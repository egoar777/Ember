namespace CinemaApp.Domain.Entities;

public class Rating
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public int Score { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
