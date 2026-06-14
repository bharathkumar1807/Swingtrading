using Microsoft.AspNetCore.Hosting;
using TradingJournal.Application.Abstractions;

namespace TradingJournal.Infrastructure.Files;

public sealed class LocalFileStorage(IWebHostEnvironment environment) : IFileStorage
{
    private static readonly HashSet<string> AllowedTypes = ["image/png", "image/jpeg", "image/webp"];

    public async Task<string> SaveTradeScreenshotAsync(Stream file, string fileName, string contentType, string userId, CancellationToken cancellationToken)
    {
        if (!AllowedTypes.Contains(contentType)) throw new InvalidOperationException("Only PNG, JPEG, and WEBP screenshots are supported.");
        var extension = Path.GetExtension(fileName);
        var safeName = $"{Guid.NewGuid():N}{extension}";
        var root = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", userId);
        Directory.CreateDirectory(root);
        var path = Path.Combine(root, safeName);
        await using var output = File.Create(path);
        await file.CopyToAsync(output, cancellationToken);
        return $"/uploads/{userId}/{safeName}";
    }
}
