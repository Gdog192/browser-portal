const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Store active browser sessions
const sessions = new Map();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

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

// Start screenshot session - ASYNC with immediate response
app.post('/api/screenshot/start', async (req, res) => {
  const { url } = req.body;
  const sessionId = uuidv4();
  
  try {
    console.log(`Starting session ${sessionId} for ${url}`);
    
    // Create session placeholder with "initializing" status
    sessions.set(sessionId, {
      status: 'initializing',
      url,
      createdAt: Date.now()
    });
    
    // Respond immediately with sessionId
    res.json({ sessionId, success: true, status: 'initializing' });
    
    // Launch browser in background (don't await here)
    (async () => {
      try {
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
        
        // Update session with browser and page
        sessions.set(sessionId, {
          browser,
          page,
          url,
          status: 'ready',
          createdAt: Date.now()
        });
        
        console.log(`Session ${sessionId} ready`);
      } catch (error) {
        console.error(`Error initializing session ${sessionId}:`, error);
        sessions.set(sessionId, {
          status: 'error',
          error: error.message,
          url,
          createdAt: Date.now()
        });
      }
    })();
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check session status
app.get('/api/screenshot/status', (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(sessionId);
  res.json({ 
    status: session.status,
    error: session.error 
  });
});

// Get screenshot
app.get('/api/screenshot/get', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(sessionId);
  
  if (session.status === 'initializing') {
    return res.status(202).json({ status: 'initializing', message: 'Browser is starting...' });
  }
  
  if (session.status === 'error') {
    return res.status(500).json({ error: session.error });
  }
  
  try {
    const screenshot = await session.page.screenshot({ type: 'png' });
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(screenshot, 'binary');
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
app.post('/api/screenshot/upload', upload.single('file'), async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const filePath = req.file.path;
    res.json({ 
      success: true, 
      filename: req.file.filename,
      filePath 
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Perform action on the page
app.post('/api/screenshot/action', async (req, res) => {
  const { sessionId, action, x, y, text, direction, amount, filename } = req.body;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(sessionId);
  
  if (session.status !== 'ready') {
    return res.status(202).json({ status: session.status, message: 'Browser not ready yet' });
  }
  
  try {
    switch (action) {
      case 'click':
        await session.page.mouse.click(x, y);
        break;
        
      case 'type':
        await session.page.keyboard.type(text);
        break;
        
      case 'scroll':
        const scrollAmount = direction === 'down' ? amount : -amount;
        await session.page.mouse.wheel({ deltaY: scrollAmount });
        break;
        
      case 'key':
        await session.page.keyboard.press(text);
        break;
        
      case 'upload':
        if (!filename) {
          return res.status(400).json({ error: 'Filename required for upload action' });
        }
        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found' });
        }
        const fileInput = await session.page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(filePath);
        } else {
          return res.status(404).json({ error: 'No file input found on page' });
        }
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
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
    if (session.browser) {
      await session.browser.close();
    }
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
      console.log(`Cleaning up old session: ${sessionId}`);
      if (session.browser) {
        session.browser.close().catch(console.error);
      }
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Browser Portal (Screenshot Mode) running on http://localhost:${PORT}/`);
  console.log(`Using Puppeteer for live screenshots - No frame restrictions`);
  console.log(`File upload support enabled with multer`);
  console.log(`Async session initialization for faster response times`);
});
