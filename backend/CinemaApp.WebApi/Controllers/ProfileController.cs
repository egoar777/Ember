using CinemaApp.WebApi.Extensions;
using CinemaApp.Application.Common;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Services;
using CinemaApp.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly CinemaDbContext _db;
    public ProfileController(CinemaDbContext db) => _db = db;

    private int UserId => User.GetRequiredUserId();

    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();
        return Ok(new UserProfileDto(user.Id, user.Email, user.DisplayName, user.Role.ToString(),
            user.AvatarUrl, user.Preferences, user.NotificationSettings,
            user.BonusBalance, user.TotalSpent, user.TicketsPurchased,
            LoyaltyProgram.GetLevel(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetTicketDiscountPercent(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetBonusEarnMultiplier(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetLoyaltySummary(user.TotalSpent, user.TicketsPurchased)));
    }

    [HttpPut]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();
        if (req.DisplayName != null) user.DisplayName = req.DisplayName;
        if (req.AvatarUrl != null) user.AvatarUrl = req.AvatarUrl;
        if (req.Preferences != null) user.Preferences = req.Preferences;
        if (req.NotificationSettings != null) user.NotificationSettings = req.NotificationSettings;
        await _db.SaveChangesAsync();
        return Ok(new UserProfileDto(user.Id, user.Email, user.DisplayName, user.Role.ToString(),
            user.AvatarUrl, user.Preferences, user.NotificationSettings,
            user.BonusBalance, user.TotalSpent, user.TicketsPurchased,
            LoyaltyProgram.GetLevel(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetTicketDiscountPercent(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetBonusEarnMultiplier(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetLoyaltySummary(user.TotalSpent, user.TicketsPurchased)));
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var bookings = await _db.Bookings
            .Include(b => b.Screening).ThenInclude(s => s.Movie)
            .Where(b => b.UserId == UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new { b.Id, Movie = b.Screening.Movie.Title, b.Screening.StartTime, b.Status, b.TotalPrice, b.CreatedAt })
            .ToListAsync();
        return Ok(bookings);
    }
}
