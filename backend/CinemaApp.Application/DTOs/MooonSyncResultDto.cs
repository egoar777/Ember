namespace CinemaApp.Application.DTOs;

public record MooonSyncResultDto(
    int RemoteFilmEvents,
    int Upserted,
    int Archived,
    int ScreeningsAddedForMovies);
