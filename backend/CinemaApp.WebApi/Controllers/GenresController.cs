using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/genres")]
public class GenresController : ControllerBase
{
    private readonly IMovieService _movieService;
    public GenresController(IMovieService movieService) => _movieService = movieService;

    [HttpGet]
    public async Task<IActionResult> GetGenres()
    {
        return Ok(await _movieService.GetGenresAsync());
    }

    [HttpGet("with-ids")]
    public async Task<IActionResult> GetGenresWithIds()
    {
        return Ok(await _movieService.GetGenresWithIdsAsync());
    }

    [HttpGet("~/api/filters/platforms")]
    public async Task<IActionResult> GetPlatforms()
    {
        return Ok(await _movieService.GetPlatformsAsync());
    }
}
