namespace TradingJournal.Application.Auth;

public sealed record RegisterRequest(string Email, string Password, string FullName);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc, UserProfile User);
public sealed record UserProfile(string Id, string Email, string FullName);
