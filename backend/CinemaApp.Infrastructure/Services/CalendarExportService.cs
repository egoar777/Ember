using CinemaApp.Domain.Interfaces;
using System.Text;

namespace CinemaApp.Infrastructure.Services;

public class CalendarExportService : ICalendarExportService
{
    public byte[] GenerateIcsFile(string title, string description, DateTime start, DateTime end, string? location)
    {
        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//CinemaApp//RU");
        sb.AppendLine("BEGIN:VEVENT");
        sb.AppendLine($"DTSTART:{start:yyyyMMddTHHmmssZ}");
        sb.AppendLine($"DTEND:{end:yyyyMMddTHHmmssZ}");
        sb.AppendLine($"SUMMARY:{title}");
        sb.AppendLine($"DESCRIPTION:{description}");
        if (!string.IsNullOrEmpty(location))
            sb.AppendLine($"LOCATION:{location}");
        sb.AppendLine($"UID:{Guid.NewGuid()}@cinemaapp");
        sb.AppendLine("END:VEVENT");
        sb.AppendLine("END:VCALENDAR");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }
}
