# Quick Start: Deploy to Render (5 Minutes)

## Step-by-Step Guide

### 1. Create GitHub Repository
1. Go to https://github.com/new
2. Name it `browser-portal` (or any name)
3. Make it **Public** (required for free Render)
4. Click "Create repository"

### 2. Push Your Code
Open PowerShell in your project folder and run:

```powershell
cd C:\Users\grady\Downloads\BrowserSchoolComp
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

*(Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub username and repository name)*

### 3. Deploy on Render
1. Go to https://render.com
2. Sign up with GitHub (free)
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository (click "Connect")
5. Select your repository
6. Configure:
   - **Name:** `browser-portal` (or any name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
7. Click **"Create Web Service"**
8. Wait 2-3 minutes for deployment

### 4. Get Your URL
Once deployed, you'll see:
- **Your app URL:** `https://browser-portal.onrender.com` (or similar)

Test it now! It should work immediately.

### 5. Connect Your Domain (Optional)
1. In Render dashboard → Your service → **Settings**
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `portal.yourdomain.com`)
5. Render will show you DNS instructions

**GoDaddy DNS Setup:**
1. Log into GoDaddy
2. Go to DNS Management
3. Add **CNAME** record:
   - **Type:** CNAME
   - **Name:** `portal` (or `@` for root domain)
   - **Value:** `browser-portal.onrender.com` (your Render URL)
   - **TTL:** 3600

Wait 5-15 minutes for DNS to propagate, then access via your domain!

---

## Done! 🎉

Your portal is now:
- ✅ Online 24/7 (with free tier, sleeps after 15min but wakes automatically)
- ✅ Free HTTPS included
- ✅ Accessible from anywhere: `https://yourdomain.com`
- ✅ No router configuration needed
- ✅ No home PC needed

## Updating Your App

To update after making changes:
```powershell
git add .
git commit -m "Update sites"
git push
```

Render automatically redeploys when you push to GitHub!

---

## Troubleshooting

**Render URL shows "Your service is being deployed"?**
- Wait 2-3 minutes, it's still building

**Domain not working?**
- Wait 5-15 minutes for DNS propagation
- Check CNAME record is correct (not A record)

**First load is slow?**
- Free tier services sleep after 15min inactivity
- First request takes ~30 seconds to wake up
- Subsequent requests are fast

---

Need help? Check [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md) for more details.

