# Quick Deployment Guide - EdgeLedger Trading Journal

## Step 1: Initialize Git (Required for Vercel)

```bash
cd d:/React/Swingtrading
git init
git add .
git commit -m "Initial commit"
```

Then push to GitHub, GitLab, or Bitbucket.

---

## Step 2: Set Up Database (Supabase - 2 min)

1. Go to [supabase.com](https://supabase.com) → Create Account → New Project
2. In **SQL Editor**, run:
```sql
-- Your backend will auto-create tables with EnsureCreatedOnStartup=true
```
3. Go to **Project Settings** → **Database** → Copy **Connection String** (URI)
   - Format: `postgresql://[user]:[password]@[host]:[port]/[database]`
4. Keep this handy for Render setup

---

## Step 3: Deploy Backend (Render - 5 min)

1. Go to [render.com](https://render.com) → Sign up
2. Click **New +** → **Web Service**
3. **Connect Repository**: 
   - Connect your GitHub/GitLab account
   - Select this repository
4. **Configure**:
   - **Name**: `trading-journal-api`
   - **Root Directory**: leave blank (it's root)
   - **Environment**: `Docker`
   - **Docker**: 
     - Build Command: (auto-detected)
     - Dockerfile path: `./backend/Dockerfile`
     - Context: `.`
   - **Plan**: `Free`
5. **Environment Variables** (add these):
   ```
   ASPNETCORE_ENVIRONMENT=Production
   Database__Provider=PostgreSql
   Database__EnsureCreatedOnStartup=true
   ConnectionStrings__PostgreSqlConnection=[PASTE SUPABASE CONNECTION STRING]
   Jwt__Issuer=TradingJournal
   Jwt__Audience=TradingJournal
   Jwt__SigningKey=[GENERATE A RANDOM 32+ CHAR STRING]
   Cors__Origins__0=[WILL UPDATE AFTER VERCEL DEPLOYMENT]
   ```
6. Click **Create Web Service**
7. Wait for deployment (~5-10 min)
8. Copy your API URL: `https://trading-journal-api-xxxxx.onrender.com/api`

---

## Step 4: Deploy Frontend (Vercel - 3 min)

1. Go to [vercel.com](https://vercel.com) → Sign up
2. Click **Add New +** → **Project**
3. **Import Git Repository**: Select your repo
4. **Configure**:
   - **Project Name**: `trading-journal`
   - **Framework**: React
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   ```
   VITE_API_URL=https://trading-journal-api-xxxxx.onrender.com/api
   ```
   (Replace with your Render API URL from Step 3)
6. Click **Deploy**
7. Wait for deployment (~2-3 min)
8. Get your Frontend URL: `https://trading-journal-xxxxx.vercel.app`

---

## Step 5: Enable CORS (Back to Render)

1. Return to Render → Your API service
2. Edit Environment Variables:
   - Update `Cors__Origins__0` → `https://trading-journal-xxxxx.vercel.app`
3. Save & Auto-deploy will trigger

---

## ✅ You're Live!

**Access your app:**
- Frontend: `https://trading-journal-xxxxx.vercel.app`
- Backend API: `https://trading-journal-api-xxxxx.onrender.com/api`

**Test Login:**
- Email: `trader@example.com`
- Password: `Password123`

---

## Optional: Custom Domain

Add a custom domain in **Vercel Settings** → **Domains** (e.g., `mytrader.app`)

---

## ⚠️ Notes

- Free Render services sleep after 15 min inactivity (first request takes ~30s)
- Free Supabase projects pause after 1 week inactivity
- Screenshot uploads are local (not persistent on free Render) - upgrade to production for persistence
