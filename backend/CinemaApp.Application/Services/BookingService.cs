using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using CinemaApp.Domain.Interfaces;
using CinemaApp.Data;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class BookingService : IBookingService
{
    private readonly CinemaDbContext _db;
    private readonly IPaymentProvider _paymentProvider;

    public BookingService(CinemaDbContext db, IPaymentProvider paymentProvider)
    {
        _db = db;
        _paymentProvider = paymentProvider;
    }

        private async Task<int> GetGuestUserIdAsync()
        {
            var guest = await _db.Users.FirstOrDefaultAsync(u => u.Email == "guest@cinema.local");
            if (guest != null) return guest.Id;

            var guestUser = new User
            {
                Email = "guest@cinema.local",
                PasswordHash = string.Empty,
                DisplayName = "Гость",
                Role = UserRole.User
            };
            _db.Users.Add(guestUser);
            await _db.SaveChangesAsync();
            return guestUser.Id;
        }

    public async Task<HallLayoutDto> GetScreeningSeatsAsync(int screeningId)
    {
        var screening = await _db.Screenings
            .Include(s => s.Hall)
            .Include(s => s.Movie)
            .Include(s => s.SeatStatuses)
                .ThenInclude(ss => ss.SeatTemplate)
            .FirstOrDefaultAsync(s => s.Id == screeningId);

        if (screening == null)
            throw new InvalidOperationException($"Screening with id {screeningId} not found.");

        var now = DateTime.UtcNow;
        var seats = screening.SeatStatuses.Select(ss =>
        {
            var st = ss.SeatTemplate;
            var effectiveStatus = ss.Status == SeatStatus.Reserved && ss.LockedUntil < now
                ? SeatStatus.Available
                : ss.Status;
            var price = screening.BasePrice * st.PriceMultiplier;
            return new SeatStatusDto(
                st.Id,
                st.Row,
                st.Number,
                st.Type.ToString(),
                effectiveStatus.ToString(),
                price);
        }).ToList();

        return new HallLayoutDto(
            screening.Hall.Id,
            screening.Hall.Name,
            screening.Hall.TotalRows,
            screening.Hall.SeatsPerRow,
            seats);
    }

    public async Task<BookingDto> CreateBookingAsync(int userId, CreateBookingRequest req)
    {
        // Если пользователь не авторизован, создаём/используем специального гостя
        if (userId == 0)
        {
            userId = await GetGuestUserIdAsync();
        }
        var screening = await _db.Screenings
            .Include(s => s.Hall)
            .Include(s => s.Movie)
            .Include(s => s.SeatStatuses)
                .ThenInclude(ss => ss.SeatTemplate)
            .FirstOrDefaultAsync(s => s.Id == req.ScreeningId);

        if (screening == null)
            throw new InvalidOperationException($"Screening with id {req.ScreeningId} not found.");

        if (screening.StartTime <= DateTime.UtcNow)
            throw new InvalidOperationException("Screening has already started or ended.");

        var seatStatuses = await _db.ScreeningSeatStatuses
            .Include(ss => ss.SeatTemplate)
            .Where(ss => ss.ScreeningId == req.ScreeningId && req.SeatTemplateIds.Contains(ss.SeatTemplateId))
            .ToListAsync();

        if (seatStatuses.Count != req.SeatTemplateIds.Count)
            throw new InvalidOperationException("One or more requested seats are invalid for this screening.");

        var now = DateTime.UtcNow;
        foreach (var ss in seatStatuses)
        {
            var isAvailable = ss.Status == SeatStatus.Available
                || (ss.Status == SeatStatus.Reserved && ss.LockedUntil < now);
            if (!isAvailable)
                throw new InvalidOperationException($"Seat row {ss.SeatTemplate.Row}, number {ss.SeatTemplate.Number} is not available.");
        }

        var lockUntil = now.AddMinutes(10);
        foreach (var ss in seatStatuses)
        {
            ss.Status = SeatStatus.Reserved;
            ss.LockedUntil = lockUntil;
        }

        var seatPrice = seatStatuses.Sum(ss => screening.BasePrice * ss.SeatTemplate.PriceMultiplier);

        var foodPrice = 0m;
        List<FoodItem>? foodItemsList = null;
        if (req.FoodItems != null && req.FoodItems.Count > 0)
        {
            var foodItemIds = req.FoodItems.Select(f => f.FoodItemId).Distinct().ToList();
            foodItemsList = await _db.FoodItems
                .Where(f => foodItemIds.Contains(f.Id) && f.IsAvailable)
                .ToListAsync();

            var foodQtyById = req.FoodItems.ToDictionary(f => f.FoodItemId, f => f.Quantity);
            foreach (var fi in foodItemsList)
            {
                if (foodQtyById.TryGetValue(fi.Id, out var qty))
                    foodPrice += fi.Price * qty;
            }
        }

        var totalPrice = seatPrice + foodPrice;

        var booking = new Booking
        {
            UserId = userId,
            ScreeningId = req.ScreeningId,
            Status = BookingStatus.Pending,
            TotalPrice = totalPrice,
            CreatedAt = DateTime.UtcNow
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        foreach (var ss in seatStatuses)
        {
            ss.BookingId = booking.Id;
        }

        if (req.FoodItems != null && foodItemsList != null)
        {
            var validFoodIds = foodItemsList.Select(f => f.Id).ToHashSet();
            foreach (var item in req.FoodItems.Where(fo => validFoodIds.Contains(fo.FoodItemId)))
            {
                _db.BookingFoodItems.Add(new BookingFoodItem
                {
                    BookingId = booking.Id,
                    FoodItemId = item.FoodItemId,
                    Quantity = item.Quantity
                });
            }
        }

        await _db.SaveChangesAsync();

        var paymentResult = await _paymentProvider.CreatePaymentAsync(booking.Id, totalPrice, $"Booking #{booking.Id}");
        booking.PaymentProvider = "Stub";
        booking.PaymentReference = paymentResult.PaymentReference;
        await _db.SaveChangesAsync();

        var foodDtos = req.FoodItems != null && foodItemsList != null
            ? req.FoodItems
                .Where(fo => foodItemsList.Any(fi => fi.Id == fo.FoodItemId))
                .Select(fo =>
                {
                    var fi = foodItemsList.First(f => f.Id == fo.FoodItemId);
                    return new BookingFoodDto(fi.Name, fo.Quantity, fi.Price * fo.Quantity);
                }).ToList()
            : new List<BookingFoodDto>();
        return MapToBookingDto(booking, screening, seatStatuses, foodDtos, paymentResult.PaymentUrl);
    }

        public async Task<BookingDto> ConfirmPaymentAsync(int bookingId, int userId)
    {
        var booking = await _db.Bookings
            .Include(b => b.Seats)
                .ThenInclude(s => s.SeatTemplate)
            .Include(b => b.FoodItems)
                .ThenInclude(bf => bf.FoodItem)
            .Include(b => b.Screening)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Screening)
                .ThenInclude(s => s.Hall)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            throw new InvalidOperationException($"Booking with id {bookingId} not found.");

        // Для авторизованных пользователей продолжаем проверять владельца.
        // Для гостевых покупок (userId == 0) не проверяем.
        if (userId != 0 && booking.UserId != userId)
            throw new UnauthorizedAccessException("Booking does not belong to this user.");

        if (booking.Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Booking is not pending payment (current status: {booking.Status}).");

        if (string.IsNullOrEmpty(booking.PaymentReference))
            throw new InvalidOperationException("Booking has no payment reference.");

        var verified = await _paymentProvider.VerifyPaymentAsync(booking.PaymentReference);
        if (!verified)
            throw new InvalidOperationException("Payment verification failed.");

        booking.Status = BookingStatus.Paid;
        booking.PaidAt = DateTime.UtcNow;

        foreach (var ss in booking.Seats)
        {
            ss.Status = SeatStatus.Sold;
            ss.LockedUntil = null;
        }

        await _db.SaveChangesAsync();

        var foodDtos = booking.FoodItems.Select(bf => new BookingFoodDto(bf.FoodItem.Name, bf.Quantity, bf.FoodItem.Price * bf.Quantity)).ToList();
        return MapToBookingDto(booking, booking.Screening, booking.Seats.ToList(), foodDtos, null);
    }

    public async Task CancelBookingAsync(int bookingId, int userId)
    {
        var booking = await _db.Bookings
            .Include(b => b.Seats)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            throw new InvalidOperationException($"Booking with id {bookingId} not found.");

        if (booking.UserId != userId)
            throw new UnauthorizedAccessException("Booking does not belong to this user.");

        booking.Status = BookingStatus.Cancelled;
        foreach (var ss in booking.Seats)
        {
            ss.Status = SeatStatus.Available;
            ss.LockedUntil = null;
            ss.BookingId = null;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<List<BookingDto>> GetUserBookingsAsync(int userId)
    {
        var bookings = await _db.Bookings
            .Include(b => b.Screening)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Screening)
                .ThenInclude(s => s.Hall)
            .Include(b => b.Seats)
                .ThenInclude(ss => ss.SeatTemplate)
            .Include(b => b.FoodItems)
                .ThenInclude(bf => bf.FoodItem)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(b =>
        {
            var foodDtos = b.FoodItems.Select(bf => new BookingFoodDto(bf.FoodItem.Name, bf.Quantity, bf.FoodItem.Price * bf.Quantity)).ToList();
            return MapToBookingDto(b, b.Screening, b.Seats.ToList(), foodDtos, null);
        }).ToList();
    }

    public async Task<List<FoodItemDto>> GetFoodMenuAsync()
    {
        var items = await _db.FoodItems
            .Where(f => f.IsAvailable)
            .ToListAsync();

        return items.Select(f => new FoodItemDto(
            f.Id,
            f.Name,
            f.Description,
            f.Price,
            f.ImageUrl,
            f.Category)).ToList();
    }

    private static BookingDto MapToBookingDto(
        Booking booking,
        Screening screening,
        List<ScreeningSeatStatus> seats,
        List<BookingFoodDto> foodDtos,
        string? paymentUrl)
    {
        // Подстраховка от возможных null в навигационных свойствах
        var safeSeats = seats ?? new List<ScreeningSeatStatus>();
        var basePrice = screening?.BasePrice ?? 0m;

        var seatDtos = safeSeats
            .Where(ss => ss?.SeatTemplate != null)
            .Select(ss =>
            {
                var st = ss.SeatTemplate!;
                var price = basePrice * st.PriceMultiplier;
                return new BookingSeatDto(st.Row, st.Number, st.Type.ToString(), price);
            })
            .ToList();

        var movieTitle = screening?.Movie?.Title ?? "Фильм";
        var hallName = screening?.Hall?.Name ?? "Зал";

        return new BookingDto(
            booking.Id,
            booking.ScreeningId,
            movieTitle,
            hallName,
            screening?.StartTime ?? booking.CreatedAt,
            booking.Status.ToString(),
            booking.TotalPrice,
            booking.CreatedAt,
            booking.PaidAt,
            paymentUrl,
            booking.PaymentReference,
            seatDtos,
            foodDtos ?? new List<BookingFoodDto>());
    }
}
