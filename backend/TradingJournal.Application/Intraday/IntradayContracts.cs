namespace TradingJournal.Application.Intraday;

public sealed record ExecutionDto(
    Guid Id,
    string Symbol,
    string CompanyName,
    string Side,
    decimal Price,
    decimal Quantity,
    decimal Principal,
    decimal Fees,
    decimal NetAmount,
    DateTime TradeDate,
    int SequenceOrder,
    Guid? IntradayTradeId);

public sealed record IntradayTradeDto(
    Guid Id,
    string Symbol,
    string CompanyName,
    decimal TotalBuyQty,
    decimal TotalSellQty,
    decimal AvgBuyPrice,
    decimal AvgSellPrice,
    decimal MatchedQty,
    decimal Pnl,
    decimal OpenBuyQty,
    decimal PriorPositionSellQty,
    bool IsFullyClosed,
    string Outcome,
    List<ExecutionDto> Executions);

public sealed record IntradaySessionDto(
    Guid Id,
    DateOnly SessionDate,
    string Broker,
    decimal TotalPnl,
    int WinCount,
    int LossCount,
    int BreakevenCount,
    int TotalExecutions,
    List<string> Symbols,
    List<IntradayTradeDto> IntradayTrades);

public sealed record IntradaySessionSummaryDto(
    Guid Id,
    DateOnly SessionDate,
    string Broker,
    decimal TotalPnl,
    int WinCount,
    int LossCount,
    int TotalExecutions,
    List<string> Symbols);

public sealed record IntradayPreviewDto(
    DateOnly SessionDate,
    string Broker,
    int TotalExecutions,
    List<IntradayTradeDto> Trades);
