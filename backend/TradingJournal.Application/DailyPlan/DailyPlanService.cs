using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.DailyPlan;

public sealed class DailyPlanService(IApplicationDbContext db, IUserContext user)
{
    public async Task<List<DailyStockPlanDto>> GetByDateAsync(DateOnly date, CancellationToken ct)
    {
        var plans = await db.DailyStockPlans
            .Include(p => p.Legs)
            .Where(p => p.UserId == user.UserId && p.Date == date)
            .OrderBy(p => p.Symbol)
            .ToListAsync(ct);

        return plans.Select(Map).ToList();
    }

    public async Task<List<DailyStockPlanDto>> GetRangeAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var plans = await db.DailyStockPlans
            .Include(p => p.Legs)
            .Where(p => p.UserId == user.UserId && p.Date >= from && p.Date <= to)
            .OrderBy(p => p.Date).ThenBy(p => p.Symbol)
            .ToListAsync(ct);

        return plans.Select(Map).ToList();
    }

    public async Task<DailyStockPlanDto> CreateAsync(CreateDailyStockPlanRequest req, CancellationToken ct)
    {
        var plan = new DailyStockPlan
        {
            UserId = user.UserId,
            Date = req.Date,
            Symbol = req.Symbol.ToUpperInvariant().Trim(),
            StopLossPrice = req.StopLossPrice,
            MaxLossAllowed = req.MaxLossAllowed,
            MarketDirection = ParseEnum<MarketDirection>(req.MarketDirection),
            SectorBehavior = ParseEnum<SectorBehavior>(req.SectorBehavior),
            Outcome = ParseEnum<DailyPlanOutcome>(req.Outcome),
            ResultVsPlan = ParseEnum<ResultVsPlan>(req.ResultVsPlan),
            BehaviorNotes = req.BehaviorNotes,
            EntryTime = ParseTime(req.EntryTime),
        };

        db.DailyStockPlans.Add(plan);
        await db.SaveChangesAsync(ct);
        return Map(plan);
    }

    public async Task<DailyStockPlanDto> UpdateAsync(Guid id, UpdateDailyStockPlanRequest req, CancellationToken ct)
    {
        var plan = await db.DailyStockPlans
            .Include(p => p.Legs)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == user.UserId, ct)
            ?? throw new KeyNotFoundException($"Plan {id} not found.");

        plan.StopLossPrice = req.StopLossPrice;
        plan.MaxLossAllowed = req.MaxLossAllowed;
        plan.MarketDirection = ParseEnum<MarketDirection>(req.MarketDirection);
        plan.SectorBehavior = ParseEnum<SectorBehavior>(req.SectorBehavior);
        plan.Outcome = ParseEnum<DailyPlanOutcome>(req.Outcome);
        plan.ResultVsPlan = ParseEnum<ResultVsPlan>(req.ResultVsPlan);
        plan.BehaviorNotes = req.BehaviorNotes;
        plan.EntryTime = ParseTime(req.EntryTime);
        plan.RecalculateFromLegs();

        await db.SaveChangesAsync(ct);
        return Map(plan);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var plan = await db.DailyStockPlans
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == user.UserId, ct)
            ?? throw new KeyNotFoundException($"Plan {id} not found.");

        db.DailyStockPlans.Remove(plan);
        await db.SaveChangesAsync(ct);
    }

    // ── Leg management ────────────────────────────────────────────────────

    public async Task<DailyStockPlanDto> AddLegAsync(Guid planId, AddLegRequest req, CancellationToken ct)
    {
        var plan = await db.DailyStockPlans
            .Include(p => p.Legs)
            .FirstOrDefaultAsync(p => p.Id == planId && p.UserId == user.UserId, ct)
            ?? throw new KeyNotFoundException($"Plan {planId} not found.");

        var leg = new DailyPlanLeg
        {
            DailyStockPlanId = planId,
            Time = TimeOnly.TryParse(req.Time, out var t) ? t : TimeOnly.MinValue,
            Action = ParseEnum<LegAction>(req.Action),
            LegType = ParseEnum<LegType>(req.LegType),
            Quantity = req.Quantity,
            Price = req.Price,
            Notes = req.Notes,
        };

        plan.Legs.Add(leg);
        plan.RecalculateFromLegs();
        await db.SaveChangesAsync(ct);
        return Map(plan);
    }

    public async Task<DailyStockPlanDto> DeleteLegAsync(Guid legId, CancellationToken ct)
    {
        var leg = await db.DailyPlanLegs
            .Include(l => l.Plan).ThenInclude(p => p.Legs)
            .FirstOrDefaultAsync(l => l.Id == legId && l.Plan.UserId == user.UserId, ct)
            ?? throw new KeyNotFoundException($"Leg {legId} not found.");

        var plan = leg.Plan;
        plan.Legs.Remove(leg);
        db.DailyPlanLegs.Remove(leg);
        plan.RecalculateFromLegs();
        await db.SaveChangesAsync(ct);
        return Map(plan);
    }

    // ── Import from session ───────────────────────────────────────────────

    public async Task<List<DailyStockPlanDto>> ImportFromSessionAsync(ImportFromSessionRequest req, CancellationToken ct)
    {
        var session = await db.IntradaySessions
            .Include(s => s.Executions)
            .FirstOrDefaultAsync(s => s.UserId == user.UserId && s.SessionDate == req.Date, ct);

        if (session is null)
            throw new KeyNotFoundException($"No session found for {req.Date}.");

        var executions = session.Executions
            .Where(e => req.Symbol == null || e.Symbol.Equals(req.Symbol, StringComparison.OrdinalIgnoreCase))
            .GroupBy(e => e.Symbol)
            .ToList();

        var created = new List<DailyStockPlanDto>();

        foreach (var symbolGroup in executions)
        {
            var symbol = symbolGroup.Key;

            // Skip if a plan already exists for this symbol on this date
            var existing = await db.DailyStockPlans
                .AnyAsync(p => p.UserId == user.UserId && p.Date == req.Date && p.Symbol == symbol, ct);
            if (existing) continue;

            var plan = new DailyStockPlan
            {
                UserId = user.UserId,
                Date = req.Date,
                Symbol = symbol,
                MaxLossAllowed = 50,
                MarketDirection = MarketDirection.TrendingUp,
                SectorBehavior = SectorBehavior.Strong,
                Outcome = DailyPlanOutcome.Win,
                ResultVsPlan = ResultVsPlan.FollowedPlan,
            };

            // Build legs from executions, ordered by time
            var orderedExecs = symbolGroup.OrderBy(e => e.TradeDate).ToList();
            decimal runningQty = 0;

            for (var i = 0; i < orderedExecs.Count; i++)
            {
                var exec = orderedExecs[i];
                var isBuy = exec.Side == ExecutionSide.Buy;

                LegType legType;
                if (isBuy)
                {
                    legType = runningQty == 0 ? LegType.Entry : LegType.AddToPosition;
                    runningQty += exec.Quantity;
                }
                else
                {
                    runningQty -= exec.Quantity;
                    legType = runningQty <= 0 ? LegType.FullExit : LegType.PartialExit;
                }

                plan.Legs.Add(new DailyPlanLeg
                {
                    Time = TimeOnly.FromDateTime(exec.TradeDate.ToLocalTime()),
                    Action = isBuy ? LegAction.Buy : LegAction.Sell,
                    LegType = legType,
                    Quantity = exec.Quantity,
                    Price = exec.Price,
                });
            }

            plan.RecalculateFromLegs();

            // Auto-set outcome from P&L
            plan.Outcome = plan.Pnl > 0 ? DailyPlanOutcome.Win
                : plan.Pnl < 0 ? DailyPlanOutcome.Loss
                : DailyPlanOutcome.Breakeven;

            db.DailyStockPlans.Add(plan);
            created.Add(Map(plan));
        }

        await db.SaveChangesAsync(ct);
        return created;
    }

    // ── Weekly stats ──────────────────────────────────────────────────────

    public async Task<WeeklyPlanStatsDto> GetWeeklyStatsAsync(DateOnly weekStart, CancellationToken ct)
    {
        var weekEnd = weekStart.AddDays(6);
        var plans = await db.DailyStockPlans
            .Where(p => p.UserId == user.UserId && p.Date >= weekStart && p.Date <= weekEnd)
            .ToListAsync(ct);

        var totalTraded = plans.Where(p => p.Outcome != DailyPlanOutcome.Skipped).ToList();
        var wins = totalTraded.Count(p => p.Outcome == DailyPlanOutcome.Win);
        var losses = totalTraded.Count(p => p.Outcome == DailyPlanOutcome.Loss);
        var ruleBreaks = plans.Count(p => p.ResultVsPlan == ResultVsPlan.BrokeRule);
        var totalPnl = plans.Sum(p => p.Pnl);
        var winRate = totalTraded.Count > 0 ? (double)wins / totalTraded.Count * 100 : 0;

        var symbolStats = plans
            .GroupBy(p => p.Symbol)
            .Select(g =>
            {
                var traded = g.Where(p => p.Outcome != DailyPlanOutcome.Skipped).ToList();
                var sw = traded.Count(p => p.Outcome == DailyPlanOutcome.Win);
                var sl = traded.Count(p => p.Outcome == DailyPlanOutcome.Loss);
                return new SymbolWeeklyStats(
                    Symbol: g.Key,
                    Wins: sw,
                    Losses: sl,
                    Skipped: g.Count(p => p.Outcome == DailyPlanOutcome.Skipped),
                    RuleBreaks: g.Count(p => p.ResultVsPlan == ResultVsPlan.BrokeRule),
                    TotalPnl: g.Sum(p => p.Pnl),
                    WinRate: traded.Count > 0 ? (double)sw / traded.Count * 100 : 0
                );
            })
            .OrderByDescending(s => s.TotalPnl)
            .ToList();

        return new WeeklyPlanStatsDto(
            WeekStart: weekStart,
            WeekEnd: weekEnd,
            SymbolStats: symbolStats,
            TotalTrades: totalTraded.Count,
            TotalWins: wins,
            TotalLosses: losses,
            RuleBreaks: ruleBreaks,
            TotalPnl: totalPnl,
            WinRate: winRate);
    }

    // ── Mapping ───────────────────────────────────────────────────────────

    private static DailyStockPlanDto Map(DailyStockPlan p)
    {
        var legs = MapLegsWithPnl(p.Legs);
        return new DailyStockPlanDto(
            Id: p.Id,
            Date: p.Date,
            Symbol: p.Symbol,
            StopLossPrice: p.StopLossPrice,
            AvgEntryPrice: p.AvgEntryPrice,
            OpenQty: p.OpenQty,
            RealizedPnl: p.RealizedPnl,
            Pnl: p.Pnl,
            IsClosed: p.IsClosed,
            MaxLossAllowed: p.MaxLossAllowed,
            MarketDirection: p.MarketDirection.ToString(),
            SectorBehavior: p.SectorBehavior.ToString(),
            Outcome: p.Outcome.ToString(),
            ResultVsPlan: p.ResultVsPlan.ToString(),
            BehaviorNotes: p.BehaviorNotes,
            EntryTime: p.EntryTime?.ToString("HH:mm"),
            Legs: legs);
    }

    private static List<DailyPlanLegDto> MapLegsWithPnl(List<DailyPlanLeg> legs)
    {
        var sorted = legs.OrderBy(l => l.Time).ToList();
        decimal avgCost = 0;
        decimal openQty = 0;
        var result = new List<DailyPlanLegDto>();

        foreach (var leg in sorted)
        {
            decimal realized = 0;
            if (leg.Action == LegAction.Buy)
            {
                avgCost = openQty == 0
                    ? leg.Price
                    : (avgCost * openQty + leg.Price * leg.Quantity) / (openQty + leg.Quantity);
                openQty += leg.Quantity;
            }
            else
            {
                var sellQty = Math.Min(leg.Quantity, openQty);
                realized = (leg.Price - avgCost) * sellQty;
                openQty = Math.Max(0, openQty - leg.Quantity);
            }

            result.Add(new DailyPlanLegDto(
                Id: leg.Id,
                Time: leg.Time.ToString("HH:mm"),
                Action: leg.Action.ToString(),
                LegType: leg.LegType.ToString(),
                Quantity: leg.Quantity,
                Price: leg.Price,
                RealizedPnl: realized,
                Notes: leg.Notes));
        }

        return result;
    }

    private static T ParseEnum<T>(string value) where T : struct, Enum
        => Enum.TryParse<T>(value, ignoreCase: true, out var result) ? result : default;

    private static TimeOnly? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        // Try "HH:mm" and "H:mm" (formats sent by <input type="time">)
        if (TimeOnly.TryParseExact(value, ["HH:mm", "H:mm", "HH:mm:ss", "H:mm:ss"],
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var t))
            return t;
        // Fallback: accept any parseable time
        return TimeOnly.TryParse(value, CultureInfo.InvariantCulture, out var t2) ? t2 : null;
    }
}
