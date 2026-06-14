using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TradingJournal.Application.Abstractions;
using TradingJournal.Domain.Entities;
using TradingJournal.Infrastructure.Identity;

namespace TradingJournal.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options), IApplicationDbContext
{
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<IntradaySession> IntradaySessions => Set<IntradaySession>();
    public DbSet<IntradayTrade> IntradayTrades => Set<IntradayTrade>();
    public DbSet<Execution> Executions => Set<Execution>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Trade>(entity =>
        {
            entity.Property(x => x.Symbol).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Sector).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Broker).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Strategy).HasMaxLength(120).IsRequired();
            entity.Property(x => x.EntryPrice).HasPrecision(18, 4);
            entity.Property(x => x.ExitPrice).HasPrecision(18, 4);
            entity.Property(x => x.StopLoss).HasPrecision(18, 4);
            entity.Property(x => x.Size).HasPrecision(18, 4);
            entity.Property(x => x.Fees).HasPrecision(18, 4);
            entity.Property(x => x.Slippage).HasPrecision(18, 4);
            entity.Property(x => x.Pnl).HasPrecision(18, 4);
            entity.Property(x => x.RMultiple).HasPrecision(18, 4);
            entity.Property(x => x.RiskAmount).HasPrecision(18, 4);
            entity.Property(x => x.RewardAmount).HasPrecision(18, 4);
            entity.Property(x => x.Tags);
            entity.Property(x => x.Mistakes);
            entity.HasIndex(x => new { x.UserId, x.EntryDate });
            entity.HasIndex(x => new { x.UserId, x.Symbol });
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.Property(x => x.TokenHash).HasMaxLength(256).IsRequired();
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => x.UserId);
        });

        builder.Entity<IntradaySession>(entity =>
        {
            entity.Property(x => x.Broker).HasMaxLength(80).IsRequired();
            entity.Property(x => x.TotalPnl).HasPrecision(18, 4);
            entity.HasMany(x => x.Executions).WithOne(x => x.Session).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.IntradayTrades).WithOne(x => x.Session).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.UserId, x.SessionDate });
        });

        builder.Entity<IntradayTrade>(entity =>
        {
            entity.Property(x => x.Symbol).HasMaxLength(24).IsRequired();
            entity.Property(x => x.CompanyName).HasMaxLength(200);
            entity.Property(x => x.TotalBuyQty).HasPrecision(18, 4);
            entity.Property(x => x.TotalSellQty).HasPrecision(18, 4);
            entity.Property(x => x.AvgBuyPrice).HasPrecision(18, 4);
            entity.Property(x => x.AvgSellPrice).HasPrecision(18, 4);
            entity.Property(x => x.MatchedQty).HasPrecision(18, 4);
            entity.Property(x => x.Pnl).HasPrecision(18, 4);
            entity.Property(x => x.OpenBuyQty).HasPrecision(18, 4);
            entity.Property(x => x.PriorPositionSellQty).HasPrecision(18, 4);
            entity.HasMany(x => x.Executions).WithOne(x => x.IntradayTrade).HasForeignKey(x => x.IntradayTradeId).OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<Execution>(entity =>
        {
            entity.Property(x => x.Symbol).HasMaxLength(24).IsRequired();
            entity.Property(x => x.CompanyName).HasMaxLength(200);
            entity.Property(x => x.Price).HasPrecision(18, 4);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.Principal).HasPrecision(18, 4);
            entity.Property(x => x.Fees).HasPrecision(18, 4);
            entity.Property(x => x.NetAmount).HasPrecision(18, 4);
            entity.HasIndex(x => new { x.SessionId, x.Symbol });
        });
    }

    public async Task EnsureIntradayTablesAsync(ILogger logger)
    {
        try
        {
            var isPostgres = Database.ProviderName?.Contains("Npgsql") == true;
            if (isPostgres)
            {
                await Database.ExecuteSqlRawAsync("""
                    CREATE TABLE IF NOT EXISTS "IntradaySessions" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "UserId" text NOT NULL DEFAULT '',
                        "SessionDate" date NOT NULL,
                        "Broker" character varying(80) NOT NULL DEFAULT 'Robinhood',
                        "TotalPnl" numeric(18,4) NOT NULL DEFAULT 0,
                        "WinCount" integer NOT NULL DEFAULT 0,
                        "LossCount" integer NOT NULL DEFAULT 0,
                        "BreakevenCount" integer NOT NULL DEFAULT 0,
                        "TotalExecutions" integer NOT NULL DEFAULT 0,
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_IntradaySessions" PRIMARY KEY ("Id")
                    );
                    CREATE INDEX IF NOT EXISTS "IX_IntradaySessions_UserId_SessionDate" ON "IntradaySessions" ("UserId", "SessionDate");

                    CREATE TABLE IF NOT EXISTS "IntradayTrades" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "SessionId" uuid NOT NULL,
                        "Symbol" character varying(24) NOT NULL DEFAULT '',
                        "CompanyName" character varying(200) NOT NULL DEFAULT '',
                        "TotalBuyQty" numeric(18,4) NOT NULL DEFAULT 0,
                        "TotalSellQty" numeric(18,4) NOT NULL DEFAULT 0,
                        "AvgBuyPrice" numeric(18,4) NOT NULL DEFAULT 0,
                        "AvgSellPrice" numeric(18,4) NOT NULL DEFAULT 0,
                        "MatchedQty" numeric(18,4) NOT NULL DEFAULT 0,
                        "Pnl" numeric(18,4) NOT NULL DEFAULT 0,
                        "OpenBuyQty" numeric(18,4) NOT NULL DEFAULT 0,
                        "PriorPositionSellQty" numeric(18,4) NOT NULL DEFAULT 0,
                        "IsFullyClosed" boolean NOT NULL DEFAULT false,
                        "Outcome" integer NOT NULL DEFAULT 0,
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_IntradayTrades" PRIMARY KEY ("Id"),
                        CONSTRAINT "FK_IntradayTrades_IntradaySessions" FOREIGN KEY ("SessionId") REFERENCES "IntradaySessions" ("Id") ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS "Executions" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "SessionId" uuid NOT NULL,
                        "IntradayTradeId" uuid,
                        "Symbol" character varying(24) NOT NULL DEFAULT '',
                        "CompanyName" character varying(200) NOT NULL DEFAULT '',
                        "Side" integer NOT NULL DEFAULT 0,
                        "Price" numeric(18,4) NOT NULL DEFAULT 0,
                        "Quantity" numeric(18,4) NOT NULL DEFAULT 0,
                        "Principal" numeric(18,4) NOT NULL DEFAULT 0,
                        "Fees" numeric(18,4) NOT NULL DEFAULT 0,
                        "NetAmount" numeric(18,4) NOT NULL DEFAULT 0,
                        "TradeDate" timestamp with time zone NOT NULL DEFAULT now(),
                        "SequenceOrder" integer NOT NULL DEFAULT 0,
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_Executions" PRIMARY KEY ("Id"),
                        CONSTRAINT "FK_Executions_IntradaySessions" FOREIGN KEY ("SessionId") REFERENCES "IntradaySessions" ("Id") ON DELETE CASCADE,
                        CONSTRAINT "FK_Executions_IntradayTrades" FOREIGN KEY ("IntradayTradeId") REFERENCES "IntradayTrades" ("Id")
                    );
                    CREATE INDEX IF NOT EXISTS "IX_Executions_SessionId_Symbol" ON "Executions" ("SessionId", "Symbol");
                    """);
            }
            else
            {
                await Database.ExecuteSqlRawAsync("""
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IntradaySessions')
                    BEGIN
                        CREATE TABLE IntradaySessions (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            UserId nvarchar(450) NOT NULL DEFAULT '',
                            SessionDate date NOT NULL,
                            Broker nvarchar(80) NOT NULL DEFAULT 'Robinhood',
                            TotalPnl decimal(18,4) NOT NULL DEFAULT 0,
                            WinCount int NOT NULL DEFAULT 0,
                            LossCount int NOT NULL DEFAULT 0,
                            BreakevenCount int NOT NULL DEFAULT 0,
                            TotalExecutions int NOT NULL DEFAULT 0,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_IntradaySessions PRIMARY KEY (Id)
                        );
                        CREATE INDEX IX_IntradaySessions_UserId_SessionDate ON IntradaySessions (UserId, SessionDate);
                    END

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IntradayTrades')
                    BEGIN
                        CREATE TABLE IntradayTrades (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            SessionId uniqueidentifier NOT NULL,
                            Symbol nvarchar(24) NOT NULL DEFAULT '',
                            CompanyName nvarchar(200) NOT NULL DEFAULT '',
                            TotalBuyQty decimal(18,4) NOT NULL DEFAULT 0,
                            TotalSellQty decimal(18,4) NOT NULL DEFAULT 0,
                            AvgBuyPrice decimal(18,4) NOT NULL DEFAULT 0,
                            AvgSellPrice decimal(18,4) NOT NULL DEFAULT 0,
                            MatchedQty decimal(18,4) NOT NULL DEFAULT 0,
                            Pnl decimal(18,4) NOT NULL DEFAULT 0,
                            OpenBuyQty decimal(18,4) NOT NULL DEFAULT 0,
                            PriorPositionSellQty decimal(18,4) NOT NULL DEFAULT 0,
                            IsFullyClosed bit NOT NULL DEFAULT 0,
                            Outcome int NOT NULL DEFAULT 0,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_IntradayTrades PRIMARY KEY (Id),
                            CONSTRAINT FK_IntradayTrades_IntradaySessions FOREIGN KEY (SessionId) REFERENCES IntradaySessions(Id) ON DELETE CASCADE
                        );
                    END

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Executions')
                    BEGIN
                        CREATE TABLE Executions (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            SessionId uniqueidentifier NOT NULL,
                            IntradayTradeId uniqueidentifier NULL,
                            Symbol nvarchar(24) NOT NULL DEFAULT '',
                            CompanyName nvarchar(200) NOT NULL DEFAULT '',
                            Side int NOT NULL DEFAULT 0,
                            Price decimal(18,4) NOT NULL DEFAULT 0,
                            Quantity decimal(18,4) NOT NULL DEFAULT 0,
                            Principal decimal(18,4) NOT NULL DEFAULT 0,
                            Fees decimal(18,4) NOT NULL DEFAULT 0,
                            NetAmount decimal(18,4) NOT NULL DEFAULT 0,
                            TradeDate datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            SequenceOrder int NOT NULL DEFAULT 0,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_Executions PRIMARY KEY (Id),
                            CONSTRAINT FK_Executions_IntradaySessions FOREIGN KEY (SessionId) REFERENCES IntradaySessions(Id) ON DELETE CASCADE,
                            CONSTRAINT FK_Executions_IntradayTrades FOREIGN KEY (IntradayTradeId) REFERENCES IntradayTrades(Id)
                        );
                        CREATE INDEX IX_Executions_SessionId_Symbol ON Executions (SessionId, Symbol);
                    END
                    """);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning("Could not create intraday tables (may already exist): {Message}", ex.Message);
        }
    }
}
