@echo off
echo ===================================
echo Starting EdgeLedger Trading Journal
echo ===================================
echo.

echo [1/2] Starting Backend (.NET API on port 5117)...
cd backend
start cmd /k "dotnet run --project TradingJournal.Api/TradingJournal.Api.csproj"
timeout /t 3 /nobreak

echo [2/2] Starting Frontend (React on port 5173)...
cd ..\frontend
start cmd /k "npm run dev"
timeout /t 3 /nobreak

echo.
echo ===================================
echo ✅ Services Started!
echo ===================================
echo Backend: http://localhost:5117
echo Frontend: http://localhost:5173
echo.
echo Next Step: Install ngrok and expose to internet
echo   1. Sign up: https://ngrok.com
echo   2. Install: https://ngrok.com/download
echo   3. Run in new terminal:
echo      ngrok http 5173 (frontend)
echo      ngrok http 5117 (backend)
echo.
pause
