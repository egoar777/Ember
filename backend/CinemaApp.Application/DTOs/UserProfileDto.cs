namespace CinemaApp.Application.DTOs;

public record UserProfileDto(
    int Id, string Email, string DisplayName, string Role,
    string? AvatarUrl, string? Preferences, string? NotificationSettings,
    int BonusBalance, decimal TotalSpent, int TicketsPurchased, string Level,
    decimal LoyaltyTicketDiscountPercent,
    decimal BonusEarnMultiplier,
    string LoyaltySummary);

public record UpdateProfileRequest(string? DisplayName, string? AvatarUrl, string? Preferences, string? NotificationSettings);
