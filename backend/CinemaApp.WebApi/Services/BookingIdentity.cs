using CinemaApp.Application.Common;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.WebApi.Extensions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace CinemaApp.WebApi.Services;

public sealed class BookingIdentity(CinemaDbContext db, IDataProtectionProvider protection)
{
    private readonly IDataProtector _protector = protection.CreateProtector("Ember.GuestIdentity.v1");
    private const string CookieName = "ember_guest";

    public async Task<int> ResolveAsync(HttpContext context)
    {
        var userId = context.User.GetUserIdOrNull();
        if (userId.HasValue) return userId.Value;
        if (context.Request.Headers.ContainsKey("Authorization"))
            throw ApiException.Unauthorized(ErrorCodes.UserNotIdentified);

        if (context.Request.Cookies.TryGetValue(CookieName, out var cookie))
        {
            try
            {
                if (int.TryParse(_protector.Unprotect(cookie), out var guestId) &&
                    await db.Users.AnyAsync(u => u.Id == guestId && u.PasswordHash == "!guest"))
                    return guestId;
            }
            catch (CryptographicException) { }
        }

        var guest = new User
        {
            Email = $"guest-{Guid.NewGuid():N}@cinema.local",
            DisplayName = "Гость",
            PasswordHash = "!guest",
        };
        db.Users.Add(guest);
        await db.SaveChangesAsync();
        context.Response.Cookies.Append(CookieName, _protector.Protect(guest.Id.ToString()), new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromDays(7),
            IsEssential = true,
        });
        return guest.Id;
    }
}
