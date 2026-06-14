# 🚀 DEPLOYMENT CHECKLIST - Supabase + Render + Vercel

**Estimated Time: 20-30 minutes**

Copy-paste this checklist and check off as you go!

---

## 📋 PART 1: SUPABASE (Database) - 5 min

### Step 1.1: Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Click **"New project"**
- [ ] **Project name:** `trading-journal`
- [ ] **Password:** Generate strong password (save it!)
- [ ] **Region:** Choose closest to you
- [ ] Click **"Create new project"** → Wait 2-3 min

### Step 1.2: Get Connection String
- [ ] Go to **Settings** → **Database**
- [ ] Find **Connection string** section
- [ ] Click **URI** tab
- [ ] Copy the connection string (format: `postgresql://...`)
- [ ] ⏸️ **SAVE THIS** - You need it for Render!

**Your Supabase Connection String:**
```
postgresql://postgres.[PROJECT_ID].supabase.co:5432/postgres?password=[YOUR_PASSWORD]
```

✅ **Supabase Done!**

---

## 🔧 PART 2: RENDER (Backend API) - 8 min

### Step 2.1: Create Render Account
- [ ] Go to [render.com](https://render.com)
- [ ] Sign up (can use GitHub)
- [ ] Link GitHub account

### Step 2.2: Connect Your Repository to Render
- [ ] In Render dashboard: **New +** → **Web Service**
- [ ] **Connect your GitHub repo**
  - [ ] Select repository: `React-Swingtrading` (or your repo name)
  - [ ] **Root Directory:** Leave blank
  - [ ] Click **Connect**

### Step 2.3: Configure Render Service
- [ ] **Name:** `trading-journal-api`
- [ ] **Environment:** Docker
- [ ] **Dockerfile:** `./backend/Dockerfile`
- [ ] **Docker Context:** `.`
- [ ] **Plan:** Free

### Step 2.4: Add Environment Variables
Click **Add Secret File** and add these:

| Key | Value |
|-----|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Database__Provider` | `PostgreSql` |
| `Database__EnsureCreatedOnStartup` | `true` |
| `ConnectionStrings__PostgreSqlConnection` | `[PASTE SUPABASE CONNECTION STRING FROM STEP 1.2]` |
| `Jwt__Issuer` | `TradingJournal` |
| `Jwt__Audience` | `TradingJournal` |
| `Jwt__SigningKey` | `guDQC6GULbkUt6NsKrZ+0JX/fKzY+NEnysSNTDl3Avc=` |
| `Cors__Origins__0` | `https://trading-journal-xxxxx.vercel.app` **(UPDATE AFTER VERCEL)** |

### Step 2.5: Deploy
- [ ] Click **Create Web Service**
- [ ] Wait for deployment (~5-10 min)
- [ ] ⏸️ **SAVE THIS** - Your API URL when complete:
  ```
  https://trading-journal-api-xxxxx.onrender.com/api
  ```

✅ **Render Done!**

---

## 🌐 PART 3: VERCEL (Frontend) - 7 min

### Step 3.1: Create Vercel Account
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Select your GitHub account

### Step 3.2: Import Repository
- [ ] Click **Add New +** → **Project**
- [ ] Select your GitHub repo
- [ ] Click **Import**

### Step 3.3: Configure Project
- [ ] **Framework Preset:** React
- [ ] **Root Directory:** `frontend`
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `dist`

### Step 3.4: Add Environment Variable
- [ ] **VITE_API_URL:** `https://trading-journal-api-xxxxx.onrender.com/api`
  - Replace `xxxxx` with your Render API URL from Step 2.5

### Step 3.5: Deploy
- [ ] Click **Deploy**
- [ ] Wait for deployment (~3-5 min)
- [ ] ⏸️ **SAVE THIS** - Your Frontend URL when complete:
  ```
  https://trading-journal-xxxxx.vercel.app
  ```

✅ **Vercel Done!**

---

## 🔄 PART 4: UPDATE RENDER CORS - 2 min

### Step 4.1: Fix CORS for Frontend
- [ ] Go back to Render dashboard
- [ ] Select your `trading-journal-api` service
- [ ] Click **Environment** → **Edit Environment Variables**
- [ ] Update `Cors__Origins__0` to your Vercel URL:
  ```
  https://trading-journal-xxxxx.vercel.app
  ```
- [ ] Save → Auto-redeploy (~2 min)

✅ **CORS Updated!**

---

## ✅ FINAL STEP: TEST YOUR APP

### Access Your Trading Journal:
```
Frontend: https://trading-journal-xxxxx.vercel.app
Backend API: https://trading-journal-api-xxxxx.onrender.com/api
```

### Test Login:
- **Email:** `trader@example.com`
- **Password:** `Password123`

### Share With Others:
```
https://trading-journal-xxxxx.vercel.app
```

---

## 📊 URLs Reference

| Service | Your URL | Status |
|---------|----------|--------|
| **Frontend (Vercel)** | https://trading-journal-xxxxx.vercel.app | ⏳ After Step 3.5 |
| **Backend (Render)** | https://trading-journal-api-xxxxx.onrender.com/api | ⏳ After Step 2.5 |
| **Database (Supabase)** | PostgreSQL on cloud | ✅ After Step 1.2 |

---

## ⚠️ IMPORTANT NOTES

- **Free Tier Limits:**
  - Render services sleep after 15 min inactivity (first request = 30s delay)
  - Supabase free projects pause after 1 week inactivity
  - Vercel free tier includes unlimited deployments

- **Persistent URLs:**
  - Vercel URLs are permanent
  - Render URLs are permanent
  - To upgrade to paid & avoid slowness: $7/month on Render

- **Screenshots:**
  - Currently stored locally on Render (lost on restart)
  - To keep: Upgrade to paid Render or use Supabase Storage

---

## ❓ NEED HELP?

- Deployment stuck? → Check each service's logs
- Can't login? → Check API is running on Render
- Can't reach backend? → Verify CORS is updated in Step 4

**LET ME KNOW YOUR URLs WHEN DONE AND I'LL VERIFY EVERYTHING! 🎉**
