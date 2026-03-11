const POSTER_OVERRIDES = [
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
    url: 'https://kinogo.ec/uploads/posts/2025-05/1746802698_queen-of-the-ring.png',
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

export function getPosterOverride(movie) {
  if (!movie || !movie.title) return null;
  const title = String(movie.title).toLowerCase();
  const found = POSTER_OVERRIDES.find((item) => title.includes(item.match));
  return found ? found.url : null;
}

