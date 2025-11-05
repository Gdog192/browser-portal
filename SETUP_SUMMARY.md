# Browser Portal Setup Summary

## ✅ Completed Setup Steps

1. ✅ Node.js v24.11.0 installed
2. ✅ npm dependencies installed
3. ✅ Server started (running in background)

## 📋 Your Network Information

**Local IP Address:** `10.0.0.13`  
**Public IP Address:** `73.237.137.84`  
**Server Port:** `3000`

## 🔥 Firewall Configuration Required

You need to allow port 3000 through Windows Firewall. Here's how:

### Option 1: PowerShell (Run as Administrator)
Open PowerShell as Administrator and run:
```powershell
netsh advfirewall firewall add rule name="Browser Portal Server" dir=in action=allow protocol=TCP localport=3000
```

### Option 2: Windows Firewall GUI
1. Press `Windows + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → Next
4. Select "TCP" → "Specific local ports" → Enter `3000` → Next
5. Select "Allow the connection" → Next
6. Check all profiles → Next
7. Name it "Browser Portal Server" → Finish

## 🌐 Router Port Forwarding Setup

You need to configure port forwarding on your router:

1. **Access your router:**
   - Usually at `192.168.1.1` or `10.0.0.1` (check your router manual)
   - Look for your router's IP by running: `ipconfig` and checking "Default Gateway"

2. **Create Port Forwarding Rule:**
   - **Name:** Browser Portal
   - **External Port:** `80` (for HTTP) or `3000` (to test)
   - **Internal Port:** `3000`
   - **Internal IP:** `10.0.0.13`
   - **Protocol:** TCP

## 🔗 GoDaddy DNS Configuration

1. Log into your GoDaddy account
2. Go to "My Products" → Click your domain → "DNS"
3. Add/Edit an **A Record:**
   - **Type:** A
   - **Name:** `@` (or leave blank for root domain) OR `portal` (for subdomain)
   - **Value:** `73.237.137.84`
   - **TTL:** `600`

**Note:** If your IP changes frequently, consider using Dynamic DNS (DuckDNS, No-IP, etc.)

## 🚀 Testing Your Setup

### Test Locally:
Open your browser and go to: `http://localhost:3000`

### Test from Outside Network:
1. From your phone (using mobile data), visit: `http://73.237.137.84:3000`
   - (If you forwarded port 80, use port 80 instead)
2. Or use your domain: `http://yourdomain.com` (after DNS propagates)

## 📝 Server Management

### Start Server:
```powershell
cd C:\Users\grady\Downloads\BrowserSchoolComp
npm start
```

### Stop Server:
Press `Ctrl + C` in the terminal

### Keep Server Running 24/7:
Consider using PM2 or Windows Task Scheduler to keep the server running automatically.

## ⚙️ Configuration

Edit `config.json` to add/remove sites:
```json
{
  "sites": [
    {
      "name": "Site Name",
      "url": "https://example.com",
      "icon": "🎯"
    }
  ],
  "rateLimit": 100,
  "port": 3000
}
```

## ❓ Troubleshooting

- **Server not starting?** Check if port 3000 is already in use
- **Can't access from outside?** Verify port forwarding and firewall rules
- **DNS not working?** Wait up to 48 hours for propagation (usually much faster)
- **Sites not loading?** Some sites block iframes - this is normal

## 📞 Next Steps

1. Configure firewall (see above)
2. Set up router port forwarding
3. Configure GoDaddy DNS
4. Test access from outside your network
5. Access from school!

