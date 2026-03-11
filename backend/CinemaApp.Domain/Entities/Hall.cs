namespace CinemaApp.Domain.Entities;

public class Hall
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TotalRows { get; set; }
    public int SeatsPerRow { get; set; }

    public ICollection<SeatTemplate> SeatTemplates { get; set; } = new List<SeatTemplate>();
    public ICollection<Screening> Screenings { get; set; } = new List<Screening>();
}
