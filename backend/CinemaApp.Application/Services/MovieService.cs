using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class MovieService : IMovieService
{
    private readonly CinemaDbContext _db;

    public MovieService(CinemaDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<MovieListDto>> GetMoviesAsync(MovieFilterRequest filter)
    {
        var query = _db.Movies.Include(m => m.Genres).AsQueryable();

        if (filter.GenreIds is { Length: > 0 } genreIds)
        {
            query = query.Where(m => m.Genres.Any(g => genreIds.Contains(g.Id)));
        }

        if (filter.YearFrom.HasValue)
        {
            query = query.Where(m => m.Year >= filter.YearFrom.Value);
        }

        if (filter.YearTo.HasValue)
        {
            query = query.Where(m => m.Year <= filter.YearTo.Value);
        }

        if (filter.RatingFrom.HasValue)
        {
            query = query.Where(m => m.AverageRating >= filter.RatingFrom.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Platforms))
        {
            var platforms = filter.Platforms.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (platforms.Length > 0)
            {
                query = query.Where(m => m.Platforms != null && platforms.Any(p => m.Platforms!.Contains(p)));
            }
        }

        if (filter.Exclusive == true)
        {
            query = query.Where(m => m.IsExclusive);
        }

        if (filter.IsPremiere == true)
        {
            var premiereMovieIds = await _db.Screenings
                .Where(s => s.IsPremiere)
                .Select(s => s.MovieId)
                .Distinct()
                .ToListAsync();
            query = query.Where(m => premiereMovieIds.Contains(m.Id));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var searchLower = filter.Search.ToLower();
            query = query.Where(m =>
                (m.Title != null && m.Title.ToLower().Contains(searchLower)) ||
                (m.OriginalTitle != null && m.OriginalTitle.ToLower().Contains(searchLower)));
        }

        query = filter.SortBy?.ToLowerInvariant() switch
        {
            "rating" => query.OrderByDescending(m => m.AverageRating),
            "year" => query.OrderByDescending(m => m.Year),
            "title" => query.OrderBy(m => m.Title),
            _ => query.OrderByDescending(m => m.AverageRating)
        };

        var totalCount = await query.CountAsync();

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Max(1, Math.Min(filter.PageSize, 100));
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToMovieListDto).ToList();

        return new PagedResult<MovieListDto>(dtos, totalCount, page, pageSize);
    }

    public async Task<MovieDetailDto?> GetMovieByIdAsync(int id)
    {
        var movie = await _db.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.Id == id);

        return movie == null ? null : MapToMovieDetailDto(movie);
    }

    public async Task<List<MovieListDto>> GetSimilarMoviesAsync(int movieId)
    {
        var movie = await _db.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.Id == movieId);

        if (movie == null || movie.Genres.Count == 0)
            return [];

        var genreIds = movie.Genres.Select(g => g.Id).ToList();

        var similar = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => m.Id != movieId && m.Genres.Any(g => genreIds.Contains(g.Id)))
            .OrderByDescending(m => m.AverageRating)
            .Take(8)
            .ToListAsync();

        return similar.Select(MapToMovieListDto).ToList();
    }

    public async Task<List<ScreeningDto>> GetScreeningsForMovieAsync(int movieId)
    {
        var now = DateTime.UtcNow;
        var screenings = await _db.Screenings
            .Include(s => s.Movie)
            .Include(s => s.Hall)
            .Where(s => s.MovieId == movieId && s.StartTime > now)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        return screenings.Select(MapToScreeningDto).ToList();
    }

    public async Task<List<string>> GetGenresAsync()
    {
        return await _db.Genres
            .OrderBy(g => g.Name)
            .Select(g => g.Name)
            .ToListAsync();
    }

    public async Task<List<GenreDto>> GetGenresWithIdsAsync()
    {
        return await _db.Genres
            .OrderBy(g => g.Name)
            .Select(g => new GenreDto(g.Id, g.Name))
            .ToListAsync();
    }

    public async Task<List<string>> GetPlatformsAsync()
    {
        var platforms = await _db.Movies
            .Where(m => m.Platforms != null && m.Platforms != "")
            .Select(m => m.Platforms!)
            .ToListAsync();

        return platforms
            .SelectMany(p => p.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .OrderBy(s => s)
            .ToList();
    }

    private static MovieListDto MapToMovieListDto(Movie m)
    {
        return new MovieListDto(
            m.Id,
            m.Title,
            m.OriginalTitle,
            m.Year,
            m.Duration,
            m.AgeRating,
            m.AverageRating,
            m.RatingCount,
            m.PosterUrl,
            m.Platforms,
            m.IsExclusive,
            m.Genres.Select(g => g.Name).ToList());
    }

    private static MovieDetailDto MapToMovieDetailDto(Movie m)
    {
        return new MovieDetailDto(
            m.Id,
            m.Title,
            m.OriginalTitle,
            m.Year,
            m.Duration,
            m.AgeRating,
            m.Countries,
            m.Description,
            m.Cast,
            m.Director,
            m.AverageRating,
            m.RatingCount,
            m.PosterUrl,
            m.BackgroundUrl,
            m.TrailerUrl,
            m.Platforms,
            m.IsExclusive,
            m.Genres.Select(g => g.Name).ToList());
    }

    private static ScreeningDto MapToScreeningDto(Screening s)
    {
        return new ScreeningDto(
            s.Id,
            s.MovieId,
            s.Movie.Title,
            s.HallId,
            s.Hall.Name,
            s.StartTime,
            s.EndTime,
            s.Language,
            s.Format,
            s.BasePrice,
            s.IsPremiere,
            s.IsExclusive);
    }
}
