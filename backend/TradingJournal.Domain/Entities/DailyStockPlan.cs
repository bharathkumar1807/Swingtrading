using TradingJournal.Domain.Common;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Domain.Entities;

public sealed class DailyStockPlan : Entity
{
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public decimal StopLossPrice { get; set; }
    public decimal MaxLossAllowed { get; set; }
    public MarketDirection MarketDirection { get; set; }
    public SectorBehavior SectorBehavior { get; set; }
    public DailyPlanOutcome Outcome { get; set; }
    public ResultVsPlan ResultVsPlan { get; set; }
    public string? BehaviorNotes { get; set; }
    public TimeOnly? EntryTime { get; set; }

    // Computed from legs
    public decimal AvgEntryPrice { get; set; }
    public decimal OpenQty { get; set; }
    public decimal RealizedPnl { get; set; }
    public decimal Pnl { get; set; }
    public bool IsClosed { get; set; }

    public List<DailyPlanLeg> Legs { get; set; } = [];

    public void RecalculateFromLegs()
    {
        var sorted = Legs.OrderBy(l => l.Time).ToList();

        decimal avgCost = 0;
        decimal openQty = 0;
        decimal realized = 0;

        foreach (var leg in sorted)
        {
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
                realized += (leg.Price - avgCost) * sellQty;
                openQty = Math.Max(0, openQty - leg.Quantity);
            }
        }

        AvgEntryPrice = avgCost;
        OpenQty = openQty;
        RealizedPnl = realized;
        Pnl = realized;
        IsClosed = openQty == 0 && sorted.Count > 0;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
