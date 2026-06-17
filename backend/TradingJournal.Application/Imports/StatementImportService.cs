using System.Globalization;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Microsoft.EntityFrameworkCore;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Trades;
using TradingJournal.Domain.Entities;
using TradingJournal.Domain.Enums;

namespace TradingJournal.Application.Imports;

public sealed partial class StatementImportService(IApplicationDbContext db, IUserContext userContext)
{
    private static readonly CultureInfo UsCulture = CultureInfo.GetCultureInfo("en-US");

    public async Task<IReadOnlyList<ImportedTradeDto>> PreviewAsync(Stream pdfStream, CancellationToken cancellationToken)
    {
        await using var memory = new MemoryStream();
        await pdfStream.CopyToAsync(memory, cancellationToken);
        var text = ExtractText(memory.ToArray());
        return ParseRobinhoodActivity(text);
    }

    public async Task<StatementImportResult> ImportAsync(Stream pdfStream, CancellationToken cancellationToken)
    {
        var imported = await PreviewAsync(pdfStream, cancellationToken);
        var existingKeys = await db.Trades
            .Where(t => t.UserId == userContext.UserId)
            .Select(t => new { t.Symbol, t.EntryDate, t.Size, t.EntryPrice, t.Broker })
            .ToListAsync(cancellationToken);

        var trades = imported
            .Where(row => !existingKeys.Any(x =>
                x.Symbol == row.Symbol &&
                x.EntryDate.Date == row.TransactionDate.Date &&
                x.Size == row.Quantity &&
                x.EntryPrice == row.Price &&
                x.Broker == row.Broker))
            .Select(ToTrade)
            .ToList();

        db.Trades.AddRange(trades);
        await db.SaveChangesAsync(cancellationToken);
        return new StatementImportResult(trades.Count, trades.Select(t => t.ToDto()).ToList());
    }

    public async Task<IReadOnlyList<OpenLotDto>> GetOpenLotsAsync(CancellationToken cancellationToken)
    {
        var trades = await db.Trades
            .AsNoTracking()
            .Where(t => t.UserId == userContext.UserId && t.ExitPrice == null)
            .OrderBy(t => t.EntryDate)
            .ToListAsync(cancellationToken);

        return trades.Select(t => new OpenLotDto(t.Id, t.Symbol, t.Size, t.EntryPrice, t.EntryDate)).ToList();
    }

    public async Task<string> ExtractRawTextAsync(Stream pdfStream, CancellationToken cancellationToken)
    {
        await using var memory = new MemoryStream();
        await pdfStream.CopyToAsync(memory, cancellationToken);
        return ExtractText(memory.ToArray());
    }

    public async Task<StatementImportResult> ImportRowsAsync(ImportCreateRequest request, CancellationToken cancellationToken)
    {
        var trades = request.Rows.Select(row =>
        {
            var trade = new Trade
            {
                UserId = userContext.UserId,
                Symbol = row.Symbol.Trim().ToUpperInvariant(),
                Broker = row.Broker,
                Sector = row.Sector,
                Strategy = row.Strategy,
                ConfidenceScore = row.ConfidenceScore,
                Notes = row.Notes,
                Tags = row.Tags.ToList(),
                EntryPrice = row.EntryPrice,
                ExitPrice = row.ExitPrice,
                StopLoss = row.StopLoss,
                Size = row.Size,
                Fees = 0,
                Slippage = 0,
                Mistakes = row.Mistakes.ToList(),
                PositionType = row.PositionType,
                EntryDate = row.EntryDate,
                ExitDate = row.ExitDate
            };
            trade.Recalculate();
            return trade;
        }).ToList();

        db.Trades.AddRange(trades);
        await db.SaveChangesAsync(cancellationToken);
        return new StatementImportResult(trades.Count, trades.Select(t => t.ToDto()).ToList());
    }

