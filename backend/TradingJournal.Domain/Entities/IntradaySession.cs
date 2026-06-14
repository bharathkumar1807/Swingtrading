using TradingJournal.Domain.Common;

namespace TradingJournal.Domain.Entities;

public sealed class IntradaySession : Entity
{
    public string UserId { get; set; } = string.Empty;
    public DateOnly SessionDate { get; set; }
    public string Broker { get; set; } = "Robinhood";
    public decimal TotalPnl { get; set; }
    public int WinCount { get; set; }
    public int LossCount { get; set; }
    public int BreakevenCount { get; set; }
    public int TotalExecutions { get; set; }
    public List<Execution> Executions { get; set; } = [];
    public List<IntradayTrade> IntradayTrades { get; set; } = [];
}
