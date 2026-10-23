using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/news")]
public class NewsController : ControllerBase
{
    private readonly IAdminService _admin;

    public NewsController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> GetPublished([FromQuery] int? limit) =>
        Ok(await _admin.GetPublishedNewsAsync(limit));
}
