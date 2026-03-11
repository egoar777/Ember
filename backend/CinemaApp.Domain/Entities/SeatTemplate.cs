using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class SeatTemplate
{
    public int Id { get; set; }
    public int HallId { get; set; }
    public int Row { get; set; }
    public int Number { get; set; }
    public SeatType Type { get; set; } = SeatType.Standard;
    public decimal PriceMultiplier { get; set; } = 1.0m;

    public Hall Hall { get; set; } = null!;
}
