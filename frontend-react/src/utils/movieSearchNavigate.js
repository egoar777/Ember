import { apiGet } from '../api/client';
import { dedupeMovies } from './dedupeMovies';
import { getMovieDisplayTitle, rankMoviesForSearch, resolveSearchQuery } from './movieSearch';

let catalogCache = null;
let catalogPromise = null;

export async function loadMovieCatalog(onAuthChange) {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;

  catalogPromise = apiGet('/movies?pageSize=200&sortBy=title', onAuthChange)
    .then((r) => {
      catalogCache = dedupeMovies(r?.items ?? r?.Items ?? []);
      return catalogCache;
    })
    .catch(() => {
      return [];
    })
    .finally(() => {
      catalogPromise = null;
    });

  return catalogPromise;
}

export function invalidateMovieCatalog() {
  catalogCache = null;
}

/**
 * Поиск по каталогу (клиент) с запасным запросом к API.
 * @returns {{ items: object[], query: string, source: 'catalog'|'api' }}
 */
export async function searchMoviesCatalog(rawQuery, onAuthChange, { voice = false } = {}) {
  const query = resolveSearchQuery(rawQuery, { voice });
  if (!query) return { items: [], query: '', source: 'catalog' };

  const catalog = await loadMovieCatalog(onAuthChange);
  const ranked = rankMoviesForSearch(catalog, query, 20);
  if (ranked.length > 0) {
    return { items: ranked.map((r) => r.movie), query, source: 'catalog' };
  }

  const params = new URLSearchParams({ search: query, pageSize: '20' });
  const r = await apiGet(`/movies?${params}`, onAuthChange);
  const items = dedupeMovies(r?.items ?? r?.Items ?? []);
  return { items, query, source: 'api' };
}

export function navigateFromSearchResults(items, query, navigate, showToast, t) {
  if (!items?.length) {
    navigate(`/catalog?search=${encodeURIComponent(query)}`);
    const normalized = String(query || '').trim().toLowerCase();
    if (normalized === '67') {
      const variants = ['SIXSEVEN', 'СИКСЕВЕН', 'ФЫФЯТ СЕМЬ'];
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      showToast(randomVariant, 'info');
      return;
    }
    showToast(t('header.toastNotFound'), 'info');
    return;
  }

  if (items.length === 1) {
    const first = items[0];
    const id = first.id ?? first.Id;
    navigate(`/movie/${id}`);
    showToast(t('header.toastOpened', { title: getMovieDisplayTitle(first) }), 'success');
    return;
  }

  navigate(`/catalog?search=${encodeURIComponent(query)}`);
  showToast(t('header.toastCatalogMatches', { count: items.length }), 'info');
}
