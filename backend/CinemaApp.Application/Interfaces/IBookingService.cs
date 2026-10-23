using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IBookingService
{
    Task<HallLayoutDto> GetScreeningSeatsAsync(int screeningId);
    Task<BookingDto> CreateBookingAsync(int userId, CreateBookingRequest request);
    Task<BookingDto> ConfirmPaymentAsync(int bookingId, int userId);
    Task CancelBookingAsync(int bookingId, int userId);
    Task<int> PruneUserBookingsAsync(int userId, int keepCount = 3);
    Task<List<BookingDto>> GetUserBookingsAsync(int userId);
    Task<List<FoodItemDto>> GetFoodMenuAsync();

    Task<CartStateDto> CreateCartAsync(int userId, int screeningId);
    Task<CartStateDto> GetCartAsync(int bookingId, int userId);
    Task<CartStateDto> AddSeatAsync(int bookingId, int userId, int seatTemplateId);
    Task<CartStateDto> RemoveSeatAsync(int bookingId, int userId, int seatTemplateId);
    Task<CartStateDto> SetFoodAsync(int bookingId, int userId, int foodItemId, int quantity);
    Task<CartStateDto> ApplyPromoAsync(int bookingId, int userId, string? promoCode);
    Task<CartStateDto> SetBonusAsync(int bookingId, int userId, int bonusPoints);
    Task<CartStateDto> ExtendHoldAsync(int bookingId, int userId);
    Task<PaymentResultDto> PayCartAsync(int bookingId, int userId);
}
