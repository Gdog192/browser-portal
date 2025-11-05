# Cloud Deployment Guide

## 🌐 Deploy to Cloud (Recommended - No Home PC Needed!)

The easiest way to host this is on a free cloud platform. They provide:
- ✅ Free HTTPS (SSL certificates)
- ✅ Automatic deployment
- ✅ No router configuration needed
- ✅ Always online (no need to keep your PC running)

## Option 1: Deploy to Render (Easiest - Recommended)

### Step 1: Create GitHub Repository
1. Go to https://github.com and create a new repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to https://render.com and sign up (free with GitHub)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** browser-portal (or any name)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click "Create Web Service"
6. Wait for deployment (about 2-3 minutes)
7. Your app will be at: `https://your-app-name.onrender.com`

### Step 3: Connect Your Domain
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain (e.g., `portal.yourdomain.com`)
4. Follow Render's instructions to add DNS records in GoDaddy:
   - Add a **CNAME** record:
     - **Name:** portal (or @ for root)
     - **Value:** your-app-name.onrender.com
     - **TTL:** 3600

**Note:** Render free tier services spin down after 15 minutes of inactivity, but wake up automatically when accessed (takes ~30 seconds).

---

## Option 2: Deploy to Railway

### Step 1: Create GitHub Repository
(Same as Render - push your code to GitHub)

### Step 2: Deploy on Railway
1. Go to https://railway.app and sign up (free with GitHub)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect Node.js and deploy automatically
6. Click on your service → "Settings" → "Generate Domain"
7. Your app will be at: `https://your-app-name.up.railway.app`

### Step 3: Connect Your Domain
1. In Railway dashboard, go to your service → "Settings"
2. Click "Custom Domain"
3. Add your domain
4. Add DNS records in GoDaddy:
   - Add a **CNAME** record pointing to your Railway domain

---

## Option 3: Deploy to Fly.io

### Step 1: Install Fly CLI
```powershell
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login and Launch
```bash
fly auth login
fly launch
```

### Step 3: Deploy
```bash
fly deploy
```

Your app will be at: `https://your-app-name.fly.dev`

---

## Quick Comparison

| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Render** | ✅ Yes | Easy setup, custom domains | Sleeps after 15min inactivity |
| **Railway** | ✅ Yes ($5 credit/month) | Fast, no sleep | Uses credit, may require payment |
| **Fly.io** | ✅ Yes | Good performance | More complex setup |

---

## Recommended: Render Setup

**Why Render?**
- Simplest deployment process
- Free HTTPS automatically
- Custom domain support
- No credit card required for free tier

**Steps:**
1. Push code to GitHub
2. Connect GitHub to Render
3. Deploy (automatic)
4. Add custom domain in Render
5. Update GoDaddy DNS with CNAME record
6. Done! Access from school at your domain

---

## After Deployment

Once deployed, you can:
- ✅ Access from anywhere: `https://yourdomain.com`
- ✅ No need to keep your PC running
- ✅ Free HTTPS (secure connection)
- ✅ Automatic updates when you push to GitHub

## Updating Your App

After making changes:
1. Push to GitHub: `git push`
2. Render/Railway will automatically redeploy
3. Changes go live in ~2 minutes

---

## Troubleshooting

**Deployment fails?**
- Check build logs in Render/Railway dashboard
- Ensure `package.json` has correct `start` script
- Verify Node.js version compatibility

**Domain not working?**
- Wait 5-15 minutes for DNS propagation
- Check DNS records match platform requirements
- Verify CNAME record is correct (not A record)

**App sleeps (Render free tier)?**
- First request takes ~30 seconds to wake up
- Consider upgrading to paid plan for always-on
- Or use Railway/Fly.io which don't sleep

---

## Next Steps

1. Choose a platform (Render recommended)
2. Push code to GitHub
3. Deploy to cloud platform
4. Connect your domain
5. Access from school!

