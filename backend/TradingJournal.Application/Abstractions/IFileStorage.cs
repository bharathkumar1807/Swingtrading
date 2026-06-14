namespace TradingJournal.Application.Abstractions;

public interface IFileStorage
{
    Task<string> SaveTradeScreenshotAsync(Stream file, string fileName, string contentType, string userId, CancellationToken cancellationToken);
}
