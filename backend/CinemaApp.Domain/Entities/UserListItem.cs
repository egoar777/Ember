namespace CinemaApp.Domain.Entities;

public class UserListItem
{
    public int Id { get; set; }
    public int UserListId { get; set; }
    public int MovieId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public UserList UserList { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
