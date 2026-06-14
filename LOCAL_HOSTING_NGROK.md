# Local Hosting with ngrok - Quick Setup

## Step 1: Install ngrok (One-time)

### Windows
```bash
# Option A: Download from ngrok.com/download
# Option B: Using Chocolatey
choco install ngrok

# Or using npm
npm install -g ngrok
```

### macOS
```bash
brew install ngrok
```

### Linux
```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/ngrok.gpg && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

---

## Step 2: Create ngrok Account & Get Auth Token

1. Go to [ngrok.com](https://ngrok.com)
2. Sign up (free)
3. Go to **Dashboard** → **Your Authtoken**
4. Copy it
5. Run: `ngrok config add-authtoken <YOUR_TOKEN>`

---

## Step 3: Start Services Locally

### Terminal 1: Backend
```bash
cd d:/React/Swingtrading
dotnet run --project backend/TradingJournal.Api/TradingJournal.Api.csproj
# Backend runs on: http://localhost:5117
```

### Terminal 2: Frontend
```bash
cd d:/React/Swingtrading/frontend
npm run dev
# Frontend runs on: http://localhost:5173
```

### Terminal 3: Expose Backend (ngrok)
```bash
ngrok http 5117
# You'll see: Forwarding https://abc123.ngrok.io -> http://localhost:5117
# Copy the URL!
```

### Terminal 4: Expose Frontend (ngrok)
```bash
ngrok http 5173
# You'll see: Forwarding https://xyz789.ngrok.io -> http://localhost:5173
# This is your PUBLIC URL!
```

---

## Step 4: Configure CORS for Frontend

Update `frontend/src/services/api.ts` to use ngrok URL:

```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://abc123.ngrok.io/api",  // Use ngrok backend URL
});
```

Or set environment variable:
```bash
VITE_API_URL=https://abc123.ngrok.io/api npm run dev
```

---

## Step 5: Access Remotely

Share this URL with anyone:
```
https://xyz789.ngrok.io
```

They can login with:
- Email: `trader@example.com`
- Password: `Password123`

---

## 🔗 Public URLs Generated

| Service | ngrok URL | Local URL |
|---------|-----------|-----------|
| Frontend | `https://xyz789.ngrok.io` | `http://localhost:5173` |
| Backend API | `https://abc123.ngrok.io/api` | `http://localhost:5117/api` |

---

## ⚠️ Notes

- **URL Changes**: ngrok free tier generates new URLs on restart
- **For Persistent URL**: Get ngrok Pro ($5/month) for static domains
- **Speed**: Tunneling adds ~50-100ms latency (normal for ngrok)
- **Bandwidth**: Free ngrok has reasonable limits
- **Keep Running**: Dont close terminal windows or services stop

---

## Troubleshooting

**Frontend can't reach backend?**
```bash
# Check backend is running:
curl http://localhost:5117/health

# Check ngrok is exposing:
ngrok config show-agent

# Update VITE_API_URL and restart frontend
```

**ngrok says "too many connections"?**
- Free tier has connection limits
- Close old ngrok windows
- Or upgrade to Pro

---

## One-Liner Command (All in One)

```bash
# Terminal 1
dotnet run --project backend/TradingJournal.Api/TradingJournal.Api.csproj

# Terminal 2
cd frontend && npm run dev

# Terminal 3
ngrok http --domain=YOUR_SUBDOMAIN.ngrok-free.app 5173

# Terminal 4
ngrok http --domain=YOUR_SUBDOMAIN2.ngrok-free.app 5117
```
