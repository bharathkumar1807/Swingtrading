using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Intraday;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/intraday")]
public sealed class IntradayController(IntradayService intraday) : ControllerBase
{
    [HttpPost("preview")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<IntradayPreviewDto>> Preview(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await intraday.PreviewAsync(stream, ct));
    }

    [HttpPost("import")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<IntradaySessionDto>> Import(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await intraday.ImportAsync(stream, ct));
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<List<IntradaySessionSummaryDto>>> GetSessions(CancellationToken ct)
        => Ok(await intraday.GetSessionsAsync(ct));

    [HttpGet("sessions/{id:guid}")]
    public async Task<ActionResult<IntradaySessionDto>> GetSession(Guid id, CancellationToken ct)
        => Ok(await intraday.GetSessionAsync(id, ct));

    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> DeleteSession(Guid id, CancellationToken ct)
    {
        await intraday.DeleteSessionAsync(id, ct);
        return NoContent();
    }

    [HttpPost("recalculate")]
    public async Task<IActionResult> Recalculate(CancellationToken ct)
    {
        await intraday.RecalculateAllAsync(ct);
        return NoContent();
    }

    [HttpPost("debug-text")]
    [AllowAnonymous]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<string>> DebugText(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await intraday.ExtractRawTextAsync(stream, ct));
    }
}
