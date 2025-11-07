let sites = [];
let currentUrl = null;
let screenshotInterval = null;
let sessionId = null;

// Load sites from config
async function loadSites() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    sites = data.sites || [];
    renderSites();
  } catch (error) {
    console.error('Error loading sites:', error);
    showError('Failed to load sites. Please refresh the page.');
  }
}

// Render site grid
function renderSites() {
  const grid = document.getElementById('site-grid');
  grid.innerHTML = '';
  
  sites.forEach(site => {
    const card = document.createElement('div');
    card.className = 'site-card';
    card.innerHTML = `
      <img src="${site.name}" alt="${site.name}">
      <h3>${site.name}</h3>
    `;
    card.addEventListener('click', () => openSite(site.url));
    grid.appendChild(card);
  });
}

// Open a site via screenshots
async function openSite(url) {
  // Normalize URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  currentUrl = url;
  
  // Show screenshot container, hide grid
  document.getElementById('site-grid').style.display = 'none';
  document.getElementById('screenshot-container').classList.remove('hidden');
  document.getElementById('current-url').textContent = url;
  
  // Start screenshot session
  await startScreenshotSession(url);
}

// Start screenshot session
async function startScreenshotSession(url) {
  try {
    // Initialize browser session on server
    const response = await fetch('/api/screenshot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    sessionId = data.sessionId;
    
    updateStatus('✅ Connected', 'connected');
    
    // Start screenshot refresh loop (faster for almost live updates)
    startScreenshotLoop();
  } catch (error) {
    console.error('Error starting session:', error);
    updateStatus('❌ Error', 'error');
  }
}

// Screenshot refresh loop
function startScreenshotLoop() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
  }
  
  // Refresh every 50ms (20 FPS) for almost live experience
  screenshotInterval = setInterval(async () => {
    await fetchScreenshot();
  }, 50);
  
  // Initial fetch
  fetchScreenshot();
}

// Fetch latest screenshot
async function fetchScreenshot() {
  if (!sessionId) return;
  
  try {
    const response = await fetch(`/api/screenshot/get?sessionId=${sessionId}`);
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    
    const img = document.getElementById('screenshot-img');
    img.src = imageUrl;
  } catch (error) {
    console.error('Error fetching screenshot:', error);
  }
}

// Send action to browser (click, type, scroll)
async function sendAction(action, data = {}) {
  if (!sessionId) return;
  
  try {
    await fetch('/api/screenshot/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId,
        action,
        ...data 
      })
    });
    
    // Immediate screenshot update after action
    await fetchScreenshot();
  } catch (error) {
    console.error('Error sending action:', error);
  }
}

// Update status indicator
function updateStatus(text, className) {
  const status = document.getElementById('connection-status');
  status.textContent = text;
  status.className = 'status ' + className;
}

// Show error message
function showError(message) {
  alert(message);
}

// Handle screenshot click for navigation
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  
  // Search form
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = searchInput.value.trim();
    if (url) {
      await openSite(url);
      searchInput.value = '';
    }
  });
  
  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    // Stop screenshot session
    if (sessionId) {
      fetch('/api/screenshot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }
    
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }
    
    sessionId = null;
    document.getElementById('screenshot-container').classList.add('hidden');
    document.getElementById('site-grid').style.display = 'grid';
  });
  
  // Screenshot click for page interaction
  const screenshotImg = document.getElementById('screenshot-img');
  screenshotImg.addEventListener('click', async (e) => {
    // Calculate click position relative to image
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;
    
    await sendAction('click', { x: Math.round(x), y: Math.round(y) });
  });
  
  // Control buttons
  document.getElementById('type-btn').addEventListener('click', () => {
    const overlay = document.getElementById('input-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('page-input').focus();
  });
  
  document.getElementById('input-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'input-overlay') {
      e.target.classList.add('hidden');
    }
  });
  
  document.getElementById('page-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const text = e.target.value;
      if (text) {
        await sendAction('type', { text });
        e.target.value = '';
        document.getElementById('input-overlay').classList.add('hidden');
      }
    } else if (e.key === 'Escape') {
      document.getElementById('input-overlay').classList.add('hidden');
    }
  });
  
  document.getElementById('scroll-down-btn').addEventListener('click', async () => {
    await sendAction('scroll', { direction: 'down', amount: 500 });
  });
  
  document.getElementById('scroll-up-btn').addEventListener('click', async () => {
    await sendAction('scroll', { direction: 'up', amount: 500 });
  });
  
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    if (currentUrl) {
      await startScreenshotSession(currentUrl);
    }
  });
  
  // File upload button
  document.getElementById('upload-file-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  
  // Handle file selection
  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      const response = await fetch('/api/screenshot/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('File uploaded successfully:', data.filename);
        // Trigger file input on the webpage
        await sendAction('upload', { filename: data.filename });
      } else {
        console.error('File upload failed:', data.error);
        alert('Failed to upload file: ' + data.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    }
    
    // Clear file input
    e.target.value = '';
  });
});
