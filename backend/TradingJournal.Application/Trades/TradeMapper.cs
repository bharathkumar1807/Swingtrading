using TradingJournal.Domain.Entities;

namespace TradingJournal.Application.Trades;

public static class TradeMapper
{
    public static TradeDto ToDto(this Trade trade) => new(
        trade.Id,
        trade.Symbol,
        trade.Sector,
        trade.Broker,
        trade.Strategy,
        trade.ConfidenceScore,
        trade.Notes,
        trade.ScreenshotUrl,
        trade.Tags,
        trade.EntryPrice,
        trade.ExitPrice,
        trade.StopLoss,
        trade.Size,
        trade.Fees,
        trade.Slippage,
        trade.Pnl,
        trade.RMultiple,
        trade.RiskAmount,
        trade.RewardAmount,
        trade.Mistakes,
        trade.PositionType,
        trade.Outcome,
        trade.EntryDate,
        trade.ExitDate);
}
