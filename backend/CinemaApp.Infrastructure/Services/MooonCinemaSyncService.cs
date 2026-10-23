using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CinemaApp.Application;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace CinemaApp.Infrastructure.Services;

public sealed class MooonCinemaSyncService : IMooonCinemaSyncService
{
    private const string MooonAfishaUrl = "https://mooon.by/afisha/minsk?set=now";
    private static readonly Regex NextDataRegex = new(
        @"<script id=""__NEXT_DATA__""[^>]*>(?<json>.*?)</script>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Dictionary<string, string> KnownRuGenreSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["боевик"] = "action",
        ["комедия"] = "comedy",
        ["драма"] = "drama",
        ["фантастика"] = "sci-fi",
        ["ужасы"] = "horror",
        ["триллер"] = "thriller",
        ["мелодрама"] = "romance",
        ["анимация"] = "animation",
        ["документальный"] = "documentary",
        ["приключения"] = "adventure",
        ["мюзикл"] = "musical",
        ["криминал"] = "crime",
        ["биография"] = "biography",
        ["фэнтези"] = "fantasy",
        ["семейный"] = "family",
        ["вестерн"] = "western",
        ["военный"] = "war",
        ["детектив"] = "detective",
        ["история"] = "history",
        ["музыка"] = "music",
        ["спорт"] = "sport",
        ["концерт"] = "concert",
        ["фэнтэзи"] = "fantasy",
    };

    private const string FilmImageMapCacheKey = "mooon:film-image-map:v1";

    private readonly CinemaDbContext _db;
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;
    private readonly ILogger<MooonCinemaSyncService> _logger;

    public MooonCinemaSyncService(
        CinemaDbContext db,
        HttpClient http,
        IMemoryCache cache,
        ILogger<MooonCinemaSyncService> logger, IConfiguration config)
    {
        _db = db;
        _http = http;
        _cache = cache;
        _logger = logger;
        _config = config;
    }

