using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class UserActivity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public ActivityType ActivityType { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Metadata { get; set; }

    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
