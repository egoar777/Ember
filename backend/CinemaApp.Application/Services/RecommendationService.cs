using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class RecommendationService : IRecommendationService
{
    private readonly CinemaDbContext _db;

    public RecommendationService(CinemaDbContext db)
    {
        _db = db;
    }

    public async Task<List<HomeCollectionDto>> GetHomeCollectionsAsync(int? userId)
    {
        var collections = new List<HomeCollectionDto>();

        var popular = await _db.Movies
            .Include(m => m.Genres)
            .OrderByDescending(m => m.RatingCount)
            .Take(10)
            .ToListAsync();
        collections.Add(new HomeCollectionDto(
            "Популярное сейчас",
            "popular",
            popular.Select(MapToMovieListDto).ToList()));

        var premiereMovieIds = await _db.Screenings
            .Where(s => s.IsPremiere)
            .Select(s => s.MovieId)
            .Distinct()
            .Take(10)
            .ToListAsync();
        var premieres = (await _db.Movies
            .Include(m => m.Genres)
            .Where(m => premiereMovieIds.Contains(m.Id))
            .ToListAsync())
            .OrderBy(m => premiereMovieIds.IndexOf(m.Id))
            .ToList();
        collections.Add(new HomeCollectionDto(
            "Премьеры",
            "premieres",
            premieres.Select(MapToMovieListDto).ToList()));

        var exclusive = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => m.IsExclusive)
            .OrderByDescending(m => m.AverageRating)
            .Take(10)
            .ToListAsync();
        collections.Add(new HomeCollectionDto(
            "Эксклюзив",
            "exclusive",
            exclusive.Select(MapToMovieListDto).ToList()));

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
                .Where(m => !ratedMovieIds.Contains(m.Id) && m.Genres.Any(g => userGenreIds.Contains(g.Id)))
                .OrderByDescending(m => m.AverageRating)
                .Take(10)
                .ToListAsync();
            collections.Add(new HomeCollectionDto(
                "Для вас",
                "for-you",
                forYou.Select(MapToMovieListDto).ToList()));
        }

        var topRated = await _db.Movies
            .Include(m => m.Genres)
            .Where(m => m.RatingCount > 100)
            .OrderByDescending(m => m.AverageRating)
            .Take(10)
            .ToListAsync();
        if (topRated.Count < 10)
        {
            topRated = await _db.Movies
                .Include(m => m.Genres)
                .Where(m => m.RatingCount > 0)
                .OrderByDescending(m => m.AverageRating)
                .Take(10)
                .ToListAsync();
        }
        collections.Add(new HomeCollectionDto(
            "Лучшие по рейтингу",
            "top-rated",
            topRated.Select(MapToMovieListDto).ToList()));

        return collections;
    }

    public async Task<List<MovieListDto>> GetRecommendationsForMovieAsync(int movieId, int? userId)
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

    public async Task<AiSearchResponse> AiSearchAsync(string query, int? userId)
    {
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
            PageSize: 20);

        var queryFilter = _db.Movies.Include(m => m.Genres).AsQueryable();

        if (filter.GenreIds is { Length: > 0 } gIds)
            queryFilter = queryFilter.Where(m => m.Genres.Any(g => gIds.Contains(g.Id)));
        if (filter.YearFrom.HasValue)
            queryFilter = queryFilter.Where(m => m.Year >= filter.YearFrom!.Value);
        if (filter.YearTo.HasValue)
            queryFilter = queryFilter.Where(m => m.Year <= filter.YearTo!.Value);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLower();
            queryFilter = queryFilter.Where(m =>
                (m.Title != null && m.Title.ToLower().Contains(s)) ||
                (m.OriginalTitle != null && m.OriginalTitle.ToLower().Contains(s)));
        }

        var results = await queryFilter
            .OrderByDescending(m => m.AverageRating)
            .Take(20)
            .ToListAsync();

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
            results.Select(MapToMovieListDto).ToList());
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
}
