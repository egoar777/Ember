using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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
    private readonly CinemaDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(CinemaDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
            throw new InvalidOperationException("Email is already registered.");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = HashPassword(request.Password),
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
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var hash = HashPassword(request.Password);
        if (user.PasswordHash != hash)
            throw new UnauthorizedAccessException("Invalid email or password.");

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
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

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

    private static string HashPassword(string password)
    {
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
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
            user.NotificationSettings);
    }
}
