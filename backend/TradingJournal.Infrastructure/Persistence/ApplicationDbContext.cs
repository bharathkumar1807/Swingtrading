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
    public DbSet<DailyStockPlan> DailyStockPlans => Set<DailyStockPlan>();
    public DbSet<DailyPlanLeg> DailyPlanLegs => Set<DailyPlanLeg>();
    public DbSet<PositionLot> PositionLots => Set<PositionLot>();

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

        builder.Entity<PositionLot>(entity =>
        {
            entity.Property(x => x.UserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.Symbol).HasMaxLength(24).IsRequired();
            entity.Property(x => x.CompanyName).HasMaxLength(200);
            entity.Property(x => x.Price).HasPrecision(18, 4);
            entity.Property(x => x.Qty).HasPrecision(18, 4);
            entity.HasIndex(x => new { x.UserId, x.Symbol });
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

        builder.Entity<DailyStockPlan>(entity =>
        {
            entity.Property(x => x.Symbol).HasMaxLength(24).IsRequired();
            entity.Property(x => x.StopLossPrice).HasPrecision(18, 4);
            entity.Property(x => x.AvgEntryPrice).HasPrecision(18, 4);
            entity.Property(x => x.OpenQty).HasPrecision(18, 4);
            entity.Property(x => x.RealizedPnl).HasPrecision(18, 4);
            entity.Property(x => x.Pnl).HasPrecision(18, 4);
            entity.Property(x => x.MaxLossAllowed).HasPrecision(18, 4);
            entity.Property(x => x.BehaviorNotes).HasMaxLength(1000);
            entity.HasMany(x => x.Legs).WithOne(x => x.Plan).HasForeignKey(x => x.DailyStockPlanId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.UserId, x.Date });
        });

        builder.Entity<DailyPlanLeg>(entity =>
        {
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.Price).HasPrecision(18, 4);
            entity.Property(x => x.Notes).HasMaxLength(500);
            entity.HasIndex(x => x.DailyStockPlanId);
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

                    CREATE TABLE IF NOT EXISTS "DailyStockPlans" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "UserId" text NOT NULL DEFAULT '',
                        "Date" date NOT NULL,
                        "Symbol" character varying(24) NOT NULL DEFAULT '',
                        "EntryTime" time without time zone,
                        "ExitTime" time without time zone,
                        "EntryPrice" numeric(18,4),
                        "ExitPrice" numeric(18,4),
                        "Size" numeric(18,4),
                        "Pnl" numeric(18,4) NOT NULL DEFAULT 0,
                        "MaxLossAllowed" numeric(18,4) NOT NULL DEFAULT 0,
                        "MarketDirection" integer NOT NULL DEFAULT 0,
                        "SectorBehavior" integer NOT NULL DEFAULT 0,
                        "Outcome" integer NOT NULL DEFAULT 0,
                        "ResultVsPlan" integer NOT NULL DEFAULT 0,
                        "BehaviorNotes" character varying(1000),
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_DailyStockPlans" PRIMARY KEY ("Id")
                    );
                    CREATE INDEX IF NOT EXISTS "IX_DailyStockPlans_UserId_Date" ON "DailyStockPlans" ("UserId", "Date");

                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "StopLossPrice" numeric(18,4) NOT NULL DEFAULT 0;
                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "AvgEntryPrice" numeric(18,4) NOT NULL DEFAULT 0;
                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "OpenQty" numeric(18,4) NOT NULL DEFAULT 0;
                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "RealizedPnl" numeric(18,4) NOT NULL DEFAULT 0;
                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "IsClosed" boolean NOT NULL DEFAULT false;
                    ALTER TABLE "DailyStockPlans" ADD COLUMN IF NOT EXISTS "EntryTime" time without time zone;

                    CREATE TABLE IF NOT EXISTS "DailyPlanLegs" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "DailyStockPlanId" uuid NOT NULL,
                        "Time" time without time zone NOT NULL DEFAULT '00:00:00',
                        "Action" integer NOT NULL DEFAULT 0,
                        "LegType" integer NOT NULL DEFAULT 0,
                        "Quantity" numeric(18,4) NOT NULL DEFAULT 0,
                        "Price" numeric(18,4) NOT NULL DEFAULT 0,
                        "Notes" character varying(500),
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_DailyPlanLegs" PRIMARY KEY ("Id"),
                        CONSTRAINT "FK_DailyPlanLegs_DailyStockPlans" FOREIGN KEY ("DailyStockPlanId") REFERENCES "DailyStockPlans" ("Id") ON DELETE CASCADE
                    );
                    CREATE INDEX IF NOT EXISTS "IX_DailyPlanLegs_DailyStockPlanId" ON "DailyPlanLegs" ("DailyStockPlanId");

                    ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT true;
                    ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "IsApproved" boolean NOT NULL DEFAULT true;
                    ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "LastActiveAt" timestamp with time zone;
                    ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "JoinedAt" timestamp with time zone NOT NULL DEFAULT now();

                    ALTER TABLE "IntradayTrades" ADD COLUMN IF NOT EXISTS "TradeType" integer NOT NULL DEFAULT 0;
                    ALTER TABLE "IntradayTrades" ADD COLUMN IF NOT EXISTS "EntryDate" date NULL;

                    CREATE TABLE IF NOT EXISTS "PositionLots" (
                        "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                        "UserId" character varying(450) NOT NULL DEFAULT '',
                        "Symbol" character varying(24) NOT NULL DEFAULT '',
                        "CompanyName" character varying(200) NOT NULL DEFAULT '',
                        "Price" numeric(18,4) NOT NULL DEFAULT 0,
                        "Qty" numeric(18,4) NOT NULL DEFAULT 0,
                        "AcquiredDate" date NOT NULL,
                        "SourceSessionId" uuid NOT NULL,
                        "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now(),
                        "UpdatedAtUtc" timestamp with time zone,
                        CONSTRAINT "PK_PositionLots" PRIMARY KEY ("Id")
                    );
                    CREATE INDEX IF NOT EXISTS "IX_PositionLots_UserId_Symbol" ON "PositionLots" ("UserId", "Symbol");
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

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DailyStockPlans')
                    BEGIN
                        CREATE TABLE DailyStockPlans (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            UserId nvarchar(450) NOT NULL DEFAULT '',
                            Date date NOT NULL,
                            Symbol nvarchar(24) NOT NULL DEFAULT '',
                            EntryTime time NULL,
                            ExitTime time NULL,
                            EntryPrice decimal(18,4) NULL,
                            ExitPrice decimal(18,4) NULL,
                            Size decimal(18,4) NULL,
                            Pnl decimal(18,4) NOT NULL DEFAULT 0,
                            MaxLossAllowed decimal(18,4) NOT NULL DEFAULT 0,
                            MarketDirection int NOT NULL DEFAULT 0,
                            SectorBehavior int NOT NULL DEFAULT 0,
                            Outcome int NOT NULL DEFAULT 0,
                            ResultVsPlan int NOT NULL DEFAULT 0,
                            BehaviorNotes nvarchar(1000) NULL,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_DailyStockPlans PRIMARY KEY (Id)
                        );
                        CREATE INDEX IX_DailyStockPlans_UserId_Date ON DailyStockPlans (UserId, Date);
                    END

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'StopLossPrice')
                        ALTER TABLE DailyStockPlans ADD StopLossPrice decimal(18,4) NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'AvgEntryPrice')
                        ALTER TABLE DailyStockPlans ADD AvgEntryPrice decimal(18,4) NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'OpenQty')
                        ALTER TABLE DailyStockPlans ADD OpenQty decimal(18,4) NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'RealizedPnl')
                        ALTER TABLE DailyStockPlans ADD RealizedPnl decimal(18,4) NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'IsClosed')
                        ALTER TABLE DailyStockPlans ADD IsClosed bit NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyStockPlans' AND COLUMN_NAME = 'EntryTime')
                        ALTER TABLE DailyStockPlans ADD EntryTime time NULL;

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DailyPlanLegs')
                    BEGIN
                        CREATE TABLE DailyPlanLegs (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            DailyStockPlanId uniqueidentifier NOT NULL,
                            Time time NOT NULL DEFAULT '00:00:00',
                            Action int NOT NULL DEFAULT 0,
                            LegType int NOT NULL DEFAULT 0,
                            Quantity decimal(18,4) NOT NULL DEFAULT 0,
                            Price decimal(18,4) NOT NULL DEFAULT 0,
                            Notes nvarchar(500) NULL,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_DailyPlanLegs PRIMARY KEY (Id),
                            CONSTRAINT FK_DailyPlanLegs_DailyStockPlans FOREIGN KEY (DailyStockPlanId) REFERENCES DailyStockPlans(Id) ON DELETE CASCADE
                        );
                        CREATE INDEX IX_DailyPlanLegs_DailyStockPlanId ON DailyPlanLegs (DailyStockPlanId);
                    END

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'IsActive')
                        ALTER TABLE AspNetUsers ADD IsActive bit NOT NULL DEFAULT 1;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'IsApproved')
                        ALTER TABLE AspNetUsers ADD IsApproved bit NOT NULL DEFAULT 1;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'LastActiveAt')
                        ALTER TABLE AspNetUsers ADD LastActiveAt datetime2 NULL;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AspNetUsers' AND COLUMN_NAME = 'JoinedAt')
                        ALTER TABLE AspNetUsers ADD JoinedAt datetime2 NOT NULL DEFAULT GETUTCDATE();

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IntradayTrades' AND COLUMN_NAME = 'TradeType')
                        ALTER TABLE IntradayTrades ADD TradeType int NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IntradayTrades' AND COLUMN_NAME = 'EntryDate')
                        ALTER TABLE IntradayTrades ADD EntryDate date NULL;

                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PositionLots')
                    BEGIN
                        CREATE TABLE PositionLots (
                            Id uniqueidentifier NOT NULL DEFAULT newid(),
                            UserId nvarchar(450) NOT NULL DEFAULT '',
                            Symbol nvarchar(24) NOT NULL DEFAULT '',
                            CompanyName nvarchar(200) NOT NULL DEFAULT '',
                            Price decimal(18,4) NOT NULL DEFAULT 0,
                            Qty decimal(18,4) NOT NULL DEFAULT 0,
                            AcquiredDate date NOT NULL,
                            SourceSessionId uniqueidentifier NOT NULL,
                            CreatedAtUtc datetime2 NOT NULL DEFAULT GETUTCDATE(),
                            UpdatedAtUtc datetime2 NULL,
                            CONSTRAINT PK_PositionLots PRIMARY KEY (Id)
                        );
                        CREATE INDEX IX_PositionLots_UserId_Symbol ON PositionLots (UserId, Symbol);
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
