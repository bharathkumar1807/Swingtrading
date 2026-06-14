using System.Globalization;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Intraday;

public sealed partial class IntradayService(IApplicationDbContext db, IUserContext userContext)
{
    private static readonly CultureInfo UsCulture = CultureInfo.GetCultureInfo("en-US");

    public async Task<IntradayPreviewDto> PreviewAsync(Stream pdfStream, CancellationToken ct)
    {
        await using var memory = new MemoryStream();
        await pdfStream.CopyToAsync(memory, ct);
        string text;
        try { text = ExtractText(memory.ToArray()); }
        catch (Exception ex) { throw new InvalidOperationException($"Could not open PDF: {ex.Message}"); }

        var executions = ParseTransactionConfirmation(text);
        if (executions.Count == 0)
        {
            if (!text.Contains("CUSIP", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("This does not appear to be a Robinhood Transaction Confirmation — no CUSIP entries found.");
            return new IntradayPreviewDto(DateOnly.FromDateTime(DateTime.UtcNow), "Robinhood", 0, []);
        }

        var sessionDate = DateOnly.FromDateTime(executions.Min(e => e.TradeDate));
        var tempSessionId = Guid.NewGuid();
        foreach (var e in executions) e.SessionId = tempSessionId;

        var trades = IntradayMatchingEngine.Match(tempSessionId, executions);
        return new IntradayPreviewDto(
            sessionDate,
            "Robinhood",
            executions.Count,
            trades.Select(ToTradeDto).ToList());
    }

    public async Task<IntradaySessionDto> ImportAsync(Stream pdfStream, CancellationToken ct)
    {
        await using var memory = new MemoryStream();
        await pdfStream.CopyToAsync(memory, ct);
        string text;
        try { text = ExtractText(memory.ToArray()); }
        catch (Exception ex) { throw new InvalidOperationException($"Could not open PDF: {ex.Message}"); }

        var executions = ParseTransactionConfirmation(text);
        if (executions.Count == 0)
            throw new InvalidOperationException("No trade executions found in this statement.");

        var sessionDate = DateOnly.FromDateTime(executions.Min(e => e.TradeDate));

        var existing = await db.IntradaySessions
            .FirstOrDefaultAsync(s => s.UserId == userContext.UserId && s.SessionDate == sessionDate, ct);
        if (existing is not null)
            throw new InvalidOperationException($"A session for {sessionDate:yyyy-MM-dd} already exists.");

        var session = new IntradaySession
        {
            UserId = userContext.UserId,
            SessionDate = sessionDate,
            Broker = "Robinhood",
            TotalExecutions = executions.Count,
        };

        foreach (var e in executions) e.SessionId = session.Id;
        var trades = IntradayMatchingEngine.Match(session.Id, executions);

        session.IntradayTrades = trades;
        session.Executions = executions;
        session.TotalPnl = trades.Sum(t => t.Pnl);
        session.WinCount = trades.Count(t => t.Outcome == Domain.Enums.TradeOutcome.Win);
        session.LossCount = trades.Count(t => t.Outcome == Domain.Enums.TradeOutcome.Loss);
        session.BreakevenCount = trades.Count(t => t.Outcome == Domain.Enums.TradeOutcome.Breakeven);

        db.IntradaySessions.Add(session);
        await db.SaveChangesAsync(ct);

        return ToSessionDto(session);
    }

    public async Task<List<IntradaySessionSummaryDto>> GetSessionsAsync(CancellationToken ct)
    {
        var sessions = await db.IntradaySessions
            .AsNoTracking()
            .Where(s => s.UserId == userContext.UserId)
            .Include(s => s.IntradayTrades)
            .OrderByDescending(s => s.SessionDate)
            .ToListAsync(ct);

        return sessions.Select(s => new IntradaySessionSummaryDto(
            s.Id,
            s.SessionDate,
            s.Broker,
            s.TotalPnl,
            s.WinCount,
            s.LossCount,
            s.TotalExecutions,
            s.IntradayTrades.Select(t => t.Symbol).ToList()
        )).ToList();
    }

    public async Task<IntradaySessionDto> GetSessionAsync(Guid id, CancellationToken ct)
    {
        var session = await db.IntradaySessions
            .AsNoTracking()
            .Where(s => s.UserId == userContext.UserId && s.Id == id)
            .Include(s => s.IntradayTrades)
                .ThenInclude(t => t.Executions)
            .Include(s => s.Executions)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Session not found.");

        return ToSessionDto(session);
    }

    public async Task DeleteSessionAsync(Guid id, CancellationToken ct)
    {
        var session = await db.IntradaySessions
            .Where(s => s.UserId == userContext.UserId && s.Id == id)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Session not found.");

        db.IntradaySessions.Remove(session);
        await db.SaveChangesAsync(ct);
    }

    public async Task<string> ExtractRawTextAsync(Stream pdfStream, CancellationToken ct)
    {
        await using var memory = new MemoryStream();
        await pdfStream.CopyToAsync(memory, ct);
        return ExtractText(memory.ToArray());
    }

    // ── PDF parsing ────────────────────────────────────────────────────────────

    private static string ExtractText(byte[] bytes)
    {
        using var reader = new PdfReader(new MemoryStream(bytes));
        using var document = new PdfDocument(reader);
        var pages = new List<string>();
        for (var i = 1; i <= document.GetNumberOfPages(); i++)
        {
            var strategy = new LocationTextExtractionStrategy();
            pages.Add(PdfTextExtractor.GetTextFromPage(document.GetPage(i), strategy));
        }
        return string.Join(Environment.NewLine, pages);
    }

    private static List<Execution> ParseTransactionConfirmation(string text)
    {
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => Whitespace().Replace(l.Trim(), " "))
            .Where(l => l.Length > 0)
            .ToList();

        var executions = new List<Execution>();
        var sequence = 0;

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];

            // Find a CUSIP line — this is the anchor we trust.
            // Format: "HKIT CUSIP: G45139121"
            // Sometimes with company prefix: "Hitek Global Inc. HKIT CUSIP: G45139121"
            var cusipMatch = CusipLine().Match(line);
            if (!cusipMatch.Success) continue;

            var symbol = cusipMatch.Groups["symbol"].Value;

            // Layout A (most common with LocationTextExtractionStrategy):
            //   Line i-1: "Hitek Global Inc. B 06/11/2026 06/12/2026 M $0.8802 50 $44.01 ..."
            //   Line i:   "HKIT CUSIP: G45139121"
            // The company name and transaction data are on the SAME line because iText7
            // places all text at the same y-position on a single line.
            if (i > 0)
            {
                var prevLine = lines[i - 1];
                var embedded = TransactionEmbedded().Match(prevLine);
                if (embedded.Success)
                {
                    var company = prevLine[..embedded.Index].Trim().TrimEnd('.');
                    try { executions.Add(BuildExecution(embedded, symbol, company, sequence++)); }
                    catch { /* skip malformed row */ }
                    continue;
                }
            }

            // Layout B (alternative):
            //   Line i:   "HKIT CUSIP: G45139121"
            //   Line i+1: "B 06/11/2026 06/12/2026 M $0.8802 50 $44.01 ..."
            if (i + 1 < lines.Count)
            {
                var nextLine = lines[i + 1];
                var txNext = TransactionLine().Match(nextLine);
                if (txNext.Success)
                {
                    var company = cusipMatch.Groups["company"].Success
                        ? cusipMatch.Groups["company"].Value.Trim()
                        : (i > 0 ? TryExtractCompanyName(lines[i - 1]) ?? string.Empty : string.Empty);
                    try { executions.Add(BuildExecution(txNext, symbol, company, sequence++)); }
                    catch { /* skip malformed row */ }
                    i++;
                }
            }
        }

