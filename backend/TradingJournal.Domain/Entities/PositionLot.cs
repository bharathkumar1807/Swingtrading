using TradingJournal.Domain.Common;

namespace TradingJournal.Domain.Entities;

public sealed class PositionLot : Entity
{
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public DateOnly AcquiredDate { get; set; }
    public Guid SourceSessionId { get; set; }
}
