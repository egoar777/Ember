namespace CinemaApp.Application.DTOs;

public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string RefreshToken, UserProfileDto User);
public record RefreshRequest(string RefreshToken);
