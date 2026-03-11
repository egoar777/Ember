const TITLE_OVERRIDES = [
  {
    match: 'красавица',
    title: 'Горничная',
  },
  {
    match: 'король и шут',
    title: 'Крик 7',
  },
];

export function getTitleOverride(movie) {
  if (!movie || !movie.title) return null;
  const title = String(movie.title).toLowerCase();
  const found = TITLE_OVERRIDES.find((item) => title.includes(item.match));
  return found ? found.title : null;
}

/** Для чека, профиля и любых мест, где есть только строка названия с бэка — возвращает отображаемое название (Крик 7, Горничная). */
export function getDisplayTitleForString(titleString) {
  if (titleString == null || titleString === '') return titleString ?? '';
  const title = String(titleString).toLowerCase();
  const found = TITLE_OVERRIDES.find((item) => title.includes(item.match));
  return found ? found.title : titleString;
}

