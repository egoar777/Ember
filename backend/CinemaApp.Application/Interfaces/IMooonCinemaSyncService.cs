using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IMooonCinemaSyncService
{
    Task<MooonSyncResultDto> SyncFromMooonAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Id события mooon → постер (medium/small) и широкий фон (large). Кэшируется на стороне реализации.
    /// </summary>
    Task<IReadOnlyDictionary<int, (string PosterUrl, string? BackdropUrl)>> GetCachedFilmImageMapAsync(
        CancellationToken cancellationToken = default);
}
