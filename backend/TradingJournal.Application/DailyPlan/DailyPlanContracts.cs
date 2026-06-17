namespace TradingJournal.Application.DailyPlan;

public sealed record DailyPlanLegDto(
    Guid Id,
    string Time,
    string Action,
    string LegType,
    decimal Quantity,
    decimal Price,
    decimal RealizedPnl,
    string? Notes);

public sealed record DailyStockPlanDto(
    Guid Id,
    DateOnly Date,
    string Symbol,
    decimal StopLossPrice,
    decimal AvgEntryPrice,
    decimal OpenQty,
    decimal RealizedPnl,
    decimal Pnl,
    bool IsClosed,
    decimal MaxLossAllowed,
    string MarketDirection,
    string SectorBehavior,
    string Outcome,
    string ResultVsPlan,
    string? BehaviorNotes,
    string? EntryTime,
    List<DailyPlanLegDto> Legs);

public sealed record CreateDailyStockPlanRequest(
    DateOnly Date,
    string Symbol,
    decimal StopLossPrice,
    decimal MaxLossAllowed,
    string MarketDirection,
    string SectorBehavior,
    string Outcome,
    string ResultVsPlan,
    string? BehaviorNotes,
    string? EntryTime);

public sealed record UpdateDailyStockPlanRequest(
    decimal StopLossPrice,
    decimal MaxLossAllowed,
    string MarketDirection,
    string SectorBehavior,
    string Outcome,
    string ResultVsPlan,
    string? BehaviorNotes,
    string? EntryTime);

public sealed record AddLegRequest(
    string Time,
    string Action,
    string LegType,
    decimal Quantity,
    decimal Price,
    string? Notes);

public sealed record ImportFromSessionRequest(
    DateOnly Date,
    string? Symbol);

public sealed record WeeklyPlanStatsDto(
    DateOnly WeekStart,
    DateOnly WeekEnd,
    List<SymbolWeeklyStats> SymbolStats,
    int TotalTrades,
    int TotalWins,
    int TotalLosses,
    int RuleBreaks,
    decimal TotalPnl,
    double WinRate);

public sealed record SymbolWeeklyStats(
    string Symbol,
    int Wins,
    int Losses,
    int Skipped,
    int RuleBreaks,
    decimal TotalPnl,
    double WinRate);
