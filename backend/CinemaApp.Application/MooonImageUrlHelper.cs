namespace CinemaApp.Application;

/// <summary>
/// mooon: eventsphoto/photo — широкий кадр (фон), medium/small — афиша с текстом (постер).
/// </summary>
public static class MooonImageUrlHelper
{
    private const string MediaBase = "https://rest.mooon.by";

    public static string? NormalizeMediaUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        var u = url.Trim();
        if (u.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return u;
        if (u.StartsWith('/'))
            return u.StartsWith("/static/media-storage/", StringComparison.OrdinalIgnoreCase)
                || u.StartsWith("/eventsphoto/", StringComparison.OrdinalIgnoreCase)
                ? MediaBase + u : u;
        if (u.StartsWith("bin/", StringComparison.OrdinalIgnoreCase)
            || u.StartsWith("/bin/", StringComparison.OrdinalIgnoreCase))
            return MediaBase + "/static/media-storage/" + u.TrimStart('/');
        return u;
    }

    public static string? ToPosterUrl(string? url)
    {
        var normalized = NormalizeMediaUrl(url);
        if (string.IsNullOrWhiteSpace(normalized)) return null;
        if (normalized.Contains("/eventsphoto/photo/", StringComparison.OrdinalIgnoreCase))
            return normalized.Replace("/eventsphoto/photo/", "/eventsphoto/medium/", StringComparison.OrdinalIgnoreCase);
        if (normalized.Contains("/eventsphoto/small/", StringComparison.OrdinalIgnoreCase))
            return normalized.Replace("/eventsphoto/small/", "/eventsphoto/medium/", StringComparison.OrdinalIgnoreCase);
        return normalized;
    }

    public static string? ToBackdropUrl(string? url)
    {
        var normalized = NormalizeMediaUrl(url);
        if (string.IsNullOrWhiteSpace(normalized)) return null;
        if (normalized.Contains("/eventsphoto/medium/", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("/eventsphoto/small/", StringComparison.OrdinalIgnoreCase))
            return null;
        return normalized;
    }

    public static (string Poster, string? Backdrop) PickFromMooonEvent(string? imageSmall, string? imageMedium, string? imageLarge)
    {
        var poster = NormalizeMediaUrl(imageMedium) ?? NormalizeMediaUrl(imageSmall);
        var backdrop = NormalizeMediaUrl(imageLarge);
        if (string.IsNullOrWhiteSpace(backdrop))
            backdrop = ToBackdropUrl(imageMedium);
        if (string.IsNullOrWhiteSpace(poster))
            poster = ToPosterUrl(imageLarge);
        return (poster ?? string.Empty, backdrop);
    }
}
