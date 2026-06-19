using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Intraday;

public sealed record PriorLot(string Symbol, string CompanyName, decimal Price, decimal Qty, DateOnly AcquiredDate, Guid SourceSessionId);
public sealed record OpenLot(string Symbol, string CompanyName, decimal Price, decimal Qty, DateOnly AcquiredDate, Guid SourceSessionId);

public sealed class MatchResult
{
    public List<IntradayTrade> Trades { get; init; } = [];
    public List<OpenLot> OpenLots { get; init; } = [];
}

public static class IntradayMatchingEngine
{
    public static MatchResult Match(
        Guid sessionId,
        DateOnly sessionDate,
        IReadOnlyList<Execution> executions,
        IReadOnlyList<PriorLot> priorLots)
    {
        var bySymbol = executions
            .OrderBy(e => e.SequenceOrder)
            .GroupBy(e => e.Symbol);

        var allTrades = new List<IntradayTrade>();
        var allOpenLots = new List<OpenLot>();

        foreach (var group in bySymbol)
        {
            var symbol = group.Key;
            var companyName = group.First().CompanyName;
            var symbolPrior = priorLots
                .Where(l => l.Symbol == symbol)
                .OrderBy(l => l.AcquiredDate)
                .ToList();

            var (trades, openLots) = MatchSymbol(sessionId, sessionDate, symbol, companyName, group.ToList(), symbolPrior);
            allTrades.AddRange(trades);
            allOpenLots.AddRange(openLots);
        }

        return new MatchResult { Trades = allTrades, OpenLots = allOpenLots };
    }

    private readonly record struct QueueEntry(decimal Price, decimal Qty, bool IsPrior, DateOnly AcquiredDate, Guid SourceSessionId);

