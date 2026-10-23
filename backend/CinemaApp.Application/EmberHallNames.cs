namespace CinemaApp.Application;

public static class EmberHallNames
{
    public const string Premium = "Ember Screen XL";
    public const string Classic = "Ember Classic";
    public const string Lounge = "Ember Lounge";

    public const string FormatPremium = "XL";
    public const string FormatStandard = "2D";

    public static bool IsPremiumHall(string? name) =>
        !string.IsNullOrEmpty(name) && (
            name.Contains("Screen XL", StringComparison.OrdinalIgnoreCase)
            || name.Contains("IMAX", StringComparison.OrdinalIgnoreCase));

    public static bool IsLoungeHall(string? name) =>
        !string.IsNullOrEmpty(name) && (
            name.Contains("Lounge", StringComparison.OrdinalIgnoreCase)
            || name.Contains("VIP", StringComparison.OrdinalIgnoreCase));

    public static string FormatForHall(string? hallName) =>
        IsPremiumHall(hallName) ? FormatPremium : FormatStandard;

    public static string? LegacyRename(string name) => name switch
    {
        "Зал 1 — IMAX" => Premium,
        "Зал 2 — Стандарт" => Classic,
        "Зал 3 — VIP" => Lounge,
        _ => null,
    };
}
