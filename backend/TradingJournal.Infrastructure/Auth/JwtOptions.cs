namespace TradingJournal.Infrastructure.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "TradingJournal";
    public string Audience { get; set; } = "TradingJournal";
    public string SigningKey { get; set; } = "change-me-development-key-with-at-least-32-characters";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 30;
}
