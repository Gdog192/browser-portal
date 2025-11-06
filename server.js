const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { URL } = require('url');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (so req.ip is correct behind load balancers)
app.set('trust proxy', true);

// Load configuration
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Warning: config.json missing or invalid, falling back to defaults');
  config = {};
}

// Build allowlist of hostnames
const envAllowed = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedHosts = new Set(envAllowed);
if (Array.isArray(config.allowedHosts)) {
  config.allowedHosts.forEach(h => allowedHosts.add(h));
} else if (Array.isArray(config.sites)) {
  config.sites.forEach(site => {
    try {
      const u = new URL(site.url);
      allowedHosts.add(u.hostname);
    } catch (e) {
      // ignore invalid site URLs
    }
  });
}
// Always allow localhost for local testing
allowedHosts.add('localhost');
allowedHosts.add('127.0.0.1');

// Serve static files
app.use(express.static(path.join(__dirname)));

// Helmet: enable common security headers but avoid setting X-Frame-Options because portal intentionally embeds sites
app.use(helmet({ frameguard: false }));

// Rate limiter (more robust than in-memory counters)
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 60 * 1000,
  max: config.rateLimit || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Rate limit exceeded' })
});
app.use('/api/proxy', limiter);

// Utility: check if hostname is allowed
function isAllowedHost(hostname) {
  if (!hostname) return false;
  return allowedHosts.has(hostname);
}

// Function to rewrite URLs in HTML/CSS/JS content
function rewriteUrls(content, baseUrl, proxyBase) {
  if (!content || typeof content !== 'string') return content;
  try {
    const base = new URL(baseUrl);
    const baseHost = base.origin;

    // Absolute URLs
    content = content.replace(/https?:\/\/[^"'\s<>]+/gi, (url) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseHost || url.startsWith(baseHost)) {
          return `${proxyBase}?url=${encodeURIComponent(url)}`;
        }
        return url;
      } catch (e) {
        return url;
      }
    });

    // Attributes and url(...) patterns
    const attrPatterns = [
      /(src|href|action)=['"]([^"']+)['"]/gi,
      /(src|href|action)=([^\s>]+)/gi,
      /url\(['"]?([^"')]+)['"]?\)/gi
    ];

    attrPatterns.forEach(pattern => {
      content = content.replace(pattern, (match, attr, url) => {
        if (!url) return match;
        if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#')) return match;
        try {
          let fullUrl;
          if (url.startsWith('http://') || url.startsWith('https://')) {
            fullUrl = url;
          } else if (url.startsWith('//')) {
            fullUrl = base.protocol + url;
          } else {
            fullUrl = new URL(url, baseUrl).href;
          }
          const urlObj = new URL(fullUrl);
          if (urlObj.origin === baseHost) {
            return match.replace(url, `${proxyBase}?url=${encodeURIComponent(fullUrl)}`);
          }
        } catch (e) {
          // ignore
        }
        return match;
      });
    });

    return content;
  } catch (e) {
    return content;
  }
}

// Proxy endpoint handler factory
function createProxyHandler() {
  return (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL parameter is required' });

    let target;
    try {
      target = new URL(targetUrl);
      if (!['http:', 'https:'].includes(target.protocol)) {
        return res.status(400).json({ error: 'Invalid protocol' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // If env ALLOW_ANY_TARGET is set to 'true', allow all hosts (user requested option B)
    const allowAny = String(process.env.ALLOW_ANY_TARGET || '').toLowerCase() === 'true';
    if (!allowAny && !isAllowedHost(target.hostname)) {
      return res.status(403).json({ error: 'Target host is not allowed' });
    }

    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      followRedirects: true,
      ws: false,
      timeout: 60_000,
      proxyTimeout: 60_000,
      selfHandleResponse: true,
      pathRewrite: { '^/api/proxy': '' },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0');
        proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        proxyReq.setHeader('Accept-Language', req.headers['accept-language'] || 'en-US,en;q=0.9');
        proxyReq.setHeader('Accept-Encoding', 'identity');
        proxyReq.setHeader('Referer', req.headers.referer || targetUrl);
        proxyReq.setTimeout(60_000);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Normalize header keys
        const headers = {};
        Object.keys(proxyRes.headers || {}).forEach(k => {
          headers[k.toLowerCase()] = proxyRes.headers[k];
        });

        // Remove framing header(s)
        delete headers['x-frame-options'];

        // Remove frame-ancestors from CSP
        if (headers['content-security-policy']) {
          headers['content-security-policy'] = headers['content-security-policy'].replace(/frame-ancestors[^;]*;?/gi, '');
        }

        // CORS for embedding via iframe when needed
        headers['access-control-allow-origin'] = headers['access-control-allow-origin'] || '*';
        headers['access-control-allow-methods'] = headers['access-control-allow-methods'] || 'GET, POST, PUT, DELETE, OPTIONS';
        headers['access-control-allow-headers'] = headers['access-control-allow-headers'] || 'Content-Type, Authorization';

        // Rewrite location header to route back through proxy
        if (headers['location'] && headers['location'].startsWith('http')) {
          headers['location'] = `/api/proxy?url=${encodeURIComponent(headers['location'])}`;
        }

        // Sanitize Set-Cookie: strip Domain attribute so cookies are not set for upstream domain
        if (headers['set-cookie']) {
          try {
            headers['set-cookie'] = headers['set-cookie'].map(cookie => cookie.replace(/;\s*Domain=[^;]+/i, ''));
          } catch (e) {
            // leave as-is if something unexpected
          }
        }

        const contentType = headers['content-type'] || '';
        const isHTML = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
        const isCSS = contentType.includes('text/css');
        const isJS = contentType.includes('application/javascript') || contentType.includes('text/javascript');

        if (isHTML || isCSS || isJS) {
          const chunks = [];
          proxyRes.on('data', chunk => chunks.push(chunk));
          proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const rewritten = rewriteUrls(body, targetUrl, '/api/proxy');

            Object.keys(headers).forEach(key => {
              if (key !== 'content-length') res.setHeader(key, headers[key]);
            });
            res.setHeader('Content-Length', Buffer.byteLength(rewritten, 'utf8'));
            res.status(proxyRes.statusCode).send(rewritten);
          });
        } else {
          Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
          res.status(proxyRes.statusCode);
          proxyRes.pipe(res);
        }
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err && err.message);
        if (!res.headersSent) {
          if (err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
            res.status(502).send(`<html><body><h1>502 Bad Gateway</h1><p>The requested site could not be reached.</p><p><a href="/">Back</a></p></body></html>`);
          } else {
            res.status(500).send(`<html><body><h1>Proxy Error</h1><p>An error occurred while proxying the request.</p><p><a href="/">Back</a></p></body></html>`);
          }
        }
      }
    });

    return proxy(req, res, next);
  };
}

app.get('/api/proxy', createProxyHandler());
app.post('/api/proxy', createProxyHandler());

// Start server and set HTTP server timeout for Render-like platforms
const server = http.createServer(app);
server.timeout = 60_000;
server.listen(PORT, () => {
  console.log(`Browser Portal Server running on port ${PORT}`);
  console.log(`Access it at http://localhost:${PORT}`);
});
