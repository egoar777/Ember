const GENRE_OVERRIDES = [
  { match: 'крик 7', genres: ['Ужасы'] },
  { match: 'король и шут', genres: ['Ужасы'] },
];

export function getGenresOverride(movie) {
  if (!movie || !movie.title) return null;
  const title = String(movie.title).toLowerCase();
  const found = GENRE_OVERRIDES.find((item) => title.includes(item.match));
  return found ? found.genres : null;
}

