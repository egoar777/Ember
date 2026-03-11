using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Linq;
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

    private int? UserId
    {
        get
        {
            if (User.Identity?.IsAuthenticated != true)
                return null;

            var claim = User.FindFirst("sub")?.Value
                        ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(claim))
                return int.Parse(claim);

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
                }
            }

            return null;
        }
    }

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
