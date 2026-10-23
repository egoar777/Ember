namespace CinemaApp.Application;

public static class ScreeningLanguageLabels
{
    public const string Belarusian = "Беларуская мова";
    public const string Russian = "Русский";
    public const string OriginalSubtitles = "Оригинал (субтитры)";

    public static bool IsBelarusian(string? language)
    {
        if (string.IsNullOrWhiteSpace(language)) return false;
        var l = language.ToLowerInvariant();
        return l.Contains("беларус") || l.Contains("белорус") || l.Contains("беларуская");
    }
    public static bool Matches(string? language, string filter)
    {
        var value = language?.ToLowerInvariant() ?? "";
        return filter.Trim().ToLowerInvariant() switch
        {
            "ru" or "russian" => value.Contains("русск"),
            "en" or "english" => value.Contains("англ") || value.Contains("english"),
            "be" or "belarusian" => IsBelarusian(language),
            "original" => value.Contains("оригинал") || value.Contains("субтит"),
            var key => value.Contains(key),
        };
    }
}
