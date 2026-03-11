namespace CinemaApp.Application.DTOs;

public record CreateBookingRequest(int ScreeningId, List<int> SeatTemplateIds, List<FoodOrderItem>? FoodItems);
public record FoodOrderItem(int FoodItemId, int Quantity);

public record BookingDto(
    int Id, int ScreeningId, string MovieTitle, string HallName,
    DateTime StartTime, string Status, decimal TotalPrice,
    DateTime CreatedAt, DateTime? PaidAt,
    string? PaymentUrl, string? PaymentReference,
    List<BookingSeatDto> Seats, List<BookingFoodDto> Food);

public record BookingSeatDto(int Row, int Number, string Type, decimal Price);
public record BookingFoodDto(string Name, int Quantity, decimal Price);

public record FoodItemDto(int Id, string Name, string? Description, decimal Price, string? ImageUrl, string Category);
