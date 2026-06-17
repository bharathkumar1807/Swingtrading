using TradingJournal.Domain.Common;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Domain.Entities;

public sealed class DailyPlanLeg : Entity
{
    public Guid DailyStockPlanId { get; set; }
    public DailyStockPlan Plan { get; set; } = null!;
    public TimeOnly Time { get; set; }
    public LegAction Action { get; set; }
    public LegType LegType { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
}
