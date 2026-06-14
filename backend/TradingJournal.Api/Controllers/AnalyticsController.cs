using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Analytics;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public sealed class AnalyticsController(AnalyticsService analytics) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard(CancellationToken cancellationToken)
        => Ok(await analytics.GetDashboardAsync(cancellationToken));

    [HttpGet("strategies")]
    public async Task<ActionResult<IReadOnlyList<StrategyMetric>>> Strategies(CancellationToken cancellationToken)
        => Ok(await analytics.GetStrategiesAsync(cancellationToken));

    [HttpGet("mistakes")]
    public async Task<ActionResult<MistakeAnalyticsDto>> Mistakes(CancellationToken cancellationToken)
        => Ok(await analytics.GetMistakesAsync(cancellationToken));

    [HttpGet("review")]
    public async Task<ActionResult<ReviewDto>> Review(CancellationToken cancellationToken)
        => Ok(await analytics.GetReviewAsync(cancellationToken));
}
