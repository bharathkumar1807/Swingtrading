using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.DailyPlan;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/daily-plan")]
public sealed class DailyPlanController(DailyPlanService dailyPlan) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DailyStockPlanDto>>> GetByDate(
        [FromQuery] DateOnly date, CancellationToken ct)
        => Ok(await dailyPlan.GetByDateAsync(date, ct));

    [HttpGet("range")]
    public async Task<ActionResult<List<DailyStockPlanDto>>> GetRange(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
        => Ok(await dailyPlan.GetRangeAsync(from, to, ct));

    [HttpGet("weekly-stats")]
    public async Task<ActionResult<WeeklyPlanStatsDto>> GetWeeklyStats(
        [FromQuery] DateOnly weekStart, CancellationToken ct)
        => Ok(await dailyPlan.GetWeeklyStatsAsync(weekStart, ct));

    [HttpPost]
    public async Task<ActionResult<DailyStockPlanDto>> Create(
        [FromBody] CreateDailyStockPlanRequest req, CancellationToken ct)
    {
        var result = await dailyPlan.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetByDate), new { date = result.Date }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DailyStockPlanDto>> Update(
        Guid id, [FromBody] UpdateDailyStockPlanRequest req, CancellationToken ct)
    {
        try { return Ok(await dailyPlan.UpdateAsync(id, req, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try { await dailyPlan.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // ── Legs ──────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/legs")]
    public async Task<ActionResult<DailyStockPlanDto>> AddLeg(
        Guid id, [FromBody] AddLegRequest req, CancellationToken ct)
    {
        try { return Ok(await dailyPlan.AddLegAsync(id, req, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("legs/{legId:guid}")]
    public async Task<ActionResult<DailyStockPlanDto>> DeleteLeg(Guid legId, CancellationToken ct)
    {
        try { return Ok(await dailyPlan.DeleteLegAsync(legId, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // ── Import from session ───────────────────────────────────────────────

    [HttpPost("import-from-session")]
    public async Task<ActionResult<List<DailyStockPlanDto>>> ImportFromSession(
        [FromBody] ImportFromSessionRequest req, CancellationToken ct)
    {
        try { return Ok(await dailyPlan.ImportFromSessionAsync(req, ct)); }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }
}
