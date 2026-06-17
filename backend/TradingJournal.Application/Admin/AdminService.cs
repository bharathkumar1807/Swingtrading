namespace TradingJournal.Application.Admin;

public interface IAdminService
{
    Task<List<AdminUserDto>> GetUsersAsync(CancellationToken ct);
    Task<PlatformStatsDto> GetPlatformStatsAsync(CancellationToken ct);
    Task<UserSummaryDto> GetUserSummaryAsync(string userId, CancellationToken ct);
    Task<AdminUserDto> ToggleUserStatusAsync(string userId, CancellationToken ct);
    Task<AdminUserDto> ApproveUserAsync(string userId, CancellationToken ct);
    Task<List<AdminUserDto>> GetPendingUsersAsync(CancellationToken ct);
    Task<List<AdminTradeDto>> GetUserTradesAsync(string userId, CancellationToken ct);
    Task<List<AdminIntradaySessionDto>> GetUserIntradaySessionsAsync(string userId, CancellationToken ct);
    Task ChangePasswordAsync(string userId, string newPassword, CancellationToken ct);
    Task<AdminUserDto> UpdateUserNameAsync(string userId, string fullName, CancellationToken ct);
}

public sealed record AdminIntradayTradeDto(
    Guid Id,
    string Symbol,
    string CompanyName,
    decimal MatchedQty,
    decimal AvgBuyPrice,
    decimal AvgSellPrice,
    decimal Pnl,
    string Outcome,
    bool IsFullyClosed);

public sealed record AdminIntradaySessionDto(
    Guid Id,
    DateOnly SessionDate,
    string Broker,
    decimal TotalPnl,
    int WinCount,
    int LossCount,
    int BreakevenCount,
    int TotalExecutions,
    List<AdminIntradayTradeDto> Trades);

public sealed record AdminTradeDto(
    Guid Id,
    string Symbol,
    string Sector,
    string Strategy,
    string Broker,
    string PositionType,
    decimal Pnl,
    decimal RMultiple,
    decimal RiskAmount,
    decimal RewardAmount,
    string Outcome,
    DateTime EntryDate,
    DateTime? ExitDate,
    decimal EntryPrice,
    decimal? ExitPrice,
    decimal StopLoss,
    decimal Size,
    decimal Fees,
    decimal Slippage,
    int ConfidenceScore,
    string? Notes,
    List<string> Tags,
    List<string> Mistakes);
