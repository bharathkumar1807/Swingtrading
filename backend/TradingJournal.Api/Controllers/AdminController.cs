using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingJournal.Application.Admin;

namespace TradingJournal.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class AdminController(IAdminService adminService) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers(CancellationToken ct)
        => Ok(await adminService.GetUsersAsync(ct));

    [HttpGet("platform-stats")]
    public async Task<ActionResult<PlatformStatsDto>> GetPlatformStats(CancellationToken ct)
        => Ok(await adminService.GetPlatformStatsAsync(ct));

    [HttpGet("users/{userId}/summary")]
    public async Task<ActionResult<UserSummaryDto>> GetUserSummary(string userId, CancellationToken ct)
        => Ok(await adminService.GetUserSummaryAsync(userId, ct));

    [HttpPost("users/{userId}/toggle-status")]
    public async Task<ActionResult<AdminUserDto>> ToggleUserStatus(string userId, CancellationToken ct)
        => Ok(await adminService.ToggleUserStatusAsync(userId, ct));

    [HttpGet("pending-users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetPendingUsers(CancellationToken ct)
        => Ok(await adminService.GetPendingUsersAsync(ct));

    [HttpPost("users/{userId}/approve")]
    public async Task<ActionResult<AdminUserDto>> ApproveUser(string userId, CancellationToken ct)
        => Ok(await adminService.ApproveUserAsync(userId, ct));

    [HttpGet("users/{userId}/trades")]
    public async Task<ActionResult<List<AdminTradeDto>>> GetUserTrades(string userId, CancellationToken ct)
        => Ok(await adminService.GetUserTradesAsync(userId, ct));

    [HttpPost("users/{userId}/change-password")]
    public async Task<IActionResult> ChangePassword(string userId, [FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        await adminService.ChangePasswordAsync(userId, req.NewPassword, ct);
        return NoContent();
    }

    [HttpPatch("users/{userId}/name")]
    public async Task<ActionResult<AdminUserDto>> UpdateUserName(string userId, [FromBody] UpdateUserNameRequest req, CancellationToken ct)
        => Ok(await adminService.UpdateUserNameAsync(userId, req.FullName, ct));
}

public sealed record ChangePasswordRequest(string NewPassword);
public sealed record UpdateUserNameRequest(string FullName);
