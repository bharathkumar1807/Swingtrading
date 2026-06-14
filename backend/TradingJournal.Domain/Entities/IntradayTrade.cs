using TradingJournal.Domain.Common;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Domain.Entities;

public sealed class IntradayTrade : Entity
{
    public Guid SessionId { get; set; }
    public IntradaySession Session { get; set; } = null!;
    public string Symbol { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public decimal TotalBuyQty { get; set; }
    public decimal TotalSellQty { get; set; }
    public decimal AvgBuyPrice { get; set; }
    public decimal AvgSellPrice { get; set; }
    public decimal MatchedQty { get; set; }
    public decimal Pnl { get; set; }
    public decimal OpenBuyQty { get; set; }
    public decimal PriorPositionSellQty { get; set; }
    public bool IsFullyClosed { get; set; }
    public TradeOutcome Outcome { get; set; }
    public List<Execution> Executions { get; set; } = [];
}
