# Self-Hosting Guide - Cloudflare Tunnel

> **Why Self-Host?** Using your home PC with residential IP avoids proxy detection that affects cloud hosting services like Render.

---

## 🚀 Quick Start (Recommended - Easiest Way)

### **TWO Simple Steps:**

#### **Step 1: Download Your Code**

Open PowerShell and run:

```powershell
# Navigate to where you want the folder
cd $env:USERPROFILE\Documents

# Clone the repository
git clone https://github.com/Gdog192/browser-portal.git

# Navigate into the folder
cd browser-portal

# Install dependencies
npm install
```

**Don't have Git?** Download ZIP from GitHub:
1. Go to https://github.com/Gdog192/browser-portal
2. Click green "Code" button → "Download ZIP"
3. Extract to `C:\Users\YOUR_USERNAME\Documents\browser-portal`
4. Open PowerShell in that folder and run `npm install`

---

#### **Step 2: Install Cloudflare Tunnel**

**Windows (using winget):**
```powershell
winget install --id Cloudflare.cloudflared
```

**Or download manually:**
- Go to: https://github.com/cloudflare/cloudflared/releases/latest
- Download: `cloudflared-windows-amd64.exe`
- Rename to `cloudflared.exe` and add to PATH

**Mac:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

---

## ✅ Start Your Server (Every Time)

### **You Need TWO PowerShell Windows:**

#### **Window 1: Start Node.js Server**

```powershell
cd C:\Users\YOUR_USERNAME\Documents\browser-portal
npm start
```

✅ You should see:
```
Browser Portal Server running on port 3000
Access it at http://localhost:3000
```

**Keep this window open!**

---

#### **Window 2: Start Cloudflare Tunnel**

Open a **NEW** PowerShell window:

```powershell
cloudflared tunnel --url http://localhost:3000
```

✅ You'll get a URL like:
```
https://abc-def-123.trycloudflare.com
```

**That's your public URL!** Share it with anyone. ✨

---

## 🔒 Option: Create Permanent Tunnel (Optional)

If you want a URL that doesn't change:

### **Step 1: Login to Cloudflare**

```powershell
cloudflared tunnel login
```

- Opens your browser
- Login or create free Cloudflare account
- Authorizes your computer

### **Step 2: Create Named Tunnel**

```powershell
cloudflared tunnel create browser-portal
```

Note the Tunnel ID shown (e.g., `abc123-def456-ghi789`)

### **Step 3: Create Config File**

Create `cloudflared-config.yml` in your browser-portal folder:

**Windows:**
```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:3000
```

**Mac/Linux:**
```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /Users/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:3000
```

### **Step 4: Run Permanent Tunnel**

```powershell
# Window 1: Start Node server
npm start

# Window 2: Start tunnel with config
cloudflared tunnel --config cloudflared-config.yml run browser-portal
```

---

## 🌐 Custom Domain Setup (Advanced)

If you have a domain (like from GoDaddy):

### **Step 1: Add Domain to Cloudflare**

1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers at GoDaddy to Cloudflare's nameservers

### **Step 2: Route Tunnel to Domain**

```powershell
cloudflared tunnel route dns browser-portal portal.yourdomain.com
```

### **Step 3: Update Config**

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: portal.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Now access at: `https://portal.yourdomain.com`

---

## 🔄 Run on Startup (Windows)

### **Option 1: Batch File**

Create `start-portal.bat` in your browser-portal folder:

```batch
@echo off
cd /d "%~dp0"
start "Node Server" cmd /k npm start
timeout /t 5
start "Cloudflare Tunnel" cmd /k cloudflared tunnel --url http://localhost:3000
```

Double-click this file to start everything!

### **Option 2: Auto-Start on Boot**

1. Press `Win+R`
2. Type: `shell:startup`
3. Press Enter
4. Copy your `start-portal.bat` file into this folder

---

