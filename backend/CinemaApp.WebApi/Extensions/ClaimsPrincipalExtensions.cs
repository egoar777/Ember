using System.Security.Claims;
using CinemaApp.Application.Common;

namespace CinemaApp.WebApi.Extensions;

internal static class ClaimsPrincipalExtensions
{
    public static int? GetUserIdOrNull(this ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
            return null;

        var value = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(value, out var id) && id > 0 ? id : null;
    }

    public static int GetRequiredUserId(this ClaimsPrincipal user) =>
        user.GetUserIdOrNull() ?? throw ApiException.Unauthorized(ErrorCodes.UserNotIdentified);
}
