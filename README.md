# Browser Proxy Portal

A minimal web portal that allows you to browse popular sites through iframes, accessible via your GoDaddy domain. The proxy server bypasses X-Frame-Options restrictions and helps avoid detection by some sites. Use with caution and follow the security guidance provided.

**🚀 Recommended: Deploy to Cloud (Render/Railway)** - See [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md) for easy cloud setup (no home PC needed, free HTTPS included!)

## Features

- Simple, modern UI for selecting sites
- Proxy server that removes X-Frame-Options headers
- Rate limiting to prevent abuse
- Easy configuration via JSON file
- Minimal resource usage

## Environment variables

The server can be configured via environment variables (useful for cloud deployments):

- PORT - Port to listen on (platforms like Render/Heroku set this automatically).
- ALLOWED_HOSTS - Optional comma-separated list of hostnames that the proxy is allowed to target (e.g. "example.com,another.com"). If not set, the server derives allowed hosts from config.json sites and always allows localhost.
- ALLOW_ANY_TARGET - If set to "true", disables the host allowlist and permits proxying to any host. This is less secure and should only be used for local testing.

## Quick Start (Cloud Deployment - Recommended)

**See [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md) for detailed cloud deployment instructions.**

1. Push code to GitHub
2. Deploy to Render (free) - takes 5 minutes
3. Connect your domain
4. Done! Access from anywhere

## Prerequisites (Home PC Setup)

- Node.js (v18 or higher) installed on your home PC
- A domain name configured with GoDaddy
- Router with port forwarding capability
- Static IP address (or dynamic DNS service)

## Installation

1. **Clone or download this repository** to your home PC

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure your sites** by editing `config.json`:
   ```json
   {
     "sites": [
       {
         "name": "Netflix",
         "url": "https://www.netflix.com",
         "icon": "🎬"
       }
     ],
     "rateLimit": 100,
     "port": 3000
   }
   ```

## Running the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on the port specified by the PORT environment variable or default to 3000.

## Deployment Setup

### Step 1: Configure Your Router

1. Log into your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Navigate to **Port Forwarding** or **Virtual Server** settings
3. Create a new port forwarding rule:
   - **External Port:** 80 (HTTP) or 443 (HTTPS)
   - **Internal Port:** 3000 (or your configured port)
   - **Internal IP:** Your PC's local IP address (e.g., `192.168.1.100`)
   - **Protocol:** TCP

### Step 2: Set Up Domain with GoDaddy

1. Log into your GoDaddy account
2. Go to **DNS Management** for your domain
3. Add/Edit an **A Record**:
   - **Type:** A
   - **Name:** @ (or leave blank for root domain) or a subdomain like `portal`
   - **Value:** Your home's public IP address
   - **TTL:** 600 (10 minutes)

**To find your public IP:**
- Visit `https://whatismyipaddress.com` from your home network
- Note this IP address

**Important:** If your ISP provides a dynamic IP, you'll need:
- A Dynamic DNS service (e.g., DuckDNS, No-IP, Dynu)
- Update the A record whenever your IP changes, or use a DDNS service that provides a subdomain

### Step 3: Set Up HTTPS (Recommended)

For better security and to avoid mixed content warnings:

**Option A: Use a Reverse Proxy (Nginx)**
1. Install Nginx on your PC
2. Configure SSL certificate with Let's Encrypt (Certbot)
3. Set up reverse proxy to forward requests to `localhost:3000`

**Option B: Use Cloudflare**
1. Change your domain's nameservers to Cloudflare
2. Enable Cloudflare's proxy (orange cloud)
3. Configure SSL/TLS encryption mode to "Full"
4. Cloudflare will handle HTTPS automatically

**Option C: Use Node.js HTTPS (Simple)**
1. Obtain SSL certificate (Let's Encrypt via Certbot)
2. Modify `server.js` to use HTTPS (example in original README)

### Step 4: Configure Firewall

Allow incoming connections on your chosen port:

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Create Inbound Rule:
   - Port → TCP → Specific local ports: `3000` (or your port)
   - Allow the connection
   - Apply to all profiles

**Linux (UFW):**
```bash
sudo ufw allow 3000/tcp
```

## Accessing Your Portal

Once configured:
- **Locally:** `http://localhost:3000`
- **Via Domain:** `http://yourdomain.com` (or `https://yourdomain.com` if HTTPS is configured)

## Configuration

### Adding Sites

Edit `config.json` to add more sites:

```json
{
  "sites": [
    {
      "name": "Site Name",
      "url": "https://example.com",
      "icon": "🎯"
    }
  ]
}
```

### Adjusting Rate Limits

Modify the `rateLimit` value in `config.json` to change requests per minute allowed per IP address.

### Changing Port

Update the `port` value in `config.json` and ensure your router port forwarding matches.

## Security Considerations

- **Rate Limiting:** Prevents abuse by limiting requests per IP
- **URL Validation:** Only allows HTTP/HTTPS protocols
- **Input Sanitization:** Basic validation on proxy requests
- **HTTPS Recommended:** Use HTTPS to encrypt traffic between clients and your server

## Troubleshooting

### Sites Not Loading in Iframe

Some sites actively block iframe embedding even with X-Frame-Options removed. These sites may:
- Use JavaScript-based frame detection
- Require authentication that doesn't work in iframes
- Have complex CSP policies

**Solutions:**
- Some sites simply won't work in iframes
- Try accessing the site directly through the proxy URL
- Consider using a full-page proxy instead of iframe embedding

### Domain Not Resolving

1. Check DNS propagation: Use `nslookup yourdomain.com` or visit `https://dnschecker.org`
2. Verify A record is correct in GoDaddy DNS settings
3. Wait for DNS propagation (can take up to 48 hours, usually much faster)

### Can't Access from Outside Network

1. Verify port forwarding is configured correctly
2. Check firewall rules allow incoming connections
3. Test if `http://your-public-ip:port` works (replace with your actual IP and port)
4. Ensure your router's firewall isn't blocking connections

### Server Crashes

- Check Node.js version: `node --version` (should be v18+)
- Review server logs for error messages
- Ensure port isn't already in use by another application

## Limitations

- Some sites may not work properly in iframes due to JavaScript frame detection
- Performance may be slower than direct access due to proxying
- Some sites may block proxy requests
- Dynamic content and WebSockets may have limited support

## Legal Notice

This tool is for educational purposes. Ensure you comply with:
- Your school's acceptable use policy
- Terms of service of websites you access
- Local laws and regulations regarding network usage

## License

MIT License - Feel free to modify and use as needed.
