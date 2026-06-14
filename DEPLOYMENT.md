# Free Beta Deployment

Recommended free-ish beta stack:

- Frontend: Vercel
- Backend API: Render Web Service using `backend/Dockerfile`
- Database: Supabase Postgres

## 1. Supabase

1. Create a Supabase project.
2. Copy the Postgres connection string.
3. Use the URI or standard connection string as `ConnectionStrings__PostgreSqlConnection` in Render.

## 2. Render API

Create a Render Blueprint from `render.yaml`, or create a Docker web service manually:

- Dockerfile path: `./backend/Dockerfile`
- Docker context: `.`
- Plan: Free

Environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
Database__Provider=PostgreSql
Database__EnsureCreatedOnStartup=true
ConnectionStrings__PostgreSqlConnection=<your Supabase connection string>
Jwt__Issuer=TradingJournal
Jwt__Audience=TradingJournal
Jwt__SigningKey=<long random secret>
Cors__Origins__0=<your Vercel frontend URL>
```

Render provides `PORT`; the API reads it automatically.

## 3. Vercel Frontend

Import the repo in Vercel and set:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable:

```text
VITE_API_URL=https://your-render-api.onrender.com/api
```

## Notes

- Free Render services may sleep after inactivity.
- Supabase free projects may pause after inactivity.
- Current screenshot uploads use local API storage. On free Render this is not permanent. Use Supabase Storage or S3/Azure Blob before relying on screenshots in production.
- `EnsureCreatedOnStartup=true` is acceptable for a beta. For serious production, replace it with EF migrations.
