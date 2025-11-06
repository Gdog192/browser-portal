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
  console.log('Config loaded successfully');
} catch (e) {
  console.warn('Warning: config.json missing or invalid, falling back to defaults');
  config = {};
}

// Build allowlist of hostnames - Use Map for O(1) lookup
const allowedHosts = new Map();
const envAllowed = (process.env.ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
envAllowed.forEach(h => allowedHosts.set(h, true));

if (Array.isArray(config.allowedHosts)) {
  config.allowedHosts.forEach(h => allowedHosts.set(h, true));
} else if (Array.isArray(config.sites)) {
  config.sites.forEach(site => {
    try {
      const u = new URL(site.url);
      allowedHosts.set(u.hostname, true);
    } catch (e) {
      // ignore invalid site URLs
    }
  });
}

// Always allow localhost for local testing
allowedHosts.set('localhost', true);
allowedHosts.set('127.0.0.1', true);

console.log(`Allowed hosts: ${Array.from(allowedHosts.keys()).join(', ')}`);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Helmet: enable common security headers but avoid setting X-Frame-Options
app.use(helmet({ frameguard: false }));

// Rate limiter
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 60000,
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

// OPTIMIZED: Single reusable proxy middleware with router
const proxyMiddleware = createProxyMiddleware({
  router: (req) => {
    // Extract target URL from query param
    const targetUrl = req.query.url;
    if (!targetUrl) return null;
    return targetUrl;
  },
  changeOrigin: true,
  followRedirects: true,
  ws: false,
  timeout: 60000,
  proxyTimeout: 60000,
  // REMOVED pathRewrite - it was breaking URLs with paths
  onProxyReq: (proxyReq, req, res) => {
    // Set realistic browser headers
    proxyReq.setHeader('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
    proxyReq.setHeader('Accept-Language', req.headers['accept-language'] || 'en-US,en;q=0.9');
    proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
    proxyReq.setHeader('Referer', req.query.url || req.headers.referer || '');
    proxyReq.setTimeout(60000);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Normalize header keys to lowercase
    const headers = {};
    Object.keys(proxyRes.headers || {}).forEach(k => {
      headers[k.toLowerCase()] = proxyRes.headers[k];
    });

    // Remove framing restrictions
    delete headers['x-frame-options'];
    
    // Remove frame-ancestors from CSP
    if (headers['content-security-policy']) {
      headers['content-security-policy'] = headers['content-security-policy']
        .replace(/frame-ancestors[^;]*;?/gi, '');
    }

    // CORS headers for iframe embedding
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['access-control-allow-headers'] = 'Content-Type, Authorization';

    // Rewrite Location header for redirects
    if (headers['location'] && headers['location'].startsWith('http')) {
      headers['location'] = `/api/proxy?url=${encodeURIComponent(headers['location'])}`;
    }

    // Sanitize cookies - remove Domain attribute
    if (headers['set-cookie']) {
      try {
        if (Array.isArray(headers['set-cookie'])) {
          headers['set-cookie'] = headers['set-cookie'].map(cookie => 
            cookie.replace(/;\s*Domain=[^;]+/i, '')
          );
        } else {
          headers['set-cookie'] = headers['set-cookie'].replace(/;\s*Domain=[^;]+/i, '');
        }
      } catch (e) {
        console.warn('Cookie sanitization error:', e.message);
      }
    }

    // Apply all modified headers to response
    Object.keys(headers).forEach(key => {
      res.setHeader(key, headers[key]);
    });
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.code || err.message, 'for URL:', req.query.url);
    if (!res.headersSent) {
      const errorPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Proxy Error</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
            .error-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            .error-code { color: #666; font-size: 14px; margin-top: 20px; }
            .back-btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ Proxy Error</h1>
            <p>The requested site could not be loaded through the proxy.</p>
            <p><strong>Error:</strong> ${err.code === 'ECONNREFUSED' ? 'Connection refused' : err.code === 'ETIMEDOUT' ? 'Connection timeout' : 'Unknown error'}</p>
            <p class="error-code">Error code: ${err.code || 'UNKNOWN'}</p>
            <a href="/" class="back-btn">← Back to Home</a>
          </div>
        </body>
        </html>
      `;
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        res.status(502).send(errorPage);
      } else {
        res.status(500).send(errorPage);
      }
    }
  }
});

// Request validation middleware
function validateProxyRequest(req, res, next) {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let target;
  try {
    target = new URL(targetUrl);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Check if ALLOW_ANY_TARGET environment variable bypasses allowlist
  const allowAny = String(process.env.ALLOW_ANY_TARGET || '').toLowerCase() === 'true';
  
  if (!allowAny && !isAllowedHost(target.hostname)) {
    return res.status(403).json({ 
      error: 'Target host is not allowed',
      hostname: target.hostname,
      hint: 'Add this hostname to config.json allowedHosts or set ALLOW_ANY_TARGET=true'
    });
  }

  next();
}

// API endpoint to serve config to frontend
app.get('/api/config', (req, res) => {
  res.json({ 
    sites: config.sites || [],
    rateLimit: config.rateLimit || 100,
    rateLimitWindowMs: config.rateLimitWindowMs || 60000
  });
});

// Proxy endpoints with validation
app.get('/api/proxy', validateProxyRequest, proxyMiddleware);
app.post('/api/proxy', validateProxyRequest, proxyMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = http.createServer(app);
server.timeout = 120000; // Increase timeout to 120s

server.listen(PORT, () => {
  console.log(`🚀 Browser Portal Server running on port ${PORT}`);
  console.log(`📍 Access it at http://localhost:${PORT}`);
  console.log(`🔒 ALLOW_ANY_TARGET: ${process.env.ALLOW_ANY_TARGET || 'false'}`);
  console.log(`⚡ Rate limit: ${config.rateLimit || 100} requests per ${(config.rateLimitWindowMs || 60000) / 1000}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
