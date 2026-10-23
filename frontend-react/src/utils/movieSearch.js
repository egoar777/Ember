import { getDisplayTitleForString, getTitleOverride } from '../titleOverrides';
import { normalizeSearchQuery, normalizeVoiceSearchQuery } from './searchQuery';

function normalizeText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/[«»„""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchQuery(raw) {
  const s = normalizeSearchQuery(raw);
  if (!s) return [];
  return [...new Set(s.split(' ').map((t) => t.trim()).filter((t) => t.length >= 2))];
}

export function getMovieDisplayTitle(movie) {
  return getTitleOverride(movie) || getDisplayTitleForString(movie?.title ?? movie?.Title ?? '');
}

function movieSearchBlob(movie) {
  const genres = (movie?.genres || movie?.Genres || []).join(' ');
  return normalizeText(
    [
      movie?.title ?? movie?.Title,
      movie?.originalTitle ?? movie?.OriginalTitle,
      genres,
      movie?.description ?? movie?.Description,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function movieMatchesSearch(movie, rawQuery) {
  const tokens = tokenizeSearchQuery(rawQuery).map((token) => token.toLowerCase());
  if (tokens.length === 0) return true;
  const blob = movieSearchBlob(movie);
  if (!blob) return false;
  return tokens.every((token) => blob.toLowerCase().includes(token.toLowerCase()));
}

function scoreMovie(movie, rawQuery) {
  const tokens = tokenizeSearchQuery(rawQuery).map((token) => token.toLowerCase());
  if (tokens.length === 0) return 0;

  const title = normalizeText(getMovieDisplayTitle(movie)).toLowerCase();
  const blob = movieSearchBlob(movie).toLowerCase();
  const q = tokens.join(' ');

  let score = 0;
  if (title === q) score += 200;
  if (title.startsWith(q)) score += 120;
  if (tokens.every((t) => title.includes(t))) score += 80;
  if (title.includes(q)) score += 40;

  const genres = (movie?.genres || movie?.Genres || []).map((g) => String(g).toLowerCase());
  if (genres.some((g) => g.includes(q) || tokens.some((t) => g.includes(t)))) score += 35;

  if (blob.includes(q)) score += 15;
  tokens.forEach((t) => {
    if (title.includes(t)) score += 10;
    if (blob.includes(t)) score += 3;
  });

  return score;
}

export function rankMoviesForSearch(movies, rawQuery, limit = 8) {
  const tokens = tokenizeSearchQuery(rawQuery).map((token) => token.toLowerCase());
  if (tokens.length === 0) return [];

  return (movies || [])
    .filter((m) => movieMatchesSearch(m, rawQuery))
    .map((movie) => ({ movie, score: scoreMovie(movie, rawQuery) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function resolveSearchQuery(raw, { voice = false } = {}) {
  return voice ? normalizeVoiceSearchQuery(raw) : normalizeSearchQuery(raw);
}