    private static (List<IntradayTrade> trades, List<OpenLot> openLots) MatchSymbol(
        Guid sessionId,
        DateOnly sessionDate,
        string symbol,
        string companyName,
        List<Execution> executions,
        List<PriorLot> prior)
    {
        var queue = new Queue<QueueEntry>();

        foreach (var lot in prior)
            queue.Enqueue(new(lot.Price, lot.Qty, true, lot.AcquiredDate, lot.SourceSessionId));

        // Swing accumulators (sells matched against prior lots with known cost basis)
        decimal swingPnl = 0, swingBuyValue = 0, swingBuyQty = 0;
        decimal swingSellValue = 0, swingSellQty = 0;
        DateOnly? swingEntryDate = null;

        // Intraday accumulators (same-session round-trips)
        decimal intradayPnl = 0, intradayBuyValue = 0, intradayBuyQty = 0;
        decimal intradaySellValue = 0, intradaySellQty = 0;

        // Unknown-basis accumulators: sells against empty queue with no prior lots loaded.
        // These are inferred swing exits — the position existed before the first uploaded session.
        decimal unknownBasisSellValue = 0, unknownBasisSellQty = 0;

        foreach (var exec in executions)
        {
            if (exec.Side == ExecutionSide.Buy)
            {
                queue.Enqueue(new(exec.Price, exec.Quantity, false, sessionDate, sessionId));
                intradayBuyQty += exec.Quantity;
                intradayBuyValue += exec.Price * exec.Quantity;
            }
            else
            {
                var remaining = exec.Quantity;
                while (remaining > 0)
                {
                    if (queue.Count == 0)
                    {
                        // No lot to match — infer this is a prior position exit
                        unknownBasisSellQty += remaining;
                        unknownBasisSellValue += exec.Price * remaining;
                        remaining = 0;
                        break;
                    }

                    var head = queue.Peek();
                    var matched = Math.Min(remaining, head.Qty);
                    var pnl = (exec.Price - head.Price) * matched;

                    if (head.IsPrior)
                    {
                        swingPnl += pnl;
                        swingBuyQty += matched;
                        swingBuyValue += head.Price * matched;
                        swingSellQty += matched;
                        swingSellValue += exec.Price * matched;
                        if (swingEntryDate is null || head.AcquiredDate < swingEntryDate)
                            swingEntryDate = head.AcquiredDate;
                    }
                    else
                    {
                        intradayPnl += pnl;
                        intradaySellQty += matched;
                        intradaySellValue += exec.Price * matched;
                    }

                    remaining -= matched;

                    if (head.Qty - matched <= 0.0001m)
                        queue.Dequeue();
                    else
                        queue = ReplaceHead(queue, head with { Qty = head.Qty - matched });
                }
            }
        }

        // Remaining queue entries become carry-forward open lots
        var openLots = queue
            .Select(e => new OpenLot(symbol, companyName, e.Price, e.Qty, e.AcquiredDate, e.SourceSessionId))
            .ToList();

        var trades = new List<IntradayTrade>();

        // Swing trade — prior-lot exits with known cost basis
        if (swingSellQty > 0)
        {
            trades.Add(new IntradayTrade
            {
                SessionId = sessionId,
                Symbol = symbol,
                CompanyName = companyName,
                TradeType = TradeType.Swing,
                EntryDate = swingEntryDate,
                TotalBuyQty = swingBuyQty,
                TotalSellQty = swingSellQty,
                AvgBuyPrice = swingBuyQty > 0 ? swingBuyValue / swingBuyQty : 0,
                AvgSellPrice = swingSellQty > 0 ? swingSellValue / swingSellQty : 0,
                MatchedQty = swingSellQty,
                Pnl = swingPnl,
                OpenBuyQty = 0,
                PriorPositionSellQty = 0,
                IsFullyClosed = true,
                Outcome = swingPnl > 0 ? TradeOutcome.Win : swingPnl < 0 ? TradeOutcome.Loss : TradeOutcome.Breakeven,
                Executions = []
            });
        }

        // Inferred swing trade — sells against an empty queue with no prior lots.
        // Cost basis is unknown (position predates the earliest uploaded session).
        // TotalBuyQty = 0 signals "unknown cost basis" to the UI.
        if (unknownBasisSellQty > 0)
        {
            trades.Add(new IntradayTrade
            {
                SessionId = sessionId,
                Symbol = symbol,
                CompanyName = companyName,
                TradeType = TradeType.Swing,
                EntryDate = null,
                TotalBuyQty = 0,
                TotalSellQty = unknownBasisSellQty,
                AvgBuyPrice = 0,
                AvgSellPrice = unknownBasisSellValue / unknownBasisSellQty,
                MatchedQty = unknownBasisSellQty,
                Pnl = 0,
                OpenBuyQty = 0,
                PriorPositionSellQty = unknownBasisSellQty,
                IsFullyClosed = true,
                Outcome = TradeOutcome.Breakeven,
                Executions = []
            });
        }

        // Intraday trade — same-session buys/sells
        if (intradayBuyQty > 0 || intradaySellQty > 0)
        {
            var openBuyQty = queue.Where(e => !e.IsPrior).Sum(e => e.Qty);
            var intradayTrade = new IntradayTrade
            {
                SessionId = sessionId,
                Symbol = symbol,
                CompanyName = companyName,
                TradeType = TradeType.Intraday,
                EntryDate = sessionDate,
                TotalBuyQty = intradayBuyQty,
                TotalSellQty = intradaySellQty,
                AvgBuyPrice = intradayBuyQty > 0 ? intradayBuyValue / intradayBuyQty : 0,
                AvgSellPrice = intradaySellQty > 0 ? intradaySellValue / intradaySellQty : 0,
                MatchedQty = intradaySellQty,
                Pnl = intradayPnl,
                OpenBuyQty = openBuyQty,
                PriorPositionSellQty = 0,
                IsFullyClosed = openBuyQty <= 0.0001m,
                Outcome = intradayPnl > 0 ? TradeOutcome.Win : intradayPnl < 0 ? TradeOutcome.Loss : TradeOutcome.Breakeven,
                Executions = executions
            };
            foreach (var exec in executions)
                exec.IntradayTradeId = intradayTrade.Id;
            trades.Add(intradayTrade);
        }
        else if (trades.Count > 0)
        {
            // Pure swing (all sells matched prior lots, no today's buys) — link executions to swing trade
            var swingTrade = trades[0];
            swingTrade.Executions = executions;
            foreach (var exec in executions)
                exec.IntradayTradeId = swingTrade.Id;
        }

        return (trades, openLots);
    }

    private static Queue<QueueEntry> ReplaceHead(Queue<QueueEntry> queue, QueueEntry updated)
    {
        queue.Dequeue();
        var items = queue.ToArray();
        var rebuilt = new Queue<QueueEntry>();
        rebuilt.Enqueue(updated);
        foreach (var item in items) rebuilt.Enqueue(item);
        return rebuilt;
    }
}
