namespace CinemaApp.Domain.Entities;

public class Movie
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? OriginalTitle { get; set; }
    public int Year { get; set; }
    public int Duration { get; set; }
    public string? AgeRating { get; set; }
    public string? Countries { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Cast { get; set; }
    public string? Director { get; set; }
    public double AverageRating { get; set; }
    public int RatingCount { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackgroundUrl { get; set; }
    public string? TrailerUrl { get; set; }
    public string? Platforms { get; set; }
    public bool IsExclusive { get; set; }

    /// <summary>Внешний id события на mooon.by; null — локальный/сидированный фильм.</summary>
    public int? ExternalMooonEventId { get; set; }

    /// <summary>Скрыт с витрины (ушёл с афиши mooon), в БД остаётся из‑за связей.</summary>
    public bool IsArchived { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Genre> Genres { get; set; } = new List<Genre>();
    public ICollection<Screening> Screenings { get; set; } = new List<Screening>();
    public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
