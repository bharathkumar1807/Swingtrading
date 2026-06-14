FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY TradingJournal.sln ./
COPY backend/TradingJournal.Domain/TradingJournal.Domain.csproj backend/TradingJournal.Domain/
COPY backend/TradingJournal.Application/TradingJournal.Application.csproj backend/TradingJournal.Application/
COPY backend/TradingJournal.Infrastructure/TradingJournal.Infrastructure.csproj backend/TradingJournal.Infrastructure/
COPY backend/TradingJournal.Api/TradingJournal.Api.csproj backend/TradingJournal.Api/
RUN dotnet restore backend/TradingJournal.Api/TradingJournal.Api.csproj

COPY backend/TradingJournal.Domain/ backend/TradingJournal.Domain/
COPY backend/TradingJournal.Application/ backend/TradingJournal.Application/
COPY backend/TradingJournal.Infrastructure/ backend/TradingJournal.Infrastructure/
COPY backend/TradingJournal.Api/ backend/TradingJournal.Api/
RUN dotnet publish backend/TradingJournal.Api/TradingJournal.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "TradingJournal.Api.dll"]
