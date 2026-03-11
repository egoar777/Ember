using CinemaApp.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace CinemaApp.Infrastructure.Services;

public class StubNotificationService : INotificationService
{
    private readonly ILogger<StubNotificationService> _logger;
    public StubNotificationService(ILogger<StubNotificationService> logger) => _logger = logger;

    public Task SendEmailAsync(string to, string subject, string body)
    {
        _logger.LogInformation("[STUB EMAIL] To: {To}, Subject: {Subject}", to, subject);
        return Task.CompletedTask;
    }

    public Task SendPushAsync(int userId, string title, string message)
    {
        _logger.LogInformation("[STUB PUSH] UserId: {UserId}, Title: {Title}", userId, title);
        return Task.CompletedTask;
    }
}
