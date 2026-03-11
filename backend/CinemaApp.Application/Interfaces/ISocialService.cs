using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface ISocialService
{
    Task<List<UserListDto>> GetUserListsAsync(int userId);
    Task<UserListDto> CreateListAsync(int userId, CreateListRequest request);
    Task<UserListItemDto> AddItemToListAsync(int listId, int userId, int movieId);
    Task RemoveItemFromListAsync(int listId, int itemId, int userId);
    Task<List<UserListItemDto>> GetListItemsAsync(int listId, int userId);

    Task<RatingDto> RateMovieAsync(int userId, int movieId, int score);
    Task<List<RatingDto>> GetMovieRatingsAsync(int movieId);

    Task<ReviewDto> CreateReviewAsync(int userId, int movieId, string text);
    Task<List<ReviewDto>> GetMovieReviewsAsync(int movieId);

    Task<CommentDto> CreateCommentAsync(int userId, int movieId, string text, int? parentId);
    Task<List<CommentDto>> GetMovieCommentsAsync(int movieId);

    Task<List<NotificationDto>> GetNotificationsAsync(int userId);
    Task MarkNotificationReadAsync(int notificationId, int userId);
}
