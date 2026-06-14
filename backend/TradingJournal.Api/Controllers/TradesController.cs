using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Trades;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/trades")]
public sealed class TradesController(TradeService trades) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TradeDto>>> Get([FromQuery] TradeQuery query, CancellationToken cancellationToken)
        => Ok(await trades.GetAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TradeDto>> GetById(Guid id, CancellationToken cancellationToken)
        => await trades.GetByIdAsync(id, cancellationToken) is { } trade ? Ok(trade) : NotFound();

    [HttpPost]
    public async Task<ActionResult<TradeDto>> Create(UpsertTradeRequest request, CancellationToken cancellationToken)
    {
        var trade = await trades.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = trade.Id }, trade);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TradeDto>> Update(Guid id, UpsertTradeRequest request, CancellationToken cancellationToken)
        => await trades.UpdateAsync(id, request, cancellationToken) is { } trade ? Ok(trade) : NotFound();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        => await trades.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("reset")]
    public async Task<ActionResult<object>> Reset(CancellationToken cancellationToken)
        => Ok(new { deleted = await trades.ResetAsync(cancellationToken) });
}
