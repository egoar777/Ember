namespace CinemaApp.Application.DTOs;

public record MovieListDto(
    int Id, string Title, string? OriginalTitle, int Year, int Duration,
    string? AgeRating, double AverageRating, int RatingCount,
    string? PosterUrl, string? BackgroundUrl, string? TrailerUrl, string? Platforms, bool IsExclusive,
    List<string> Genres);

public record MovieDetailDto(
    int Id, string Title, string? OriginalTitle, int Year, int Duration,
    string? AgeRating, string? Countries, string Description,
    string? Cast, string? Director, double AverageRating, int RatingCount,
    string? PosterUrl, string? BackgroundUrl, string? TrailerUrl,
    string? Platforms, bool IsExclusive, List<string> Genres);

public record MovieFilterRequest(
    int[]? GenreIds, int? YearFrom, int? YearTo, double? RatingFrom,
    string? Platforms, string? Search, string? SortBy, bool? Exclusive, bool? IsPremiere,
    int Page = 1, int PageSize = 20,
    bool? ForKids = null, bool? Featured = null,
    string? ScreeningLanguage = null);

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record GenreDto(int Id, string Name);
