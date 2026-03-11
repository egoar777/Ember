using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IBookingService
{
    Task<HallLayoutDto> GetScreeningSeatsAsync(int screeningId);
    Task<BookingDto> CreateBookingAsync(int userId, CreateBookingRequest request);
    Task<BookingDto> ConfirmPaymentAsync(int bookingId, int userId);
    Task CancelBookingAsync(int bookingId, int userId);
    Task<List<BookingDto>> GetUserBookingsAsync(int userId);
    Task<List<FoodItemDto>> GetFoodMenuAsync();
}
