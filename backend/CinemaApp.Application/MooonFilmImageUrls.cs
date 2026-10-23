using CinemaApp.Domain.Entities;

namespace CinemaApp.Application;

/// <summary>Подстановка актуальных URL постера/фона с mooon для фильмов с ExternalMooonEventId.</summary>
public static class MooonFilmImageUrls
{
    public static string? ResolvePosterUrl(
        Movie m,
        IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? map)
    {
        if (map != null
            && m.ExternalMooonEventId is int ext
            && map.TryGetValue(ext, out var urls)
            && !string.IsNullOrWhiteSpace(urls.PosterUrl))
            return MooonImageUrlHelper.ToPosterUrl(urls.PosterUrl);

        return MooonImageUrlHelper.ToPosterUrl(m.PosterUrl);
    }

    public static string? ResolveBackgroundUrl(
        Movie m,
        IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? map)
    {
        if (map != null
            && m.ExternalMooonEventId is int ext
            && map.TryGetValue(ext, out var urls))
        {
            var fromMap = MooonImageUrlHelper.ToBackdropUrl(urls.BackdropUrl)
                ?? MooonImageUrlHelper.ToBackdropUrl(urls.PosterUrl);
            if (!string.IsNullOrWhiteSpace(fromMap))
                return fromMap;
        }

        return MooonImageUrlHelper.ToBackdropUrl(m.BackgroundUrl)
            ?? MooonImageUrlHelper.ToBackdropUrl(m.PosterUrl);
    }
}
