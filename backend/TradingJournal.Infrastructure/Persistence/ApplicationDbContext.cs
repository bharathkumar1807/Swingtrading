using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Domain.Entities;
using TradingJournal.Infrastructure.Identity;

namespace TradingJournal.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options), IApplicationDbContext
{
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

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
    }
}
