using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Exports;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/exports")]
public sealed class ExportsController(ExportService exports) : ControllerBase
{
    [HttpPost("csv")]
    public async Task<FileContentResult> Csv(ExportRequest request, CancellationToken cancellationToken)
        => File(await exports.ExportCsvAsync(request.Ids, cancellationToken), "text/csv", "trades.csv");

    [HttpPost("json")]
    public async Task<FileContentResult> Json(ExportRequest request, CancellationToken cancellationToken)
        => File(await exports.ExportJsonAsync(request.Ids, cancellationToken), "application/json", "trades.json");

    [HttpPost("zip")]
    public IActionResult ZipPlaceholder()
        => Accepted(new { message = "ZIP export endpoint is reserved for screenshot bundle generation." });
}

public sealed record ExportRequest(IReadOnlyList<Guid>? Ids);
