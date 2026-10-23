/** Парсинг возраста из «12+», «6+» и т.д. */
export function parseMovieAge(ageRating) {
  if (!ageRating || typeof ageRating !== 'string') return null;
  const match = ageRating.trim().match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Детская афиша: только 0+, 6+, 12+. */
export function isKidsMovie(movie) {
  const age = parseMovieAge(movie?.ageRating ?? movie?.AgeRating);
  return age != null && age <= 12;
}

/** Возрастное предупреждение 18+ (и выше). */
export function isAdultRestrictedMovie(movie) {
  const age = parseMovieAge(movie?.ageRating ?? movie?.AgeRating);
  return age != null && age >= 18;
}
