import { useState, useEffect } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function Exclusive() {
  const { onAuthChange } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/movies?platforms=IMAX&pageSize=20', onAuthChange)
      .then((r) => setMovies(r?.items || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [onAuthChange]);

  return (
    <div className="container">
      <div className="hero" style={{ height: 280, marginBottom: 40 }}>
        <div className="hero-overlay" style={{ background: 'linear-gradient(to top, var(--color-bg), transparent 60%)' }} />
        <div className="hero-content">
          <h1 className="hero-title">Эксклюзивный контент</h1>
          <p className="hero-description">Премьерные показы и особые мероприятия</p>
        </div>
      </div>
      <h2 className="section-title" style={{ marginBottom: 20 }}>Премьерные показы</h2>
      {loading ? (
        <div className="movies-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 320 }} />)}
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((m) => <MovieCard key={m.id} movie={m} />)}
        </div>
      )}
      <div className="section" style={{ marginTop: 48 }}>
        <h2 className="section-title">Особые мероприятия</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {['Ночные премьеры', 'Ретро-показы', 'Киноклуб', 'Детские марафоны'].map((title, i) => (
            <div key={i} className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 8 }}>{title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Уникальные сеансы и события в кинотеатрах.</p>
              <a href="#events" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Подробнее</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