    private Trade ToTrade(ImportedTradeDto imported)
    {
        var trade = new Trade
        {
            UserId = userContext.UserId,
            Symbol = imported.Symbol,
            Broker = imported.Broker,
            Strategy = imported.Strategy,
            Sector = imported.Sector,
            ConfidenceScore = 50,
            Notes = $"Imported from account statement. Action: {imported.Action}. Description: {imported.Description}",
            Tags = ["imported", imported.Action.ToLowerInvariant()],
            EntryPrice = imported.Price,
            StopLoss = imported.Price,
            Size = imported.Quantity,
            Fees = 0,
            Slippage = 0,
            PositionType = imported.Action.Equals("Sell", StringComparison.OrdinalIgnoreCase) ? PositionType.Short : PositionType.Long,
            EntryDate = imported.TransactionDate
        };

        trade.Recalculate();
        return trade;
    }

    private static string ExtractText(byte[] bytes)
    {
        try
        {
            using var reader = new PdfReader(new MemoryStream(bytes));
            using var document = new PdfDocument(reader);
            var pages = new List<string>();
            for (var pageNumber = 1; pageNumber <= document.GetNumberOfPages(); pageNumber++)
            {
                var strategy = new LocationTextExtractionStrategy();
                pages.Add(PdfTextExtractor.GetTextFromPage(document.GetPage(pageNumber), strategy));
            }
            var text = string.Join(Environment.NewLine, pages);
            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("No text could be extracted from this PDF. It may be a scanned/image-based document. Please use a text-based Robinhood Account Activity statement.");
            return text;
        }
        catch (InvalidOperationException) { throw; }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Could not open PDF: {ex.Message}. Make sure the file is a valid, unencrypted Robinhood Account Activity PDF.");
        }
    }

    private static IReadOnlyList<ImportedTradeDto> ParseRobinhoodActivity(string text)
    {
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => Whitespace().Replace(line.Trim(), " "))
            .Where(line => line.Length > 0)
            .ToList();

        var rows = new List<ImportedTradeDto>();
        var lastDescription = string.Empty;
        foreach (var line in lines)
        {
            var match = ActivityRow().Match(line);
            if (!match.Success)
            {
                if (IsDescriptionLine(line)) lastDescription = line;
                continue;
            }

            var inlineDescription = match.Groups["description"].Success
                ? match.Groups["description"].Value.Trim()
                : string.Empty;

            rows.Add(new ImportedTradeDto(
                match.Groups["symbol"].Value,
                "Robinhood",
                match.Groups["action"].Value,
                DateTime.ParseExact(match.Groups["date"].Value, "MM/dd/yyyy", UsCulture),
                Decimal(match.Groups["qty"].Value),
                Decimal(match.Groups["price"].Value),
                Decimal(match.Groups["amount"].Value),
                !string.IsNullOrWhiteSpace(inlineDescription) ? inlineDescription : lastDescription,
                "Statement Import",
                "Unclassified"));
        }

        return rows;
    }

    private static decimal Decimal(string value) => decimal.Parse(value.Replace("$", "").Replace(",", ""), UsCulture);

    private static bool IsDescriptionLine(string line)
    {
        if (line.StartsWith("Page ", StringComparison.OrdinalIgnoreCase)) return false;
        if (line.StartsWith("CUSIP:", StringComparison.OrdinalIgnoreCase)) return false;
        if (line.Contains("Account Activity", StringComparison.OrdinalIgnoreCase)) return false;
        if (line.Contains("Description Symbol", StringComparison.OrdinalIgnoreCase)) return false;
        if (line.Contains("Margin ", StringComparison.OrdinalIgnoreCase)) return false;
        if (line.Contains("$", StringComparison.OrdinalIgnoreCase)) return false;
        return Regex.IsMatch(line, "^[A-Za-z][A-Za-z\\- .&]+$");
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    [GeneratedRegex(@"^(?:(?<description>[A-Za-z][A-Za-z\-.& ]{1,80}?)\s+)?(?:CUSIP:\s+\S+\s+)?(?<symbol>[A-Z.]{1,8})\s+(?:Margin|Cash|IRA|Option|Roth|Individual)\s+(?<action>Buy|Sell)\s+(?<date>\d{2}/\d{2}/\d{4})\s+(?<qty>[\d.]+)\s+\$(?<price>[\d,]+\.\d+)\s+\$(?<amount>[\d,]+\.\d+)", RegexOptions.IgnoreCase)]
    private static partial Regex ActivityRow();
}
