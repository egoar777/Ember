using CinemaApp.Application.DTOs;

namespace CinemaApp.Application.Interfaces;

public interface IRecommendationService
{
    Task<List<HomeCollectionDto>> GetHomeCollectionsAsync(int? userId);
    Task<List<MovieListDto>> GetRecommendationsForMovieAsync(int movieId, int? userId);
    Task<AiSearchResponse> AiSearchAsync(string query, int? userId);
}
