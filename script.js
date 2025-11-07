let sites = [];
let currentSite = null;

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
    card.addEventListener('click', () => openSite(site));
    grid.appendChild(card);
  });
}

// Open a site directly in iframe (no proxy)
function openSite(site) {
  currentSite = site;
  const contentFrame = document.getElementById('content-frame');
  const iframeContainer = document.getElementById('iframe-container');
  const siteGrid = document.getElementById('site-grid');
  
  // Load site directly in iframe
  contentFrame.src = site.url;
  
  // Show iframe, hide grid
  iframeContainer.style.display = 'block';
  siteGrid.style.display = 'none';
}

// Open a site from custom URL (search bar)
function openSiteFromURL(url) {
  const contentFrame = document.getElementById('content-frame');
  const iframeContainer = document.getElementById('iframe-container');
  const siteGrid = document.getElementById('site-grid');
  
  // Load URL directly in iframe
  contentFrame.src = url;
  
  // Show iframe, hide grid
  iframeContainer.style.display = 'block';
  siteGrid.style.display = 'none';
  
  // Clear current site since this is a custom URL
  currentSite = null;
}

// Go back to site grid
function goBack() {
  const contentFrame = document.getElementById('content-frame');
  const iframeContainer = document.getElementById('iframe-container');
  const siteGrid = document.getElementById('site-grid');
  
  // Stop loading and clear iframe
  contentFrame.src = '';
  
  // Show grid, hide iframe
  iframeContainer.style.display = 'none';
  siteGrid.style.display = 'grid';
  
  currentSite = null;
}

// Search bar functionality
function searchAndNavigate() {
  const urlInput = document.getElementById('url-input');
  let url = urlInput.value.trim();
  
  if (!url) {
    return; // Don't navigate if empty
  }
  
  // Normalize URL - add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Load the URL
  openSiteFromURL(url);
}

// Show error message
function showError(message) {
  const siteGrid = document.getElementById('site-grid');
  siteGrid.innerHTML = `<p class="error">${message}</p>`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load sites from config
  loadSites();
  
  // Back button event listener
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', goBack);
  }
  
  // Search bar event listeners
  const goButton = document.getElementById('go-button');
  const urlInput = document.getElementById('url-input');
  
  if (goButton) {
    goButton.addEventListener('click', searchAndNavigate);
  }
  
  if (urlInput) {
    // Handle Enter key on search input
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchAndNavigate();
      }
    });
  }
});
