using FluentValidation;

namespace TradingJournal.Application.Trades;

public sealed class UpsertTradeRequestValidator : AbstractValidator<UpsertTradeRequest>
{
    public UpsertTradeRequestValidator()
    {
        RuleFor(x => x.Symbol).NotEmpty().MaximumLength(24);
        RuleFor(x => x.Sector).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Broker).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Strategy).NotEmpty().MaximumLength(120);
        RuleFor(x => x.ConfidenceScore).InclusiveBetween(0, 100);
        RuleFor(x => x.EntryPrice).GreaterThan(0);
        RuleFor(x => x.StopLoss).GreaterThan(0);
        RuleFor(x => x.Size).GreaterThan(0);
        RuleFor(x => x.Fees).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Slippage).GreaterThanOrEqualTo(0);
        RuleFor(x => x.EntryDate).NotEmpty();
        RuleFor(x => x.ExitDate).GreaterThanOrEqualTo(x => x.EntryDate).When(x => x.ExitDate.HasValue);
    }
}
