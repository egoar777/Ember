using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IMovieService
{
    Task<PagedResult<MovieListDto>> GetMoviesAsync(MovieFilterRequest filter);
    Task<MovieDetailDto?> GetMovieByIdAsync(int id);
    Task<List<MovieListDto>> GetSimilarMoviesAsync(int movieId);
    Task<List<ScreeningDto>> GetScreeningsForMovieAsync(int movieId);
    Task<List<string>> GetGenresAsync();
    Task<List<GenreDto>> GetGenresWithIdsAsync();
    Task<List<string>> GetPlatformsAsync();
}
