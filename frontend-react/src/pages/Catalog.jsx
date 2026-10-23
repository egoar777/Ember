import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import MovieCard from '../components/MovieCard';
import LoadingState from '../components/LoadingState';
import { dedupeMovies } from '../utils/dedupeMovies';
import { groupGenresByCategory } from '../utils/genreGroups';
import { getAudioFilterOptions } from '../utils/audioFilterOptions';
import RolloutSelect from '../components/ui/RolloutSelect';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { onAuthChange } = useAuth();
  const { t } = useI18n();
  const aiState = location.state?.aiResults;
  const urlSearch = (searchParams.get('search') || '').trim();
  const audioLang = (searchParams.get('audio') || '').trim();

  const [genres, setGenres] = useState([]);
  const [genreIds, setGenreIds] = useState([]);
  const [sortBy, setSortBy] = useState('year');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(aiState ? { items: aiState.results, totalCount: aiState.results?.length } : null);
  const [loading, setLoading] = useState(!aiState);
  const filterKey = JSON.stringify([urlSearch, audioLang, sortBy, genreIds]);
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey);
    setPage(1);
    setResult(null);
    setLoading(true);
  }


  const buildParams = useCallback(
    (pageNum) => {
      const params = new URLSearchParams();
      const shouldFilterByGenres = genreIds.length && genreIds.length < genres.length;
      if (shouldFilterByGenres) {
        genreIds.forEach((id) => params.append('genreIds', String(id)));
      }
      if (urlSearch) params.set('search', urlSearch);
      if (audioLang) params.set('screeningLanguage', audioLang);
      params.set('sortBy', sortBy);
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      return params;
    },
    [genreIds, genres, urlSearch, audioLang, sortBy]
  );

  useEffect(() => {
    apiGet('/genres/with-ids', onAuthChange).then(setGenres).catch(() => setGenres([]));
  }, [onAuthChange]);

  useEffect(() => {
    if (aiState) return undefined;
    let active = true;
    const params = buildParams(page);
    apiGet(`/movies?${params}`, onAuthChange)
      .then((r) => {
        if (!active) return;
        setResult((prev) => ({
          items: dedupeMovies(page === 1 ? r.items : [...(prev?.items || []), ...(r.items || [])]),
          totalCount: r.totalCount,
          page: r.page,
        }));
      })
      .catch(() => { if (active) setResult({ items: [], totalCount: 0 }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, buildParams, aiState, onAuthChange]);

  const resetPage = () => {
    setPage(1);
    setLoading(true);
    setResult(null);
  };

  const toggleGenre = (id) => {
    resetPage();
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const genreGroups = useMemo(() => groupGenresByCategory(genres), [genres]);

  const setAudioLang = (v) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set('audio', v);
    else next.delete('audio');
    setSearchParams(next, { replace: true });
  };

  const audioOptions = useMemo(() => getAudioFilterOptions(t), [t]);
  const sortOptions = useMemo(
    () => [
      { value: 'year', label: t('catalog.sortYear') },
      { value: 'title', label: t('catalog.sortTitle') },
    ],
    [t]
  );

  const visibleResult = aiState ? { items: aiState.results || [], totalCount: aiState.results?.length || 0 } : result;
  const movies = dedupeMovies(visibleResult?.items || []);

  return (
    <>
      <div className="container">
        <h1 className="catalog-page-title">{t('catalog.title')}</h1>
        <div className="catalog-filters-panel">
          <div className="catalog-filters-toolbar" role="group" aria-label={t('catalog.title')}>
            <div className="catalog-filter-field" title={t('catalog.audioHint')}>
              <label id="catalog-audio-select-label" className="catalog-filter-field-label" htmlFor="catalog-audio-select">
                {t('catalog.audioLabel')}
              </label>
              <RolloutSelect
                id="catalog-audio-select"
                value={audioLang}
                onChange={setAudioLang}
                options={audioOptions}
                variant="catalog"
                aria-labelledby="catalog-audio-select-label"
              />
            </div>
            <div className="catalog-filter-field">
              <label id="catalog-sort-select-label" className="catalog-filter-field-label" htmlFor="catalog-sort-select">
                {t('catalog.sortLabel')}
              </label>
              <RolloutSelect
                id="catalog-sort-select"
                value={sortBy}
                onChange={(value) => { resetPage(); setSortBy(value); }}
                options={sortOptions}
                variant="catalog"
                aria-labelledby="catalog-sort-select-label"
              />
            </div>
          </div>
          <div className="catalog-filters-genres-block">
            <div className="catalog-filters-genres-head">
              <span className="catalog-filters-genres-title">{t('catalog.genresSection')}</span>
              {genreIds.length > 0 && (
                <button type="button" className="catalog-genres-reset" onClick={() => { resetPage(); setGenreIds([]); }}>
                  {t('catalog.clearGenres')}
                </button>
              )}
            </div>
            <div className="catalog-filters-genres-grid" aria-label={t('catalog.genresSection')}>
              {genreGroups.map((group) => (
                <section key={group.id} className="catalog-genre-group" aria-labelledby={`genre-group-${group.id}`}>
                  <h3 id={`genre-group-${group.id}`} className="catalog-genre-group-label">
                    {t(`catalog.genreGroup.${group.id}`)}
                  </h3>
                  <div className="catalog-genre-group-chips" role="group" aria-label={t(`catalog.genreGroup.${group.id}`)}>
                    {group.genres.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`filter-chip ${genreIds.includes(g.id) ? 'active' : ''}`}
                        onClick={() => toggleGenre(g.id)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        {location.state?.aiResults?.interpretedQuery && (
          <p className="voice-text" style={{ marginBottom: 16 }}>
            {location.state.aiResults.interpretedQuery}
          </p>
        )}
        {loading && !aiState && page === 1 ? (
          <LoadingState fullScreen />
        ) : (
          <>
            <div className="movies-grid">
              {movies.map((m) => (
                <MovieCard key={m.id} movie={m} audioParam={audioLang || undefined} />
              ))}
            </div>
            {!aiState && visibleResult?.totalCount > movies.length && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() => { setLoading(true); setPage((p) => p + 1); }}
                >
                  {t('catalog.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
