namespace CinemaApp.Domain.Entities;

public class NewsItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    /// <summary>news | sale</summary>
    public string Type { get; set; } = "news";
    public string Badge { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string DisplayDate { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPublished { get; set; } = true;
}
