using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Imports;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/imports")]
public sealed class ImportsController(StatementImportService imports) : ControllerBase
{
    [HttpPost("statement-preview")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<IReadOnlyList<ImportedTradeDto>>> Preview(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0) return BadRequest("Statement file is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await imports.PreviewAsync(stream, cancellationToken));
    }

    [HttpPost("statement-import")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<StatementImportResult>> Import(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0) return BadRequest("Statement file is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await imports.ImportAsync(stream, cancellationToken));
    }

    [HttpGet("open-lots")]
    public async Task<ActionResult<IReadOnlyList<OpenLotDto>>> OpenLots(CancellationToken cancellationToken)
        => Ok(await imports.GetOpenLotsAsync(cancellationToken));

    [HttpPost("rows")]
    public async Task<ActionResult<StatementImportResult>> ImportRows(ImportCreateRequest request, CancellationToken cancellationToken)
        => Ok(await imports.ImportRowsAsync(request, cancellationToken));

    [HttpPost("debug-text")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<string>> DebugText(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        await using var stream = file.OpenReadStream();
        return Ok(await imports.ExtractRawTextAsync(stream, cancellationToken));
    }
}
