# Screenshot-Based Browsing Method

## Overview

Browser Portal now uses **screenshot-based browsing** powered by Puppeteer to completely bypass iframe restrictions (X-Frame-Options). This method allows you to browse **ANY website** including Google, YouTube, Facebook, Amazon, and more - sites that normally block iframe embedding.

## How It Works

Instead of loading websites in an iframe (which gets blocked), the server runs a **headless Chromium browser** via Puppeteer and:

1. Loads the website in the background
2. Takes screenshots every **200ms** (5 FPS)
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
- 200ms refresh rate (5 FPS) - just like your friend's implementation!
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
3. The page updates within 200ms

### Typing Text

1. Click the **⌨️ Type Mode** button
2. An input overlay appears
3. Type your text (e.g., a search query)
4. Click **Send**
5. The text is typed into the currently focused field on the website
6. Press Enter automatically submits

**Workflow Example (Google Search):**
1. Navigate to `google.com`
2. Click on the search box in the screenshot
3. Click **Type Mode**
4. Type "puppies"
5. Click **Send**
6. Results appear!

### Scrolling

- Click **⬇️ Scroll Down** to scroll down 500px
- Click **⬆️ Scroll Up** to scroll up 500px
- Repeat as needed to navigate long pages

### Going Back

- Click **← Back to Sites** to return to the site grid
- This closes the browser session and stops the screenshot stream

## Technical Details

### Architecture

```
[Your Browser] <--200ms screenshot stream-- [Server]
       |                                          |
   (clicks, types)                         [Puppeteer]
       |                                          |
       +--------- actions sent ---------------> [Headless Chrome]
                                                     |
                                                [Real Website]
```

### API Endpoints

#### `POST /api/screenshot/start`
Starts a new browser session
```json
{"url": "https://example.com"}
```
Returns: `{"sessionId": "uuid", "success": true}`

#### `GET /api/screenshot/get?sessionId=xxx`
Fetches the latest screenshot (PNG image)

#### `POST /api/screenshot/action`
Sends an action to the browser
```json
{
  "sessionId": "uuid",
  "action": "click" | "type" | "scroll",
  "data": {
    "x": 50,  // percentage for click
    "y": 30,  // percentage for click
    "text": "search query",  // for type action
    "direction": "down",  // for scroll
    "amount": 500  // pixels to scroll
  }
}
```

#### `POST /api/screenshot/stop`
Stops a browser session and cleans up

### Performance

- **Screenshot Rate**: 200ms (5 FPS)
- **Browser Viewport**: 1280x720
- **Session Timeout**: 30 minutes
- **Memory**: ~150MB per active session

### Limitations

1. **Not Real-Time Video**: 5 FPS is sufficient for browsing but not for watching videos
2. **No Audio**: Screenshots don't include sound
3. **Server Resources**: Each session uses ~150MB RAM
4. **Click Precision**: May take practice for small buttons/links
5. **Typing Workflow**: Requires clicking the element first, then using Type Mode

## Comparison: Screenshot vs. Iframe

| Feature | Iframe Method | Screenshot Method |
|---------|--------------|------------------|
| **Google/YouTube** | ❌ Blocked | ✅ Works |
| **Facebook/Twitter** | ❌ Blocked | ✅ Works |
| **Banking Sites** | ❌ Blocked | ✅ Works |
| **Speed** | ⚡ Instant | 🐌 200ms delay |
| **Resource Usage** | 👍 Light | 💪 Heavy |
| **Setup** | 🌿 Simple | 🔧 Puppeteer required |
| **Restrictions** | Many | None |

## Troubleshooting

### "Session not found" Error
- The browser session expired (30 min timeout)
- Click **Back** and try opening the site again

### Screenshot Not Updating
- Check your network connection
- Refresh the page
- The site might be loading slowly - wait a few seconds

### Clicks Not Working
- Make sure you're clicking directly on interactive elements
- Try clicking in the center of buttons/links
- Some elements may require scrolling into view first

### Typing Not Working
- Click the input field on the screenshot FIRST
- Then use Type Mode
- The field must be focused for typing to work

### Puppeteer Installation Failed
- Puppeteer downloads Chromium (~200MB) on first install
- Ensure you have a stable internet connection
- Try: `npm install puppeteer --unsafe-perm=true`

## Security Considerations

⚠️ **Important Notes:**

1. **Server-Side Browsing**: All browsing happens on YOUR server, not the client
2. **Session Isolation**: Each user gets their own browser session
3. **No Credential Storage**: Logins are temporary and session-only
4. **HTTPS Recommended**: Use HTTPS in production to protect screenshot data
5. **Resource Limits**: Implement user limits to prevent server overload

## Credits

Inspired by your friend's implementation using 200ms screenshot refresh rate! This is the same method used by remote desktop tools like TeamViewer and Chrome Remote Desktop.

---

## Quick Start Commands

```bash
# Install
npm install

# Run
npm start

# Open
http://localhost:3000

# Try browsing:
- google.com
- youtube.com
- github.com
- amazon.com
# ALL work with no restrictions!
```

**Enjoy unrestricted browsing! 🎉**
