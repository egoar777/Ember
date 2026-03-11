using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public string? AvatarUrl { get; set; }
    public string? Preferences { get; set; }
    public string? NotificationSettings { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<UserList> Lists { get; set; } = new List<UserList>();
    public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<UserActivity> Activities { get; set; } = new List<UserActivity>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
