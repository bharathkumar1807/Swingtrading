using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Trades;

namespace TradingJournal.Application.Exports;

public sealed class ExportService(IApplicationDbContext db, IUserContext userContext)
{
    public async Task<byte[]> ExportCsvAsync(IReadOnlyList<Guid>? ids, CancellationToken cancellationToken)
    {
        var trades = await Query(ids).OrderByDescending(t => t.EntryDate).ToListAsync(cancellationToken);
        var csv = new StringBuilder();
        csv.AppendLine("Symbol,Sector,Broker,Strategy,EntryDate,ExitDate,PositionType,EntryPrice,ExitPrice,StopLoss,Size,Fees,Slippage,Pnl,RMultiple,Outcome,Tags,Mistakes");
        foreach (var t in trades)
        {
            csv.AppendLine(string.Join(",", [
                Esc(t.Symbol), Esc(t.Sector), Esc(t.Broker), Esc(t.Strategy), t.EntryDate.ToString("O"), t.ExitDate?.ToString("O") ?? "",
                t.PositionType.ToString(), t.EntryPrice.ToString(), t.ExitPrice?.ToString() ?? "", t.StopLoss.ToString(), t.Size.ToString(),
                t.Fees.ToString(), t.Slippage.ToString(), t.Pnl.ToString(), t.RMultiple.ToString(), t.Outcome.ToString(),
                Esc(string.Join("|", t.Tags)), Esc(string.Join("|", t.Mistakes))
            ]));
        }
        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public async Task<byte[]> ExportJsonAsync(IReadOnlyList<Guid>? ids, CancellationToken cancellationToken)
    {
        var trades = await Query(ids).OrderByDescending(t => t.EntryDate).Select(t => t.ToDto()).ToListAsync(cancellationToken);
        return JsonSerializer.SerializeToUtf8Bytes(trades, new JsonSerializerOptions { WriteIndented = true });
    }

    private IQueryable<Domain.Entities.Trade> Query(IReadOnlyList<Guid>? ids)
    {
        var query = db.Trades.AsNoTracking().Where(t => t.UserId == userContext.UserId);
        return ids is { Count: > 0 } ? query.Where(t => ids.Contains(t.Id)) : query;
    }

    private static string Esc(string value) => value.Contains(',') || value.Contains('"') ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
}
