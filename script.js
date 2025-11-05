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

function renderSites() {
    const grid = document.getElementById('site-grid');
    grid.innerHTML = '';

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'site-card';
        card.onclick = () => openSite(site);

        const icon = document.createElement('div');
        icon.className = 'site-icon';
        icon.textContent = site.icon || '🌐';

        const name = document.createElement('div');
        name.className = 'site-name';
        name.textContent = site.name;

        card.appendChild(icon);
        card.appendChild(name);
        grid.appendChild(card);
    });
}

function openSite(site) {
    currentSite = site;
    const iframeContainer = document.getElementById('iframe-container');
    const siteGrid = document.getElementById('site-grid');
    const contentFrame = document.getElementById('content-frame');
    const siteTitle = document.getElementById('site-title');

    // Hide site grid, show iframe container
    siteGrid.style.display = 'none';
    iframeContainer.classList.remove('hidden');
    siteTitle.textContent = site.name;

    // Load site through proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(site.url)}`;
    contentFrame.src = proxyUrl;
}

function goBack() {
    const iframeContainer = document.getElementById('iframe-container');
    const siteGrid = document.getElementById('site-grid');
    const contentFrame = document.getElementById('content-frame');

    siteGrid.style.display = 'grid';
    iframeContainer.classList.add('hidden');
    contentFrame.src = '';
    currentSite = null;
}

function showError(message) {
    const grid = document.getElementById('site-grid');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    grid.appendChild(errorDiv);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSites();
    document.getElementById('back-button').addEventListener('click', goBack);
});

