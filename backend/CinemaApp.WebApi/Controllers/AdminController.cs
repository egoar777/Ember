using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaApp.WebApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    };

    private readonly IMooonCinemaSyncService _mooonSync;
    private readonly IAdminService _admin;
    private readonly IWebHostEnvironment _env;

    public AdminController(IMooonCinemaSyncService mooonSync, IAdminService admin, IWebHostEnvironment env)
    {
        _mooonSync = mooonSync;
        _admin = admin;
        _env = env;
    }

    [HttpPost("sync/mooon")]
    public async Task<IActionResult> SyncMooon(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _mooonSync.SyncFromMooonAsync(cancellationToken);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = "Не удалось скачать страницу mooon.by.", detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("screenings")]
    public async Task<IActionResult> GetScreenings([FromQuery] bool includeCancelled = true) =>
        Ok(await _admin.GetUpcomingScreeningsAsync(includeCancelled));

    [HttpPost("screenings/{id:int}/cancel")]
    public async Task<IActionResult> CancelScreening(int id)
    {
        await _admin.CancelScreeningAsync(id);
        return Ok();
    }

    [HttpGet("news")]
    public async Task<IActionResult> GetAllNews() =>
        Ok(await _admin.GetAllNewsAsync());

    [HttpPost("news")]
    public async Task<IActionResult> CreateNews([FromBody] CreateNewsItemRequest request) =>
        Ok(await _admin.CreateNewsItemAsync(request));

    [HttpPost("news/upload-image")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadNewsImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Файл не выбран." });

        if (!AllowedImageTypes.Contains(file.ContentType))
            return BadRequest(new { error = "Допустимы только изображения JPG, PNG, WEBP или GIF." });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads", "news");
        Directory.CreateDirectory(uploadsDir);

        var extension = file.ContentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => ".jpg",
        };

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var savePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(savePath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { url = $"/uploads/news/{fileName}" });
    }

    [HttpDelete("news/{id:int}")]
    public async Task<IActionResult> DeleteNews(int id)
    {
        await _admin.DeleteNewsItemAsync(id);
        return Ok();
    }

    [HttpGet("movies/{movieId:int}/discussions")]
    public async Task<IActionResult> GetDiscussions(int movieId) =>
        Ok(await _admin.GetMovieDiscussionsAsync(movieId));

    [HttpDelete("comments/{id:int}")]
    public async Task<IActionResult> DeleteComment(int id)
    {
        await _admin.DeleteCommentAsync(id);
        return Ok();
    }

    [HttpDelete("reviews/{id:int}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        await _admin.DeleteReviewAsync(id);
        return Ok();
    }
}
