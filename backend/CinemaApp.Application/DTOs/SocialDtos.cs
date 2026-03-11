namespace CinemaApp.Application.DTOs;

public record UserListDto(int Id, string Name, string Type, int ItemCount, DateTime CreatedAt);
public record CreateListRequest(string Name, string Type);
public record AddListItemRequest(int MovieId);
public record UserListItemDto(int Id, int MovieId, string MovieTitle, string? PosterUrl, DateTime AddedAt);

public record RatingDto(int Id, int UserId, string UserName, int Score, DateTime CreatedAt);
public record CreateRatingRequest(int Score);

public record ReviewDto(int Id, int UserId, string UserName, string Text, DateTime CreatedAt, int Likes, int Dislikes);
public record CreateReviewRequest(string Text);

public record CommentDto(int Id, int UserId, string UserName, string Text, DateTime CreatedAt, int? ParentCommentId, List<CommentDto> Replies);
public record CreateCommentRequest(string Text);

public record NotificationDto(int Id, string Type, string Payload, bool IsRead, DateTime CreatedAt);
