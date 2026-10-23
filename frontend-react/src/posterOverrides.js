const POSTER_OVERRIDES = [
  // mooon: вертикальный medium (в БД часто остаётся широкий .../photo/...)
  {
    match: 'дети леса',
    url: '/poster-bel.webp',
  },
  {
    match: 'домовенок кузя',
    url: '/poster-help.webp',
  },
  {
    // Горничная / прежнее название Красавица
    match: 'горничн',
    url: '/poster-gornichnaia.webp',
  },
  {
    // Крик 7 / прежнее название Король и Шут
    match: 'крик 7',
    url: '/poster-crick.webp',
  },
  {
    match: 'наследник',
    url: '/poster-naslednik.webp',
  },
  {
    match: 'королева ринга',
    url: '/hero-korolevaringa.jpg',
  },
  {
    match: 'грозовой перевал',
    url: '/poster-pereval.webp',
  },
  {
    match: 'кутюр',
    url: '/poster-cutur.webp',
  },
  // старые названия на всякий случай, если где-то ещё остались
  {
    match: 'красавица',
    url: '/poster-gornichnaia.webp',
  },
  {
    match: 'король и шут',
    url: '/poster-crick.webp',
  },
];

function titleForMatch(movie) {
  return String(movie?.title || movie?.movieTitle || '').toLowerCase();
}

/** Локальная афиша по названию (public/…). */
export function resolvePosterByTitle(movie) {
  const title = titleForMatch(movie);
  if (!title) return null;
  const found = POSTER_OVERRIDES.find((item) => title.includes(item.match));
  return found?.url ?? null;
}

export function getPosterOverride(movie) {
  if (!movie || !titleForMatch(movie)) return null;

  const apiPoster = movie.posterUrl || movie.backgroundUrl;
  if (typeof apiPoster === 'string' && /^https?:\/\//i.test(apiPoster.trim())) {
    return null;
  }

  const url = resolvePosterByTitle(movie);
  if (!url || url.startsWith('/')) return null;

  return url;
}
