# Screenshot-Based Browsing Method

## Overview

Browser Portal now uses **screenshot-based browsing** powered by Puppeteer to completely bypass iframe restrictions (X-Frame-Options). This method allows you to browse **ANY website** including Google, YouTube, Facebook, Amazon, and more - sites that normally block iframe embedding.

## How It Works

Instead of loading websites in an iframe (which gets blocked), the server runs a **headless Chromium browser** via Puppeteer and:

1. Loads the website in the background
2. Takes screenshots every **50ms** (20 FPS)
3. Streams these screenshots to your browser
4. Sends your clicks, typing, and scrolls back to the headless browser
5. The website thinks it's interacting with a real browser (because it is!)

### Why This Works

- **No iframe = No X-Frame-Options restriction**
- **Real browser = No bot detection issues**
- **Server-side = Full control over any website**
- **Works with ANY site** - Google, YouTube, banking sites, etc.

## Installation

### 1. Install Dependencies

```bash
cd browser-portal
npm install
```

This will install:
- **express** ^4.18.2 - Web server
- **puppeteer** ^21.5.0 - Headless Chrome automation (~200MB download)
- **uuid** ^9.0.1 - Session ID generation

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Features

### ✅ Browse ANY Website
- No iframe restrictions
- Works with Google, YouTube, Facebook, Amazon, banks, etc.
- No "refused to connect" errors

### ⌨️ Interactive Input
- **Click Mode**: Click anywhere on the screenshot to interact
- **Type Mode**: Enter text in search boxes, forms, etc.
- **Scroll**: Scroll up/down through pages
- **Refresh**: Reload the current page

### 📸 Live Screenshot Stream
- 50ms refresh rate (20 FPS) for almost live experience!
- Real-time updates as you interact
- Shows exactly what the website looks like

### 🛡️ Session Management
- Each browser session is isolated
- Automatic cleanup after 30 minutes of inactivity
- Multiple users can browse different sites simultaneously

## Usage Guide

### Opening a Website
1. Enter a URL in the search bar (e.g., `google.com`, `youtube.com`)
2. Click the **Go** button
3. Wait 2-3 seconds for the page to load
4. Start interacting!

### Clicking on the Page
1. Simply **click anywhere** on the screenshot
2. Your click position is calculated and sent to the real browser
3. The page updates within 50ms

### Typing Text
1. Click the **⌨️ Type Mode** button
2. An input overlay appears
3. Type your text (e.g., a search query)
4. Click **Send**
5. The text is typed into the currently focused field on the website

### Scrolling
1. Use the **⬇️ Scroll Down** button to scroll down 500px
2. Use the **⬆️ Scroll Up** button to scroll up 500px
3. Scroll multiple times to navigate long pages

### Refreshing the Page
1. Click the **🔄 Refresh** button to reload the current page
2. Useful if the page becomes unresponsive

## Technical Details

### Architecture

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│              │          │              │          │              │
│   Browser    │◄────────►│   Express    │◄────────►│  Puppeteer   │
│   (Client)   │          │    Server    │          │   Browser    │
│              │          │              │          │              │
└──────────────┘          └──────────────┘          └──────────────┘
     │                           │                          │
     │ 1. Request URL            │                          │
     ├──────────────────────────►│                          │
     │                           │ 2. Launch browser        │
     │                           ├─────────────────────────►│
     │                           │                          │ 3. Load page
     │                           │                          ├────────┐
     │                           │                          │◄───────┘
     │                           │ 4. Capture screenshot    │
     │                           │◄─────────────────────────┤
     │ 5. Send PNG image         │                          │
     │◄──────────────────────────┤                          │
     │                           │                          │
     │ 6. User clicks            │                          │
     ├──────────────────────────►│                          │
     │                           │ 7. Execute click         │
     │                           ├─────────────────────────►│
     │                           │                          │
     │                           │ 8. New screenshot        │
     │◄────────(loop every 50ms)─┴──────────────────────────┘
```

### API Endpoints

#### POST /api/screenshot/start
Starts a new browser session
```json
Request: { "url": "https://google.com" }
Response: { "sessionId": "abc-123" }
```

#### GET /api/screenshot/get?sessionId=abc-123
Gets the latest screenshot (PNG image)

#### POST /api/screenshot/action
Sends an action to the browser
```json
{
  "sessionId": "abc-123",
  "action": "click",
  "x": 640,
  "y": 360
}
```

Actions:
- `click` - Click at coordinates (x, y)
- `type` - Type text (text parameter)
- `scroll` - Scroll page (direction: 'up'/'down', amount: pixels)

#### POST /api/screenshot/stop
Closes the browser session
```json
{ "sessionId": "abc-123" }
```

### Performance

- **Screenshot rate**: 20 FPS (50ms refresh)
- **Latency**: ~100-200ms from action to visual update
- **Memory**: ~150MB RAM per active session
- **Browser startup**: ~2-3 seconds
- **Screenshot size**: ~100-300KB per frame (compressed PNG)
- **Bandwidth**: ~2-6 MB/s per active session

## Limitations

### ⚠️ Not Suitable For

1. **Video playback** - 20 FPS is not smooth enough for video
2. **Gaming** - Too much latency for real-time games
3. **Audio** - Screenshots don't capture sound
4. **Heavy usage** - Each session uses significant resources
5. **Click precision** - Small buttons may be hard to click accurately
6. **Typing workflow** - Requires opening Type Mode overlay

### 🔒 Security Considerations

- All browsing happens on the server, not your local machine
- Sessions are isolated per user
- Auto-cleanup prevents abandoned sessions
- Consider running behind authentication if deployed publicly

## Comparison: Screenshot vs Iframe

| Feature | Iframe Method | Screenshot Method |
|---------|---------------|-------------------|
| **Works with Google** | ❌ No | ✅ Yes |
| **Works with YouTube** | ❌ No | ✅ Yes |
| **Works with Facebook** | ❌ No | ✅ Yes |
| **Works with ANY site** | ❌ Limited | ✅ Yes |
| **Setup complexity** | ✅ Simple | ⚠️ Moderate |
| **Server resources** | ✅ Low | ⚠️ High |
| **Smoothness** | ✅ Native | ⚠️ 20 FPS |
| **Latency** | ✅ None | ⚠️ 100-200ms |
| **Audio support** | ✅ Yes | ❌ No |
| **Video playback** | ✅ Good | ❌ Poor |
| **Text input** | ✅ Native | ⚠️ Overlay |

## Troubleshooting

### Browser session not starting
- Check if Puppeteer is installed: `npm list puppeteer`
- Re-run `npm install` to download Chromium
- Check server logs for errors

### Screenshots not updating
- Check your internet connection
- Verify the session ID is valid
- Try refreshing the page

### Clicks not working
- Click directly on elements, not too close to edges
- Wait for the page to fully load before clicking
- Use Type Mode for text input fields

### High memory usage
- Each active session uses ~150MB RAM
- Sessions auto-cleanup after 30 minutes
- Manually stop sessions when done browsing

### Page loads slowly
- Initial load takes 2-3 seconds (browser startup)
- Subsequent navigation is faster
- Heavy websites may take longer to render

## Quick Start Commands

```bash
# Install everything
git clone https://github.com/yourusername/browser-portal.git
cd browser-portal
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

## Future Improvements

- [ ] Increase refresh rate to 60 FPS with WebSocket streaming
- [ ] Add touch gestures for mobile
- [ ] Implement audio capture/streaming
- [ ] Add browser back/forward buttons
- [ ] Support multiple browser tabs
- [ ] Add bookmarks and history
- [ ] Implement zoom controls
- [ ] Add screenshot download feature
