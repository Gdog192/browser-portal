# Self-Hosting Guide - Cloudflare Tunnel

> **Why Self-Host?** Using your home PC with residential IP avoids proxy detection that affects cloud hosting services like Render.

## Quick Start (5 Minutes)

### Option A: Cloudflare Tunnel (Recommended - Free Forever)

#### Step 1: Install Cloudflare Tunnel

**Windows:**
```bash
# Download from: https://github.com/cloudflare/cloudflared/releases
# Or use winget:
winget install --id Cloudflare.cloudflared
```

**Mac:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### Step 2: Authenticate Cloudflare
```bash
cloudflared tunnel login
```
This opens a browser - sign in with your Cloudflare account (free signup at cloudflare.com)

#### Step 3: Create a Tunnel
```bash
cloudflared tunnel create browser-portal
```
Note the Tunnel ID shown (e.g., `abc123-def456-ghi789`)

#### Step 4: Configure the Tunnel
Create a file called `config.yml` in your browser-portal folder:

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: C:\\Users\\YOUR_USERNAME\\.cloudflared\\YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```

**For a free subdomain (no custom domain needed):**
```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /Users/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:3000
```

#### Step 5: Start Your Server
```bash
# Terminal 1: Start your Node.js server
npm start

# Terminal 2: Start the tunnel
cloudflared tunnel run browser-portal
```

#### Step 6: Get Your Public URL
If using a free subdomain, Cloudflare will show you a URL like:
```
https://abc-def-ghi.trycloudflare.com
```

### Option B: Quick Tunnel (Testing Only)

For instant testing without setup:

```bash
# Start your server
npm start

# In another terminal:
cloudflared tunnel --url http://localhost:3000
```

You'll get a temporary URL instantly (changes each time).

---

## Custom Domain Setup (Optional)

If you have a GoDaddy domain:

### Step 1: Add Domain to Cloudflare Tunnel
```bash
cloudflared tunnel route dns browser-portal portal.yourdomain.com
```

### Step 2: Update config.yml
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: portal.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 3: Update DNS in Cloudflare Dashboard
1. Go to your Cloudflare dashboard
2. Select your domain
3. DNS → Add record:
   - Type: CNAME
   - Name: portal
   - Target: YOUR_TUNNEL_ID.cfargotunnel.com
   - Proxy: Enabled (orange cloud)

---

## Run as Background Service

### Windows (Run on Startup)

1. Create `start-tunnel.bat`:
```batch
@echo off
cd C:\\path\\to\\browser-portal
start "Node Server" cmd /k npm start
timeout /t 5
start "Cloudflare Tunnel" cmd /k cloudflared tunnel run browser-portal
```

2. Create a shortcut to this file
3. Press `Win+R`, type `shell:startup`, press Enter
4. Move the shortcut to the Startup folder

### Mac/Linux (systemd service)

Create `/etc/systemd/system/cloudflared-tunnel.service`:
```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
ExecStart=/usr/local/bin/cloudflared tunnel run browser-portal
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cloudflared-tunnel
sudo systemctl start cloudflared-tunnel
```

---

## Security Best Practices

✅ **Advantages of Self-Hosting:**
- Residential IP (harder to detect as proxy)
- Full control over environment
- No monthly costs
- Better performance (no cloud latency)

⚠️ **Important Security Notes:**

1. **Firewall Protection**
   - Cloudflare Tunnel = No port forwarding needed ✅
   - Your home IP stays hidden
   - All traffic goes through Cloudflare's secure network

2. **Rate Limiting**
   - The app already has rate limiting configured
   - Monitor your bandwidth usage

3. **Access Control**
   - Consider adding authentication if exposing publicly
   - Use strong passwords for any admin features

4. **Keep PC Running**
   - Server must stay on for 24/7 access
   - Use "sleep prevention" if needed
   - Consider power/network outages

---

## Troubleshooting

### Tunnel Not Connecting
```bash
# Check tunnel status
cloudflared tunnel info browser-portal

# View logs
cloudflared tunnel run browser-portal --loglevel debug
```

### Server Not Responding
```bash
# Test local server
curl http://localhost:3000

# Check if port 3000 is in use
netstat -ano | findstr :3000
```

### Sites Still Detecting Proxy
- Self-hosting with residential IP helps, but some sites (Netflix, Hulu) still detect iframes
- Try accessing less restrictive sites first
- Some sites block ALL iframe embedding regardless of IP

---

## Alternative: ngrok (Backup Option)

If Cloudflare Tunnel doesn't work:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Free tier limitations:
- URL changes on restart
- Less bandwidth than Cloudflare
- Rate limits

---

## Comparison

| Feature | Cloudflare Tunnel | ngrok Free | Render |
|---------|------------------|------------|--------|
| Cost | Free | Free | Free |
| Custom Domain | ✅ Yes | ❌ No | ✅ Yes |
| Persistent URL | ✅ Yes | ❌ No | ✅ Yes |
| Bandwidth | Unlimited | 1GB/month | Limited |
| IP Type | Residential | Residential | Datacenter |
| Detection Risk | Low | Low | High |
| Uptime | Depends on PC | Depends on PC | 99.9% |

---

## Getting Help

If you encounter issues:

1. Check Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
2. Verify your Node.js server is running: `npm start`
3. Test locally first: http://localhost:3000
4. Check firewall isn't blocking cloudflared

**Your app should now be accessible from anywhere with much better proxy detection avoidance!** 🎉
