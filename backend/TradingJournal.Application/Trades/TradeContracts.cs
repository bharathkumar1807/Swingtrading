using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Trades;

public sealed record TradeDto(
    Guid Id,
    string Symbol,
    string Sector,
    string Broker,
    string Strategy,
    int ConfidenceScore,
    string? Notes,
    string? ScreenshotUrl,
    IReadOnlyList<string> Tags,
    decimal EntryPrice,
    decimal? ExitPrice,
    decimal StopLoss,
    decimal Size,
    decimal Fees,
    decimal Slippage,
    decimal Pnl,
    decimal RMultiple,
    decimal RiskAmount,
    decimal RewardAmount,
    IReadOnlyList<string> Mistakes,
    PositionType PositionType,
    TradeOutcome Outcome,
    DateTime EntryDate,
    DateTime? ExitDate);

public sealed record UpsertTradeRequest(
    string Symbol,
    string Sector,
    string Broker,
    string Strategy,
    int ConfidenceScore,
    string? Notes,
    string? ScreenshotUrl,
    IReadOnlyList<string> Tags,
    decimal EntryPrice,
    decimal? ExitPrice,
    decimal StopLoss,
    decimal Size,
    decimal Fees,
    decimal Slippage,
    IReadOnlyList<string> Mistakes,
    PositionType PositionType,
    DateTime EntryDate,
    DateTime? ExitDate);

public sealed record TradeQuery(
    string? Search,
    string? Symbol,
    string? Sector,
    string? Strategy,
    string? Broker,
    string? Mistake,
    string? ProfitLoss,
    PositionType? PositionType,
    int? MinConfidence,
    int? MaxConfidence,
    DateTime? From,
    DateTime? To,
    int Page = 1,
    int PageSize = 20,
    string? SortBy = "entryDate",
    bool Desc = true);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
