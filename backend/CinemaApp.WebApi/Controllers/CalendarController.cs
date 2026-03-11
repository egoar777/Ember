using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Linq;
using CinemaApp.Data;
using CinemaApp.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/screenings")]
public class CalendarController : ControllerBase
{
    private readonly CinemaDbContext _db;
    private readonly ICalendarExportService _calendarService;

    public CalendarController(CinemaDbContext db, ICalendarExportService calendarService)
    {
        _db = db;
        _calendarService = calendarService;
    }

    private int UserId
    {
        get
        {
            var claim = User.FindFirst("sub")?.Value
                        ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(claim))
                return int.Parse(claim);

            var auth = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = auth.Substring("Bearer ".Length).Trim();
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(token);
                    var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == ClaimTypes.NameIdentifier)?.Value;
                    if (!string.IsNullOrEmpty(sub))
                        return int.Parse(sub);
                }
                catch
                {
                }
            }

            throw new UnauthorizedAccessException("User id claim is missing.");
        }
    }

    [HttpGet("{id:int}/calendar")]
    public async Task<IActionResult> GetCalendarEvent(int id)
    {
        var screening = await _db.Screenings
            .Include(s => s.Movie).Include(s => s.Hall)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (screening == null) return NotFound();

        var ics = _calendarService.GenerateIcsFile(
            screening.Movie.Title,
            $"Сеанс в {screening.Hall.Name}",
            screening.StartTime, screening.EndTime,
            screening.Hall.Name);
        return File(ics, "text/calendar", $"screening-{id}.ics");
    }

    [Authorize]
    [HttpPost("{id:int}/remind")]
    public async Task<IActionResult> SubscribeReminder(int id)
    {
        var screening = await _db.Screenings.Include(s => s.Movie).FirstOrDefaultAsync(s => s.Id == id);
        if (screening == null) return NotFound();
        _db.Notifications.Add(new Domain.Entities.Notification
        {
            UserId = UserId,
            Type = "screening_reminder",
            Payload = $"{{\"screeningId\":{id},\"movie\":\"{screening.Movie.Title}\",\"time\":\"{screening.StartTime:O}\"}}",
            IsRead = false
        });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Reminder set" });
    }
}
