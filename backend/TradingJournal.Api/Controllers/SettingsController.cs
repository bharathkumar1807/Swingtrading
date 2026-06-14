using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Trades;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController(TradeService trades) : ControllerBase
{
    [HttpDelete("reset-user-data")]
    public async Task<ActionResult<object>> ResetUserData(CancellationToken cancellationToken)
        => Ok(new { deletedTrades = await trades.ResetAsync(cancellationToken) });
}
