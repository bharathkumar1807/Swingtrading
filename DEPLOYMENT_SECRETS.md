# JWT Secret for Deployment

**Use this in Render environment variables:**

```
Jwt__SigningKey=guDQC6GULbkUt6NsKrZ+0JX/fKzY+NEnysSNTDl3Avc=
```

---

# QUICK REFERENCE - Copy/Paste URLs

## After Supabase (Step 1.2)
Save your connection string here:
```
postgresql://postgres.[PROJECT_ID].supabase.co:5432/postgres?password=[YOUR_PASSWORD]
```

## After Render Deployment (Step 2.5)
Save your backend URL here:
```
https://trading-journal-api-xxxxx.onrender.com/api
```

## After Vercel Deployment (Step 3.5)
Save your frontend URL here:
```
https://trading-journal-xxxxx.vercel.app
```

---

# Environment Variables Summary

### Render Backend (.env)
```
ASPNETCORE_ENVIRONMENT=Production
Database__Provider=PostgreSql
Database__EnsureCreatedOnStartup=true
ConnectionStrings__PostgreSqlConnection=[SUPABASE_CONNECTION_STRING]
Jwt__Issuer=TradingJournal
Jwt__Audience=TradingJournal
Jwt__SigningKey=guDQC6GULbkUt6NsKrZ+0JX/fKzY+NEnysSNTDl3Avc=
Cors__Origins__0=[YOUR_VERCEL_URL]
```

### Vercel Frontend (.env)
```
VITE_API_URL=[YOUR_RENDER_API_URL]
```

---

# Test Login Credentials

Email: `trader@example.com`
Password: `Password123`
