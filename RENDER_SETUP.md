# 🚀 Render Deployment - Step by Step

## ✅ Step 1: Git Repository Ready
Your local Git repository is initialized and committed!

## 📝 Step 2: Create GitHub Repository

**Do this in your web browser:**

1. Go to: **https://github.com/new**
2. **Repository name:** `browser-portal` (or any name you want)
3. **Description:** "Browser proxy portal for accessing sites"
4. **Visibility:** Choose **Public** (required for free Render)
5. **DO NOT** check "Initialize with README" (we already have files)
6. Click **"Create repository"**

After creating, GitHub will show you a page with setup instructions. **Don't follow those yet** - I'll give you the exact commands below.

## 🔗 Step 3: Connect and Push to GitHub

**After you create the GitHub repository, tell me:**
- Your GitHub username
- The repository name you chose

**Or run these commands yourself** (replace YOUR_USERNAME and YOUR_REPO_NAME):

```powershell
cd C:\Users\grady\Downloads\BrowserSchoolComp
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

When prompted, enter your GitHub username and password (or use a Personal Access Token).

## 🌐 Step 4: Deploy on Render

**Once your code is on GitHub:**

1. Go to: **https://render.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"** (this connects your GitHub account)
4. Authorize Render to access your GitHub repositories
5. In Render dashboard, click **"New +"** → **"Web Service"**
6. Click **"Connect"** next to your GitHub repository
7. Select your `browser-portal` repository
8. Configure the service:
   - **Name:** `browser-portal` (or any name)
   - **Environment:** `Node`
   - **Region:** Choose closest to you (e.g., `Oregon (US West)`)
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
9. Click **"Create Web Service"**
10. Wait 2-3 minutes for deployment ⏳

## ✅ Step 5: Test Your Deployment

Once deployment completes, you'll see:
- **Your Render URL:** `https://browser-portal-XXXX.onrender.com`

Click the URL to test! Your portal should be live.

## 🔗 Step 6: Connect Your Domain (Optional but Recommended)

1. In Render dashboard → Click your service → **Settings**
2. Scroll down to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `portal.yourdomain.com`)
5. Render will show you DNS instructions

**GoDaddy DNS Setup:**
1. Log into GoDaddy
2. Go to **DNS Management** for your domain
3. Add a **CNAME** record:
   - **Type:** CNAME
   - **Name:** `portal` (or `@` for root domain, but CNAME might not work for root)
   - **Value:** `browser-portal-XXXX.onrender.com` (your Render URL)
   - **TTL:** 3600
4. Save

Wait 5-15 minutes for DNS to propagate, then access via your domain!

---

## 📋 Quick Checklist

- [x] Git installed
- [x] Local repository initialized
- [x] Code committed
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Deployed on Render
- [ ] Domain connected (optional)

---

## 🆘 Need Help?

- **Can't push to GitHub?** Make sure you're authenticated (GitHub may prompt for credentials)
- **Render deployment fails?** Check the build logs in Render dashboard
- **Domain not working?** Wait 5-15 minutes for DNS propagation

---

**Ready? Create your GitHub repository and let me know when it's done, or tell me your GitHub username and repo name!**

