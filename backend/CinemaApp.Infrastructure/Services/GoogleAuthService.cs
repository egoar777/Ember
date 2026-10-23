using System.Net.Http.Json;
using System.Text.Json.Serialization;
using CinemaApp.Application.Common;
using CinemaApp.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CinemaApp.Infrastructure.Services;

public class GoogleAuthService : IGoogleAuthService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public GoogleAuthService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task<GoogleUserInfo> ExchangeAuthorizationCodeAsync(
        string code,
        string redirectUri,
        CancellationToken cancellationToken = default)
    {
        var clientId = _config["Google:ClientId"];
        var clientSecret = _config["Google:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw ApiException.BadRequest(ErrorCodes.GoogleAuthFailed);

        using var tokenResponse = await _http.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
            }),
            cancellationToken);

        if (!tokenResponse.IsSuccessStatusCode)
            throw ApiException.Unauthorized(ErrorCodes.GoogleAuthFailed);

        var tokenPayload = await tokenResponse.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken);
        if (string.IsNullOrWhiteSpace(tokenPayload?.AccessToken))
            throw ApiException.Unauthorized(ErrorCodes.GoogleAuthFailed);

        using var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
        userInfoRequest.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenPayload.AccessToken);

        using var userInfoResponse = await _http.SendAsync(userInfoRequest, cancellationToken);
        if (!userInfoResponse.IsSuccessStatusCode)
            throw ApiException.Unauthorized(ErrorCodes.GoogleAuthFailed);

        var profile = await userInfoResponse.Content.ReadFromJsonAsync<GoogleUserInfoResponse>(cancellationToken);
        if (profile == null || string.IsNullOrWhiteSpace(profile.Sub) || string.IsNullOrWhiteSpace(profile.Email) || !profile.EmailVerified)
            throw ApiException.Unauthorized(ErrorCodes.GoogleAuthFailed);

        var displayName = string.IsNullOrWhiteSpace(profile.Name)
            ? profile.Email.Split('@')[0]
            : profile.Name.Trim();

        return new GoogleUserInfo(profile.Sub, profile.Email.Trim().ToLowerInvariant(), displayName, profile.Picture);
    }

    private sealed class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
    }

    private sealed class GoogleUserInfoResponse
    {
        [JsonPropertyName("sub")]
        public string? Sub { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("email_verified")]
        public bool EmailVerified { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("picture")]
        public string? Picture { get; set; }
    }
}
