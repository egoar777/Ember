import { resolvePosterByTitle } from '../posterOverrides';
import { toMooonBackdropUrl, toMooonPosterUrl, isRemoteImageUrl } from './mooonImageUrls';

function siteAssetPosterUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;
  return null;
}

function isUsablePosterUrl(url) {
  return isRemoteImageUrl(url) || (typeof url === 'string' && url.startsWith('/'));
}

export function picsumFallback(movie, variant = 'backdrop') {
  const seed = encodeURIComponent(String(movie?.id ?? movie?.title ?? 'fallback'));
  if (variant === 'poster') {
    return `https://picsum.photos/seed/movie-${seed}/400/600`;
  }
  return `https://picsum.photos/seed/movie-bg-${seed}/1920/1080`;
}

/** Афиша для карточек — только постер (medium/small), без широкого фона. */
export function getMoviePosterCandidates(movie) {
  const urls = [
    toMooonPosterUrl(movie?.posterUrl),
    siteAssetPosterUrl(movie?.posterUrl),
    siteAssetPosterUrl(movie?.backgroundUrl),
    resolvePosterByTitle(movie),
    picsumFallback(movie, 'poster'),
  ].filter(isUsablePosterUrl);

  return [...new Set(urls)];
}

export function resolveMoviePoster(movie) {
  return getMoviePosterCandidates(movie)[0] ?? picsumFallback(movie, 'poster');
}

/** Широкий фон для hero (главная и страница фильма). */
export function getMovieBackdropCandidates(movie) {
  const urls = [
    toMooonBackdropUrl(movie?.backgroundUrl),
    toMooonBackdropUrl(movie?.posterUrl),
    toMooonPosterUrl(movie?.posterUrl),
    toMooonPosterUrl(movie?.backgroundUrl),
    picsumFallback(movie, 'backdrop'),
  ].filter(isUsablePosterUrl);

  return [...new Set(urls)];
}

export function movieHasHeroImage(movie) {
  return getMovieBackdropCandidates(movie).length > 0;
}

export function resolveMovieBackdrop(movie) {
  return getMovieBackdropCandidates(movie)[0] ?? null;
}
