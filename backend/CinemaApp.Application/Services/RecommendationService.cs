using CinemaApp.Application;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class RecommendationService : IRecommendationService
{
    private readonly CinemaDbContext _db;
    private readonly IMooonCinemaSyncService _mooonSync;

    public RecommendationService(CinemaDbContext db, IMooonCinemaSyncService mooonSync)
    {
        _db = db;
        _mooonSync = mooonSync;
    }

    public async Task<List<HomeCollectionDto>> GetHomeCollectionsAsync(int? userId)
    {
        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var collections = new List<HomeCollectionDto>();

        var popular = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived)
            .OrderByDescending(m => m.RatingCount)
            .ThenByDescending(m => m.AverageRating)
            .Take(15)
            .ToListAsync();
        collections.Add(new HomeCollectionDto(
            "Популярное сейчас",
            "popular",
            popular.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));

        var exclusive = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived && m.IsExclusive)
            .OrderByDescending(m => m.AverageRating)
            .Take(10)
            .ToListAsync();
        collections.Add(new HomeCollectionDto(
            "Эксклюзив",
            "exclusive",
            exclusive.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));

        var plus = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived && (m.IsExclusive || m.AverageRating >= 7.5))
            .OrderByDescending(m => m.AverageRating)
            .Take(10)
            .ToListAsync();
        if (plus.Count == 0)
        {
            plus = popular.Take(10).ToList();
        }
        collections.Add(new HomeCollectionDto(
            "Ember+",
            "plus",
            plus.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));

        var kids = (await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived && m.AgeRating != null)
            .ToListAsync())
            .Where(m => MovieAgeRatingHelper.IsKidsFriendly(m.AgeRating))
            .OrderByDescending(m => m.Year)
            .Take(10)
            .ToList();
        collections.Add(new HomeCollectionDto(
            "Детям",
            "kids",
            kids.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));

        if (userId != null)
        {
            var ratedMovieIds = await _db.Ratings
                .Where(r => r.UserId == userId.Value)
                .Select(r => r.MovieId)
                .ToListAsync();
            var userGenreIds = await _db.Movies
                .Where(m => ratedMovieIds.Contains(m.Id))
                .SelectMany(m => m.Genres.Select(g => g.Id))
                .Distinct()
                .ToListAsync();

            var forYou = await _db.Movies
                .Include(m => m.Genres)
                .Where(m => !m.IsArchived && !ratedMovieIds.Contains(m.Id) && m.Genres.Any(g => userGenreIds.Contains(g.Id)))
                .OrderByDescending(m => m.AverageRating)
                .Take(10)
                .ToListAsync();
            collections.Add(new HomeCollectionDto(
                "Для вас",
                "for-you",
                forYou.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));
        }

        var topRated = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => !m.IsArchived && m.RatingCount > 100)
            .OrderByDescending(m => m.AverageRating)
            .Take(10)
            .ToListAsync();
        if (topRated.Count < 10)
        {
            topRated = await _db.Movies
                .Include(m => m.Genres)
                .Where(m => !m.IsArchived && m.RatingCount > 0)
                .OrderByDescending(m => m.AverageRating)
                .Take(10)
                .ToListAsync();
        }
        collections.Add(new HomeCollectionDto(
            "Лучшие по рейтингу",
            "top-rated",
            topRated.Select(m => MapToMovieListDto(m, mooonMap)).ToList()));

        return collections;
    }

    public async Task<List<MovieListDto>> GetRecommendationsForMovieAsync(int movieId, int? userId)
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

    public async Task<AiSearchResponse> AiSearchAsync(string query, int? userId)
    {
        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var genreKeywordMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["комедия"] = "comedy",
            ["боевик"] = "action",
            ["драма"] = "drama",
            ["фантастика"] = "sci-fi",
            ["ужасы"] = "horror",
            ["триллер"] = "thriller",
            ["мелодрама"] = "romance",
            ["анимация"] = "animation",
            ["мультфильм"] = "animation",
            ["документальный"] = "documentary",
            ["приключения"] = "adventure"
        };

        var matchedGenreSlugs = new List<string>();
        var remainingWords = new List<string>();
        var queryLower = query.Trim().ToLowerInvariant();
        var words = queryLower.Split(new[] { ' ', ',', '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var word in words)
        {
            var matched = false;
            foreach (var (keyword, slug) in genreKeywordMap)
            {
                if (word.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    if (!matchedGenreSlugs.Contains(slug))
                        matchedGenreSlugs.Add(slug);
                    matched = true;
                    break;
                }
            }
            if (!matched)
                remainingWords.Add(word);
        }

        var yearMatches = System.Text.RegularExpressions.Regex.Matches(query, @"\b(19|20)\d{2}\b");
        int? yearFrom = null;
        int? yearTo = null;
        foreach (System.Text.RegularExpressions.Match m in yearMatches)
        {
            if (int.TryParse(m.Value, out var y))
            {
                yearFrom ??= y;
                yearTo = y;
            }
        }
        if (yearMatches.Count > 1 && yearFrom.HasValue && yearTo.HasValue && yearFrom > yearTo)
            (yearFrom, yearTo) = (yearTo, yearFrom);

        var searchText = string.Join(" ", remainingWords).Trim();
        if (string.IsNullOrWhiteSpace(searchText) && remainingWords.Count > 0)
            searchText = string.Join(" ", remainingWords).Trim();

        int[]? genreIds = null;
        if (matchedGenreSlugs.Count > 0)
        {
            genreIds = await _db.Genres
                .Where(g => matchedGenreSlugs.Contains(g.Slug))
                .Select(g => g.Id)
                .ToArrayAsync();
        }

        var filter = new MovieFilterRequest(
            GenreIds: genreIds,
            YearFrom: yearFrom,
            YearTo: yearTo,
            RatingFrom: null,
            Platforms: null,
            Search: string.IsNullOrWhiteSpace(searchText) ? null : searchText,
            SortBy: "rating",
            Exclusive: null,
            IsPremiere: null,
            Page: 1,
            PageSize: 20,
            ForKids: null,
            Featured: null,
            ScreeningLanguage: null);

        var queryFilter = _db.Movies.Where(m => !m.IsArchived).Include(m => m.Genres).AsQueryable();

        if (filter.GenreIds is { Length: > 0 } gIds)
            queryFilter = queryFilter.Where(m => m.Genres.Any(g => gIds.Contains(g.Id)));
        if (filter.YearFrom.HasValue)
            queryFilter = queryFilter.Where(m => m.Year >= filter.YearFrom!.Value);
        if (filter.YearTo.HasValue)
            queryFilter = queryFilter.Where(m => m.Year <= filter.YearTo!.Value);
        var candidates = await queryFilter.ToListAsync();
        if (!string.IsNullOrWhiteSpace(filter.Search))
            candidates = candidates.Where(m => MovieSearchQuery.Matches(m, filter.Search)).ToList();

        var results = candidates
            .OrderByDescending(m => m.AverageRating)
            .Take(20)
            .ToList();

        var interpretedParts = new List<string>();
        if (matchedGenreSlugs.Count > 0)
            interpretedParts.Add($"жанры: {string.Join(", ", matchedGenreSlugs)}");
        if (yearFrom.HasValue)
            interpretedParts.Add($"год: {yearFrom}" + (yearTo.HasValue && yearTo != yearFrom ? $"-{yearTo}" : ""));
        if (!string.IsNullOrWhiteSpace(searchText))
            interpretedParts.Add($"поиск: \"{searchText}\"");
        var interpretedQuery = interpretedParts.Count > 0
            ? "Понято: " + string.Join("; ", interpretedParts)
            : "Общий поиск по рейтингу";

        return new AiSearchResponse(
            interpretedQuery,
            filter,
            results.Select(m => MapToMovieListDto(m, mooonMap)).ToList());
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
}
