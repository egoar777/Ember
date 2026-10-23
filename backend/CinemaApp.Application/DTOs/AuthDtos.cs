using System.ComponentModel.DataAnnotations;

namespace CinemaApp.Application.DTOs;

public record RegisterRequest([Required, EmailAddress, MaxLength(256)] string Email, [Required, MinLength(8), MaxLength(128)] string Password, [Required, MaxLength(100)] string DisplayName);
public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public record GoogleLoginRequest([Required] string Code, [Required, Url] string RedirectUri);
public record AuthResponse(string Token, string RefreshToken, UserProfileDto User);
public record RefreshRequest([Required] string RefreshToken);
