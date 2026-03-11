namespace CinemaApp.Domain.Interfaces;

public interface ICalendarExportService
{
    byte[] GenerateIcsFile(string title, string description, DateTime start, DateTime end, string? location);
}
