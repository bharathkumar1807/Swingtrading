namespace TradingJournal.Application.Imports;

public sealed record ImportedTradeDto(
    string Symbol,
    string Broker,
    string Action,
    DateTime TransactionDate,
    decimal Quantity,
    decimal Price,
    decimal Amount,
    string Description,
    string Strategy,
    string Sector);

public sealed record StatementImportResult(int ImportedCount, IReadOnlyList<Trades.TradeDto> Trades);

public sealed record ImportCreateRequest(IReadOnlyList<ImportCreateRow> Rows);

public sealed record ImportCreateRow(
    string Symbol,
    string Broker,
    string Sector,
    string Strategy,
    int ConfidenceScore,
    string Notes,
    IReadOnlyList<string> Tags,
    decimal EntryPrice,
    decimal? ExitPrice,
    decimal StopLoss,
    decimal Size,
    IReadOnlyList<string> Mistakes,
    Domain.Enums.PositionType PositionType,
    DateTime EntryDate,
    DateTime? ExitDate);

public sealed record OpenLotDto(Guid TradeId, string Symbol, decimal RemainingQuantity, decimal EntryPrice, DateTime EntryDate);
