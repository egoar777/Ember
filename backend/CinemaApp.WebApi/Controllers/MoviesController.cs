using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/movies")]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;
    public MoviesController(IMovieService movieService) => _movieService = movieService;

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<PagedResult<MovieListDto>>> GetMovies(
        [FromQuery] int[]? genreIds, [FromQuery] int? yearFrom, [FromQuery] int? yearTo,
        [FromQuery] double? ratingFrom, [FromQuery] string? platforms, [FromQuery] string? search,
        [FromQuery] string? sortBy, [FromQuery] bool? exclusive, [FromQuery] bool? isPremiere,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] bool? forKids = null, [FromQuery] bool? featured = null,
        [FromQuery] string? screeningLanguage = null)
    {
        var filter = new MovieFilterRequest(genreIds, yearFrom, yearTo, ratingFrom, platforms, search, sortBy, exclusive, isPremiere, page, pageSize, forKids, featured, screeningLanguage);
        return Ok(await _movieService.GetMoviesAsync(filter));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MovieDetailDto>> GetMovie(int id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);
        if (movie == null) return NotFound();
        return Ok(movie);
    }

    [AllowAnonymous]
    [HttpGet("{id:int}/screenings")]
    public async Task<IActionResult> GetScreenings(int id)
    {
        return Ok(await _movieService.GetScreeningsForMovieAsync(id));
    }

    [HttpGet("{id:int}/similar")]
    public async Task<IActionResult> GetSimilar(int id)
    {
        return Ok(await _movieService.GetSimilarMoviesAsync(id));
    }
}
