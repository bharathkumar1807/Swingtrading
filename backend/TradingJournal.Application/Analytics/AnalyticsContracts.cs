namespace TradingJournal.Application.Analytics;

public sealed record KpiSummary(decimal WinRate, decimal TotalProfit, decimal TotalLoss, decimal AverageRMultiple, int TotalTrades);
public sealed record ExtendedKpis(decimal ProfitFactor, decimal Expectancy, decimal MaxDrawdown, int CurrentStreak, int MaxWinStreak, int MaxLossStreak);
public sealed record DailyPnl(string Date, decimal Pnl, int TradeCount, int Wins, int Losses);
public sealed record ChartPoint(string Label, decimal Value);
public sealed record StrategyMetric(string Strategy, int Trades, decimal WinRate, decimal Pnl, decimal AverageRMultiple);
public sealed record DashboardDto(
    KpiSummary Kpis,
    ExtendedKpis ExtendedKpis,
    IReadOnlyList<ChartPoint> EquityCurve,
    IReadOnlyList<ChartPoint> SectorAllocation,
    IReadOnlyList<ChartPoint> WeeklyPerformance,
    IReadOnlyList<ChartPoint> MonthlyPerformance,
    IReadOnlyList<DailyPnl> DailyCalendar,
    IReadOnlyList<TradePerformanceRow> TopWinners,
    IReadOnlyList<TradePerformanceRow> TopLosers,
    IReadOnlyList<StrategyMetric> Strategies,
    RiskRewardOverview RiskReward);

public sealed record TradePerformanceRow(Guid Id, string Symbol, string Strategy, decimal Pnl, decimal RMultiple, DateTime EntryDate);
public sealed record RiskRewardOverview(decimal AverageRisk, decimal AverageReward, decimal AverageRiskRewardRatio);
public sealed record ReviewDto(ReviewSection Weekly, ReviewInsight Monthly, IReadOnlyList<string> ActionPrompts);
public sealed record ReviewSection(decimal WinRate, decimal Pnl, IReadOnlyList<TradePerformanceRow> BestTrades, IReadOnlyList<TradePerformanceRow> WorstTrades, IReadOnlyList<string> RuleViolations);
public sealed record ReviewInsight(string MostProfitableStrategy, string BiggestLeak, decimal ImprovementVsLastMonth);
public sealed record MistakeAnalyticsDto(IReadOnlyList<ChartPoint> Frequency, IReadOnlyList<HeatmapPoint> Heatmap, IReadOnlyList<MistakeBreakdown> Breakdown, IReadOnlyList<string> Insights);
public sealed record HeatmapPoint(string Day, int Hour, int Count);
public sealed record MistakeBreakdown(string Mistake, int Count, decimal PnlImpact);
