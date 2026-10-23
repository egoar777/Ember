using System.Text.Json;
using CinemaApp.WebApi.Extensions;
using CinemaApp.Application.Common;
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

    private int UserId => User.GetRequiredUserId();

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
            Payload = JsonSerializer.Serialize(new { screeningId = id, movie = screening.Movie.Title, time = screening.StartTime }),
            IsRead = false
        });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Reminder set" });
    }
}
