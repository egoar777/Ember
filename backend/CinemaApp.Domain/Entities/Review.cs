namespace CinemaApp.Domain.Entities;

public class Review
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int Likes { get; set; }
    public int Dislikes { get; set; }

    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
