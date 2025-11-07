const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Store active browser sessions
const sessions = new Map();

// Load configuration
let config = {};
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  console.log('Configuration loaded successfully');
} catch (error) {
  console.warn('Warning: config.json missing or invalid. Falling back to defaults.');
  config = { sites: [] };
}

// API endpoint to get configuration
app.get('/api/config', (req, res) => {
  res.json(config);
});

// Start screenshot session
app.post('/api/screenshot/start', async (req, res) => {
  const { url } = req.body;
  const sessionId = uuidv4();
  
  try {
    console.log(`Starting session ${sessionId} for ${url}`);
    
    // Launch browser in headless mode
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Store session
    sessions.set(sessionId, {
      browser,
      page,
      url,
      createdAt: Date.now()
    });
    
    res.json({ sessionId, success: true });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get screenshot
app.get('/api/screenshot/get', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    const session = sessions.get(sessionId);
    const screenshot = await session.page.screenshot({ type: 'png' });
    
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send action to page (click, type, scroll)
app.post('/api/screenshot/action', async (req, res) => {
  const { sessionId, action, data } = req.body;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    const session = sessions.get(sessionId);
    const page = session.page;
    
    switch (action) {
      case 'click':
        // Convert percentage to pixel coordinates
        const viewport = page.viewport();
        const x = (data.x / 100) * viewport.width;
        const y = (data.y / 100) * viewport.height;
        await page.mouse.click(x, y);
        break;
        
      case 'type':
        // Type text (assumes a field is already focused or clicks were made)
        await page.keyboard.type(data.text);
        await page.keyboard.press('Enter'); // Auto-submit
        break;
        
      case 'scroll':
        const scrollAmount = data.amount || 500;
        if (data.direction === 'down') {
          await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
        } else if (data.direction === 'up') {
          await page.evaluate((amount) => window.scrollBy(0, -amount), scrollAmount);
        }
        break;
        
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error performing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop screenshot session
app.post('/api/screenshot/stop', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    const session = sessions.get(sessionId);
    await session.browser.close();
    sessions.delete(sessionId);
    
    console.log(`Stopped session ${sessionId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeSessions: sessions.size,
    mode: 'screenshot'
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Cleanup old sessions (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > maxAge) {
      console.log(`Cleaning up old session ${sessionId}`);
      session.browser.close().catch(console.error);
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Browser Portal (Screenshot Mode) running on http://localhost:${PORT}`);
  console.log('Using Puppeteer for live screenshots - No iframe restrictions!');
  console.log('Screenshot refresh rate: 200ms (5 FPS)');
});
