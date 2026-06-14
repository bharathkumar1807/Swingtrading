using TradingJournal.Domain.Common;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Domain.Entities;

public sealed class Trade : Entity
{
    public string Symbol { get; set; } = string.Empty;
    public string Sector { get; set; } = string.Empty;
    public string Broker { get; set; } = string.Empty;
    public string Strategy { get; set; } = string.Empty;
    public int ConfidenceScore { get; set; }
    public string? Notes { get; set; }
    public string? ScreenshotUrl { get; set; }
    public List<string> Tags { get; set; } = [];
    public decimal EntryPrice { get; set; }
    public decimal? ExitPrice { get; set; }
    public decimal StopLoss { get; set; }
    public decimal Size { get; set; }
    public decimal Fees { get; set; }
    public decimal Slippage { get; set; }
    public decimal Pnl { get; set; }
    public decimal RMultiple { get; set; }
    public decimal RiskAmount { get; set; }
    public decimal RewardAmount { get; set; }
    public List<string> Mistakes { get; set; } = [];
    public PositionType PositionType { get; set; }
    public TradeOutcome Outcome { get; set; }
    public DateTime EntryDate { get; set; }
    public DateTime? ExitDate { get; set; }
    public string UserId { get; set; } = string.Empty;

    public void Recalculate()
    {
        RiskAmount = Math.Abs(EntryPrice - StopLoss) * Size;
        var effectiveExit = ExitPrice ?? EntryPrice;
        var gross = PositionType == PositionType.Long
            ? (effectiveExit - EntryPrice) * Size
            : (EntryPrice - effectiveExit) * Size;

        Pnl = gross - Fees - Slippage;
        RewardAmount = Math.Max(0, Math.Abs(effectiveExit - EntryPrice) * Size);
        RMultiple = RiskAmount == 0 ? 0 : Pnl / RiskAmount;
        Outcome = ExitPrice is null ? TradeOutcome.Open :
            Pnl > 0 ? TradeOutcome.Win :
            Pnl < 0 ? TradeOutcome.Loss : TradeOutcome.Breakeven;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
