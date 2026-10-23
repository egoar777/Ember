using CinemaApp.WebApi.Extensions;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    public AiController(IRecommendationService recommendationService) => _recommendationService = recommendationService;

    private int? UserId => User.GetUserIdOrNull();

    [HttpGet("recommendations/home")]
    public async Task<IActionResult> GetHomeCollections()
    {
        return Ok(await _recommendationService.GetHomeCollectionsAsync(UserId));
    }

    [HttpGet("recommendations/for-movie/{id:int}")]
    public async Task<IActionResult> GetForMovie(int id)
    {
        return Ok(await _recommendationService.GetRecommendationsForMovieAsync(id, UserId));
    }

    [HttpPost("search")]
    public async Task<IActionResult> AiSearch([FromBody] AiSearchRequest request)
    {
        return Ok(await _recommendationService.AiSearchAsync(request.Query, UserId));
    }
}
