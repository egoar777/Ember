using CinemaApp.WebApi.Services;
using CinemaApp.WebApi.Extensions;
using CinemaApp.Application.Common;
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
    private readonly BookingIdentity _identity;
    public BookingsController(IBookingService bookingService, BookingIdentity identity)
    {
        _bookingService = bookingService;
        _identity = identity;
    }

    private int UserId => User.GetRequiredUserId();

    [AllowAnonymous]
    [HttpGet("screenings/{id:int}/seats")]
    public async Task<IActionResult> GetScreeningSeats(int id) =>
        Ok(await _bookingService.GetScreeningSeatsAsync(id));

    [AllowAnonymous]
    [HttpPost("bookings")]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingRequest request) =>
        Ok(await _bookingService.CreateBookingAsync(await _identity.ResolveAsync(HttpContext), request));

    [AllowAnonymous]
    [HttpPost("bookings/{id:int}/confirm-payment")]
    public async Task<ActionResult<BookingDto>> ConfirmPayment(int id) =>
        Ok(await _bookingService.ConfirmPaymentAsync(id, await _identity.ResolveAsync(HttpContext)));

    [Authorize]
    [HttpPost("bookings/{id:int}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        await _bookingService.CancelBookingAsync(id, UserId);
        return Ok();
    }

    [Authorize]
    [HttpGet("bookings/my")]
    public async Task<IActionResult> GetMyBookings() =>
        Ok(await _bookingService.GetUserBookingsAsync(UserId));

    [Authorize]
    [HttpPost("bookings/prune-history")]
    public async Task<IActionResult> PruneBookingHistory([FromQuery] int keep = 3)
    {
        var removed = await _bookingService.PruneUserBookingsAsync(UserId, keep);
        var bookings = await _bookingService.GetUserBookingsAsync(UserId);
        return Ok(new { removed, bookings });
    }

    [AllowAnonymous]
    [HttpGet("food")]
    public async Task<IActionResult> GetFoodMenu() =>
        Ok(await _bookingService.GetFoodMenuAsync());
}
