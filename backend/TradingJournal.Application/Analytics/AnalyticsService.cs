using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Trades;
using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Analytics;

public sealed class AnalyticsService(IApplicationDbContext db, IUserContext userContext)
{
    public async Task<DashboardDto> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var trades = await UserTrades().OrderBy(t => t.EntryDate).ToListAsync(cancellationToken);
        var closed = trades.Where(t => t.Outcome != TradeOutcome.Open).ToList();
        var wins = closed.Count(t => t.Pnl > 0);
        var losses = closed.Count(t => t.Pnl < 0);
        var kpis = new KpiSummary(
            closed.Count == 0 ? 0 : Math.Round((decimal)wins / closed.Count * 100, 2),
            trades.Where(t => t.Pnl > 0).Sum(t => t.Pnl),
            trades.Where(t => t.Pnl < 0).Sum(t => t.Pnl),
            closed.Count == 0 ? 0 : Math.Round(closed.Average(t => t.RMultiple), 2),
            trades.Count);

        var grossWin = closed.Where(t => t.Pnl > 0).Sum(t => t.Pnl);
        var grossLoss = Math.Abs(closed.Where(t => t.Pnl < 0).Sum(t => t.Pnl));
        var profitFactor = grossLoss == 0 ? (grossWin > 0 ? 99.99m : 1m) : Math.Round(grossWin / grossLoss, 2);

        var winRate = closed.Count == 0 ? 0m : (decimal)wins / closed.Count;
        var avgWinR = wins > 0 ? closed.Where(t => t.Pnl > 0).Average(t => t.RMultiple) : 0;
        var avgLossR = losses > 0 ? closed.Where(t => t.Pnl < 0).Average(t => t.RMultiple) : 0;
        var expectancy = Math.Round(winRate * avgWinR + (1 - winRate) * avgLossR, 2);

        var extendedKpis = new ExtendedKpis(
            profitFactor,
            expectancy,
            ComputeMaxDrawdown(trades),
            ComputeStreaks(closed).current,
            ComputeStreaks(closed).maxWin,
            ComputeStreaks(closed).maxLoss);

        decimal running = 0;
        var equity = trades.Select(t =>
        {
            running += t.Pnl;
            return new ChartPoint(t.EntryDate.ToString("MMM dd"), running);
        }).ToList();

        var dailyCalendar = trades
            .GroupBy(t => t.EntryDate.Date)
            .Select(g => new DailyPnl(
                g.Key.ToString("yyyy-MM-dd"),
                Math.Round(g.Sum(t => t.Pnl), 2),
                g.Count(),
                g.Count(t => t.Pnl > 0),
                g.Count(t => t.Pnl < 0)))
            .OrderBy(x => x.Date)
            .ToList();

