import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import { dictForLocale } from '../i18n/translations';
import MovieCard from '../components/MovieCard';
import LoadingState from '../components/LoadingState';
import { dedupeMovies } from '../utils/dedupeMovies';

export default function Exclusive() {
  const { onAuthChange } = useAuth();
  const { locale } = useI18n();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const ex = useMemo(() => dictForLocale(locale).exclusive || {}, [locale]);
  const specialEvents = ex.events || [];

  useEffect(() => {
    apiGet('/movies?platforms=IMAX&pageSize=20', onAuthChange)
      .then((r) => setMovies(dedupeMovies(r?.items || [])))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [onAuthChange]);

  return (
    <div className="container exclusive-page">
      <section className="exclusive-hero">
        <div className="exclusive-hero-glow exclusive-hero-glow-left" aria-hidden="true" />
        <div className="exclusive-hero-glow exclusive-hero-glow-right" aria-hidden="true" />
        <div className="exclusive-hero-wordmark" aria-hidden="true">
          ember<span>.</span>
        </div>
        <div className="exclusive-hero-grid">
          <div className="exclusive-hero-copy">
            <span className="exclusive-hero-badge">{ex.heroBadge}</span>
            <h1 className="exclusive-hero-title">{ex.heroTitle}</h1>
            <p className="exclusive-hero-description">{ex.heroLead}</p>
            <div className="exclusive-hero-actions">
              <a href="#exclusive-premieres" className="btn btn-primary btn-lg">
                {ex.btnPremieres}
              </a>
              <a href="#exclusive-events" className="btn btn-secondary btn-lg">
                {ex.btnEvents}
              </a>
            </div>
          </div>
          <div className="exclusive-hero-panel">
            <div className="exclusive-hero-panel-label">{ex.formatsLabel}</div>
            <div className="exclusive-hero-stats">
              <div className="exclusive-hero-stat">
                <strong>{ex.stat1h}</strong>
                <span>{ex.stat1t}</span>
              </div>
              <div className="exclusive-hero-stat">
                <strong>{ex.stat2h}</strong>
                <span>{ex.stat2t}</span>
              </div>
              <div className="exclusive-hero-stat">
                <strong>{ex.stat3h}</strong>
                <span>{ex.stat3t}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="exclusive-premieres" className="exclusive-section-shell">
        <div className="exclusive-section-head">
          <div>
            <span className="exclusive-section-kicker">{ex.secPremKicker}</span>
            <h2 className="section-title exclusive-section-title">{ex.secPremTitle}</h2>
          </div>
          <Link to="/catalog" className="btn btn-secondary btn-sm">
            {ex.fullAfisha}
          </Link>
        </div>
        {loading ? (
          <LoadingState />
        ) : (
          <div className="movies-grid exclusive-movies-grid">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </section>

      <section id="exclusive-events" className="exclusive-section-shell">
        <div className="exclusive-section-head">
          <div>
            <span className="exclusive-section-kicker">{ex.secEvKicker}</span>
            <h2 className="section-title exclusive-section-title">{ex.secEvTitle}</h2>
          </div>
          <Link to="/news" className="btn btn-secondary btn-sm">
            {ex.newsLink}
          </Link>
        </div>
        <div className="exclusive-events-grid">
          {specialEvents.map((event) => (
            <article key={event.key || event.title} className="exclusive-event-card">
              <span className="exclusive-event-label">{event.label}</span>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="exclusive-event-footer">
                <span>{event.meta}</span>
                <Link to="/catalog" className="btn btn-secondary btn-sm exclusive-event-button">
                  {ex.toAfisha}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="exclusive-cta-strip">
        <div className="exclusive-cta-copy">
          <span className="exclusive-section-kicker">{ex.ctaKicker}</span>
          <h2>{ex.ctaTitle}</h2>
          <p>{ex.ctaText}</p>
        </div>
        <Link to="/catalog" className="btn btn-primary btn-lg exclusive-cta-button">
          {ex.ctaBtn}
        </Link>
      </section>
    </div>
  );
}
