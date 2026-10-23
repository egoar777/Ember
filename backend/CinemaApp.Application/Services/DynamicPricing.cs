using CinemaApp.Domain.Entities;

namespace CinemaApp.Application.Services;

/// <summary>
/// Итоговая цена билета от базы в БД: время суток, день недели, популярность фильма, премьера/эксклюзив.
/// </summary>
public static class DynamicPricing
{
    private static readonly TimeZoneInfo MinskTz =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Minsk");

    public static decimal GetEffectiveBasePrice(Screening screening, Movie movie)
    {
        var baseP = screening.BasePrice;
        if (baseP <= 0) return baseP;

        var utc = NormalizeToUtc(screening.StartTime);
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, MinskTz);
        var hour = local.Hour;
        var dow = local.DayOfWeek;

        var m = 1.0m;

        // Пик вечера (17–22)
        if (hour >= 17 && hour <= 22)
            m *= 1.12m;
        else if (hour >= 10 && hour <= 13)
            m *= 0.93m;
        else if (hour < 10)
            m *= 0.89m;

        if (dow is DayOfWeek.Saturday or DayOfWeek.Sunday)
            m *= 1.07m;

        var rc = movie.RatingCount;
        var ar = movie.AverageRating;
        if (rc >= 35 && ar >= 7.4)
            m *= 1.07m;
        else if (rc > 0 && rc < 12 && ar > 0 && ar < 6.3)
            m *= 0.96m;

        if (screening.IsPremiere)
            m *= 1.10m;
        if (screening.IsExclusive)
            m *= 1.06m;

        m = Math.Clamp(m, 0.78m, 1.45m);
        return Math.Round(baseP * m, 2, MidpointRounding.AwayFromZero);
    }

    public static string? GetPricingNote(Screening screening, Movie movie)
    {
        var effective = GetEffectiveBasePrice(screening, movie);
        if (effective <= 0 || screening.BasePrice <= 0) return null;

        var utc = NormalizeToUtc(screening.StartTime);
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, MinskTz);
        var hour = local.Hour;
        var dow = local.DayOfWeek;

        var parts = new List<string>();
        if (hour >= 17 && hour <= 22)
            parts.Add("пик спроса");
        else if (hour >= 10 && hour <= 13)
            parts.Add("дневной сеанс");
        else if (hour < 10)
            parts.Add("утро");

        if (dow is DayOfWeek.Saturday or DayOfWeek.Sunday)
            parts.Add("выходной");

        if (movie.RatingCount >= 35 && movie.AverageRating >= 7.4)
            parts.Add("хит проката");

        if (screening.IsPremiere)
            parts.Add("премьера");
        if (screening.IsExclusive)
            parts.Add("эксклюзив");

        return parts.Count == 0 ? null : string.Join(" · ", parts);
    }

    private static DateTime NormalizeToUtc(DateTime t)
    {
        if (t.Kind == DateTimeKind.Utc) return t;
        if (t.Kind == DateTimeKind.Local) return t.ToUniversalTime();
        return DateTime.SpecifyKind(t, DateTimeKind.Utc);
    }
}
