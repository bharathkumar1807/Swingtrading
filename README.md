# EdgeLedger Trading Journal

Production-oriented trading journal application with a React fintech dashboard frontend and ASP.NET Core 8 clean architecture API.

## Structure

- `frontend` - React, TypeScript, Vite, TailwindCSS, Redux Toolkit, React Router, Axios, Recharts, Lucide icons, shadcn-style primitives.
- `backend/TradingJournal.Api` - ASP.NET Core Web API, Swagger, JWT, uploads, controllers.
- `backend/TradingJournal.Application` - DTOs, validators, trade services, analytics, exports.
- `backend/TradingJournal.Domain` - Entities, enums, journal calculation logic.
- `backend/TradingJournal.Infrastructure` - EF Core, PostgreSQL, Identity, JWT issuing, file storage, background worker.

## Local Setup

1. Backend uses SQL Server LocalDB by default: `(localdb)\MSSQLLocalDB`.
2. Backend:

```bash
dotnet restore
dotnet run --project backend/TradingJournal.Api
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

The default API URL is `http://localhost:5117/api`, matching the backend HTTP launch profile.

To use PostgreSQL instead, set `Database:Provider` to `PostgreSql` and update `PostgreSqlConnection`.

## Included Features

- Register, login, JWT access token, refresh token storage.
- Trade CRUD with calculated P&L, risk, reward, R-multiple, and outcome.
- Screenshot upload with local storage abstraction for later Azure Blob or S3 replacement.
- Dashboard, trades table, add trade drawer, review, mistake analytics, strategy analytics, settings.
- CSV/JSON export APIs and selected-row export from the UI.
- Swagger/OpenAPI, FluentValidation, Serilog, EF Core Identity, PostgreSQL schema-ready model.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel + Render + Supabase beta deployment setup.
