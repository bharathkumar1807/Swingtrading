using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Domain.Entities;

namespace TradingJournal.Application.Trades;

public sealed class TradeService(IApplicationDbContext db, IUserContext userContext)
{
    public async Task<PagedResult<TradeDto>> GetAsync(TradeQuery query, CancellationToken cancellationToken)
    {
        var trades = db.Trades.AsNoTracking().Where(t => t.UserId == userContext.UserId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            trades = trades.Where(t => t.Symbol.ToLower().Contains(search) || t.Strategy.ToLower().Contains(search) || t.Tags.Any(tag => tag.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Symbol)) trades = trades.Where(t => t.Symbol == query.Symbol);
        if (!string.IsNullOrWhiteSpace(query.Sector)) trades = trades.Where(t => t.Sector == query.Sector);
        if (!string.IsNullOrWhiteSpace(query.Strategy)) trades = trades.Where(t => t.Strategy == query.Strategy);
        if (!string.IsNullOrWhiteSpace(query.Broker)) trades = trades.Where(t => t.Broker == query.Broker);
        if (!string.IsNullOrWhiteSpace(query.Mistake)) trades = trades.Where(t => t.Mistakes.Contains(query.Mistake));
        if (query.PositionType.HasValue) trades = trades.Where(t => t.PositionType == query.PositionType);
        if (query.MinConfidence.HasValue) trades = trades.Where(t => t.ConfidenceScore >= query.MinConfidence);
        if (query.MaxConfidence.HasValue) trades = trades.Where(t => t.ConfidenceScore <= query.MaxConfidence);
        if (query.From.HasValue) trades = trades.Where(t => t.EntryDate >= query.From.Value);
        if (query.To.HasValue) trades = trades.Where(t => t.EntryDate <= query.To.Value);
        if (query.ProfitLoss?.Equals("profit", StringComparison.OrdinalIgnoreCase) == true) trades = trades.Where(t => t.Pnl > 0);
        if (query.ProfitLoss?.Equals("loss", StringComparison.OrdinalIgnoreCase) == true) trades = trades.Where(t => t.Pnl < 0);

        trades = (query.SortBy?.ToLower(), query.Desc) switch
        {
            ("pnl", true) => trades.OrderByDescending(t => t.Pnl),
            ("pnl", false) => trades.OrderBy(t => t.Pnl),
            ("symbol", true) => trades.OrderByDescending(t => t.Symbol),
            ("symbol", false) => trades.OrderBy(t => t.Symbol),
            ("confidence", true) => trades.OrderByDescending(t => t.ConfidenceScore),
            ("confidence", false) => trades.OrderBy(t => t.ConfidenceScore),
            (_, false) => trades.OrderBy(t => t.EntryDate),
            _ => trades.OrderByDescending(t => t.EntryDate)
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var total = await trades.CountAsync(cancellationToken);
        var items = await trades.Skip((page - 1) * pageSize).Take(pageSize).Select(t => t.ToDto()).ToListAsync(cancellationToken);
        return new PagedResult<TradeDto>(items, total, page, pageSize);
    }

    public async Task<TradeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var trade = await db.Trades.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id && t.UserId == userContext.UserId, cancellationToken);
        return trade?.ToDto();
    }

    public async Task<TradeDto> CreateAsync(UpsertTradeRequest request, CancellationToken cancellationToken)
    {
        var trade = Apply(new Trade { UserId = userContext.UserId }, request);
        db.Trades.Add(trade);
        await db.SaveChangesAsync(cancellationToken);
        return trade.ToDto();
    }

    public async Task<TradeDto?> UpdateAsync(Guid id, UpsertTradeRequest request, CancellationToken cancellationToken)
    {
        var trade = await db.Trades.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userContext.UserId, cancellationToken);
        if (trade is null) return null;
        Apply(trade, request);
        await db.SaveChangesAsync(cancellationToken);
        return trade.ToDto();
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var trade = await db.Trades.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userContext.UserId, cancellationToken);
        if (trade is null) return false;
        db.Trades.Remove(trade);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> ResetAsync(CancellationToken cancellationToken)
    {
        var trades = await db.Trades.Where(t => t.UserId == userContext.UserId).ToListAsync(cancellationToken);
        db.Trades.RemoveRange(trades);
        await db.SaveChangesAsync(cancellationToken);
        return trades.Count;
    }

    private static Trade Apply(Trade trade, UpsertTradeRequest request)
    {
        trade.Symbol = request.Symbol.Trim().ToUpperInvariant();
        trade.Sector = request.Sector.Trim();
        trade.Broker = request.Broker.Trim();
        trade.Strategy = request.Strategy.Trim();
        trade.ConfidenceScore = request.ConfidenceScore;
        trade.Notes = request.Notes;
        trade.ScreenshotUrl = request.ScreenshotUrl;
        trade.Tags = request.Tags.Select(x => x.Trim()).Where(x => x.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        trade.EntryPrice = request.EntryPrice;
        trade.ExitPrice = request.ExitPrice;
        trade.StopLoss = request.StopLoss;
        trade.Size = request.Size;
        trade.Fees = request.Fees;
        trade.Slippage = request.Slippage;
        trade.Mistakes = request.Mistakes.Select(x => x.Trim()).Where(x => x.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        trade.PositionType = request.PositionType;
        trade.EntryDate = request.EntryDate;
        trade.ExitDate = request.ExitDate;
        trade.Recalculate();
        return trade;
    }
}
