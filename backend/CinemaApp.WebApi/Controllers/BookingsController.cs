using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Linq;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    public BookingsController(IBookingService bookingService) => _bookingService = bookingService;

    private int UserId
    {
        get
        {
            // Try both mapped claims from authenticated principal
            var claim = User.FindFirst("sub")?.Value
                        ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(claim))
                return int.Parse(claim);

            // Fallback: parse raw JWT from Authorization header
            var auth = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = auth.Substring("Bearer ".Length).Trim();
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(token);
                    var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == ClaimTypes.NameIdentifier)?.Value;
                    if (!string.IsNullOrEmpty(sub))
                        return int.Parse(sub);
                }
                catch
                {
                    // ignore and fall through to error
                }
            }

            throw new UnauthorizedAccessException("User id claim is missing.");
        }
    }

    [AllowAnonymous]
    [HttpGet("screenings/{id:int}/seats")]
    public async Task<IActionResult> GetScreeningSeats(int id)
    {
        try { return Ok(await _bookingService.GetScreeningSeatsAsync(id)); }
        catch (InvalidOperationException ex) { return NotFound(new { error = ex.Message }); }
    }

    [AllowAnonymous]
    [HttpPost("bookings")]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var userId = 0;
        try { userId = UserId; } catch (UnauthorizedAccessException) { userId = 0; }
        try { return Ok(await _bookingService.CreateBookingAsync(userId, request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [AllowAnonymous]
    [HttpPost("bookings/{id:int}/confirm-payment")]
    public async Task<ActionResult<BookingDto>> ConfirmPayment(int id)
    {
        var userId = 0;
        try { userId = UserId; } catch (UnauthorizedAccessException) { userId = 0; }
        try { return Ok(await _bookingService.ConfirmPaymentAsync(id, userId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [Authorize]
    [HttpPost("bookings/{id:int}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        try { await _bookingService.CancelBookingAsync(id, UserId); return Ok(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [Authorize]
    [HttpGet("bookings/my")]
    public async Task<IActionResult> GetMyBookings()
    {
        try { return Ok(await _bookingService.GetUserBookingsAsync(UserId)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    [AllowAnonymous]
    [HttpGet("food")]
    public async Task<IActionResult> GetFoodMenu()
    {
        return Ok(await _bookingService.GetFoodMenuAsync());
    }
}
