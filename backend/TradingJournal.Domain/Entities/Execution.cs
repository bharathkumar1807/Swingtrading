using TradingJournal.Domain.Common;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Domain.Entities;

public sealed class Execution : Entity
{
    public Guid SessionId { get; set; }
    public IntradaySession Session { get; set; } = null!;
    public Guid? IntradayTradeId { get; set; }
    public IntradayTrade? IntradayTrade { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public ExecutionSide Side { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
    public decimal Principal { get; set; }
    public decimal Fees { get; set; }
    public decimal NetAmount { get; set; }
    public DateTime TradeDate { get; set; }
    public int SequenceOrder { get; set; }
}
