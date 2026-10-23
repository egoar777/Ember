namespace CinemaApp.Application.Services;

/// <summary>
/// Двухместные ряды (Love Seat, 1-й и последний ряд) — одна цена на пару мест.
/// </summary>
public static class SeatPairPricing
{
    public static bool FormsDoubleSeatPair(int row, int numberA, int numberB, string type, int hallTotalRows)
    {
        if (numberB != numberA + 1) return false;

        var typeLower = type.ToLowerInvariant();
        if (typeLower.Contains("love")) return true;
        if (row == 1) return true;
        if (hallTotalRows > 0 && row == hallTotalRows) return true;

        return false;
    }

    public static decimal SumSeatPrices(
        IReadOnlyList<(int SeatTemplateId, int Row, int Number, string Type, decimal Price)> seats,
        int hallTotalRows)
    {
        if (seats.Count == 0) return 0m;

        var list = seats.OrderBy(s => s.Row).ThenBy(s => s.Number).ToList();
        var skip = new HashSet<int>();
        decimal sum = 0m;

        for (var i = 0; i < list.Count; i++)
        {
            var a = list[i];
            if (skip.Contains(a.SeatTemplateId)) continue;

            if (i + 1 < list.Count)
            {
                var b = list[i + 1];
                if (a.Row == b.Row
                    && FormsDoubleSeatPair(a.Row, a.Number, b.Number, a.Type, hallTotalRows))
                {
                    sum += a.Price;
                    skip.Add(b.SeatTemplateId);
                    continue;
                }
            }

            sum += a.Price;
        }

        return sum;
    }
}
