using CinemaApp.Domain.Enums;

namespace CinemaApp.Domain.Entities;

public class UserList
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public UserListType Type { get; set; } = UserListType.Custom;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<UserListItem> Items { get; set; } = new List<UserListItem>();
}
