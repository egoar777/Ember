using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CinemaApp.Application.Common;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CinemaApp.Application.Services;

public class AuthService : IAuthService
{
    private const string GoogleOnlyPasswordMarker = "GOOGLE_OAUTH";

    private readonly CinemaDbContext _db;
    private readonly IConfiguration _config;
    private readonly IGoogleAuthService _googleAuth;

    public AuthService(CinemaDbContext db, IConfiguration config, IGoogleAuthService googleAuth)
    {
        _db = db;
        _config = config;
        _googleAuth = googleAuth;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email.Trim().ToLowerInvariant());
        if (exists)
            throw new InvalidOperationException("Этот email уже зарегистрирован.");

        var user = new User
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHashing.Hash(request.Password),
            DisplayName = request.DisplayName,
            Role = UserRole.User
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var jwt = GenerateJwtToken(user);
        return new AuthResponse(jwt, refreshToken, MapToProfile(user));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLowerInvariant());
        if (user == null)
            throw ApiException.Unauthorized(ErrorCodes.InvalidCredentials);

        if (user.PasswordHash == GoogleOnlyPasswordMarker)
            throw ApiException.Unauthorized(ErrorCodes.UseGoogleLogin);

        if (!PasswordHashing.Verify(request.Password, user.PasswordHash))
            throw ApiException.Unauthorized(ErrorCodes.InvalidCredentials);

        if (!user.PasswordHash.StartsWith("pbkdf2$", StringComparison.Ordinal))
            user.PasswordHash = PasswordHashing.Hash(request.Password);

        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var jwt = GenerateJwtToken(user);
        return new AuthResponse(jwt, refreshToken, MapToProfile(user));
    }

    public async Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request)
    {
        var googleUser = await _googleAuth.ExchangeAuthorizationCodeAsync(request.Code, request.RedirectUri);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == googleUser.SubjectId);
        if (user == null)
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == googleUser.Email);
            if (user != null)
            {
                if (!string.IsNullOrEmpty(user.GoogleSubjectId) && user.GoogleSubjectId != googleUser.SubjectId)
                    throw ApiException.Unauthorized(ErrorCodes.GoogleAuthFailed);

                user.GoogleSubjectId = googleUser.SubjectId;
                if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(googleUser.AvatarUrl))
                    user.AvatarUrl = googleUser.AvatarUrl;
                if (string.IsNullOrWhiteSpace(user.DisplayName))
                    user.DisplayName = googleUser.DisplayName;
            }
            else
            {
                user = new User
                {
                    Email = googleUser.Email,
                    DisplayName = googleUser.DisplayName,
                    AvatarUrl = googleUser.AvatarUrl,
                    GoogleSubjectId = googleUser.SubjectId,
                    PasswordHash = GoogleOnlyPasswordMarker,
                    Role = UserRole.User,
                };
                _db.Users.Add(user);
            }
        }
        else if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(googleUser.AvatarUrl))
        {
            user.AvatarUrl = googleUser.AvatarUrl;
        }

        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var jwt = GenerateJwtToken(user);
        return new AuthResponse(jwt, refreshToken, MapToProfile(user));
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == refreshToken && u.RefreshTokenExpiry > DateTime.UtcNow);
        if (user == null)
            throw ApiException.Unauthorized(ErrorCodes.InvalidRefreshToken);

        var newRefreshToken = GenerateRefreshToken();
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var jwt = GenerateJwtToken(user);
        return new AuthResponse(jwt, newRefreshToken, MapToProfile(user));
    }

    public async Task LogoutAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return;

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();
    }

    private string GenerateJwtToken(User user)
    {
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = _config["Jwt:Issuer"] ?? "";
        var audience = _config["Jwt:Audience"] ?? "";
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var signingKey = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("sub", user.Id.ToString()),
            new Claim("email", user.Email),
            new Claim("name", user.DisplayName),
            new Claim("role", user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static UserProfileDto MapToProfile(User user)
    {
        return new UserProfileDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role.ToString(),
            user.AvatarUrl,
            user.Preferences,
            user.NotificationSettings,
            user.BonusBalance,
            user.TotalSpent,
            user.TicketsPurchased,
            LoyaltyProgram.GetLevel(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetTicketDiscountPercent(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetBonusEarnMultiplier(user.TotalSpent, user.TicketsPurchased),
            LoyaltyProgram.GetLoyaltySummary(user.TotalSpent, user.TicketsPurchased));
    }
}
