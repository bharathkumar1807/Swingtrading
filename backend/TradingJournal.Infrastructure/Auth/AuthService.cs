using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TradingJournal.Application.Abstractions;
using TradingJournal.Application.Admin;
using TradingJournal.Application.Auth;
using TradingJournal.Domain.Entities;
using TradingJournal.Infrastructure.Identity;
using TradingJournal.Infrastructure.Persistence;

namespace TradingJournal.Infrastructure.Auth;

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext db,
    IOptions<JwtOptions> options,
    IConfiguration configuration) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;
    private readonly string? _adminEmail = configuration.GetValue<string>("AdminSeeder:Email");

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var isAdmin = !string.IsNullOrWhiteSpace(_adminEmail) &&
                      string.Equals(request.Email, _adminEmail, StringComparison.OrdinalIgnoreCase);
        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            FullName = request.FullName,
            IsApproved = isAdmin,
        };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        if (!isAdmin)
            throw new InvalidOperationException("Registration successful. Your account is pending admin approval before you can log in.");

        return await IssueAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            throw new UnauthorizedAccessException("Invalid email or password.");
        if (!user.IsApproved)
            throw new UnauthorizedAccessException("Your account is pending admin approval. Please wait for an admin to approve your registration.");
        if (!user.IsActive)
            throw new UnauthorizedAccessException("Your account has been deactivated. Please contact the administrator.");
        return await IssueAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var hash = Hash(request.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (token is null || !token.IsActive) throw new UnauthorizedAccessException("Invalid refresh token.");
        token.RevokedAtUtc = DateTime.UtcNow;
        var user = await userManager.FindByIdAsync(token.UserId) ?? throw new UnauthorizedAccessException("Invalid refresh token.");
        return await IssueAsync(user, cancellationToken);
    }

    private async Task<AuthResponse> IssueAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        // Lazily promote admin email on every token issue so registration order doesn't matter
        if (!string.IsNullOrWhiteSpace(_adminEmail) &&
            string.Equals(user.Email, _adminEmail, StringComparison.OrdinalIgnoreCase) &&
            !await userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await userManager.AddToRoleAsync(user, AppRoles.Admin);
        }

        var roles = await userManager.GetRolesAsync(user);
        var expires = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.FullName)
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var jwt = new JwtSecurityToken(_jwt.Issuer, _jwt.Audience, claims, expires: expires, signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwt);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        user.LastActiveAt = DateTime.UtcNow;
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = Hash(refreshToken),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
        });
        await db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken, refreshToken, expires, new UserProfile(user.Id, user.Email ?? string.Empty, user.FullName, [.. roles]));
    }

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
