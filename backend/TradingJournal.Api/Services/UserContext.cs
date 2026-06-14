using System.Security.Claims;
using TradingJournal.Application.Abstractions;

namespace TradingJournal.Api.Services;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
    public string UserId => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? accessor.HttpContext?.User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User context is unavailable.");
}
