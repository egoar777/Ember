namespace CinemaApp.Application;

public static class MovieAgeRatingHelper
{
    /// <summary>Возвращает числовой возраст из строки вида «12+», «6», «18+».</summary>
    public static int? ParseAge(string? ageRating)
    {
        if (string.IsNullOrWhiteSpace(ageRating)) return null;

        var digits = new string(ageRating.Trim().TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(digits, out var age) ? age : null;
    }

    /// <summary>Детская афиша: только 0+, 6+, 12+ (число ≤ 12).</summary>
    public static bool IsKidsFriendly(string? ageRating)
    {
        var age = ParseAge(ageRating);
        return age is >= 0 and <= 12;
    }
}
