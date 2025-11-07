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
      <img src="${site.icon}" alt="${site.name}" />
      <p>${site.name}</p>
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
    
    // Start screenshot refresh loop (every 200ms like your friend's)
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
  
  // Refresh every 200ms (5 FPS)
  screenshotInterval = setInterval(async () => {
    await fetchScreenshot();
  }, 200);
  
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
      body: JSON.stringify({ sessionId, action, data })
    });
  } catch (error) {
    console.error('Error sending action:', error);
  }
}

// Stop screenshot session
async function stopScreenshotSession() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
  
  if (sessionId) {
    try {
      await fetch('/api/screenshot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      console.error('Error stopping session:', error);
    }
    sessionId = null;
  }
  
  updateStatus('⚫ Disconnected', 'disconnected');
}

// Go back to site grid
function goBack() {
  stopScreenshotSession();
  
  document.getElementById('screenshot-container').classList.add('hidden');
  document.getElementById('site-grid').style.display = 'grid';
  
  currentUrl = null;
}

// Search and navigate
function searchAndNavigate() {
  const urlInput = document.getElementById('url-input');
  let url = urlInput.value.trim();
  
  if (!url) return;
  
  openSite(url);
}

// Update status indicator
function updateStatus(text, className) {
  const status = document.getElementById('screenshot-status');
  status.textContent = text;
  status.className = 'screenshot-status ' + className;
}

// Show error
function showError(message) {
  const grid = document.getElementById('site-grid');
  grid.innerHTML = `<p class="error">${message}</p>`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  
  // Back button
  document.getElementById('back-button').addEventListener('click', goBack);
  
  // Search bar
  document.getElementById('go-button').addEventListener('click', searchAndNavigate);
  document.getElementById('url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAndNavigate();
  });
  
  // Control buttons
  document.getElementById('click-mode').addEventListener('click', () => {
    alert('Click on the screenshot to simulate clicks on the website');
  });
  
  document.getElementById('type-mode').addEventListener('click', () => {
    // Show input overlay
    document.getElementById('input-overlay').classList.remove('hidden');
    document.getElementById('page-input').focus();
  });
  
  document.getElementById('scroll-down').addEventListener('click', () => {
    sendAction('scroll', { direction: 'down', amount: 500 });
  });
  
  document.getElementById('scroll-up').addEventListener('click', () => {
    sendAction('scroll', { direction: 'up', amount: 500 });
  });
  
  document.getElementById('refresh-page').addEventListener('click', () => {
    if (currentUrl) {
      stopScreenshotSession();
      setTimeout(() => openSite(currentUrl), 100);
    }
  });
  
  // Input overlay
  document.getElementById('send-input').addEventListener('click', () => {
    const input = document.getElementById('page-input');
    const text = input.value;
    if (text) {
      sendAction('type', { text });
      input.value = '';
      document.getElementById('input-overlay').classList.add('hidden');
    }
  });
  
  document.getElementById('close-overlay').addEventListener('click', () => {
    document.getElementById('input-overlay').classList.add('hidden');
  });
  
  // Click on screenshot to simulate click on website
  document.getElementById('screenshot-img').addEventListener('click', (e) => {
    const img = e.target;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage position (for scaling)
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    sendAction('click', { x: xPercent, y: yPercent });
  });
});
