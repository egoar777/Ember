using CinemaApp.Application;
using CinemaApp.Application.Common;
using CinemaApp.Application.DTOs;
using CinemaApp.Application.Interfaces;
using CinemaApp.Data;
using CinemaApp.Domain.Entities;
using CinemaApp.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CinemaApp.Application.Services;

public class SocialService : ISocialService
{
    private readonly CinemaDbContext _db;
    private readonly IMooonCinemaSyncService _mooonSync;

    public SocialService(CinemaDbContext db, IMooonCinemaSyncService mooonSync)
    {
        _db = db;
        _mooonSync = mooonSync;
    }

    public async Task<List<UserListDto>> GetUserListsAsync(int userId)
    {
        var lists = await _db.UserLists
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => new
            {
                l.Id,
                l.Name,
                l.Type,
                l.CreatedAt,
                ItemCount = l.Items.Count
            })
            .ToListAsync();

        return lists.Select(l => new UserListDto(
            l.Id,
            l.Name,
            l.Type.ToString(),
            l.ItemCount,
            l.CreatedAt)).ToList();
    }

    public async Task<UserListDto> CreateListAsync(int userId, CreateListRequest request)
    {
        var type = Enum.TryParse<UserListType>(request.Type, ignoreCase: true, out var t) ? t : UserListType.Custom;

        var list = new UserList
        {
            UserId = userId,
            Name = request.Name,
            Type = type,
            CreatedAt = DateTime.UtcNow
        };

        _db.UserLists.Add(list);
        await _db.SaveChangesAsync();

        return new UserListDto(list.Id, list.Name, list.Type.ToString(), 0, list.CreatedAt);
    }

    public async Task<UserListItemDto> AddItemToListAsync(int listId, int userId, int movieId)
    {
        var list = await _db.UserLists.FirstOrDefaultAsync(l => l.Id == listId);
        if (list == null || list.UserId != userId)
            throw ApiException.NotFound(ErrorCodes.ListNotFound);

        var existing = await _db.UserListItems
            .FirstOrDefaultAsync(li => li.UserListId == listId && li.MovieId == movieId);
        if (existing != null)
            throw ApiException.BadRequest(ErrorCodes.ItemAlreadyInList);

        var item = new UserListItem
        {
            UserListId = listId,
            MovieId = movieId,
            AddedAt = DateTime.UtcNow
        };

        _db.UserListItems.Add(item);
        await _db.SaveChangesAsync();

        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var movie = await _db.Movies.FindAsync(movieId);
        return new UserListItemDto(
            item.Id,
            item.MovieId,
            movie?.Title ?? "",
            movie != null ? MooonFilmImageUrls.ResolvePosterUrl(movie, mooonMap) : null,
            item.AddedAt);
    }

    public async Task RemoveItemFromListAsync(int listId, int itemId, int userId)
    {
        var item = await _db.UserListItems
            .Include(li => li.UserList)
            .FirstOrDefaultAsync(li => li.Id == itemId);

        if (item == null || item.UserListId != listId || item.UserList.UserId != userId)
            throw ApiException.NotFound(ErrorCodes.ItemNotFound);

        _db.UserListItems.Remove(item);
        await _db.SaveChangesAsync();
    }

    public async Task<List<UserListItemDto>> GetListItemsAsync(int listId, int userId)
    {
        var list = await _db.UserLists.FirstOrDefaultAsync(l => l.Id == listId);
        if (list == null || list.UserId != userId)
            throw ApiException.NotFound(ErrorCodes.ListNotFound);

        var mooonMap = await _mooonSync.GetCachedFilmImageMapAsync();
        var items = await _db.UserListItems
            .Include(li => li.Movie)
            .Where(li => li.UserListId == listId)
            .OrderByDescending(li => li.AddedAt)
            .ToListAsync();

        return items.Select(li => new UserListItemDto(
            li.Id,
            li.MovieId,
            li.Movie.Title,
            MooonFilmImageUrls.ResolvePosterUrl(li.Movie, mooonMap),
            li.AddedAt)).ToList();
    }

    public async Task<RatingDto> RateMovieAsync(int userId, int movieId, int score)
    {
        var movie = await _db.Movies.FindAsync(movieId);
        if (movie == null)
            throw ApiException.NotFound(ErrorCodes.MovieNotFound);

        var existing = await _db.Ratings
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MovieId == movieId);

        Rating rating;
        if (existing != null)
        {
            existing.Score = score;
            existing.CreatedAt = DateTime.UtcNow;
            rating = existing;
        }
        else
        {
            rating = new Rating
            {
                UserId = userId,
                MovieId = movieId,
                Score = score,
                CreatedAt = DateTime.UtcNow
            };
            _db.Ratings.Add(rating);
        }

        await _db.SaveChangesAsync();

        movie.RatingCount = await _db.Ratings.CountAsync(r => r.MovieId == movieId);
        movie.AverageRating = await _db.Ratings
            .Where(r => r.MovieId == movieId)
            .AverageAsync(r => r.Score);

        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return new RatingDto(
            rating.Id,
            rating.UserId,
            user?.DisplayName ?? "",
            rating.Score,
            rating.CreatedAt);
    }

    public async Task<List<RatingDto>> GetMovieRatingsAsync(int movieId)
    {
        var ratings = await _db.Ratings
            .Include(r => r.User)
            .Where(r => r.MovieId == movieId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return ratings.Select(r => new RatingDto(
            r.Id,
            r.UserId,
            r.User.DisplayName,
            r.Score,
            r.CreatedAt)).ToList();
    }

    public async Task<ReviewDto> CreateReviewAsync(int userId, int movieId, string text)
    {
        var review = new Review
        {
            UserId = userId,
            MovieId = movieId,
            Text = text,
            CreatedAt = DateTime.UtcNow,
            Likes = 0,
            Dislikes = 0
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return new ReviewDto(
            review.Id,
            review.UserId,
            user?.DisplayName ?? "",
            review.Text,
            review.CreatedAt,
            review.Likes,
            review.Dislikes);
    }

    public async Task<List<ReviewDto>> GetMovieReviewsAsync(int movieId)
    {
        var reviews = await _db.Reviews
            .Include(r => r.User)
            .Where(r => r.MovieId == movieId && !r.IsHidden)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return reviews.Select(r => new ReviewDto(
            r.Id,
            r.UserId,
            r.User.DisplayName,
            r.Text,
            r.CreatedAt,
            r.Likes,
            r.Dislikes)).ToList();
    }

    public async Task<CommentDto> CreateCommentAsync(int userId, int movieId, string text, int? parentId)
    {
        var comment = new Comment
        {
            UserId = userId,
            MovieId = movieId,
            Text = text,
            ParentCommentId = parentId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return new CommentDto(
            comment.Id,
            comment.UserId,
            user?.DisplayName ?? "",
            comment.Text,
            comment.CreatedAt,
            comment.ParentCommentId,
            new List<CommentDto>());
    }

    public async Task<List<CommentDto>> GetMovieCommentsAsync(int movieId)
    {
        var topLevel = await _db.Comments
            .Include(c => c.User)
            .Include(c => c.Replies)
                .ThenInclude(r => r.User)
            .Include(c => c.Replies)
                .ThenInclude(r => r.Replies)
                    .ThenInclude(rr => rr.User)
            .Where(c => c.MovieId == movieId && c.ParentCommentId == null && !c.IsHidden)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return topLevel.Select(c => MapToCommentDto(c, 2)).ToList();
    }

    private static CommentDto MapToCommentDto(Comment c, int depth)
    {
        var replies = depth > 0 && c.Replies.Any()
            ? c.Replies.Where(r => !r.IsHidden).OrderBy(r => r.CreatedAt).Select(r => MapToCommentDto(r, depth - 1)).ToList()
            : new List<CommentDto>();

        return new CommentDto(
            c.Id,
            c.UserId,
            c.User.DisplayName,
            c.Text,
            c.CreatedAt,
            c.ParentCommentId,
            replies);
    }

    public async Task<List<NotificationDto>> GetNotificationsAsync(int userId)
    {
        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(n => new NotificationDto(
            n.Id,
            n.Type,
            n.Payload,
            n.IsRead,
            n.CreatedAt)).ToList();
    }

    public async Task MarkNotificationReadAsync(int notificationId, int userId)
    {
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
        if (notification == null || notification.UserId != userId)
            throw ApiException.NotFound(ErrorCodes.NotificationNotFound);

        notification.IsRead = true;
        await _db.SaveChangesAsync();
    }
}
