import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';
import HeroPreview from '../components/HeroPreview';

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { onAuthChange } = useAuth();
  const initialSearch = searchParams.get('search') || '';
  const aiState = location.state?.aiResults;

  const [genres, setGenres] = useState([]);
  const [genreIds, setGenreIds] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('year');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(aiState ? { items: aiState.results, totalCount: aiState.results?.length } : null);
  const [loading, setLoading] = useState(!aiState);

  useEffect(() => {
    apiGet('/genres/with-ids', onAuthChange).then(setGenres).catch(() => setGenres([]));
  }, [onAuthChange]);

  const fetchMovies = useMemo(() => {
    return () => {
      if (aiState) return;
      setLoading(true);
      const params = new URLSearchParams();
      const shouldFilterByGenres = genreIds.length && genreIds.length < genres.length;
      if (shouldFilterByGenres) {
        genreIds.forEach((id) => params.append('genreIds', String(id)));
      }
      if (yearFrom) params.set('yearFrom', yearFrom);
      if (yearTo) params.set('yearTo', yearTo);
      if (search) params.set('search', search);
      params.set('sortBy', sortBy);
      params.set('page', page);
      params.set('pageSize', '20');
      apiGet(`/movies?${params}`, onAuthChange)
        .then((r) => setResult((prev) => ({
          items: page === 1 ? r.items : [...(prev?.items || []), ...r.items],
          totalCount: r.totalCount,
          page: r.page,
        })))
        .catch(() => setResult({ items: [], totalCount: 0 }))
        .finally(() => setLoading(false));
    };
  }, [genreIds, genres, yearFrom, yearTo, search, sortBy, page, aiState, onAuthChange]);

  useEffect(() => {
    if (aiState) {
      setResult({ items: aiState.results || [], totalCount: aiState.results?.length || 0 });
      setLoading(false);
      return;
    }
    fetchMovies();
  }, [page, sortBy, aiState]);

  useEffect(() => {
    setPage(1);
    setLoading(true);
    const params = new URLSearchParams();
    const shouldFilterByGenres = genreIds.length && genreIds.length < genres.length;
    if (shouldFilterByGenres) {
      genreIds.forEach((id) => params.append('genreIds', String(id)));
    }
    if (yearFrom) params.set('yearFrom', yearFrom);
    if (yearTo) params.set('yearTo', yearTo);
    if (search) params.set('search', search);
    params.set('sortBy', sortBy);
    params.set('page', '1');
    params.set('pageSize', '20');
    apiGet(`/movies?${params}`, onAuthChange)
      .then((r) => setResult({ items: r.items, totalCount: r.totalCount, page: 1 }))
      .catch(() => setResult({ items: [], totalCount: 0 }))
      .finally(() => setLoading(false));
  }, [genreIds, genres, yearFrom, yearTo, search, sortBy]);

  const toggleGenre = (id) => {
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const movies = result?.items || [];

  // Синхронизируем поиск с URL (при переходе из поиска в шапке)
  const searchFromUrl = searchParams.get('search') || '';
  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  return (
    <>
    <HeroPreview />
    <div className="container">
      <h1 style={{ marginBottom: 24 }}>Каталог фильмов</h1>
      <div className="filters-bar">
        {(genres || []).map((g) => (
          <button
            key={g.id}
            type="button"
            className={`filter-chip ${genreIds.includes(g.id) ? 'active' : ''}`}
            onClick={() => toggleGenre(g.id)}
          >
            {g.name}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-chip"
          style={{ marginLeft: 'auto' }}
        >
          <option value="year">По году</option>
          <option value="title">По названию</option>
        </select>
      </div>
      {location.state?.aiResults?.interpretedQuery && (
        <p className="voice-text" style={{ marginBottom: 16 }}>
          {location.state.aiResults.interpretedQuery}
        </p>
      )}
      {loading && page === 1 ? (
        <div className="movies-grid" style={{ minHeight: 300 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 320 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="movies-grid">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
          {result?.totalCount > movies.length && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Загрузить ещё
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
