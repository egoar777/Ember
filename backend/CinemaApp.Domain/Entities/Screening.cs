namespace CinemaApp.Domain.Entities;

public class Screening
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public int HallId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Language { get; set; }
    public string? Format { get; set; }
    public decimal BasePrice { get; set; }
    public bool IsPremiere { get; set; }
    public bool IsExclusive { get; set; }

    public Movie Movie { get; set; } = null!;
    public Hall Hall { get; set; } = null!;
    public ICollection<ScreeningSeatStatus> SeatStatuses { get; set; } = new List<ScreeningSeatStatus>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
