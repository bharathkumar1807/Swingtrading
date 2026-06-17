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
    Task ChangePasswordAsync(string userId, string newPassword, CancellationToken ct);
}

public sealed record AdminTradeDto(
    Guid Id,
    string Symbol,
    string Strategy,
    string Broker,
    decimal Pnl,
    decimal RMultiple,
    string Outcome,
    DateTime EntryDate,
    DateTime? ExitDate,
    decimal EntryPrice,
    decimal? ExitPrice,
    decimal Size);
