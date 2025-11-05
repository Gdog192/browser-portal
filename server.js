const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase timeout for Render
app.timeout = 60000;

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Rate limiting middleware (simple in-memory store)
const requestCounts = new Map();
const RATE_LIMIT = config.rateLimit || 100; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute

function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }
    
    const record = requestCounts.get(ip);
    
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_WINDOW;
        return next();
    }
    
    record.count++;
    
    if (record.count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    next();
}

// Config endpoint
app.get('/api/config', (req, res) => {
    res.json({
        sites: config.sites,
        port: PORT
    });
});

// Proxy endpoint
app.get('/api/proxy', rateLimitMiddleware, (req, res, next) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Validate URL format
    try {
        const url = new URL(targetUrl);
        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            return res.status(400).json({ error: 'Invalid protocol' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Create proxy middleware
    const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        followRedirects: true,
        ws: false, // Disable WebSocket support for security
        timeout: 60000, // 60 second timeout
        proxyTimeout: 60000,
        pathRewrite: {
            '^/api/proxy': ''
        },
        onProxyReq: (proxyReq, req, res) => {
            // Set headers to appear as normal browser request
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Referer', req.headers.referer || targetUrl);
            
            // Set timeout on the request
            proxyReq.setTimeout(60000);
        },
        onProxyRes: (proxyRes, req, res) => {
            // Remove X-Frame-Options header to allow iframe embedding
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['X-Frame-Options'];
            
            // Remove Content-Security-Policy frame-ancestors
            if (proxyRes.headers['content-security-policy']) {
                proxyRes.headers['content-security-policy'] = proxyRes.headers['content-security-policy']
                    .replace(/frame-ancestors[^;]*;?/gi, '');
            }
            
            // Set CORS headers to allow embedding
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            
            // Rewrite URLs in response headers
            const location = proxyRes.headers['location'];
            if (location && location.startsWith('http')) {
                proxyRes.headers['location'] = `/api/proxy?url=${encodeURIComponent(location)}`;
            }
        },
        onError: (err, req, res) => {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
                if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
                    res.status(502).send(`
                        <html>
                            <head><title>Proxy Error</title></head>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h1>502 Bad Gateway</h1>
                                <p>The requested site could not be reached through the proxy.</p>
                                <p><strong>Possible reasons:</strong></p>
                                <ul style="text-align: left; display: inline-block;">
                                    <li>The site may be blocking proxy requests</li>
                                    <li>Connection timeout (try again)</li>
                                    <li>The site may require authentication</li>
                                </ul>
                                <p><a href="/">← Back to Portal</a></p>
                            </body>
                        </html>
                    `);
                } else {
                    res.status(500).send(`
                        <html>
                            <head><title>Proxy Error</title></head>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h1>Proxy Error</h1>
                                <p>An error occurred while proxying the request.</p>
                                <p><a href="/">← Back to Portal</a></p>
                            </body>
                        </html>
                    `);
                }
            }
        }
    });
    
    proxy(req, res, next);
});

// Handle POST requests for proxy (for forms, etc.)
app.post('/api/proxy', rateLimitMiddleware, (req, res, next) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        followRedirects: true,
        ws: false,
        timeout: 60000,
        proxyTimeout: 60000,
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            proxyReq.setTimeout(60000);
        },
        onProxyRes: (proxyRes, req, res) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['X-Frame-Options'];
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        },
        onError: (err, req, res) => {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
                res.status(502).send(`
                    <html>
                        <head><title>Proxy Error</title></head>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h1>502 Bad Gateway</h1>
                            <p>The requested site could not be reached.</p>
                            <p><a href="/">← Back to Portal</a></p>
                        </body>
                    </html>
                `);
            }
        }
    });
    
    proxy(req, res, next);
});

// Clean up rate limit store periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now > record.resetTime) {
            requestCounts.delete(ip);
        }
    }
}, RATE_WINDOW);

// Start server
app.listen(PORT, () => {
    console.log(`Browser Portal Server running on port ${PORT}`);
    console.log(`Access it at http://localhost:${PORT}`);
    console.log(`Make sure to configure your domain to point to this server`);
});

