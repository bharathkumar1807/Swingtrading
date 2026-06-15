# Build stage — debian:bookworm-slim from Docker Hub + .NET SDK via Microsoft apt feed
FROM --platform=linux/amd64 debian:bookworm-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget ca-certificates \
    && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY ["backend/TradingJournal.Api/TradingJournal.Api.csproj", "TradingJournal.Api/"]
COPY ["backend/TradingJournal.Application/TradingJournal.Application.csproj", "TradingJournal.Application/"]
COPY ["backend/TradingJournal.Domain/TradingJournal.Domain.csproj", "TradingJournal.Domain/"]
COPY ["backend/TradingJournal.Infrastructure/TradingJournal.Infrastructure.csproj", "TradingJournal.Infrastructure/"]
RUN dotnet restore "TradingJournal.Api/TradingJournal.Api.csproj"
COPY backend/ .
RUN dotnet publish "TradingJournal.Api/TradingJournal.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage — install only ASP.NET Core runtime (smaller image)
FROM --platform=linux/amd64 debian:bookworm-slim AS final

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget ca-certificates \
    && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends aspnetcore-runtime-8.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "TradingJournal.Api.dll"]
