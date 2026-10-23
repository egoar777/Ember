/** Порядок и состав групп жанров на афише */
const GROUP_ORDER = ['fiction', 'family', 'documentary', 'events', 'other'];

const NAME_TO_GROUP = {
  боевик: 'fiction',
  комедия: 'fiction',
  драма: 'fiction',
  мелодрама: 'fiction',
  триллер: 'fiction',
  ужасы: 'fiction',
  криминал: 'fiction',
  детектив: 'fiction',
  фантастика: 'fiction',
  фэнтези: 'fiction',
  приключения: 'fiction',
  анимация: 'family',
  мультфильм: 'family',
  семейный: 'family',
  биография: 'documentary',
  документальный: 'documentary',
  история: 'documentary',
  концерт: 'events',
  киноночь: 'events',
  мюзикл: 'events',
  музыка: 'events',
  событие: 'events',
  спорт: 'events',
};

export function groupGenresByCategory(genres) {
  const buckets = Object.fromEntries(GROUP_ORDER.map((key) => [key, []]));

  for (const genre of genres || []) {
    const key = NAME_TO_GROUP[genre.name.trim().toLowerCase()] || 'other';
    buckets[key].push(genre);
  }

  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    id: key,
    genres: buckets[key],
  }));
}
