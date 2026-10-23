namespace CinemaApp.Application.DTOs;

/// <param name="BasePrice">Цена с учётом динамики (время, популярность, премьера).</param>
/// <param name="ReferenceBasePrice">База из каталога до множителей.</param>
public record ScreeningDto(
    int Id, int MovieId, string MovieTitle, int HallId, string HallName,
    DateTime StartTime, DateTime EndTime, string? Language, string? Format,
    decimal BasePrice,
    decimal ReferenceBasePrice,
    string? PricingNote,
    bool IsPremiere, bool IsExclusive,
    int AvailableSeatsCount,
    int TotalSeatsCount);

public record SeatStatusDto(int SeatTemplateId, int Row, int Number, string Type, string Status, decimal Price);

public record HallLayoutDto(
    int ScreeningId,
    int MovieId,
    string MovieTitle,
    string? PosterUrl,
    string? BackgroundUrl,
    string? AgeRating,
    int Duration,
    DateTime StartTime,
    string? Format,
    string? Language,
    int HallId,
    string Name,
    int TotalRows,
    int SeatsPerRow,
    List<SeatStatusDto> Seats);
