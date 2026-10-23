namespace CinemaApp.Application.DTOs;

public record NewsItemDto(
    int Id,
    string Type,
    string Badge,
    string? Image,
    string Title,
    string Date,
    string Text);

public record CreateNewsItemRequest(
    string Title,
    string Text,
    string Type,
    string? Badge,
    string? Image,
    string? DisplayDate);

public record AdminScreeningDto(
    int Id,
    int MovieId,
    string MovieTitle,
    string HallName,
    DateTime StartTime,
    DateTime EndTime,
    string? Language,
    string? Format,
    bool IsCancelled,
    int ActiveBookingsCount);

public record ModerationCommentDto(
    int Id,
    int MovieId,
    string MovieTitle,
    int UserId,
    string UserName,
    string Text,
    DateTime CreatedAt,
    int? ParentCommentId);

public record ModerationReviewDto(
    int Id,
    int MovieId,
    string MovieTitle,
    int UserId,
    string UserName,
    string Text,
    DateTime CreatedAt);

public record MovieDiscussionModerationDto(
    int MovieId,
    string MovieTitle,
    List<ModerationCommentDto> Comments,
    List<ModerationReviewDto> Reviews);