    public async Task<IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>> GetCachedFilmImageMapAsync(
        CancellationToken cancellationToken = default)
    {
        if (bool.TryParse(_config["Mooon:Enabled"], out var enabled) && !enabled)
            return new Dictionary<int, (string PosterUrl, string? BackdropUrl)>();

        if (_cache.TryGetValue(FilmImageMapCacheKey,
                out IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? hit)
            && hit is not null)
            return hit;

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(5));
            var html = await FetchAfishaHtmlAsync(timeout.Token);
            var map = ParseFilmImageMap(html);
            // Пустую карту не кэшируем — иначе при сбое разбора HTML постеры 15 минут остаются «фото» из БД.
            if (map.Count > 0)
            {
                _cache.Set(FilmImageMapCacheKey, map, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15),
                });
            }
            else
            {
                _logger.LogWarning("Карта постеров mooon пуста — проверьте разметку __NEXT_DATA__.");
            }

            return map;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Не удалось получить карту постеров mooon для API.");
            var empty = new Dictionary<int, (string PosterUrl, string? BackdropUrl)>();
            _cache.Set(FilmImageMapCacheKey, (IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>)empty, TimeSpan.FromSeconds(30));
            return empty;
        }
    }

    private static IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)> ParseFilmImageMap(string html)
    {
        using var doc = TryParseNextData(html);
        if (doc == null)
            return new Dictionary<int, (string PosterUrl, string? BackdropUrl)>();

        var dict = new Dictionary<int, (string PosterUrl, string? BackdropUrl)>();
        foreach (var ev in ExtractFilmEvents(doc.RootElement))
        {
            var extId = ev.GetProperty("id").GetInt32();
            var (poster, backdrop) = MooonImageUrlHelper.PickFromMooonEvent(
                GetString(ev, "imageSmall"),
                GetString(ev, "imageMedium"),
                GetString(ev, "imageLarge"));
            if (string.IsNullOrWhiteSpace(poster))
                continue;

            dict[extId] = (poster, backdrop);
        }

        return dict;
    }

    public async Task<MooonSyncResultDto> SyncFromMooonAsync(CancellationToken cancellationToken = default)
    {
        var html = await FetchAfishaHtmlAsync(cancellationToken);
        using var doc = TryParseNextData(html)
            ?? throw new InvalidOperationException("Не удалось найти __NEXT_DATA__ на mooon.by — разметка сайта изменилась.");

        var filmEvents = DeduplicateFilmEventsByTitle(ExtractFilmEvents(doc.RootElement));
        if (filmEvents.Count == 0)
            throw new InvalidOperationException("На афише mooon нет фильмов для синхронизации. Проверьте URL и разметку __NEXT_DATA__.");

        var remoteIds = filmEvents.Select(ev => ev.GetProperty("id").GetInt32()).ToHashSet();

        var genreNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var ev in filmEvents)
        {
            if (!ev.TryGetProperty("genres", out var genres) || genres.ValueKind != JsonValueKind.Array)
                continue;
            foreach (var g in genres.EnumerateArray())
            {
                if (g.TryGetProperty("genre", out var go)
                    && go.TryGetProperty("Name", out var nameEl))
                {
                    var gn = nameEl.GetString();
                    if (!string.IsNullOrWhiteSpace(gn))
                        genreNames.Add(gn.Trim());
                }
            }
        }

        await EnsureGenresAsync(genreNames, cancellationToken);
        var genreByName = await _db.Genres.ToDictionaryAsync(
            g => g.Name,
            g => g,
            StringComparer.OrdinalIgnoreCase,
            cancellationToken);

        var upserted = 0;
        var syncedMovies = new List<Movie>();

        foreach (var ev in filmEvents)
        {
            var extId = ev.GetProperty("id").GetInt32();
            var movie = await _db.Movies
                .Include(m => m.Genres)
                .FirstOrDefaultAsync(m => m.ExternalMooonEventId == extId, cancellationToken);

            var isNew = movie == null;
            if (isNew)
            {
                movie = new Movie
                {
                    ExternalMooonEventId = extId,
                    CreatedAt = DateTime.UtcNow,
                    RatingCount = 0,
                };
                _db.Movies.Add(movie);
            }

            movie!.IsArchived = false;
            ApplyEventToMovie(ev, movie);

            movie.Genres.Clear();
            if (ev.TryGetProperty("genres", out var genres) && genres.ValueKind == JsonValueKind.Array)
            {
                foreach (var g in genres.EnumerateArray())
                {
                    if (!g.TryGetProperty("genre", out var go)
                        || !go.TryGetProperty("Name", out var nameEl))
                        continue;
                    var raw = nameEl.GetString();
                    if (string.IsNullOrWhiteSpace(raw)) continue;
                    var trimmed = raw.Trim();
                    var displayName = FormatGenreDisplayName(trimmed);
                    if (!genreByName.TryGetValue(displayName, out var genreEntity)
                        && !genreByName.TryGetValue(trimmed, out genreEntity))
                        continue;

                    var tracked = await _db.Genres.FindAsync(new object[] { genreEntity.Id }, cancellationToken);
                    if (tracked != null)
                        movie.Genres.Add(tracked);
                }
            }

            upserted++;
            syncedMovies.Add(movie);
            if (isNew)
                _logger.LogInformation("Подготовлен новый фильм с mooon: {Title} (external {ExtId})", movie.Title, extId);
        }

        await _db.SaveChangesAsync(cancellationToken);
        var touchedIds = syncedMovies.ConvertAll(m => m.Id);

        var archiveList = await _db.Movies
            .Where(m => !m.IsArchived && (
                m.ExternalMooonEventId == null
                || (m.ExternalMooonEventId != null && !remoteIds.Contains(m.ExternalMooonEventId.Value))))
            .ToListAsync(cancellationToken);

        var archived = 0;
        foreach (var archivedMovie in archiveList)
        {
            archivedMovie.IsArchived = true;
            archived++;
            _logger.LogInformation("Архивирован фильм (нет в афише mooon): {Title} id={Id}", archivedMovie.Title, archivedMovie.Id);
        }

        await _db.SaveChangesAsync(cancellationToken);

        var screeningsAdded = await DbSeeder.EnsureUpcomingScreeningsForMovieIdsAsync(
            _db,
            DateTime.UtcNow,
            touchedIds);

        _cache.Remove(FilmImageMapCacheKey);

        return new MooonSyncResultDto(filmEvents.Count, upserted, archived, screeningsAdded);
    }

    private async Task EnsureGenresAsync(HashSet<string> genreNames, CancellationToken ct)
    {
        var existing = await _db.Genres.ToListAsync(ct);
        var byLower = existing.ToDictionary(g => g.Name, g => g, StringComparer.OrdinalIgnoreCase);

        foreach (var raw in genreNames)
        {
            var display = FormatGenreDisplayName(raw);
            if (byLower.ContainsKey(display) || byLower.ContainsKey(raw))
                continue;

            var slug = SlugForGenre(raw);
            var taken = await _db.Genres.AnyAsync(g => g.Slug == slug, ct);
            if (taken)
                slug = "m-" + Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(raw.ToLowerInvariant())))[..12].ToLowerInvariant();

            var g = new Genre { Name = display, Slug = slug };
            _db.Genres.Add(g);
            byLower[display] = g;
        }

        await _db.SaveChangesAsync(ct);
    }

    private static string FormatGenreDisplayName(string raw)
    {
        var t = raw.Trim();
        if (t.Length == 0) return t;
        return char.ToUpperInvariant(t[0]) + t.Substring(1).ToLowerInvariant();
    }

    /// <summary>
    /// На mooon у обычных кинопоказов фильма eventTypeId = 1. Значение 2 — киноночи/серии
    /// (напр. «Тачки 2–4: Ночь Форсажа» отдельными событиями с одним постером); в каталог не тянем.
    /// </summary>
    private static bool IsMooonStandardFilmScreening(JsonElement ev)
    {
        if (!ev.TryGetProperty("eventTypeId", out var et) || et.ValueKind != JsonValueKind.Number)
            return true;
        return et.GetInt32() == 1;
    }

    private string SlugForGenre(string raw)
    {
        var key = raw.Trim().ToLowerInvariant();
        if (KnownRuGenreSlugs.TryGetValue(key, out var slug))
            return slug;
        return "x-" + Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(key)))[..12].ToLowerInvariant();
    }

    private async Task<string> FetchAfishaHtmlAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Загрузка афиши mooon: {Url}", MooonAfishaUrl);
        return await _http.GetStringAsync(MooonAfishaUrl, cancellationToken);
    }

    private static JsonDocument? TryParseNextData(string html)
    {
        var m = NextDataRegex.Match(html);
        if (!m.Success)
            return null;
        return JsonDocument.Parse(m.Groups["json"].Value);
    }

    private static List<JsonElement> ExtractFilmEvents(JsonElement root)
    {
        var result = new List<JsonElement>();
        if (!root.TryGetProperty("props", out var props)
            || !props.TryGetProperty("pageProps", out var pageProps)
            || !pageProps.TryGetProperty("events", out var eventsEl)
            || eventsEl.ValueKind != JsonValueKind.Array)
        {
            return result;
        }

        foreach (var ev in eventsEl.EnumerateArray())
        {
            if (!IsFilmEvent(ev))
                continue;
            if (!ev.TryGetProperty("id", out _))
                continue;
            result.Add(ev);
        }

        return result;
    }

    private static bool IsFilmEvent(JsonElement ev)
    {
        if (!ev.TryGetProperty("eventCategoryId", out var cat) || cat.GetInt32() != 1)
            return false;
        if (ev.TryGetProperty("eventCategory", out var ec)
            && ec.TryGetProperty("Name", out var ecName)
            && ecName.GetString() is { } n
            && !string.Equals(n, "Фильм", StringComparison.OrdinalIgnoreCase))
            return false;

        return IsMooonStandardFilmScreening(ev);
    }

    private static List<JsonElement> DeduplicateFilmEventsByTitle(List<JsonElement> events)
    {
        var bestByTitle = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

        foreach (var ev in events)
        {
            var title = GetString(ev, "title")?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                continue;

            if (!bestByTitle.TryGetValue(title, out var existing)
                || ScoreEventForSync(ev) > ScoreEventForSync(existing))
            {
                bestByTitle[title] = ev;
            }
        }

        return bestByTitle.Values.ToList();
    }

    private static int ScoreEventForSync(JsonElement ev)
    {
        var score = 0;
        if (!string.IsNullOrWhiteSpace(GetString(ev, "imageMedium"))) score += 35;
        if (!string.IsNullOrWhiteSpace(GetString(ev, "imageSmall"))) score += 10;
        if (!string.IsNullOrWhiteSpace(GetString(ev, "imageLarge"))) score += 15;
        if (!string.IsNullOrWhiteSpace(GetString(ev, "description"))) score += 5;
        if (ev.TryGetProperty("showsCount", out var sc) && sc.ValueKind == JsonValueKind.Number)
            score += Math.Min(10, sc.GetInt32());
        return score;
    }

    private static void ApplyEventToMovie(JsonElement ev, Movie movie)
    {
        movie.Title = GetString(ev, "title") ?? movie.Title;
        movie.OriginalTitle = GetString(ev, "originalTitle");
        movie.Description = GetString(ev, "description") ?? string.Empty;

        if (ev.TryGetProperty("duration", out var durEl))
        {
            var sec = durEl.ValueKind == JsonValueKind.Number ? durEl.GetInt64() : 0;
            movie.Duration = Math.Max(1, (int)(sec / 60));
        }

        if (ev.TryGetProperty("ageLimit", out var ageEl) && ageEl.ValueKind == JsonValueKind.Number)
            movie.AgeRating = AgeFromMooon(ageEl.GetInt32());
        else
            movie.AgeRating ??= "12+";

        movie.Countries = GetString(ev, "countries");

        if (ev.TryGetProperty("rentalDateStart", out var rs) && rs.ValueKind == JsonValueKind.String
            && DateTime.TryParse(rs.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var rdt))
            movie.Year = rdt.Year > 1900 ? rdt.Year : movie.Year;
        if (movie.Year == 0)
            movie.Year = DateTime.UtcNow.Year;

        var kp = ParseRating(GetString(ev, "kinopoiskRating"));
        var imdb = ParseRating(GetString(ev, "imdbRating"));
        if (kp > 0 || imdb > 0)
            movie.AverageRating = kp > 0 ? kp : imdb;
        else if (movie.AverageRating <= 0)
            movie.AverageRating = 0;

        var (poster, backdrop) = MooonImageUrlHelper.PickFromMooonEvent(
            GetString(ev, "imageSmall"),
            GetString(ev, "imageMedium"),
            GetString(ev, "imageLarge"));
        movie.PosterUrl = MooonImageUrlHelper.ToPosterUrl(poster) ?? poster;
        movie.BackgroundUrl = backdrop;
        movie.TrailerUrl = ToYoutubeEmbed(GetString(ev, "trailer"));

        movie.IsExclusive = ev.TryGetProperty("exclusive", out var excl) && excl.ValueKind == JsonValueKind.True;

        movie.Platforms = "2D,Cinema";

        movie.Director = JoinPeople(ev, "directors", "director");
        movie.Cast = JoinPeople(ev, "incast", "actor", 18);
    }

    private static string? GetString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    private static string AgeFromMooon(int code) => code switch
    {
        2 => "6+",
        3 => "12+",
        5 => "16+",
        6 => "18+",
        _ => "12+",
    };

    private static double ParseRating(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return 0;
        var t = s.Replace(",", ".", StringComparison.Ordinal);
        return double.TryParse(t, NumberStyles.Any, CultureInfo.InvariantCulture, out var v)
            ? Math.Clamp(v, 0, 10)
            : 0;
    }

    private static string? ToYoutubeEmbed(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        if (url.Contains("youtube.com/embed", StringComparison.OrdinalIgnoreCase))
            return url;
        var m = Regex.Match(url, @"[?&]v=([^&]+)");
        if (m.Success)
            return "https://www.youtube.com/embed/" + WebUtility.UrlDecode(m.Groups[1].Value);
        m = Regex.Match(url, @"youtu\.be/([^?&]+)");
        if (m.Success)
            return "https://www.youtube.com/embed/" + WebUtility.UrlDecode(m.Groups[1].Value);
        return url;
    }

    private static string? JoinPeople(JsonElement ev, string arrayName, string objectName, int max = 8)
    {
        if (!ev.TryGetProperty(arrayName, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return null;
        var names = new List<string>();
        foreach (var item in arr.EnumerateArray())
        {
            if (!item.TryGetProperty(objectName, out var person)) continue;
            if (!person.TryGetProperty("Name", out var ne) || ne.ValueKind != JsonValueKind.String) continue;
            var n = ne.GetString();
            if (!string.IsNullOrWhiteSpace(n))
                names.Add(n.Trim());
            if (names.Count >= max) break;
        }

        return names.Count == 0 ? null : string.Join(", ", names);
    }
}
