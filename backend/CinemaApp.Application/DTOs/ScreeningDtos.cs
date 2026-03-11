namespace CinemaApp.Application.DTOs;

public record ScreeningDto(
    int Id, int MovieId, string MovieTitle, int HallId, string HallName,
    DateTime StartTime, DateTime EndTime, string? Language, string? Format,
    decimal BasePrice, bool IsPremiere, bool IsExclusive);

public record SeatStatusDto(int SeatTemplateId, int Row, int Number, string Type, string Status, decimal Price);

public record HallLayoutDto(int HallId, string Name, int TotalRows, int SeatsPerRow, List<SeatStatusDto> Seats);
