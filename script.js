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

    // Clear any previous error
    const errorMsg = document.getElementById('iframe-error');
    if (errorMsg) errorMsg.remove();

    // Load site through proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(site.url)}`;
    contentFrame.src = proxyUrl;
    
    // Add error handler for iframe
    contentFrame.onerror = () => {
        showIframeError('Failed to load site. The site may be blocking proxy requests or require authentication.');
    };
    
    // Handle iframe load errors
    contentFrame.onload = () => {
        try {
            // Check if iframe content is accessible (same-origin policy may block this)
            const iframeDoc = contentFrame.contentDocument || contentFrame.contentWindow.document;
        } catch (e) {
            // Cross-origin error is normal, but if we get here and content is empty, might be an issue
            console.log('Iframe loaded (cross-origin check normal)');
        }
    };
}

function showIframeError(message) {
    const iframeContainer = document.getElementById('iframe-container');
    const contentFrame = document.getElementById('content-frame');
    
    // Remove existing error if any
    const existingError = document.getElementById('iframe-error');
    if (existingError) existingError.remove();
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.id = 'iframe-error';
    errorDiv.style.cssText = 'background: #ff6b6b; color: white; padding: 20px; margin: 20px; border-radius: 8px; text-align: center;';
    errorDiv.innerHTML = `
        <h3>⚠️ Unable to Load Site</h3>
        <p>${message}</p>
        <p><strong>Common reasons:</strong></p>
        <ul style="text-align: left; display: inline-block;">
            <li>Site blocks proxy requests (Netflix, YouTube, etc.)</li>
            <li>Site requires authentication</li>
            <li>Connection timeout</li>
        </ul>
        <p><button onclick="document.getElementById('iframe-container').querySelector('#back-button').click()" style="margin-top: 10px; padding: 10px 20px; background: white; color: #ff6b6b; border: none; border-radius: 5px; cursor: pointer;">← Back to Sites</button></p>
    `;
    
    // Insert error before iframe
    contentFrame.parentNode.insertBefore(errorDiv, contentFrame);
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

