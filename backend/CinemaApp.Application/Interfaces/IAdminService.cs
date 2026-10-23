using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IAdminService
{
    Task<List<AdminScreeningDto>> GetUpcomingScreeningsAsync(bool includeCancelled = false);
    Task CancelScreeningAsync(int screeningId);
    Task<List<NewsItemDto>> GetPublishedNewsAsync(int? limit = null);
    Task<List<NewsItemDto>> GetAllNewsAsync();
    Task<NewsItemDto> CreateNewsItemAsync(CreateNewsItemRequest request);
    Task DeleteNewsItemAsync(int id);
    Task<MovieDiscussionModerationDto> GetMovieDiscussionsAsync(int movieId);
    Task DeleteCommentAsync(int commentId);
    Task DeleteReviewAsync(int reviewId);
}
