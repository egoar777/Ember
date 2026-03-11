namespace CinemaApp.Application.DTOs;

public record AiSearchRequest(string Query);

public record AiSearchResponse(
    string InterpretedQuery,
    MovieFilterRequest? SuggestedFilters,
    List<MovieListDto> Results);

public record HomeCollectionDto(string Title, string Slug, List<MovieListDto> Movies);
