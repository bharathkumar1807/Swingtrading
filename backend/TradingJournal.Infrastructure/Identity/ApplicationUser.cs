using Microsoft.AspNetCore.Identity;

namespace TradingJournal.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? DefaultBroker { get; set; }
    public string? DefaultStrategy { get; set; }
    public string? AccentColor { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsApproved { get; set; } = false;
    public DateTime? LastActiveAt { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
