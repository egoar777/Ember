namespace CinemaApp.Domain.Entities;

public class BookingFoodItem
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public int FoodItemId { get; set; }
    public int Quantity { get; set; }

    public Booking Booking { get; set; } = null!;
    public FoodItem FoodItem { get; set; } = null!;
}