        return new DashboardDto(
            kpis,
            extendedKpis,
            equity,
            trades.GroupBy(t => t.Sector).Select(g => new ChartPoint(g.Key, g.Count())).ToList(),
            trades.GroupBy(t => StartOfWeek(t.EntryDate)).Select(g => new ChartPoint(g.Key.ToString("MMM dd"), g.Sum(t => t.Pnl))).ToList(),
            trades.GroupBy(t => new DateTime(t.EntryDate.Year, t.EntryDate.Month, 1)).Select(g => new ChartPoint(g.Key.ToString("MMM yyyy"), g.Sum(t => t.Pnl))).ToList(),
            dailyCalendar,
            trades.OrderByDescending(t => t.Pnl).Take(5).Select(ToPerformanceRow).ToList(),
            trades.OrderBy(t => t.Pnl).Take(5).Select(ToPerformanceRow).ToList(),
            BuildStrategyMetrics(trades),
            new RiskRewardOverview(
                trades.Count == 0 ? 0 : Math.Round(trades.Average(t => t.RiskAmount), 2),
                trades.Count == 0 ? 0 : Math.Round(trades.Average(t => t.RewardAmount), 2),
                trades.Sum(t => t.RiskAmount) == 0 ? 0 : Math.Round(trades.Sum(t => t.RewardAmount) / trades.Sum(t => t.RiskAmount), 2)));
    }

    public async Task<IReadOnlyList<StrategyMetric>> GetStrategiesAsync(CancellationToken cancellationToken)
        => BuildStrategyMetrics(await UserTrades().ToListAsync(cancellationToken));

    public async Task<ReviewDto> GetReviewAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var weekStart = StartOfWeek(now);
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var lastMonthStart = monthStart.AddMonths(-1);
        var trades = await UserTrades().ToListAsync(cancellationToken);
        var week = trades.Where(t => t.EntryDate >= weekStart).ToList();
        var month = trades.Where(t => t.EntryDate >= monthStart).ToList();
        var lastMonth = trades.Where(t => t.EntryDate >= lastMonthStart && t.EntryDate < monthStart).ToList();

        var weekly = new ReviewSection(
            WinRate(week),
            week.Sum(t => t.Pnl),
            week.OrderByDescending(t => t.Pnl).Take(3).Select(ToPerformanceRow).ToList(),
            week.OrderBy(t => t.Pnl).Take(3).Select(ToPerformanceRow).ToList(),
            week.SelectMany(t => t.Mistakes).GroupBy(x => x).OrderByDescending(g => g.Count()).Take(5).Select(g => g.Key).ToList());

        var strategy = month.GroupBy(t => t.Strategy).OrderByDescending(g => g.Sum(t => t.Pnl)).FirstOrDefault()?.Key ?? "Not enough data";
        var leak = month.SelectMany(t => t.Mistakes.Select(m => new { Mistake = m, t.Pnl })).GroupBy(x => x.Mistake).OrderBy(g => g.Sum(x => x.Pnl)).FirstOrDefault()?.Key ?? "No major leak detected";
        var insight = new ReviewInsight(strategy, leak, month.Sum(t => t.Pnl) - lastMonth.Sum(t => t.Pnl));
        return new ReviewDto(weekly, insight, ["Next week I will focus on...", "Rules to reinforce..."]);
    }

    public async Task<MistakeAnalyticsDto> GetMistakesAsync(CancellationToken cancellationToken)
    {
        var trades = await UserTrades().ToListAsync(cancellationToken);
        var mistakeRows = trades.SelectMany(t => t.Mistakes.Select(m => new { Mistake = m, Trade = t })).ToList();
        var frequency = mistakeRows.GroupBy(x => x.Mistake).Select(g => new ChartPoint(g.Key, g.Count())).OrderByDescending(x => x.Value).ToList();
        var heatmap = mistakeRows.GroupBy(x => new { Day = x.Trade.EntryDate.DayOfWeek.ToString(), x.Trade.EntryDate.Hour })
            .Select(g => new HeatmapPoint(g.Key.Day, g.Key.Hour, g.Count())).ToList();
        var breakdown = mistakeRows.GroupBy(x => x.Mistake)
            .Select(g => new MistakeBreakdown(g.Key, g.Count(), g.Sum(x => x.Trade.Pnl))).OrderBy(x => x.PnlImpact).ToList();
        var insights = breakdown.Take(3).Select(x => $"{x.Mistake} is linked to {x.PnlImpact:C} net impact.").ToList();
        return new MistakeAnalyticsDto(frequency, heatmap, breakdown, insights);
    }

    private IQueryable<Trade> UserTrades() => db.Trades.AsNoTracking().Where(t => t.UserId == userContext.UserId);

    private static IReadOnlyList<StrategyMetric> BuildStrategyMetrics(IEnumerable<Trade> trades) => trades
        .GroupBy(t => t.Strategy)
        .Select(g => new StrategyMetric(g.Key, g.Count(), WinRate(g), g.Sum(t => t.Pnl), g.Any() ? Math.Round(g.Average(t => t.RMultiple), 2) : 0))
        .OrderByDescending(x => x.Pnl)
        .ToList();

    private static decimal WinRate(IEnumerable<Trade> trades)
    {
        var closed = trades.Where(t => t.Outcome != TradeOutcome.Open).ToList();
        return closed.Count == 0 ? 0 : Math.Round((decimal)closed.Count(t => t.Pnl > 0) / closed.Count * 100, 2);
    }

    private static TradePerformanceRow ToPerformanceRow(Trade t) => new(t.Id, t.Symbol, t.Strategy, t.Pnl, t.RMultiple, t.EntryDate);
    private static DateTime StartOfWeek(DateTime date) => date.Date.AddDays(-(int)date.DayOfWeek);

    private static decimal ComputeMaxDrawdown(IEnumerable<Trade> trades)
    {
        decimal peak = 0, equity = 0, maxDd = 0;
        foreach (var t in trades.OrderBy(t => t.EntryDate))
        {
            equity += t.Pnl;
            if (equity > peak) peak = equity;
            var dd = peak - equity;
            if (dd > maxDd) maxDd = dd;
        }
        return Math.Round(maxDd, 2);
    }

    private static (int current, int maxWin, int maxLoss) ComputeStreaks(IEnumerable<Trade> closedTrades)
    {
        int run = 0, maxWin = 0, maxLoss = 0;
        bool? lastWin = null;
        foreach (var t in closedTrades.OrderBy(t => t.ExitDate ?? t.EntryDate))
        {
            var isWin = t.Pnl > 0;
            if (lastWin == null || lastWin == isWin)
                run = isWin ? run + 1 : run - 1;
            else
                run = isWin ? 1 : -1;
            lastWin = isWin;
            if (run > 0 && run > maxWin) maxWin = run;
            if (run < 0 && Math.Abs(run) > maxLoss) maxLoss = Math.Abs(run);
        }
        return (run, maxWin, maxLoss);
    }
}
