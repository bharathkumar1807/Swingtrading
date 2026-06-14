using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Abstractions;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/uploads")]
public sealed class UploadsController(IFileStorage storage, IUserContext userContext) : ControllerBase
{
    [HttpPost("trade-screenshot")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<object>> TradeScreenshot(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        var url = await storage.SaveTradeScreenshotAsync(file.OpenReadStream(), file.FileName, file.ContentType, userContext.UserId, cancellationToken);
        return Ok(new { url });
    }
}
