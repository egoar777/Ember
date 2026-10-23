using CinemaApp.WebApi.Extensions;
using CinemaApp.Application.Common;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api")]
public class SocialController : ControllerBase
{
    private readonly ISocialService _socialService;
    public SocialController(ISocialService socialService) => _socialService = socialService;

    private int UserId => User.GetRequiredUserId();

    [Authorize]
    [HttpGet("lists")]
    public async Task<IActionResult> GetLists() =>
        Ok(await _socialService.GetUserListsAsync(UserId));

    [Authorize]
    [HttpPost("lists")]
    public async Task<IActionResult> CreateList([FromBody] CreateListRequest req) =>
        Ok(await _socialService.CreateListAsync(UserId, req));

    [Authorize]
    [HttpGet("lists/{id:int}/items")]
    public async Task<IActionResult> GetListItems(int id) =>
        Ok(await _socialService.GetListItemsAsync(id, UserId));

    [Authorize]
    [HttpPost("lists/{id:int}/items")]
    public async Task<IActionResult> AddItem(int id, [FromBody] AddListItemRequest req) =>
        Ok(await _socialService.AddItemToListAsync(id, UserId, req.MovieId));

    [Authorize]
    [HttpDelete("lists/{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> RemoveItem(int id, int itemId)
    {
        await _socialService.RemoveItemFromListAsync(id, itemId, UserId);
        return Ok();
    }

    [HttpGet("movies/{id:int}/reviews")]
    public async Task<IActionResult> GetReviews(int id) => Ok(await _socialService.GetMovieReviewsAsync(id));

    [Authorize]
    [HttpPost("movies/{id:int}/reviews")]
    public async Task<IActionResult> CreateReview(int id, [FromBody] CreateReviewRequest req) =>
        Ok(await _socialService.CreateReviewAsync(UserId, id, req.Text));

    [HttpGet("movies/{id:int}/ratings")]
    public async Task<IActionResult> GetRatings(int id) => Ok(await _socialService.GetMovieRatingsAsync(id));

    [Authorize]
    [HttpPost("movies/{id:int}/ratings")]
    public async Task<IActionResult> Rate(int id, [FromBody] CreateRatingRequest req) =>
        Ok(await _socialService.RateMovieAsync(UserId, id, req.Score));

    [HttpGet("movies/{id:int}/comments")]
    public async Task<IActionResult> GetComments(int id) => Ok(await _socialService.GetMovieCommentsAsync(id));

    [Authorize]
    [HttpPost("movies/{id:int}/comments")]
    public async Task<IActionResult> CreateComment(int id, [FromBody] CreateCommentRequest req) =>
        Ok(await _socialService.CreateCommentAsync(UserId, id, req.Text, null));

    [Authorize]
    [HttpPost("comments/{id:int}/reply")]
    public async Task<IActionResult> Reply(int id, [FromBody] CreateCommentRequest req, [FromQuery] int movieId)
    {
        return Ok(await _socialService.CreateCommentAsync(UserId, movieId, req.Text, id));
    }

    [Authorize]
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications() => Ok(await _socialService.GetNotificationsAsync(UserId));

    [Authorize]
    [HttpPost("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        await _socialService.MarkNotificationReadAsync(id, UserId);
        return Ok();
    }
}
