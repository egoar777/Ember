const HERO_OVERRIDES = [
  {
    // Горничная / прежнее название Красавица
    match: 'горничн',
    url: '/hero-gornichnaia.webp',
  },
  {
    match: 'красавиц',
    url: '/hero-gornichnaia.webp',
  },
  {
    match: 'король и шут',
    url: '/hero-crick.webp',
  },
  {
    match: 'крик 7',
    url: '/hero-crick.webp',
  },
  {
    match: 'наследник',
    url: '/hero-naslednik.webp',
  },
  {
    match: 'goat',
    url: '/hero-goat.webp',
  },
  {
    match: 'грозовой перевал',
    url: '/hero-pereval.webp',
  },
  {
    match: 'кутюр',
    url: '/hero-cutur.webp',
  },
  {
    match: 'королева ринга',
    url: '/hero-korolevaringa.jpg',
  },
  {
    match: 'на помощь',
    url: '/hero-help.webp',
  },
];

export function getHeroOverride(movie) {
  if (!movie || !movie.title) return null;
  const title = String(movie.title).toLowerCase();
  const found = HERO_OVERRIDES.find((item) => title.includes(item.match));
  return found ? found.url : null;
}

