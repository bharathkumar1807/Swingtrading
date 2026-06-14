using Microsoft.EntityFrameworkCore;
using TradingJournal.Domain.Entities;

namespace TradingJournal.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<Trade> Trades { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
