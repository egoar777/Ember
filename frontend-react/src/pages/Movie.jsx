import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiDel } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { useI18n } from '../context/useI18n';
import MovieCard from '../components/MovieCard';
import MovieBackdrop from '../components/MovieBackdrop';
import MoviePoster from '../components/MoviePoster';
import ModalCornerClose from '../components/ModalCornerClose';
import LoadingState from '../components/LoadingState';
import { getTitleOverride } from '../titleOverrides';
import { getMovieOverride } from '../movieOverrides';
import { formatDurationMinutes } from '../utils/formatDuration';
import { screeningMatchesAudioFilter } from '../utils/screeningAudioFilter';
import { dateLocaleForUi } from '../i18n/localeUi';
import CurrencySymbol from '../components/CurrencySymbol';
import { getAudioFilterOptions } from '../utils/audioFilterOptions';
import RolloutSelect from '../components/ui/RolloutSelect';
import TrailerModal from '../components/TrailerModal';
import ScreeningChip from '../components/ScreeningChip';
import { dayMinPrice } from '../utils/screeningUi';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import { isAdminUser } from '../utils/isAdmin';

export default function Movie() {
  const { id } = useParams();
  return <MovieDetails key={id} id={id} />;
}

function MovieDetails({ id }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const audioKey = (searchParams.get('audio') || '').trim();
  const { user, isAuthenticated, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const { t, locale: uiLocale } = useI18n();
  const dateLocale = dateLocaleForUi(uiLocale);

  const [movie, setMovie] = useState(null);
  const [screenings, setScreenings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showtimesRequested, setShowtimesOpen] = useState(false);
  const showtimesOpen = showtimesRequested || searchParams.get('showtimes') === '1';

  const filteredScreenings = useMemo(
    () => screenings.filter((s) => screeningMatchesAudioFilter(s.language, audioKey)),
    [screenings, audioKey]
  );

  const discussionFeed = useMemo(() => {
    const items = [
      ...reviews.map((r) => ({ type: 'review', key: `review-${r.id}`, ...r })),
      ...comments.map((c) => ({ type: 'comment', key: `comment-${c.id}`, ...c })),
    ];
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reviews, comments]);

  const closeShowtimes = () => {
    setShowtimesOpen(false);
    if (searchParams.get('showtimes')) {
      const next = new URLSearchParams(searchParams);
      next.delete('showtimes');
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (!showtimesOpen) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [showtimesOpen]);

  useEffect(() => {
    if (!id) return;
    apiGet(`/movies/${id}`, onAuthChange).then(setMovie).catch(() => setMovie(null));
    apiGet(`/movies/${id}/screenings`, onAuthChange).then(setScreenings).catch(() => setScreenings([]));
    apiGet(`/movies/${id}/reviews`, onAuthChange).then(setReviews).catch(() => setReviews([]));
    apiGet(`/movies/${id}/comments`, onAuthChange).then(setComments).catch(() => setComments([]));
    apiGet(`/movies/${id}/similar`, onAuthChange).then(setSimilar).catch(() => setSimilar([]));
  }, [id, onAuthChange]);

  const onAudioFilterChange = (v) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set('audio', v);
    else next.delete('audio');
    setSearchParams(next, { replace: true });
  };

  const audioOptions = useMemo(() => getAudioFilterOptions(t), [t]);

  const handleAddToWatchlist = () => {
    if (!isAuthenticated) {
      showToast(t('movie.loginWatchlist'), 'error');
      return;
    }
    apiGet('/lists', onAuthChange)
      .then((lists) => {
        let wantList = lists?.find((l) => l.type === 'WantToWatch');
        if (!wantList) {
          return apiPost('/lists', { name: t('listDefaultName'), type: 'WantToWatch' }, onAuthChange).then((newList) => {
            return apiPost(`/lists/${newList.id}/items`, { movieId: parseInt(id, 10) }, onAuthChange);
          });
        }
        return apiPost(`/lists/${wantList.id}/items`, { movieId: parseInt(id, 10) }, onAuthChange);
      })
      .then(() => showToast(t('movie.addedWatchlist'), 'success'))
      .catch((e) => showToast(resolveApiErrorFromException(e, t), 'error'));
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !isAuthenticated) return;
    apiPost(`/movies/${id}/reviews`, { text: reviewText }, onAuthChange)
      .then(() => {
        setReviewText('');
        apiGet(`/movies/${id}/reviews`, onAuthChange).then(setReviews);
        showToast(t('movie.reviewAdded'), 'success');
      })
      .catch((e) => showToast(resolveApiErrorFromException(e, t), 'error'));
  };

  if (!movie) {
    return <LoadingState label={t('movie.loading')} fullScreen />;
  }

  const displayTitle = getTitleOverride(movie) || movie.title;
  const movieOverride = getMovieOverride(movie);
  const trailerUrl = movie.trailerUrl || movie.TrailerUrl;
  const isAdmin = isAdminUser(user);

  const reloadDiscussion = () => {
    apiGet(`/movies/${id}/reviews`, onAuthChange).then(setReviews).catch(() => setReviews([]));
    apiGet(`/movies/${id}/comments`, onAuthChange).then(setComments).catch(() => setComments([]));
  };

  const handleModerateDelete = async (item) => {
    if (!window.confirm(t('admin.discussionDeleteConfirm'))) return;
    const path = item.type === 'review' ? `/admin/reviews/${item.id}` : `/admin/comments/${item.id}`;
    try {
      await apiDel(path, onAuthChange);
      showToast(t('admin.discussionDeleted'), 'success');
      reloadDiscussion();
    } catch (e) {
      showToast(resolveApiErrorFromException(e, t), 'error');
    }
  };

  const screeningsByDate = filteredScreenings.reduce((acc, s) => {
    const dateObj = new Date(s.startTime);
    const dateKey = dateObj.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString(dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const item = { ...s, _dateKey: dateKey, _timeStr: timeStr };
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  return (
    <>
      <div className="hero movie-detail-hero">
        <MovieBackdrop movie={movie} />
        <div className="hero-overlay" />
        <div className="movie-detail-hero-content">
          <div className="movie-detail-info">
            <h1 className="hero-title">{displayTitle}</h1>
            <div className="hero-meta">
              <span>{movie.year}</span>
              <span className="separator" />
              <span>{movieOverride?.durationLabel || formatDurationMinutes(movie.duration)}</span>
              <span className="separator" />
              <span>{(movieOverride?.genres || movie.genres || []).join(', ')}</span>
            </div>
            {(movieOverride?.director ?? movie.director) && (movieOverride?.director ?? movie.director) !== '—' && (
              <p className="movie-detail-meta-line">
                <strong>{t('movie.director')}</strong> {movieOverride?.director ?? movie.director}
              </p>
            )}
            {((movieOverride?.cast?.length && movieOverride.cast.join(', ')) || (movie.cast && movie.cast !== '—')) && (
              <p className="movie-detail-meta-line movie-detail-cast">
                <strong>{t('movie.cast')}</strong>{' '}
                {movieOverride?.cast?.length ? movieOverride.cast.join(', ') : movie.cast}
              </p>
            )}
            <p className="movie-detail-description">{movieOverride?.description ?? movie.description}</p>
          </div>
          <div className="movie-detail-hero-footer">
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowtimesOpen(true)}>
                {t('movie.buyTicket')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => trailerUrl && setTrailerOpen(true)}
                disabled={!trailerUrl}
              >
                {trailerUrl ? t('movieCard.watchTrailer') : t('movieCard.trailerSoon')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleAddToWatchlist}>
                {t('movie.wantToWatch')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <section className="movie-discussion-block">
          <h2 className="section-title">{t('movie.tabDiscussion')}</h2>
          {isAuthenticated && (
            <form onSubmit={handleSubmitReview} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label>{t('movie.yourReview')}</label>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} />
              </div>
              <button type="submit" className="btn btn-primary">
                {t('movie.submitReview')}
              </button>
            </form>
          )}
          {discussionFeed.map((item) =>
            item.type === 'comment' ? (
              <div key={item.key} className="glass-card comment-card">
                <div className="comment-header">
                  <div className="comment-avatar">{item.userName?.[0]}</div>
                  <span className="comment-author">{item.userName}</span>
                  <span className="comment-date">{new Date(item.createdAt).toLocaleDateString(dateLocale)}</span>
                  {isAdmin && (
                    <button type="button" className="admin-inline-delete" onClick={() => handleModerateDelete(item)}>
                      {t('admin.delete')}
                    </button>
                  )}
                </div>
                <div className="comment-text">{item.text}</div>
                {item.replies?.length > 0 && (
                  <div className="comment-replies">
                    {item.replies.map((r) => (
                      <div key={r.id} className="comment-card">
                        <div className="comment-header">
                          <div className="comment-avatar">{r.userName?.[0]}</div>
                          <span className="comment-author">{r.userName}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              className="admin-inline-delete"
                              onClick={() => handleModerateDelete({ type: 'comment', id: r.id })}
                            >
                              {t('admin.delete')}
                            </button>
                          )}
                        </div>
                        <div className="comment-text">{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div key={item.key} className="glass-card review-card">
                <div className="review-header">
                  <div className="review-avatar">{item.userName?.[0]}</div>
                  <div>
                    <span className="review-author">{item.userName}</span>
                    <span className="review-date">
                      {' '}
                      · {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                  {isAdmin && (
                    <button type="button" className="admin-inline-delete" onClick={() => handleModerateDelete(item)}>
                      {t('admin.delete')}
                    </button>
                  )}
                </div>
                <div className="review-text">{item.text}</div>
              </div>
            )
          )}
          {discussionFeed.length === 0 && (
            <p style={{ color: 'var(--color-text-secondary)' }}>{t('movie.noReviews')}</p>
          )}
        </section>

      <div className="section">
        <h2 className="section-title">{t('movie.similar')}</h2>
        <div className="movies-row">
          {(similar || [])
            .filter((m) => m && m.id)
            .map((m) => (
              <MovieCard key={m.id} movie={m} audioParam={audioKey || undefined} />
            ))}
        </div>
        {(!similar || similar.length === 0) && (
          <p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>{t('movie.noSimilar')}</p>
        )}
      </div>
      </div>
      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={trailerUrl}
        title={displayTitle}
      />
      {showtimesOpen && (
        <div
          className="modal-backdrop modal-backdrop--glass showtimes-modal-backdrop active"
          role="presentation"
          onClick={closeShowtimes}
        >
          <ModalCornerClose
            onClose={closeShowtimes}
            ariaLabel={t('movie.showtimesModalClose')}
          />
          <div
            className="modal modal--showtimes"
            role="dialog"
            aria-modal="true"
            aria-label={t('movie.showtimesModalTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="showtimes-modal__header">
              <h3 className="showtimes-modal__heading">{t('movie.showtimesModalTitle')}</h3>
              <div className="showtimes-modal__movie">
                <div className="showtimes-modal__poster-wrap">
                  <MoviePoster movie={movie} className="showtimes-modal__poster" alt={displayTitle} />
                </div>
                <div className="showtimes-modal__movie-info">
                  <h4 className="showtimes-modal__movie-title">{displayTitle}</h4>
                  <p className="showtimes-modal__movie-meta">
                    {[
                      movie.year,
                      movie.ageRating,
                      movieOverride?.durationLabel || formatDurationMinutes(movie.duration),
                      (movieOverride?.genres || movie.genres || []).join(', '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </div>
            <div className="showtimes-modal__content">
              <div className="movie-audio-filter-row screenings-panel__filter">
                <label id="movie-audio-select-label" className="catalog-audio-label" htmlFor="movie-audio-select">
                  {t('movie.audioFilterLabel')}
                </label>
                <RolloutSelect
                  id="movie-audio-select"
                  value={audioKey}
                  onChange={onAudioFilterChange}
                  options={audioOptions}
                  variant="chip"
                  aria-labelledby="movie-audio-select-label"
                />
              </div>
              {filteredScreenings.length === 0 ? (
                <p>{audioKey ? t('movie.noScreeningsFiltered') : t('movie.noScreenings')}</p>
              ) : (
                Object.entries(screeningsByDate).map(([date, items]) => {
                  const minPrice = dayMinPrice(items);
                  return (
                    <div key={date} className="screenings-day">
                      <div className="screenings-day-header">
                        <span className="screenings-day-header__date">{date}</span>
                        {items.length > 1 && minPrice != null && (
                          <span className="screenings-day-header__from">
                            {t('movie.screeningFromPrice', { price: minPrice.toFixed(2) })}
                            {' '}
                            <CurrencySymbol />
                          </span>
                        )}
                      </div>
                      <div className="screenings-grid">
                        {items.map((s) => (
                          <ScreeningChip key={s.id} screening={s} dayScreenings={items} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
