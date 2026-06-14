using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TradingJournal.Application.Analytics;

namespace TradingJournal.Infrastructure.Services;

public sealed class AnalyticsReviewWorker(IServiceProvider services, ILogger<AnalyticsReviewWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = services.CreateScope();
                _ = scope.ServiceProvider.GetRequiredService<AnalyticsService>();
                logger.LogInformation("Analytics review heartbeat completed at {Time}", DateTimeOffset.UtcNow);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Analytics review worker failed");
            }
        }
    }
}
