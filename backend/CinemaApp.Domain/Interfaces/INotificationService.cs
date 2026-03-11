namespace CinemaApp.Domain.Interfaces;

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body);
    Task SendPushAsync(int userId, string title, string message);
}
