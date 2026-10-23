using CinemaApp.Application.Common;
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
    private const string AdminPaymentReference = "admin-bypass";
    private const int AdminBonusBalance = 9_999_999;

    private readonly CinemaDbContext _db;
    private readonly IPaymentProvider _paymentProvider;
    private readonly IMooonCinemaSyncService _mooonSync;

    private static bool IsGuest(User user) => user.PasswordHash == "!guest" || user.Email == "guest@cinema.local";

    private static bool IsAdmin(User? user) => user?.Role == UserRole.Admin;

    public BookingService(CinemaDbContext db, IPaymentProvider paymentProvider, IMooonCinemaSyncService mooonSync)
    {
        _db = db;
        _paymentProvider = paymentProvider;
        _mooonSync = mooonSync;
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
            throw ApiException.NotFound(ErrorCodes.ScreeningNotFound);

        if (screening.Movie?.IsArchived == true)
            throw ApiException.BadRequest(ErrorCodes.MovieArchived);

        if (screening.IsCancelled)
            throw ApiException.BadRequest(ErrorCodes.ScreeningCancelled);

        var now = DateTime.UtcNow;
        var unit = screening.Movie != null
            ? DynamicPricing.GetEffectiveBasePrice(screening, screening.Movie)
            : screening.BasePrice;
        var seats = screening.SeatStatuses.Select(ss =>
        {
            var st = ss.SeatTemplate;
            var effectiveStatus = ss.Status == SeatStatus.Reserved && ss.LockedUntil < now
                ? SeatStatus.Available
                : ss.Status;
            var price = unit * st.PriceMultiplier;
            return new SeatStatusDto(
                st.Id,
                st.Row,
                st.Number,
                st.Type.ToString(),
                effectiveStatus.ToString(),
                price);
        }).ToList();

        var movie = screening.Movie;
        var movieTitle = movie?.Title ?? "Фильм";
        var posterUrl = movie != null ? MooonFilmImageUrls.ResolvePosterUrl(movie, null) : null;
        var backgroundUrl = movie != null ? MooonFilmImageUrls.ResolveBackgroundUrl(movie, null) : null;

        return new HallLayoutDto(
            screening.Id,
            screening.MovieId,
            movieTitle,
            posterUrl,
            backgroundUrl,
            movie?.AgeRating,
            movie?.Duration ?? 0,
            screening.StartTime,
            screening.Format,
            screening.Language,
            screening.Hall.Id,
            screening.Hall.Name,
            screening.Hall.TotalRows,
            screening.Hall.SeatsPerRow,
            seats);
    }

    public async Task<BookingDto> CreateBookingAsync(int userId, CreateBookingRequest req)
    {
        if (userId <= 0) throw ApiException.Unauthorized(ErrorCodes.UserNotIdentified);
        if (req.SeatTemplateIds == null || req.SeatTemplateIds.Count == 0 ||
            req.SeatTemplateIds.Distinct().Count() != req.SeatTemplateIds.Count)
            throw ApiException.BadRequest(ErrorCodes.SeatsInvalid);
        if (req.FoodItems?.Any(f => f.Quantity <= 0 || f.Quantity > 100) == true ||
            req.FoodItems?.Select(f => f.FoodItemId).Distinct().Count() != req.FoodItems?.Count)
            throw ApiException.BadRequest(ErrorCodes.FoodNotFound);

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var screening = await _db.Screenings
            .Include(s => s.Hall)
            .Include(s => s.Movie)
            .Include(s => s.SeatStatuses)
                .ThenInclude(ss => ss.SeatTemplate)
            .FirstOrDefaultAsync(s => s.Id == req.ScreeningId);

        if (screening == null)
            throw ApiException.NotFound(ErrorCodes.ScreeningNotFound);

        if (screening.Movie?.IsArchived == true)
            throw ApiException.BadRequest(ErrorCodes.MovieArchived);

        if (screening.IsCancelled)
            throw ApiException.BadRequest(ErrorCodes.ScreeningCancelled);

        if (screening.StartTime <= DateTime.UtcNow)
            throw ApiException.BadRequest(ErrorCodes.ScreeningAlreadyStartedOrEnded);

        User? loyaltyUser = null;
        if (userId != 0)
        {
            loyaltyUser = await _db.Users.FindAsync(userId);
        }

        var seatStatuses = await _db.ScreeningSeatStatuses
            .Include(ss => ss.SeatTemplate)
            .Where(ss => ss.ScreeningId == req.ScreeningId && req.SeatTemplateIds.Contains(ss.SeatTemplateId))
            .ToListAsync();

        if (seatStatuses.Count != req.SeatTemplateIds.Count)
            throw ApiException.BadRequest(ErrorCodes.SeatsInvalid);

        var now = DateTime.UtcNow;
        foreach (var ss in seatStatuses)
        {
            var isAvailable = ss.Status == SeatStatus.Available
                || (ss.Status == SeatStatus.Reserved && ss.LockedUntil < now);
            if (!isAvailable)
                throw ApiException.BadRequest(ErrorCodes.SeatUnavailable, SeatParams(ss));
        }

        var lockUntil = now.AddMinutes(10);
        foreach (var ss in seatStatuses)
        {
            ss.Status = SeatStatus.Reserved;
            ss.LockedUntil = lockUntil;
        }

        var unit = screening.Movie != null
            ? DynamicPricing.GetEffectiveBasePrice(screening, screening.Movie)
            : screening.BasePrice;
        var hallRows = screening.Hall?.TotalRows ?? 0;
        var seatPriceLines = seatStatuses
            .Select(ss => (
                ss.SeatTemplateId,
                ss.SeatTemplate.Row,
                ss.SeatTemplate.Number,
                ss.SeatTemplate.Type.ToString(),
                unit * ss.SeatTemplate.PriceMultiplier))
            .ToList();
        var seatPriceBeforeLoyalty = SeatPairPricing.SumSeatPrices(seatPriceLines, hallRows);
        var loyaltyPctDirect = 0;
        if (loyaltyUser != null && !IsGuest(loyaltyUser))
            loyaltyPctDirect = LoyaltyProgram.GetTicketDiscountPercent(loyaltyUser.TotalSpent, loyaltyUser.TicketsPurchased);
        var loyaltyDiscDirect = Math.Round(seatPriceBeforeLoyalty * loyaltyPctDirect / 100m, 2);
        var seatPrice = Math.Max(0m, seatPriceBeforeLoyalty - loyaltyDiscDirect);

        var foodPrice = 0m;
        List<FoodItem>? foodItemsList = null;
        if (req.FoodItems != null && req.FoodItems.Count > 0)
        {
            var foodItemIds = req.FoodItems.Select(f => f.FoodItemId).Distinct().ToList();
            foodItemsList = await _db.FoodItems
                .Where(f => foodItemIds.Contains(f.Id) && f.IsAvailable)
                .ToListAsync();

            if (foodItemsList.Count != foodItemIds.Count)
                throw ApiException.BadRequest(ErrorCodes.FoodNotFound);

            var foodQtyById = req.FoodItems.ToDictionary(f => f.FoodItemId, f => f.Quantity);
            foreach (var fi in foodItemsList)
            {
                if (foodQtyById.TryGetValue(fi.Id, out var qty))
                    foodPrice += fi.Price * qty;
            }
        }

        var subtotal = seatPrice + foodPrice;
        var promoDiscount = LoyaltyProgram.CalculatePromoDiscount(req.PromoCode, subtotal);
        var afterPromo = Math.Max(0m, subtotal - promoDiscount);

        var bonusPointsToUse = 0;
        if (loyaltyUser != null && !IsGuest(loyaltyUser) && req.BonusPointsToUse > 0)
        {
            var bonusCap = IsAdmin(loyaltyUser)
                ? (int)decimal.Floor(afterPromo)
                : Math.Min(loyaltyUser.BonusBalance, (int)decimal.Floor(afterPromo));
            bonusPointsToUse = Math.Min(Math.Max(0, req.BonusPointsToUse), bonusCap);
        }

        var totalPrice = IsAdmin(loyaltyUser) ? 0m : Math.Max(0m, afterPromo - bonusPointsToUse);

        var booking = new Booking
        {
            UserId = userId,
            ScreeningId = req.ScreeningId,
            Status = BookingStatus.Pending,
            TotalPrice = totalPrice,
            BonusPointsUsed = bonusPointsToUse,
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

        string? paymentUrl = null;
        if (IsAdmin(loyaltyUser))
        {
            booking.PaymentProvider = "Admin";
            booking.PaymentReference = AdminPaymentReference;
        }
        else
        {
            var paymentResult = await _paymentProvider.CreatePaymentAsync(booking.Id, totalPrice, $"Booking #{booking.Id}");
            booking.PaymentProvider = "Stub";
            booking.PaymentReference = paymentResult.PaymentReference;
            paymentUrl = paymentResult.PaymentUrl;
        }
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
        await transaction.CommitAsync();
        return MapToBookingDto(booking, screening, seatStatuses, foodDtos, paymentUrl);
    }

    public async Task<BookingDto> ConfirmPaymentAsync(int bookingId, int userId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var booking = await _db.Bookings
            .Include(b => b.User)
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
            throw ApiException.NotFound(ErrorCodes.BookingNotFound);

        if (booking.UserId != userId)
            throw ApiException.Forbidden(ErrorCodes.BookingAccessDenied);

        if (booking.Status != BookingStatus.Pending)
            throw ApiException.BadRequest(ErrorCodes.BookingNotPendingPayment,
                new Dictionary<string, object> { ["status"] = booking.Status.ToString() });

        var now = DateTime.UtcNow;
        if (booking.Screening.IsCancelled)
            throw ApiException.BadRequest(ErrorCodes.ScreeningCancelled);
        if (booking.Screening.StartTime <= now)
            throw ApiException.BadRequest(ErrorCodes.ScreeningAlreadyStarted);
        if (booking.Seats.Count == 0 || booking.Seats.Any(s => s.Status != SeatStatus.Reserved || s.LockedUntil == null || s.LockedUntil <= now))
            throw ApiException.BadRequest(ErrorCodes.SeatsInvalid);
        if (booking.User != null && !IsAdmin(booking.User) && booking.BonusPointsUsed > booking.User.BonusBalance)
            throw ApiException.BadRequest(ErrorCodes.BookingNotPendingPayment);

        var isAdmin = IsAdmin(booking.User);
        if (!isAdmin)
        {
            if (string.IsNullOrEmpty(booking.PaymentReference))
                throw ApiException.BadRequest(ErrorCodes.BookingNoPaymentReference);

            var verified = await _paymentProvider.VerifyPaymentAsync(booking.PaymentReference);
            if (!verified)
                throw ApiException.BadRequest(ErrorCodes.PaymentVerificationFailed);
        }
        else
        {
            booking.PaymentProvider = "Admin";
            booking.PaymentReference = AdminPaymentReference;
            booking.TotalPrice = 0;
        }

        booking.Status = BookingStatus.Paid;
        booking.PaidAt = DateTime.UtcNow;

        foreach (var ss in booking.Seats)
        {
            ss.Status = SeatStatus.Sold;
            ss.LockedUntil = null;
        }

        if (booking.User != null && !IsGuest(booking.User))
        {
            if (isAdmin)
            {
                booking.BonusPointsEarned = 0;
                booking.User.BonusBalance = AdminBonusBalance;
            }
            else
            {
                booking.User.BonusBalance = Math.Max(0, booking.User.BonusBalance - booking.BonusPointsUsed);
                booking.BonusPointsEarned = LoyaltyProgram.CalculateEarnedBonuses(
                    booking.TotalPrice,
                    booking.User.TotalSpent,
                    booking.User.TicketsPurchased);
                booking.User.BonusBalance += booking.BonusPointsEarned;
            }
            booking.User.TotalSpent += booking.TotalPrice;
            booking.User.TicketsPurchased += booking.Seats.Count;

            var wantToWatchItems = await _db.UserListItems
                .Include(item => item.UserList)
                .Where(item =>
                    item.MovieId == booking.Screening.MovieId &&
                    item.UserList.UserId == booking.UserId &&
                    item.UserList.Type == UserListType.WantToWatch)
                .ToListAsync();

            if (wantToWatchItems.Count > 0)
            {
                _db.UserListItems.RemoveRange(wantToWatchItems);
            }
        }

        await _db.SaveChangesAsync();

        var foodDtos = booking.FoodItems.Select(bf => new BookingFoodDto(bf.FoodItem.Name, bf.Quantity, bf.FoodItem.Price * bf.Quantity)).ToList();
        await transaction.CommitAsync();
        return MapToBookingDto(booking, booking.Screening, booking.Seats.ToList(), foodDtos, null);
    }

    public async Task CancelBookingAsync(int bookingId, int userId)
    {
        var booking = await _db.Bookings
            .Include(b => b.Seats)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            throw ApiException.NotFound(ErrorCodes.BookingNotFound);

        if (booking.UserId != userId)
            throw ApiException.Forbidden(ErrorCodes.BookingAccessDenied);

        if (booking.Status != BookingStatus.Pending)
            throw ApiException.BadRequest(ErrorCodes.BookingNotPending);

        booking.Status = BookingStatus.Cancelled;
        foreach (var ss in booking.Seats)
        {
            ss.Status = SeatStatus.Available;
            ss.LockedUntil = null;
            ss.BookingId = null;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<int> PruneUserBookingsAsync(int userId, int keepCount = 3)
    {
        if (keepCount < 0) keepCount = 0;

        var keepIds = await _db.Bookings
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Take(keepCount)
            .Select(b => b.Id)
            .ToListAsync();

        var toRemove = await _db.Bookings
            .Include(b => b.Seats)
            .Include(b => b.FoodItems)
            .Where(b => b.UserId == userId && !keepIds.Contains(b.Id))
            .ToListAsync();

        foreach (var booking in toRemove)
        {
            _db.BookingFoodItems.RemoveRange(booking.FoodItems);
            foreach (var seat in booking.Seats)
            {
                seat.BookingId = null;
            }
            _db.Bookings.Remove(booking);
        }

        if (toRemove.Count > 0)
            await _db.SaveChangesAsync();

        return toRemove.Count;
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

        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();

        return bookings.Select(b =>
        {
            var foodDtos = b.FoodItems.Select(bf => new BookingFoodDto(bf.FoodItem.Name, bf.Quantity, bf.FoodItem.Price * bf.Quantity)).ToList();
            return MapToBookingDto(b, b.Screening, b.Seats.ToList(), foodDtos, null, mooonMap);
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
        string? paymentUrl,
        IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>? mooonMap = null)
    {
        // Подстраховка от возможных null в навигационных свойствах
        var safeSeats = seats ?? new List<ScreeningSeatStatus>();
        var unit = screening?.Movie != null && screening != null
            ? DynamicPricing.GetEffectiveBasePrice(screening, screening.Movie)
            : screening?.BasePrice ?? 0m;

        var seatDtos = safeSeats
            .Where(ss => ss?.SeatTemplate != null)
            .Select(ss =>
            {
                var st = ss.SeatTemplate!;
                var price = unit * st.PriceMultiplier;
                return new BookingSeatDto(st.Id, st.Row, st.Number, st.Type.ToString(), price);
            })
            .ToList();

        var movie = screening?.Movie;
        var movieTitle = movie?.Title ?? "Фильм";
        var movieId = screening?.MovieId ?? movie?.Id ?? 0;
        var posterUrl = movie != null ? MooonFilmImageUrls.ResolvePosterUrl(movie, mooonMap) : null;
        var hallName = screening?.Hall?.Name ?? "Зал";

        return new BookingDto(
            booking.Id,
            booking.ScreeningId,
            movieId,
            movieTitle,
            posterUrl,
            hallName,
            screening?.StartTime ?? booking.CreatedAt,
            booking.Status.ToString(),
            booking.TotalPrice,
            booking.CreatedAt,
            booking.PaidAt,
            paymentUrl,
            booking.PaymentReference,
            seatDtos,
            foodDtos ?? new List<BookingFoodDto>(),
            booking.BonusPointsUsed,
            booking.BonusPointsEarned);
    }

    // ======================== Cart API ========================

    public async Task<CartStateDto> CreateCartAsync(int userId, int screeningId)
    {
        if (userId <= 0) throw ApiException.Unauthorized(ErrorCodes.UserNotIdentified);

        var screening = await _db.Screenings.Include(s => s.Movie)
            .FirstOrDefaultAsync(s => s.Id == screeningId)
            ?? throw ApiException.NotFound(ErrorCodes.ScreeningNotFound);

        if (screening.Movie?.IsArchived == true)
            throw ApiException.BadRequest(ErrorCodes.MovieArchived);

        if (screening.IsCancelled)
            throw ApiException.BadRequest(ErrorCodes.ScreeningCancelled);
        if (screening.StartTime <= DateTime.UtcNow)
            throw ApiException.BadRequest(ErrorCodes.ScreeningAlreadyStarted);

        var booking = new Booking
        {
            UserId = userId,
            ScreeningId = screeningId,
            Status = BookingStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        return await BuildCartStateAsync(booking.Id);
    }

    public async Task<CartStateDto> GetCartAsync(int bookingId, int userId)
    {
        await EnsureOwnedPending(bookingId, userId);
        return await BuildCartStateAsync(bookingId);
    }

    public async Task<CartStateDto> AddSeatAsync(int bookingId, int userId, int seatTemplateId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var booking = await EnsureOwnedPending(bookingId, userId);

        var ss = await _db.ScreeningSeatStatuses
            .Include(x => x.SeatTemplate)
            .FirstOrDefaultAsync(x => x.ScreeningId == booking.ScreeningId && x.SeatTemplateId == seatTemplateId)
            ?? throw ApiException.NotFound(ErrorCodes.SeatNotFound);

        var now = DateTime.UtcNow;
        var available = ss.Status == SeatStatus.Available
            || (ss.Status == SeatStatus.Reserved && ss.LockedUntil < now);
        if (!available)
            throw ApiException.BadRequest(ErrorCodes.SeatUnavailable, SeatParams(ss));

        ss.Status = SeatStatus.Reserved;
        ss.BookingId = booking.Id;
        await _db.SaveChangesAsync();
        await RenewBookingHoldAsync(bookingId);
        var state = await BuildCartStateAsync(bookingId);
        await transaction.CommitAsync();
        return state;
    }

    public async Task<CartStateDto> RemoveSeatAsync(int bookingId, int userId, int seatTemplateId)
    {
        await EnsureOwnedPending(bookingId, userId);

        var ss = await _db.ScreeningSeatStatuses
            .FirstOrDefaultAsync(x => x.SeatTemplateId == seatTemplateId && x.BookingId == bookingId)
            ?? throw ApiException.BadRequest(ErrorCodes.SeatNotInBooking);

        ss.Status = SeatStatus.Available;
        ss.LockedUntil = null;
        ss.BookingId = null;
        await _db.SaveChangesAsync();
        await RenewBookingHoldAsync(bookingId);

        return await BuildCartStateAsync(bookingId);
    }

    public async Task<CartStateDto> SetFoodAsync(int bookingId, int userId, int foodItemId, int quantity)
    {
        await EnsureOwnedPending(bookingId, userId);

        if (quantity < 0 || quantity > 100)
            throw ApiException.BadRequest(ErrorCodes.FoodNotFound);

        var food = await _db.FoodItems.FirstOrDefaultAsync(f => f.Id == foodItemId && f.IsAvailable)
            ?? throw ApiException.NotFound(ErrorCodes.FoodNotFound);

        var existing = await _db.BookingFoodItems
            .FirstOrDefaultAsync(bf => bf.BookingId == bookingId && bf.FoodItemId == foodItemId);

        if (quantity <= 0)
        {
            if (existing != null) _db.BookingFoodItems.Remove(existing);
        }
        else if (existing != null)
        {
            existing.Quantity = quantity;
        }
        else
        {
            _db.BookingFoodItems.Add(new BookingFoodItem
            {
                BookingId = bookingId,
                FoodItemId = foodItemId,
                Quantity = quantity
            });
        }

        await _db.SaveChangesAsync();
        await RenewBookingHoldAsync(bookingId);
        return await BuildCartStateAsync(bookingId);
    }

    public async Task<CartStateDto> ApplyPromoAsync(int bookingId, int userId, string? promoCode)
    {
        var booking = await EnsureOwnedPending(bookingId, userId);
        booking.PromoCode = string.IsNullOrWhiteSpace(promoCode) ? null : promoCode.Trim().ToUpperInvariant();
        await _db.SaveChangesAsync();
        await RenewBookingHoldAsync(bookingId);
        return await BuildCartStateAsync(bookingId);
    }

    public async Task<CartStateDto> SetBonusAsync(int bookingId, int userId, int bonusPoints)
    {
        var booking = await EnsureOwnedPending(bookingId, userId);
        booking.BonusPointsUsed = Math.Max(0, bonusPoints);
        await _db.SaveChangesAsync();
        await RenewBookingHoldAsync(bookingId);
        return await BuildCartStateAsync(bookingId);
    }

    public async Task<CartStateDto> ExtendHoldAsync(int bookingId, int userId)
    {
        var booking = await EnsureOwnedPending(bookingId, userId);

        var seats = await _db.ScreeningSeatStatuses
            .Where(ss => ss.BookingId == bookingId)
            .ToListAsync();

        var newDeadline = DateTime.UtcNow.AddMinutes(4);
        foreach (var ss in seats)
        {
            ss.LockedUntil = newDeadline;
        }
        await _db.SaveChangesAsync();

        return await BuildCartStateAsync(bookingId);
    }

    public async Task<PaymentResultDto> PayCartAsync(int bookingId, int userId)
    {
        await EnsureOwnedPending(bookingId, userId);

        var state = await BuildCartStateAsync(bookingId);
        if (state.Seats.Count == 0)
            throw ApiException.BadRequest(ErrorCodes.EmptyCart);

        var bookingForPay = await _db.Bookings
            .Include(b => b.User)
            .FirstAsync(b => b.Id == bookingId);

        if (IsAdmin(bookingForPay.User))
        {
            bookingForPay.TotalPrice = 0;
            bookingForPay.PaymentProvider = "Admin";
            bookingForPay.PaymentReference = AdminPaymentReference;
            await _db.SaveChangesAsync();
        }
        else if (string.IsNullOrEmpty(bookingForPay.PaymentReference))
        {
            var paymentResult = await _paymentProvider.CreatePaymentAsync(
                bookingId,
                state.Total,
                $"Booking #{bookingId}");
            if (!paymentResult.Success || string.IsNullOrEmpty(paymentResult.PaymentReference))
                throw ApiException.BadRequest(ErrorCodes.PaymentInitFailed);

            bookingForPay.PaymentProvider = "Stub";
            bookingForPay.PaymentReference = paymentResult.PaymentReference;
            await _db.SaveChangesAsync();
        }

        var confirmed = await ConfirmPaymentAsync(bookingId, userId);

        var booking = await _db.Bookings
            .Include(b => b.User)
            .FirstAsync(b => b.Id == bookingId);

        var newBalance = booking.User?.BonusBalance ?? 0;
        var level = booking.User != null && !IsGuest(booking.User)
            ? LoyaltyProgram.GetLevel(booking.User.TotalSpent, booking.User.TicketsPurchased)
            : null;

        var finalState = await BuildCartStateAsync(bookingId);

        return new PaymentResultDto(
            finalState,
            booking.PaidAt ?? DateTime.UtcNow,
            booking.BonusPointsEarned,
            newBalance,
            level);
    }

    private async Task<Booking> EnsureOwnedPending(int bookingId, int userId)
    {
        if (userId <= 0) throw ApiException.Unauthorized(ErrorCodes.UserNotIdentified);

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId)
            ?? throw ApiException.NotFound(ErrorCodes.BookingNotFound);

        if (booking.UserId != userId)
            throw ApiException.Forbidden(ErrorCodes.BookingAccessDenied);

        if (booking.Status != BookingStatus.Pending)
            throw ApiException.BadRequest(ErrorCodes.BookingNotPending);

        var screening = await _db.Screenings.FindAsync(booking.ScreeningId);
        if (screening?.IsCancelled == true)
            throw ApiException.BadRequest(ErrorCodes.ScreeningCancelled);
        if (screening == null || screening.StartTime <= DateTime.UtcNow)
            throw ApiException.BadRequest(ErrorCodes.ScreeningAlreadyStarted);
        if (await _db.ScreeningSeatStatuses.AnyAsync(s => s.BookingId == bookingId &&
            s.Status == SeatStatus.Reserved && (s.LockedUntil == null || s.LockedUntil <= DateTime.UtcNow)))
            throw ApiException.BadRequest(ErrorCodes.SeatsInvalid);

        return booking;
    }

    /// <summary>
    /// При любой активности в корзине продлеваем удержание всех зарезервированных мест,
    /// чтобы таймер на клиенте не сбрасывал заказ при смене еды / мест.
    /// </summary>
    private async Task RenewBookingHoldAsync(int bookingId)
    {
        var deadline = DateTime.UtcNow.AddMinutes(5);
        var seats = await _db.ScreeningSeatStatuses
            .Where(ss => ss.BookingId == bookingId && ss.Status == SeatStatus.Reserved)
            .ToListAsync();
        foreach (var ss in seats)
            ss.LockedUntil = deadline;
        if (seats.Count > 0)
            await _db.SaveChangesAsync();
    }

    private async Task<CartStateDto> BuildCartStateAsync(int bookingId)
    {
        var b = await _db.Bookings
            .Include(x => x.Screening).ThenInclude(s => s.Movie)
            .Include(x => x.Screening).ThenInclude(s => s.Hall)
            .Include(x => x.Seats).ThenInclude(ss => ss.SeatTemplate)
            .Include(x => x.FoodItems).ThenInclude(bf => bf.FoodItem)
            .Include(x => x.User)
            .FirstAsync(x => x.Id == bookingId);

        var screening = b.Screening;
        var movie = screening?.Movie;
        var unit = screening != null && movie != null
            ? DynamicPricing.GetEffectiveBasePrice(screening, movie)
            : screening?.BasePrice ?? 0m;

        var seatDtos = b.Seats
            .Where(ss => ss.SeatTemplate != null)
            .OrderBy(ss => ss.SeatTemplate.Row).ThenBy(ss => ss.SeatTemplate.Number)
            .Select(ss => new BookingSeatDto(
                ss.SeatTemplate!.Id,
                ss.SeatTemplate.Row,
                ss.SeatTemplate.Number,
                ss.SeatTemplate.Type.ToString(),
                unit * ss.SeatTemplate.PriceMultiplier))
            .ToList();

        var hallTotalRows = b.Screening?.Hall?.TotalRows ?? 0;
        var seatTotalBeforeLoyalty = SeatPairPricing.SumSeatPrices(
            seatDtos.Select(s => (s.SeatTemplateId, s.Row, s.Number, s.Type, s.Price)).ToList(),
            hallTotalRows);

        var loyaltyPct = 0;
        var loyaltyDiscount = 0m;
        if (b.User != null && !IsGuest(b.User))
        {
            loyaltyPct = LoyaltyProgram.GetTicketDiscountPercent(b.User.TotalSpent, b.User.TicketsPurchased);
            loyaltyDiscount = Math.Round(seatTotalBeforeLoyalty * loyaltyPct / 100m, 2);
        }

        var seatTotal = Math.Max(0m, seatTotalBeforeLoyalty - loyaltyDiscount);

        var foodLines = b.FoodItems
            .Where(bf => bf.FoodItem != null)
            .Select(bf => new CartFoodLineDto(
                bf.FoodItemId,
                bf.FoodItem!.Name,
                bf.Quantity,
                bf.FoodItem.Price,
                bf.FoodItem.Price * bf.Quantity))
            .ToList();

        var foodTotal = foodLines.Sum(f => f.TotalPrice);
        var subtotal = seatTotal + foodTotal;

        var promoDiscount = LoyaltyProgram.CalculatePromoDiscount(b.PromoCode, subtotal);
        var afterPromo = Math.Max(0m, subtotal - promoDiscount);

        var bonusAvailable = 0;
        if (b.User != null && !IsGuest(b.User))
        {
            bonusAvailable = IsAdmin(b.User)
                ? (int)decimal.Floor(afterPromo)
                : Math.Min(b.User.BonusBalance, (int)decimal.Floor(afterPromo));
        }

        var bonusUsed = b.Status == BookingStatus.Pending
            ? Math.Min(Math.Max(0, b.BonusPointsUsed), bonusAvailable)
            : b.BonusPointsUsed;
        if (b.BonusPointsUsed != bonusUsed)
        {
            b.BonusPointsUsed = bonusUsed;
        }

        var total = IsAdmin(b.User) ? 0m : Math.Max(0m, afterPromo - bonusUsed);
        if (b.Status == BookingStatus.Pending)
        {
            b.TotalPrice = total;
            await _db.SaveChangesAsync();
        }
        else
        {
            total = b.TotalPrice;
        }

        var earnedPreview = LoyaltyProgram.CalculateEarnedBonuses(
            total,
            b.User?.TotalSpent ?? 0,
            b.User?.TicketsPurchased ?? 0);

        DateTime? lockedUntil = b.Seats.Any(ss => ss.LockedUntil.HasValue)
            ? b.Seats.Where(ss => ss.LockedUntil.HasValue).Max(ss => ss.LockedUntil)
            : null;

        var loyaltyLevel = b.User != null && !IsGuest(b.User)
            ? LoyaltyProgram.GetLevel(b.User.TotalSpent, b.User.TicketsPurchased)
            : null;

        return new CartStateDto(
            b.Id, b.ScreeningId,
            b.Screening?.Movie?.Title ?? "Фильм",
            b.Screening?.Hall?.Name ?? "Зал",
            b.Screening?.StartTime ?? b.CreatedAt,
            lockedUntil,
            seatDtos, foodLines,
            seatTotal, foodTotal, subtotal,
            b.PromoCode, promoDiscount,
            bonusUsed, bonusAvailable,
            total, earnedPreview,
            loyaltyLevel,
            loyaltyDiscount,
            loyaltyPct);
    }

    private static Dictionary<string, object> SeatParams(ScreeningSeatStatus ss) =>
        new()
        {
            ["row"] = ss.SeatTemplate.Row,
            ["number"] = ss.SeatTemplate.Number
        };
}
