namespace CinemaApp.Application.DTOs;

public record CreateBookingRequest(int ScreeningId, List<int> SeatTemplateIds, List<FoodOrderItem>? FoodItems, string? PromoCode = null, int BonusPointsToUse = 0);
public record FoodOrderItem(int FoodItemId, int Quantity);

public record BookingDto(
    int Id, int ScreeningId, int MovieId, string MovieTitle, string? PosterUrl, string HallName,
    DateTime StartTime, string Status, decimal TotalPrice,
    DateTime CreatedAt, DateTime? PaidAt,
    string? PaymentUrl, string? PaymentReference,
    List<BookingSeatDto> Seats, List<BookingFoodDto> Food,
    int BonusPointsUsed, int BonusPointsEarned);

public record BookingSeatDto(int SeatTemplateId, int Row, int Number, string Type, decimal Price);
public record BookingFoodDto(string Name, int Quantity, decimal Price);

public record FoodItemDto(int Id, string Name, string? Description, decimal Price, string? ImageUrl, string Category);

public record CreateCartRequest(int ScreeningId);
public record CartSeatRequest(int SeatTemplateId);
public record CartFoodRequest(int FoodItemId, int Quantity);
public record CartPromoRequest(string? PromoCode);
public record CartBonusRequest(int BonusPoints);

public record CartStateDto(
    int BookingId,
    int ScreeningId,
    string MovieTitle,
    string HallName,
    DateTime StartTime,
    DateTime? LockedUntil,
    List<BookingSeatDto> Seats,
    List<CartFoodLineDto> Food,
    decimal SeatTotal,
    decimal FoodTotal,
    decimal Subtotal,
    string? PromoCode,
    decimal PromoDiscount,
    int BonusPointsUsed,
    int BonusPointsAvailable,
    decimal Total,
    int EarnedBonusesPreview,
    string? LoyaltyLevel,
    decimal LoyaltyDiscount,
    int LoyaltyDiscountPercent);

public record CartFoodLineDto(int FoodItemId, string Name, int Quantity, decimal UnitPrice, decimal TotalPrice);

public record PaymentResultDto(
    CartStateDto Cart,
    DateTime PaidAt,
    int BonusPointsEarned,
    int NewBonusBalance,
    string? LoyaltyLevel);
