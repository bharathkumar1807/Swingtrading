namespace TradingJournal.Application.Admin;

public sealed record AdminUserDto(
    string Id,
    string Email,
    string FullName,
    DateTime JoinedAt,
    DateTime? LastActiveAt,
    int TotalTrades,
    int TotalSessions,
    bool IsActive,
    bool IsApproved);

public sealed record PlatformStatsDto(
    int TotalUsers,
    int ActiveToday,
    int ActiveThisWeek,
    int TotalTrades,
    decimal TotalPnl,
    List<string> TopSymbols);

public sealed record UserSummaryDto(
    string Id,
    string FullName,
    string Email,
    int TotalTrades,
    decimal TotalPnl,
    double WinRate,
    decimal BestDay,
    decimal WorstDay,
    int TotalSessions,
    string? MostTradedSymbol);
