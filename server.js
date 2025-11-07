const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Load configuration
let config = {};
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  console.log('Configuration loaded successfully');
} catch (error) {
  console.warn('Warning: config.json missing or invalid. Falling back to defaults.');
  config = {
    sites: []
  };
}

// API endpoint to get configuration
app.get('/api/config', (req, res) => {
  res.json(config);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Browser Portal server running on http://localhost:${PORT}`);
  console.log(`Direct iframe mode - No proxy enabled`);
});
