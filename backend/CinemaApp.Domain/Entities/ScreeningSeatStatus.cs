using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class ScreeningSeatStatus
{
    public int Id { get; set; }
    public int ScreeningId { get; set; }
    public int SeatTemplateId { get; set; }
    public SeatStatus Status { get; set; } = SeatStatus.Available;
    public DateTime? LockedUntil { get; set; }
    public int? BookingId { get; set; }

    public Screening Screening { get; set; } = null!;
    public SeatTemplate SeatTemplate { get; set; } = null!;
    public Booking? Booking { get; set; }
}
