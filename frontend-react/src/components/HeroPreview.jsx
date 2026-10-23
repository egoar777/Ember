import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { apiGet } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import { getTitleOverride } from '../titleOverrides';
import { formatDurationMinutes } from '../utils/formatDuration';
import { getMovieOverride } from '../movieOverrides';
import MovieBackdrop from './MovieBackdrop';
import { getMovieBackdropCandidates, movieHasHeroImage } from '../utils/movieImages';

const HERO_RANDOM_COUNT = 5;
const HERO_POOL_SIZE = 60;

function pickRandomMovies(items, n) {
  if (!items?.length) return [];
  const withBackdrop = items.filter(movieHasHeroImage);
  const pool = withBackdrop.length >= n ? withBackdrop : items;
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

function preloadHeroImages(movies) {
  movies.forEach((movie) => {
    getMovieBackdropCandidates(movie).forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  });
}

export default function HeroPreview() {
  const { onAuthChange } = useAuth();
  const { t } = useI18n();
  const [heroMovies, setHeroMovies] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    apiGet(`/movies?sortBy=rating&pageSize=${HERO_POOL_SIZE}`, onAuthChange)
      .then((data) => {
        const picked = pickRandomMovies(data?.items || [], HERO_RANDOM_COUNT);
        preloadHeroImages(picked);
        setHeroMovies(picked);
        setHeroIndex(0);
        setHeroPaused(false);
      })
      .catch(() => {
        setHeroMovies([]);
        setHeroIndex(0);
        setHeroPaused(false);
      });
  }, [onAuthChange]);

  useEffect(() => {
    if (heroPaused || heroMovies.length <= 1) return;
    const interval = setInterval(() => setHeroIndex((i) => (i + 1) % heroMovies.length), 3000);
    return () => clearInterval(interval);
  }, [heroPaused, heroMovies.length]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hero-slide-change'));
  }, [heroIndex, heroMovies.length]);

  if (!heroMovies.length) return null;

  return (
    <section className="hero">
      {heroMovies.map((m, i) => (
        <div key={m.id} className={`hero-slide ${i === heroIndex ? 'active' : ''}`}>
          <MovieBackdrop movie={m} eager />
          <div className="hero-overlay" />
          <div className="hero-content">
            <h2 className="hero-title">{getTitleOverride(m) || m.title}</h2>
            <div className="hero-meta">
              <span>{m.year}</span>
              <span className="separator" />
              <span>{getMovieOverride(m)?.durationLabel || formatDurationMinutes(m.duration)}</span>
            </div>
            {m.description && <p className="hero-description">{m.description}</p>}
            <div className="hero-actions">
              <Link to={`/movie/${m.id}?showtimes=1`} className="btn btn-primary">
                {t('hero.buyTicket')}
              </Link>
              <Link to={`/movie/${m.id}`} className="btn btn-secondary">
                {t('hero.details')}
              </Link>
            </div>
          </div>
        </div>
      ))}
      <div className="hero-carousel-controls">
        <div className="hero-dots" role="tablist" aria-label={t('hero.slidesAria')}>
          {heroMovies.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === heroIndex}
              className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
              onClick={() => setHeroIndex(i)}
              aria-label={t('hero.slideNth', { n: i + 1 })}
            />
          ))}
        </div>
        {heroMovies.length > 1 && (
          <button
            type="button"
            className={`hero-pause-btn ${heroPaused ? 'hero-pause-btn--paused' : ''}`}
            onClick={() => setHeroPaused((p) => !p)}
            aria-pressed={heroPaused}
            aria-label={heroPaused ? t('hero.resumeAria') : t('hero.pauseAria')}
            title={heroPaused ? t('hero.resumeTitle') : t('hero.pauseTitle')}
          >
            {heroPaused ? <Play size={14} strokeWidth={2.25} aria-hidden /> : <Pause size={14} strokeWidth={2.25} aria-hidden />}
          </button>
        )}
      </div>
    </section>
  );
}
