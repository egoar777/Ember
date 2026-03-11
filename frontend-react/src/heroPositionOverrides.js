const HERO_POSITION_OVERRIDES = [
  {
    match: 'наследник',
    objectPosition: 'center 40%',
  },
];

export function getHeroObjectPosition(movie) {
  if (!movie || !movie.title) return undefined;
  const title = String(movie.title).toLowerCase();
  const found = HERO_POSITION_OVERRIDES.find((item) => title.includes(item.match));
  return found?.objectPosition;
}

