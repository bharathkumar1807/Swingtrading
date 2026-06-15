# Build and run TradingJournal Backend
FROM public.ecr.aws/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/TradingJournal.Api/TradingJournal.Api.csproj", "TradingJournal.Api/"]
COPY ["backend/TradingJournal.Application/TradingJournal.Application.csproj", "TradingJournal.Application/"]
COPY ["backend/TradingJournal.Domain/TradingJournal.Domain.csproj", "TradingJournal.Domain/"]
COPY ["backend/TradingJournal.Infrastructure/TradingJournal.Infrastructure.csproj", "TradingJournal.Infrastructure/"]
RUN dotnet restore "TradingJournal.Api/TradingJournal.Api.csproj"
COPY backend/ .
RUN dotnet build "TradingJournal.Api/TradingJournal.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TradingJournal.Api/TradingJournal.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM public.ecr.aws/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "TradingJournal.Api.dll"]
