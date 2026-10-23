using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class Booking
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ScreeningId { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public string? PaymentProvider { get; set; }
    public string? PaymentReference { get; set; }
    public string? PromoCode { get; set; }
    public int BonusPointsUsed { get; set; }
    public int BonusPointsEarned { get; set; }

    public User User { get; set; } = null!;
    public Screening Screening { get; set; } = null!;
    public ICollection<ScreeningSeatStatus> Seats { get; set; } = new List<ScreeningSeatStatus>();
    public ICollection<BookingFoodItem> FoodItems { get; set; } = new List<BookingFoodItem>();
}