## 🔄 Run on Startup (Mac/Linux)

Create systemd service at `/etc/systemd/system/browser-portal.service`:

```ini
[Unit]
Description=Browser Portal
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/browser-portal
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable browser-portal
sudo systemctl start browser-portal
```

---

## ⚠️ Troubleshooting

### **Problem: "cloudflared not recognized"**

**Solution:**
- Close and reopen PowerShell after installation
- Or add to PATH manually
- Or run from download location: `.\cloudflared-windows-amd64.exe tunnel --url http://localhost:3000`

### **Problem: "Cannot determine default origin certificate"**

**Solution:**
You're trying to run `cloudflared tunnel run` without authenticating first.

**Fix:** Use quick tunnel instead:
```powershell
cloudflared tunnel --url http://localhost:3000
```

No authentication needed!

### **Problem: "EADDRINUSE: Port 3000 already in use"**

**Solution:**
```powershell
# Windows - Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### **Problem: "npm: command not found"**

**Solution:**
Install Node.js from https://nodejs.org

### **Problem: Sites still detect proxy**

**Reality Check:**
- Some sites (Netflix, Hulu, Disney+) block ALL iframes regardless of IP
- Self-hosting helps but doesn't guarantee success
- Try less restrictive sites first (Reddit, Wikipedia, GitHub work well)

---

## 📊 Comparison: Quick vs Permanent Tunnel

| Feature | Quick Tunnel | Permanent Tunnel |
|---------|--------------|------------------|
| Setup Time | 30 seconds | 5 minutes |
| Authentication | None needed | Required |
| URL | Changes each time | Same every time |
| Custom Domain | ❌ No | ✅ Yes |
| Best For | Testing | Production |

---

## 🎯 Common Use Cases

### **Just Testing:**
```powershell
# Window 1
npm start

# Window 2
cloudflared tunnel --url http://localhost:3000
```

### **Daily Use:**
Double-click your `start-portal.bat` file

### **24/7 Server:**
Set up auto-start on boot (see above)

---

## 🛡️ Security Best Practices

✅ **Advantages:**
- Residential IP (harder to detect)
- No port forwarding needed
- Traffic encrypted through Cloudflare
- Your home IP stays hidden

⚠️ **Important:**
- Rate limiting already configured in code
- Monitor bandwidth usage
- Keep your PC running for 24/7 access
- Consider UPS for power outages

---

## 🆚 Self-Hosting vs Cloud Hosting

| Factor | Self-Hosting | Render/Railway |
|--------|--------------|----------------|
| IP Type | Residential | Datacenter |
| Detection Risk | Low | High |
| Cost | Free (electricity) | Free tier limits |
| Uptime | Depends on PC | 99.9% |
| Setup | Medium | Easy |
| Best For | Bypassing detection | Quick deployment |

---

## 📝 Quick Reference

**Start Everything:**
```powershell
# Terminal 1
cd C:\path\to\browser-portal
npm start

# Terminal 2
cloudflared tunnel --url http://localhost:3000
```

**Stop Everything:**
- Press `Ctrl+C` in both windows

**Update Code:**
```powershell
git pull
npm install
```

---

## 🆘 Still Having Issues?

1. **Check Node.js is installed:**
   ```powershell
   node --version
   npm --version
   ```

2. **Check cloudflared is installed:**
   ```powershell
   cloudflared --version
   ```

3. **Test local server first:**
   ```powershell
   npm start
   # Then open http://localhost:3000 in browser
   ```

4. **Check firewall isn't blocking:**
   - Windows Defender Firewall
   - Antivirus software

---

## 🎉 Success!

If you see a URL like `https://xxx.trycloudflare.com` and can access your portal, you're done!

**Your app is now:**
- ✅ Publicly accessible
- ✅ Using your residential IP
- ✅ Much harder to detect as proxy
- ✅ Free forever

Enjoy your self-hosted browser portal! 🚀
