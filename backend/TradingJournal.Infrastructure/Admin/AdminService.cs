using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Admin;
using TradingJournal.Infrastructure.Identity;
using TradingJournal.Infrastructure.Persistence;

namespace TradingJournal.Infrastructure.Admin;

public sealed class AdminService(ApplicationDbContext db, UserManager<ApplicationUser> userManager) : IAdminService
{
    public async Task<List<AdminUserDto>> GetUsersAsync(CancellationToken ct)
    {
        var users = await userManager.Users.Where(u => u.IsApproved).ToListAsync(ct);
        return await MapUsersAsync(users, ct);
    }

    public async Task<List<AdminUserDto>> GetPendingUsersAsync(CancellationToken ct)
    {
        var users = await userManager.Users.Where(u => !u.IsApproved).ToListAsync(ct);
        return await MapUsersAsync(users, ct);
    }

    public async Task<PlatformStatsDto> GetPlatformStatsAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var weekAgo = today.AddDays(-7);

        var totalUsers = await userManager.Users.CountAsync(u => u.IsApproved, ct);
        var activeToday = await userManager.Users.CountAsync(u => u.IsApproved && u.LastActiveAt != null && u.LastActiveAt >= today, ct);
        var activeThisWeek = await userManager.Users.CountAsync(u => u.IsApproved && u.LastActiveAt != null && u.LastActiveAt >= weekAgo, ct);
        var totalTrades = await db.Trades.CountAsync(ct);
        var totalPnl = await db.Trades.SumAsync(t => (decimal?)t.Pnl, ct) ?? 0m;

        var topSymbols = await db.Trades
            .GroupBy(t => t.Symbol)
            .Select(g => new { Symbol = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .Select(x => x.Symbol)
            .ToListAsync(ct);

        return new PlatformStatsDto(totalUsers, activeToday, activeThisWeek, totalTrades, totalPnl, topSymbols);
    }

    public async Task<UserSummaryDto> GetUserSummaryAsync(string userId, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        var sessions = await db.IntradaySessions
            .Include(s => s.IntradayTrades)
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var allTrades = sessions.SelectMany(s => s.IntradayTrades).ToList();
        var totalTrades = allTrades.Count;
        var totalPnl = sessions.Sum(s => s.TotalPnl);
        var wins = sessions.Sum(s => s.WinCount);
        var winRate = totalTrades > 0 ? Math.Round((double)wins / totalTrades * 100, 1) : 0;
        var bestSession = sessions.Count > 0 ? sessions.Max(s => s.TotalPnl) : 0m;
        var worstSession = sessions.Count > 0 ? sessions.Min(s => s.TotalPnl) : 0m;

        var mostTradedSymbol = allTrades
            .GroupBy(t => t.Symbol)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefault();

        return new UserSummaryDto(
            user.Id, user.FullName, user.Email ?? string.Empty,
            totalTrades, totalPnl, winRate, bestSession, worstSession,
            sessions.Count, mostTradedSymbol);
    }

    public async Task<AdminUserDto> ToggleUserStatusAsync(string userId, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        user.IsActive = !user.IsActive;
        await userManager.UpdateAsync(user);

        return await BuildDtoAsync(user, ct);
    }

    public async Task<AdminUserDto> ApproveUserAsync(string userId, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        user.IsApproved = true;
        user.IsActive = true;
        await userManager.UpdateAsync(user);

        return await BuildDtoAsync(user, ct);
    }

    public async Task<List<AdminTradeDto>> GetUserTradesAsync(string userId, CancellationToken ct)
    {
        _ = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        var trades = await db.Trades
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.EntryDate)
            .ToListAsync(ct);

        return trades.Select(t => new AdminTradeDto(
            t.Id, t.Symbol, t.Sector, t.Strategy, t.Broker,
            t.PositionType.ToString(), t.Pnl, t.RMultiple,
            t.RiskAmount, t.RewardAmount, t.Outcome.ToString(),
            t.EntryDate, t.ExitDate, t.EntryPrice, t.ExitPrice,
            t.StopLoss, t.Size, t.Fees, t.Slippage,
            t.ConfidenceScore, t.Notes, t.Tags, t.Mistakes)).ToList();
    }

    public async Task<List<AdminIntradaySessionDto>> GetUserIntradaySessionsAsync(string userId, CancellationToken ct)
    {
        _ = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        var sessions = await db.IntradaySessions
            .Include(s => s.IntradayTrades)
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.SessionDate)
            .ToListAsync(ct);

        return sessions.Select(s => new AdminIntradaySessionDto(
            s.Id,
            s.SessionDate,
            s.Broker,
            s.TotalPnl,
            s.WinCount,
            s.LossCount,
            s.BreakevenCount,
            s.TotalExecutions,
            s.IntradayTrades.Select(t => new AdminIntradayTradeDto(
                t.Id,
                t.Symbol,
                t.CompanyName,
                t.MatchedQty,
                t.AvgBuyPrice,
                t.AvgSellPrice,
                t.Pnl,
                t.Outcome.ToString(),
                t.IsFullyClosed)).ToList()
        )).ToList();
    }

    public async Task ChangePasswordAsync(string userId, string newPassword, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<AdminUserDto> UpdateUserNameAsync(string userId, string fullName, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found.");

        user.FullName = fullName.Trim();
        await userManager.UpdateAsync(user);
        return await BuildDtoAsync(user, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async Task<List<AdminUserDto>> MapUsersAsync(List<ApplicationUser> users, CancellationToken ct)
    {
        var ids = users.Select(u => u.Id).ToList();

        var tradeCounts = await db.Trades
            .Where(t => ids.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var sessionCounts = await db.IntradaySessions
            .Where(s => ids.Contains(s.UserId))
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var tradeMap = tradeCounts.ToDictionary(x => x.UserId, x => x.Count);
        var sessionMap = sessionCounts.ToDictionary(x => x.UserId, x => x.Count);

        return users
            .Select(u => new AdminUserDto(
                u.Id, u.Email ?? string.Empty, u.FullName, u.JoinedAt, u.LastActiveAt,
                tradeMap.GetValueOrDefault(u.Id, 0),
                sessionMap.GetValueOrDefault(u.Id, 0),
                u.IsActive, u.IsApproved))
            .OrderBy(u => u.FullName)
            .ToList();
    }

    private async Task<AdminUserDto> BuildDtoAsync(ApplicationUser user, CancellationToken ct)
    {
        var tradeCount = await db.Trades.CountAsync(t => t.UserId == user.Id, ct);
        var sessionCount = await db.IntradaySessions.CountAsync(s => s.UserId == user.Id, ct);
        return new AdminUserDto(user.Id, user.Email ?? string.Empty, user.FullName,
            user.JoinedAt, user.LastActiveAt, tradeCount, sessionCount, user.IsActive, user.IsApproved);
    }
}
