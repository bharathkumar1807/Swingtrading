using Microsoft.EntityFrameworkCore;
using TradingJournal.Domain.Entities;

namespace TradingJournal.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<Trade> Trades { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<IntradaySession> IntradaySessions { get; }
    DbSet<IntradayTrade> IntradayTrades { get; }
    DbSet<Execution> Executions { get; }
    DbSet<DailyStockPlan> DailyStockPlans { get; }
    DbSet<DailyPlanLeg> DailyPlanLegs { get; }
    DbSet<PositionLot> PositionLots { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
