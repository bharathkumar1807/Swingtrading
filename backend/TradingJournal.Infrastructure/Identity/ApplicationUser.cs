using Microsoft.AspNetCore.Identity;

namespace TradingJournal.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? DefaultBroker { get; set; }
    public string? DefaultStrategy { get; set; }
    public string? AccentColor { get; set; }
}
