using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Intraday;

public static class IntradayMatchingEngine
{
    public static List<IntradayTrade> Match(Guid sessionId, IReadOnlyList<Execution> executions)
    {
        var bySymbol = executions
            .OrderBy(e => e.SequenceOrder)
            .GroupBy(e => e.Symbol);

        var trades = new List<IntradayTrade>();

        foreach (var group in bySymbol)
        {
            var trade = MatchSymbol(sessionId, group.Key, group.First().CompanyName, group.ToList());
            trades.Add(trade);
        }

        return trades;
    }

    private static IntradayTrade MatchSymbol(Guid sessionId, string symbol, string companyName, List<Execution> executions)
    {
        // FIFO queue: each entry is (price, remaining_qty)
        var buyQueue = new Queue<(decimal Price, decimal Qty)>();
        decimal matchedPnl = 0;
        decimal totalBuyValue = 0;
        decimal totalBuyQty = 0;
        decimal totalSellValue = 0;
        decimal totalSellQty = 0;
        decimal priorPositionSellQty = 0;

        foreach (var exec in executions)
        {
            if (exec.Side == ExecutionSide.Buy)
            {
                buyQueue.Enqueue((exec.Price, exec.Quantity));
                totalBuyValue += exec.Price * exec.Quantity;
                totalBuyQty += exec.Quantity;
            }
            else
            {
                totalSellValue += exec.Price * exec.Quantity;
                totalSellQty += exec.Quantity;

                var remaining = exec.Quantity;
                while (remaining > 0)
                {
                    if (buyQueue.Count == 0)
                    {
                        // Selling against a prior-day position
                        priorPositionSellQty += remaining;
                        remaining = 0;
                        break;
                    }

                    var (buyPrice, buyQty) = buyQueue.Peek();
                    var matched = Math.Min(remaining, buyQty);
                    matchedPnl += (exec.Price - buyPrice) * matched;
                    remaining -= matched;

                    if (buyQty - matched <= 0.0001m)
                        buyQueue.Dequeue();
                    else
                        buyQueue = ReplaceHead(buyQueue, buyPrice, buyQty - matched);
                }
            }
        }

        var openBuyQty = buyQueue.Sum(b => b.Qty);
        var matchedQty = Math.Min(totalBuyQty, totalSellQty - priorPositionSellQty);

        var trade = new IntradayTrade
        {
            SessionId = sessionId,
            Symbol = symbol,
            CompanyName = companyName,
            TotalBuyQty = totalBuyQty,
            TotalSellQty = totalSellQty,
            AvgBuyPrice = totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0,
            AvgSellPrice = totalSellQty > 0 ? totalSellValue / totalSellQty : 0,
            MatchedQty = matchedQty,
            Pnl = matchedPnl,
            OpenBuyQty = openBuyQty,
            PriorPositionSellQty = priorPositionSellQty,
            IsFullyClosed = openBuyQty <= 0.0001m,
            Outcome = matchedPnl > 0 ? TradeOutcome.Win : matchedPnl < 0 ? TradeOutcome.Loss : TradeOutcome.Breakeven,
            Executions = executions
        };

        foreach (var exec in executions)
            exec.IntradayTradeId = trade.Id;

        return trade;
    }

    // Queue doesn't support in-place update of head, so rebuild with replaced head
    private static Queue<(decimal Price, decimal Qty)> ReplaceHead(
        Queue<(decimal Price, decimal Qty)> queue, decimal price, decimal qty)
    {
        queue.Dequeue();
        var items = queue.ToArray();
        var rebuilt = new Queue<(decimal Price, decimal Qty)>();
        rebuilt.Enqueue((price, qty));
        foreach (var item in items)
            rebuilt.Enqueue(item);
        return rebuilt;
    }
}
