namespace CinemaApp.Application.Services;

/// <summary>
/// Уровни постоянных зрителей: скидка на билеты и множитель начисления бонусов.
/// </summary>
public static class LoyaltyProgram
{
    public const decimal BonusEarnRate = 0.10m;

    public const string TierStandard = "Standard";
    public const string TierSilver = "Silver";
    public const string TierGold = "Gold";
    public const string TierPremium = "Premium";

    private const decimal SilverSpent = 50m;
    private const int SilverTickets = 3;
    private const decimal GoldSpent = 120m;
    private const int GoldTickets = 7;
    public const decimal PremiumSpentThreshold = 200m;
    public const int PremiumTicketsThreshold = 10;

    /// <summary>Обратная совместимость с прежним API.</summary>
    public static string GetLevel(decimal totalSpent, int ticketsPurchased) =>
        GetTier(totalSpent, ticketsPurchased);

    public static string GetTier(decimal totalSpent, int ticketsPurchased)
    {
        if (totalSpent >= PremiumSpentThreshold || ticketsPurchased >= PremiumTicketsThreshold)
            return TierPremium;
        if (totalSpent >= GoldSpent || ticketsPurchased >= GoldTickets)
            return TierGold;
        if (totalSpent >= SilverSpent || ticketsPurchased >= SilverTickets)
            return TierSilver;
        return TierStandard;
    }

    public static int GetTicketDiscountPercent(decimal totalSpent, int ticketsPurchased) =>
        GetTier(totalSpent, ticketsPurchased) switch
        {
            TierPremium => 10,
            TierGold => 6,
            TierSilver => 3,
            _ => 0,
        };

    public static decimal GetBonusEarnMultiplier(decimal totalSpent, int ticketsPurchased) =>
        GetTier(totalSpent, ticketsPurchased) switch
        {
            TierPremium => 1.25m,
            TierGold => 1.15m,
            TierSilver => 1.10m,
            _ => 1.0m,
        };

    /// <summary>Начисление бонусов с учётом уровня на момент оплаты (до обновления статистики).</summary>
    public static int CalculateEarnedBonuses(decimal paidAmount, decimal totalSpentBefore, int ticketsPurchasedBefore)
    {
        if (paidAmount <= 0) return 0;
        var mult = GetBonusEarnMultiplier(totalSpentBefore, ticketsPurchasedBefore);
        return (int)decimal.Floor(paidAmount * BonusEarnRate * mult);
    }

    public static decimal CalculatePromoDiscount(string? promoCode, decimal subtotal)
    {
        if (subtotal <= 0) return 0m;
        return string.Equals(promoCode?.Trim(), "MCBBY", StringComparison.OrdinalIgnoreCase)
            ? Math.Round(subtotal * 0.10m, 2)
            : 0m;
    }

    public static string GetLoyaltySummary(decimal totalSpent, int ticketsPurchased)
    {
        var tier = GetTier(totalSpent, ticketsPurchased);
        var d = GetTicketDiscountPercent(totalSpent, ticketsPurchased);
        var m = GetBonusEarnMultiplier(totalSpent, ticketsPurchased);
        return $"Уровень {tier}: скидка на билеты {d}%, бонусы ×{m:0.##}.";
    }
}
