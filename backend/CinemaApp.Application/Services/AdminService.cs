using CinemaApp.Application.Common;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class AdminService : IAdminService
{
    private readonly CinemaDbContext _db;

    public AdminService(CinemaDbContext db) => _db = db;

    public async Task<List<AdminScreeningDto>> GetUpcomingScreeningsAsync(bool includeCancelled = false)
    {
        var now = DateTime.UtcNow;
        var query = _db.Screenings
            .AsNoTracking()
            .Include(s => s.Movie)
            .Include(s => s.Hall)
            .Include(s => s.Bookings)
            .Where(s => s.StartTime > now);

        if (!includeCancelled)
            query = query.Where(s => !s.IsCancelled);

        var screenings = await query
            .OrderBy(s => s.StartTime)
            .Take(200)
            .ToListAsync();

        return screenings.Select(s => new AdminScreeningDto(
            s.Id,
            s.MovieId,
            s.Movie?.Title ?? "",
            s.Hall?.Name ?? "",
            s.StartTime,
            s.EndTime,
            s.Language,
            s.Format,
            s.IsCancelled,
            s.Bookings.Count(b => b.Status == BookingStatus.Paid || b.Status == BookingStatus.Pending))).ToList();
    }

    public async Task CancelScreeningAsync(int screeningId)
    {
        var screening = await _db.Screenings.FirstOrDefaultAsync(s => s.Id == screeningId);
        if (screening == null)
            throw ApiException.NotFound(ErrorCodes.ScreeningNotFound);

        if (screening.IsCancelled)
            return;

        screening.IsCancelled = true;
        screening.CancelledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<List<NewsItemDto>> GetPublishedNewsAsync(int? limit = null)
    {
        IQueryable<NewsItem> query = _db.NewsItems
            .AsNoTracking()
            .Where(n => n.IsPublished)
            .OrderByDescending(n => n.CreatedAt);

        if (limit.HasValue)
            query = query.Take(limit.Value);

        var items = await query.ToListAsync();
        return items.Select(MapNews).ToList();
    }

    public async Task<List<NewsItemDto>> GetAllNewsAsync()
    {
        var items = await _db.NewsItems
            .AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return items.Select(MapNews).ToList();
    }

    public async Task<NewsItemDto> CreateNewsItemAsync(CreateNewsItemRequest request)
    {
        var type = NormalizeNewsType(request.Type);
        var item = new NewsItem
        {
            Title = request.Title.Trim(),
            Text = request.Text.Trim(),
            Type = type,
            Badge = string.IsNullOrWhiteSpace(request.Badge)
                ? (type == "sale" ? "Акция" : "Новость")
                : request.Badge.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(request.Image) ? "/images/news-combo.jpg" : request.Image.Trim(),
            DisplayDate = string.IsNullOrWhiteSpace(request.DisplayDate)
                ? DateTime.UtcNow.ToString("dd MMMM", new System.Globalization.CultureInfo("ru-RU"))
                : request.DisplayDate.Trim(),
            CreatedAt = DateTime.UtcNow,
            IsPublished = true,
        };

        _db.NewsItems.Add(item);
        await _db.SaveChangesAsync();
        return MapNews(item);
    }

    public async Task DeleteNewsItemAsync(int id)
    {
        var item = await _db.NewsItems.FindAsync(id);
        if (item == null)
            throw ApiException.NotFound(ErrorCodes.NewsNotFound);

        _db.NewsItems.Remove(item);
        await _db.SaveChangesAsync();
    }

    public async Task<MovieDiscussionModerationDto> GetMovieDiscussionsAsync(int movieId)
    {
        var movie = await _db.Movies.AsNoTracking().FirstOrDefaultAsync(m => m.Id == movieId);
        if (movie == null)
            throw ApiException.NotFound(ErrorCodes.MovieNotFound);

        var comments = await _db.Comments
            .AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.MovieId == movieId && !c.IsHidden)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var reviews = await _db.Reviews
            .AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.MovieId == movieId && !r.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return new MovieDiscussionModerationDto(
            movieId,
            movie.Title,
            comments.Select(c => new ModerationCommentDto(
                c.Id, c.MovieId, movie.Title, c.UserId, c.User.DisplayName, c.Text, c.CreatedAt, c.ParentCommentId)).ToList(),
            reviews.Select(r => new ModerationReviewDto(
                r.Id, r.MovieId, movie.Title, r.UserId, r.User.DisplayName, r.Text, r.CreatedAt)).ToList());
    }

    public async Task DeleteCommentAsync(int commentId)
    {
        var comment = await _db.Comments
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == commentId);

        if (comment == null)
            throw ApiException.NotFound(ErrorCodes.CommentNotFound);

        await HideCommentTreeAsync(comment);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteReviewAsync(int reviewId)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId);
        if (review == null)
            throw ApiException.NotFound(ErrorCodes.ReviewNotFound);

        review.IsHidden = true;
        await _db.SaveChangesAsync();
    }

    private async Task HideCommentTreeAsync(Comment comment)
    {
        comment.IsHidden = true;
        foreach (var reply in comment.Replies.ToList())
            await HideCommentTreeAsync(reply);
    }

    private static NewsItemDto MapNews(NewsItem n) =>
        new(n.Id, n.Type, n.Badge, n.ImageUrl, n.Title, n.DisplayDate, n.Text);

    private static string NormalizeNewsType(string? type) =>
        string.Equals(type, "sale", StringComparison.OrdinalIgnoreCase) ? "sale" : "news";
}
