using CinemaApp.Application;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public static class MovieSearchQuery
{
    /// <summary>
    /// SQLite tolower() не работает с кириллицей — фильтрация в памяти через Matches.
    /// Несколько слов — каждое должно встретиться в названии, оригинале, описании или жанрах.
    /// </summary>
    public static string[] Tokenize(string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return Array.Empty<string>();

        return search.Trim()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(NormalizeToken)
            .Where(t => t.Length >= 2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static bool Matches(Movie movie, string? search)
    {
        var tokens = Tokenize(search);
        if (tokens.Length == 0) return true;

        static bool ContainsToken(string? text, string token) =>
            !string.IsNullOrEmpty(text)
            && NormalizeToken(text).Contains(token, StringComparison.OrdinalIgnoreCase);

        return tokens.All(tok =>
            ContainsToken(movie.Title, tok)
            || ContainsToken(movie.OriginalTitle, tok)
            || ContainsToken(movie.Description, tok)
            || (movie.Genres?.Any(g => ContainsToken(g.Name, tok)) ?? false));
    }

    private static string NormalizeToken(string value) =>
        value.Replace('«', '"').Replace('»', '"').Replace('„', '"').Replace('\u201c', '"').Replace('\u201d', '"');
}

public class MovieService : IMovieService
{
    private readonly CinemaDbContext _db;
    private readonly IMooonCinemaSyncService _mooonSync;

    public MovieService(CinemaDbContext db, IMooonCinemaSyncService mooonSync)
    {
        _db = db;
        _mooonSync = mooonSync;
    }

    public async Task<PagedResult<MovieListDto>> GetMoviesAsync(MovieFilterRequest filter)
    {
        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var query = _db.Movies.Where(m => !m.IsArchived).Include(m => m.Genres).AsQueryable();

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

        var searchText = string.IsNullOrWhiteSpace(filter.Search) ? null : filter.Search.Trim();
        var useInMemorySearch = searchText != null && MovieSearchQuery.Tokenize(searchText).Length > 0;

        if (!string.IsNullOrWhiteSpace(filter.ScreeningLanguage))
        {
            var nowScreening = DateTime.UtcNow;
            var langKey = filter.ScreeningLanguage.Trim().ToLowerInvariant();
            var screeningsWithLanguage = await _db.Screenings.AsNoTracking()
                .Where(s => s.StartTime > nowScreening && !s.IsCancelled && s.Language != null)
                .Select(s => new { s.MovieId, s.Language })
                .ToListAsync();
            var movieIdsWithLang = screeningsWithLanguage
                .Where(s => ScreeningLanguageLabels.Matches(s.Language, langKey))
                .Select(s => s.MovieId).Distinct().ToList();
            query = query.Where(m => movieIdsWithLang.Contains(m.Id));
        }

        if (filter.ForKids == true)
        {
            var rated = await query.Where(m => m.AgeRating != null).Select(m => new { m.Id, m.AgeRating }).ToListAsync();
            var kidsIds = rated.Where(x => MovieAgeRatingHelper.IsKidsFriendly(x.AgeRating)).Select(x => x.Id).ToList();
            query = kidsIds.Count > 0 ? query.Where(m => kidsIds.Contains(m.Id)) : query.Where(m => false);
        }

        if (filter.Featured == true)
        {
            var featured = await query.ToListAsync();
            if (useInMemorySearch)
                featured = featured.Where(m => MovieSearchQuery.Matches(m, searchText)).ToList();

            featured = featured
                .OrderByDescending(m => m.Title != null && m.Title.Contains("кутюр", StringComparison.OrdinalIgnoreCase))
                .ThenByDescending(m => m.AverageRating)
                .ToList();

            var totalCount2 = featured.Count;
            var page2 = Math.Max(1, filter.Page);
            var pageSize2 = Math.Max(1, Math.Min(filter.PageSize, 100));
            var items2 = featured.Skip((page2 - 1) * pageSize2).Take(pageSize2).ToList();
            return new PagedResult<MovieListDto>(items2.Select(m => MapToMovieListDto(m, mooonMap)).ToList(), totalCount2, page2, pageSize2);
        }

        if (useInMemorySearch)
        {
            var matched = await query.ToListAsync();
            matched = matched.Where(m => MovieSearchQuery.Matches(m, searchText)).ToList();
            matched = SortMovies(matched, filter.SortBy);

            var totalMem = matched.Count;
            var pageMem = Math.Max(1, filter.Page);
            var pageSizeMem = Math.Max(1, Math.Min(filter.PageSize, 100));
            var slice = matched.Skip((pageMem - 1) * pageSizeMem).Take(pageSizeMem).ToList();
            return new PagedResult<MovieListDto>(
                slice.Select(m => MapToMovieListDto(m, mooonMap)).ToList(),
                totalMem,
                pageMem,
                pageSizeMem);
        }

        query = ApplySort(query, filter.SortBy);

        var totalCount = await query.CountAsync();

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Max(1, Math.Min(filter.PageSize, 100));
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(m => MapToMovieListDto(m, mooonMap)).ToList();

        return new PagedResult<MovieListDto>(dtos, totalCount, page, pageSize);
    }

    private static List<Movie> SortMovies(List<Movie> movies, string? sortBy) =>
        (sortBy?.ToLowerInvariant() switch
        {
            "rating" => movies.OrderByDescending(m => m.RatingCount).ThenByDescending(m => m.AverageRating),
            "year" => movies.OrderByDescending(m => m.Year),
            "title" => movies.OrderBy(m => m.Title),
            _ => movies.OrderByDescending(m => m.RatingCount).ThenByDescending(m => m.AverageRating),
        }).ToList();

    private static IQueryable<Movie> ApplySort(IQueryable<Movie> query, string? sortBy) =>
        sortBy?.ToLowerInvariant() switch
        {
            "rating" => query.OrderByDescending(m => m.RatingCount).ThenByDescending(m => m.AverageRating),
            "year" => query.OrderByDescending(m => m.Year),
            "title" => query.OrderBy(m => m.Title),
            _ => query.OrderByDescending(m => m.RatingCount).ThenByDescending(m => m.AverageRating),
        };

    public async Task<MovieDetailDto?> GetMovieByIdAsync(int id)
    {
        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var movie = await _db.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsArchived);

        return movie == null ? null : MapToMovieDetailDto(movie, mooonMap);
    }

    public async Task<List<MovieListDto>> GetSimilarMoviesAsync(int movieId)
    {
        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var movie = await _db.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.Id == movieId && !m.IsArchived);

        if (movie == null || movie.Genres.Count == 0)
            return [];

        var genreIds = movie.Genres.Select(g => g.Id).ToList();

        var similar = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived && m.Id != movieId && m.Genres.Any(g => genreIds.Contains(g.Id)))
            .OrderByDescending(m => m.AverageRating)
            .Take(8)
            .ToListAsync();

        return similar.Select(m => MapToMovieListDto(m, mooonMap)).ToList();
    }

    public async Task<List<ScreeningDto>> GetScreeningsForMovieAsync(int movieId)
    {
        if (!await _db.Movies.AnyAsync(m => m.Id == movieId && !m.IsArchived))
            return [];

        var now = DateTime.UtcNow;
        var screenings = await _db.Screenings
            .Include(s => s.Movie)
            .Include(s => s.Hall)
            .Include(s => s.SeatStatuses)
            .Where(s => s.MovieId == movieId && s.StartTime > now && !s.IsCancelled)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        return screenings.Select(s => MapToScreeningDto(s, now)).ToList();
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
            .Where(m => !m.IsArchived && m.Platforms != null && m.Platforms != "")
            .Select(m => m.Platforms!)
            .ToListAsync();

        return platforms
            .SelectMany(p => p.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .OrderBy(s => s)
            .ToList();
    }

    private static MovieListDto MapToMovieListDto(
        Movie m,
        IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? mooonMap = null)
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
            MooonFilmImageUrls.ResolvePosterUrl(m, mooonMap),
            MooonFilmImageUrls.ResolveBackgroundUrl(m, mooonMap),
            m.TrailerUrl,
            m.Platforms,
            m.IsExclusive,
            m.Genres.Select(g => g.Name).ToList());
    }

    private static MovieDetailDto MapToMovieDetailDto(
        Movie m,
        IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? mooonMap = null)
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
            MooonFilmImageUrls.ResolvePosterUrl(m, mooonMap),
            MooonFilmImageUrls.ResolveBackgroundUrl(m, mooonMap),
            m.TrailerUrl,
            m.Platforms,
            m.IsExclusive,
            m.Genres.Select(g => g.Name).ToList());
    }

    private static ScreeningDto MapToScreeningDto(Screening s, DateTime nowUtc)
    {
        var movie = s.Movie;
        var effective = movie != null
            ? DynamicPricing.GetEffectiveBasePrice(s, movie)
            : s.BasePrice;
        var note = movie != null ? DynamicPricing.GetPricingNote(s, movie) : null;
        var seats = s.SeatStatuses;
        var totalSeats = seats.Count;
        var availableSeats = seats.Count(ss =>
            ss.Status == Domain.Enums.SeatStatus.Available
            || (ss.Status == Domain.Enums.SeatStatus.Reserved && ss.LockedUntil < nowUtc));
        return new ScreeningDto(
            s.Id,
            s.MovieId,
            movie?.Title ?? "",
            s.HallId,
            s.Hall.Name,
            s.StartTime,
            s.EndTime,
            s.Language,
            s.Format,
            effective,
            s.BasePrice,
            note,
            s.IsPremiere,
            s.IsExclusive,
            availableSeats,
            totalSeats);
    }
}
