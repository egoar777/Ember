namespace CinemaApp.Application.Interfaces;

public record GoogleUserInfo(string SubjectId, string Email, string DisplayName, string? AvatarUrl);

public interface IGoogleAuthService
{
    Task<GoogleUserInfo> ExchangeAuthorizationCodeAsync(string code, string redirectUri, CancellationToken cancellationToken = default);
}
