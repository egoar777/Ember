import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getPosterOverride } from '../posterOverrides';
import { getHeroOverride } from '../heroOverrides';
import { getTitleOverride } from '../titleOverrides';
import { getHeroObjectPosition } from '../heroPositionOverrides';
import { formatDurationMinutes } from '../utils/formatDuration';
import { getMovieOverride } from '../movieOverrides';

export default function HeroPreview() {
  const { onAuthChange } = useAuth();
  const [heroMovies, setHeroMovies] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    apiGet('/movies?sortBy=year&page=1&pageSize=8', onAuthChange)
      .then((data) => {
        const items = data?.items || [];
        // Всегда стараемся включить «Кутюр» в витрину каталога, если он есть
        const couture = items.find((m) => typeof m.title === 'string' && m.title.toLowerCase().includes('кутюр'));
        const ordered = couture
          ? [couture, ...items.filter((m) => m.id !== couture.id)]
          : items;
        setHeroMovies(ordered.slice(0, 4));
      })
      .catch(() => setHeroMovies([]));
  }, [onAuthChange]);

  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroMovies.length), 6000);
    return () => clearInterval(t);
  }, [heroMovies.length]);

  if (!heroMovies.length) return null;

  return (
    <section className="hero">
      {heroMovies.map((m, i) => (
        <div
          key={m.id}
          className={`hero-slide ${i === heroIndex ? 'active' : ''}`}
        >
          <img
            className="hero-bg"
            src={getHeroOverride(m) || m.backgroundUrl || getPosterOverride(m) || m.posterUrl || '/home-hero-bg.jpg'}
            style={getHeroObjectPosition(m) ? { objectPosition: getHeroObjectPosition(m) } : undefined}
            alt=""
          />
          <div className="hero-overlay" />
          <div className="hero-content">
            <h2 className="hero-title">{getTitleOverride(m) || m.title}</h2>
            <div className="hero-meta">
              <span>{m.year}</span>
              <span className="separator" />
              <span>{(getMovieOverride(m)?.durationLabel) || formatDurationMinutes(m.duration)}</span>
            </div>
            {m.description && (
              <p className="hero-description">{m.description}</p>
            )}
            <div className="hero-actions">
              <Link to={`/booking?movieId=${m.id}`} className="btn btn-primary">
                Купить билет
              </Link>
              <Link to={`/movie/${m.id}`} className="btn btn-secondary">
                Подробнее
              </Link>
            </div>
          </div>
        </div>
      ))}
      <div className="hero-dots">
        {heroMovies.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
            onClick={() => setHeroIndex(i)}
            aria-label={`Слайд ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

