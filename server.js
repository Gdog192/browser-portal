const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
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

// Manual proxy implementation using native http/https
function handleProxyRequest(req, res) {
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

  // Choose http or https module based on protocol
  const protocol = target.protocol === 'https:' ? https : http;
  
  // Prepare request options
  const options = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: req.method,
    headers: {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': targetUrl,
      'Connection': 'close'
    },
    timeout: 60000
  };

  console.log(`Proxying request to: ${targetUrl}`);

  const proxyReq = protocol.request(options, (proxyRes) => {
    // Remove framing restrictions
    const headers = {};
    Object.keys(proxyRes.headers).forEach(k => {
      const key = k.toLowerCase();
      if (key === 'x-frame-options') return;
      if (key === 'content-security-policy') {
        headers[k] = proxyRes.headers[k].replace(/frame-ancestors[^;]*;?/gi, '');
      } else if (key === 'set-cookie') {
        // Sanitize cookies
        const cookies = Array.isArray(proxyRes.headers[k]) ? proxyRes.headers[k] : [proxyRes.headers[k]];
        headers[k] = cookies.map(cookie => cookie.replace(/;\s*Domain=[^;]+/i, ''));
      } else if (key === 'location' && proxyRes.headers[k].startsWith('http')) {
        headers[k] = `/api/proxy?url=${encodeURIComponent(proxyRes.headers[k])}`;
      } else {
        headers[k] = proxyRes.headers[k];
      }
    });

    // Add CORS headers
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['access-control-allow-headers'] = 'Content-Type, Authorization';

    // Set response headers
    res.writeHead(proxyRes.statusCode, headers);

    // Pipe response data
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err.code || err.message, 'for URL:', targetUrl);
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
            <p><strong>Error:</strong> ${err.code === 'ECONNREFUSED' ? 'Connection refused' : err.code === 'ETIMEDOUT' ? 'Connection timeout' : err.code === 'ENOTFOUND' ? 'Host not found' : 'Unknown error'}</p>
            <p class="error-code">Error code: ${err.code || 'UNKNOWN'}</p>
            <p><strong>URL:</strong> ${targetUrl}</p>
            <a href="/" class="back-btn">← Back to Home</a>
          </div>
        </body>
        </html>
      `;
      res.status(502).send(errorPage);
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('Gateway Timeout');
    }
  });

  // Handle request body for POST/PUT
  if (req.method === 'POST' || req.method === 'PUT') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// API endpoint to serve config to frontend
app.get('/api/config', (req, res) => {
  res.json({ 
    sites: config.sites || [],
    rateLimit: config.rateLimit || 100,
    rateLimitWindowMs: config.rateLimitWindowMs || 60000
  });
});

// Proxy endpoints
app.get('/api/proxy', handleProxyRequest);
app.post('/api/proxy', handleProxyRequest);

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
