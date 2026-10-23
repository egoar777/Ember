using CinemaApp.WebApi.Services;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/cart")]
public class CartController : ControllerBase
{
    private readonly IBookingService _svc;
    private readonly BookingIdentity _identity;
    public CartController(IBookingService svc, BookingIdentity identity)
    {
        _svc = svc;
        _identity = identity;
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCartRequest req) =>
        Ok(await _svc.CreateCartAsync(await _identity.ResolveAsync(HttpContext), req.ScreeningId));

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) =>
        Ok(await _svc.GetCartAsync(id, await _identity.ResolveAsync(HttpContext)));

    [AllowAnonymous]
    [HttpPost("{id:int}/seats")]
    public async Task<IActionResult> AddSeat(int id, [FromBody] CartSeatRequest req) =>
        Ok(await _svc.AddSeatAsync(id, await _identity.ResolveAsync(HttpContext), req.SeatTemplateId));

    [AllowAnonymous]
    [HttpDelete("{id:int}/seats/{seatTemplateId:int}")]
    public async Task<IActionResult> RemoveSeat(int id, int seatTemplateId) =>
        Ok(await _svc.RemoveSeatAsync(id, await _identity.ResolveAsync(HttpContext), seatTemplateId));

    [AllowAnonymous]
    [HttpPost("{id:int}/food")]
    public async Task<IActionResult> SetFood(int id, [FromBody] CartFoodRequest req) =>
        Ok(await _svc.SetFoodAsync(id, await _identity.ResolveAsync(HttpContext), req.FoodItemId, req.Quantity));

    [AllowAnonymous]
    [HttpPost("{id:int}/promo")]
    public async Task<IActionResult> ApplyPromo(int id, [FromBody] CartPromoRequest req) =>
        Ok(await _svc.ApplyPromoAsync(id, await _identity.ResolveAsync(HttpContext), req.PromoCode));

    [AllowAnonymous]
    [HttpPost("{id:int}/bonuses")]
    public async Task<IActionResult> SetBonus(int id, [FromBody] CartBonusRequest req) =>
        Ok(await _svc.SetBonusAsync(id, await _identity.ResolveAsync(HttpContext), req.BonusPoints));

    [AllowAnonymous]
    [HttpPost("{id:int}/extend-hold")]
    public async Task<IActionResult> ExtendHold(int id) =>
        Ok(await _svc.ExtendHoldAsync(id, await _identity.ResolveAsync(HttpContext)));

    [AllowAnonymous]
    [HttpPost("{id:int}/pay")]
    public async Task<IActionResult> Pay(int id) =>
        Ok(await _svc.PayCartAsync(id, await _identity.ResolveAsync(HttpContext)));
}
