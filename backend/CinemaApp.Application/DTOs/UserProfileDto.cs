namespace CinemaApp.Application.DTOs;

public record UserProfileDto(
    int Id, string Email, string DisplayName, string Role,
    string? AvatarUrl, string? Preferences, string? NotificationSettings);

public record UpdateProfileRequest(string? DisplayName, string? AvatarUrl, string? Preferences, string? NotificationSettings);