        return executions;
    }

    private static Execution BuildExecution(Match m, string symbol, string company, int seq)
    {
        var sideStr = m.Groups["side"].Value.ToUpperInvariant();
        var side = sideStr is "B" or "BTC" ? ExecutionSide.Buy : ExecutionSide.Sell;
        var price = ParseDecimal(m.Groups["price"].Value);
        var qty = ParseDecimal(m.Groups["qty"].Value);
        var fees = ParseDecimal(m.Groups["fees"].Value);
        var netAmount = ParseDecimal(m.Groups["netAmount"].Value);
        var tradeDate = DateTime.SpecifyKind(DateTime.ParseExact(m.Groups["date"].Value, "MM/dd/yyyy", UsCulture), DateTimeKind.Utc);
        return new Execution
        {
            Symbol = symbol,
            CompanyName = company,
            Side = side,
            Price = price,
            Quantity = qty,
            Principal = price * qty,
            Fees = fees,
            NetAmount = netAmount,
            TradeDate = tradeDate,
            SequenceOrder = seq,
        };
    }

    private static string? TryExtractCompanyName(string line)
    {
        if (line.Contains('$') || line.Contains('/') || line.StartsWith("Page", StringComparison.OrdinalIgnoreCase))
            return null;
        return CompanyNameLine().IsMatch(line) ? line.Trim() : null;
    }

    private static decimal ParseDecimal(string value) =>
        decimal.Parse(value.Replace(",", ""), UsCulture);

    // ── Mapping ─────────────────────────────────────────────────────────────────

    private static IntradaySessionDto ToSessionDto(IntradaySession session) => new(
        session.Id,
        session.SessionDate,
        session.Broker,
        session.TotalPnl,
        session.WinCount,
        session.LossCount,
        session.BreakevenCount,
        session.TotalExecutions,
        session.IntradayTrades.Select(t => t.Symbol).Distinct().ToList(),
        session.IntradayTrades.Select(ToTradeDto).ToList());

    private static IntradayTradeDto ToTradeDto(IntradayTrade t) => new(
        t.Id,
        t.Symbol,
        t.CompanyName,
        t.TotalBuyQty,
        t.TotalSellQty,
        t.AvgBuyPrice,
        t.AvgSellPrice,
        t.MatchedQty,
        t.Pnl,
        t.OpenBuyQty,
        t.PriorPositionSellQty,
        t.IsFullyClosed,
        t.Outcome.ToString(),
        t.Executions.OrderBy(e => e.SequenceOrder).Select(ToExecDto).ToList());

    private static ExecutionDto ToExecDto(Execution e) => new(
        e.Id,
        e.Symbol,
        e.CompanyName,
        e.Side.ToString(),
        e.Price,
        e.Quantity,
        e.Principal,
        e.Fees,
        e.NetAmount,
        e.TradeDate,
        e.SequenceOrder,
        e.IntradayTradeId);

    // ── Regex ───────────────────────────────────────────────────────────────────

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    // Matches: optional "Company Name  " then "TICKER CUSIP: XXXXX"
    [GeneratedRegex(@"^(?:(?<company>[A-Za-z][A-Za-z0-9 &.,\-]{2,60}?)\s+)?(?<symbol>[A-Z][A-Z0-9.]{0,7})\s+CUSIP:\s+\S+", RegexOptions.IgnoreCase)]
    private static partial Regex CusipLine();

    // Matches a full transaction-only line (anchored), for Layout B where tx follows CUSIP line.
    // Example: "B 06/11/2026 06/12/2026 M $0.8802 50 $44.01 $0.00 $0.00 $0.00 $44.01 OTC 1 U"
    // Market code uses \S+ (handles single letters like M/N/Q and multi-char like NMS/OTC).
    // Intermediate $ columns use {2,5} to tolerate Robinhood adding/removing columns over time.
    [GeneratedRegex(@"^(?<side>B|S|BC|SS|BTC|STO)\s+(?<date>\d{2}/\d{2}/\d{4})\s+\d{2}/\d{2}/\d{4}\s+\S+\s+\$(?<price>[\d,.]+)\s+(?<qty>[\d,.]+)\s+(?:\$[\d,.]+\s+){2,5}\$(?<fees>[\d,.]+)\s+\$(?<netAmount>[\d,.]+)")]
    private static partial Regex TransactionLine();

    // Non-anchored version for Layout A where iText7 merges company name + transaction on one line.
    // Example: "Hitek Global Inc. B 06/11/2026 06/12/2026 M $0.8802 50 $44.01 $0.00 $0.00 $0.00 $44.01 OTC 1 U"
    [GeneratedRegex(@"(?<side>B|S|BC|SS|BTC|STO)\s+(?<date>\d{2}/\d{2}/\d{4})\s+\d{2}/\d{2}/\d{4}\s+\S+\s+\$(?<price>[\d,.]+)\s+(?<qty>[\d,.]+)\s+(?:\$[\d,.]+\s+){2,5}\$(?<fees>[\d,.]+)\s+\$(?<netAmount>[\d,.]+)")]
    private static partial Regex TransactionEmbedded();

    [GeneratedRegex(@"^[A-Z][A-Za-z0-9 &.,\-]{2,60}$")]
    private static partial Regex CompanyNameLine();
}
