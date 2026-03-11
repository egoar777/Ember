import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MovieCard from '../components/MovieCard';
import { getPosterOverride } from '../posterOverrides';
import { getHeroOverride } from '../heroOverrides';
import { getTitleOverride } from '../titleOverrides';
import { getHeroObjectPosition } from '../heroPositionOverrides';
import { getMovieOverride } from '../movieOverrides';
import { formatDurationMinutes } from '../utils/formatDuration';

export default function Movie() {
  const { id } = useParams();
  const { user, isAuthenticated, onAuthChange } = useAuth();
  const { show: showToast } = useToast();
  const [movie, setMovie] = useState(null);
  const [screenings, setScreenings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [tab, setTab] = useState('screenings');
  const [reviewText, setReviewText] = useState('');
  const [commentText, setCommentText] = useState('');
  const tabsBarRef = useRef(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!id) return;
    apiGet(`/movies/${id}`, onAuthChange).then(setMovie).catch(() => setMovie(null));
    apiGet(`/movies/${id}/screenings`, onAuthChange).then(setScreenings).catch(() => setScreenings([]));
    apiGet(`/movies/${id}/reviews`, onAuthChange).then(setReviews).catch(() => setReviews([]));
    apiGet(`/movies/${id}/comments`, onAuthChange).then(setComments).catch(() => setComments([]));
    apiGet(`/movies/${id}/similar`, onAuthChange).then(setSimilar).catch(() => setSimilar([]));
  }, [id, onAuthChange]);

  useEffect(() => {
    const update = () => {
      if (!tabsBarRef.current) return;
      const el = tabsBarRef.current.querySelector(`.tab[data-tab="${tab}"]`);
      if (!el) return;
      const parentRect = tabsBarRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setTabIndicatorStyle({ left: rect.left - parentRect.left, width: rect.width });
    };
    update();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(id);
  }, [tab]);

  const handleAddToWatchlist = () => {
    if (!isAuthenticated) {
      showToast('Войдите, чтобы добавить в список', 'error');
      return;
    }
    apiGet('/lists', onAuthChange).then((lists) => {
      let wantList = lists?.find((l) => l.type === 'WantToWatch');
      if (!wantList) {
        return apiPost('/lists', { name: 'Хочу посмотреть', type: 'WantToWatch' }, onAuthChange).then((newList) => {
          return apiPost(`/lists/${newList.id}/items`, { movieId: parseInt(id, 10) }, onAuthChange);
        });
      }
      return apiPost(`/lists/${wantList.id}/items`, { movieId: parseInt(id, 10) }, onAuthChange);
    }).then(() => showToast('Добавлено в «Хочу посмотреть»', 'success')).catch((e) => showToast(e.message, 'error'));
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !isAuthenticated) return;
    apiPost(`/movies/${id}/reviews`, { text: reviewText }, onAuthChange).then(() => {
      setReviewText('');
      apiGet(`/movies/${id}/reviews`, onAuthChange).then(setReviews);
      showToast('Отзыв добавлен', 'success');
    }).catch((e) => showToast(e.message, 'error'));
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;
    apiPost(`/movies/${id}/comments`, { text: commentText }, onAuthChange).then(() => {
      setCommentText('');
      apiGet(`/movies/${id}/comments`, onAuthChange).then(setComments);
      showToast('Комментарий добавлен', 'success');
    }).catch((e) => showToast(e.message, 'error'));
  };

  if (!movie) return <div className="container"><p>Загрузка...</p></div>;

  const displayTitle = getTitleOverride(movie) || movie.title;
  const movieOverride = getMovieOverride(movie);

  const screeningsByDate = screenings.reduce((acc, s) => {
    const dateObj = new Date(s.startTime);
    const dateKey = dateObj.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const item = { ...s, _dateKey: dateKey, _timeStr: timeStr };
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  return (
    <div className="container">
      <div className="hero movie-detail-hero">
        <img
          className="hero-bg"
          src={getHeroOverride(movie) || movie.backgroundUrl || getPosterOverride(movie) || 'https://picsum.photos/seed/bg/1920/1080'}
          style={getHeroObjectPosition(movie) ? { objectPosition: getHeroObjectPosition(movie) } : undefined}
          alt=""
        />
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
                <strong>Режиссёр:</strong> {movieOverride?.director ?? movie.director}
              </p>
            )}
            {((movieOverride?.cast?.length && movieOverride.cast.join(', ')) || (movie.cast && movie.cast !== '—')) && (
              <p className="movie-detail-meta-line movie-detail-cast">
                <strong>В ролях:</strong> {movieOverride?.cast?.length ? movieOverride.cast.join(', ') : movie.cast}
              </p>
            )}
            <p className="movie-detail-description">{movieOverride?.description ?? movie.description}</p>
          </div>
          <div className="movie-detail-hero-footer">
            <div className="hero-actions">
              <Link to={`/booking?movieId=${id}`} className="btn btn-primary">Купить билет</Link>
              <button type="button" className="btn btn-secondary" onClick={handleAddToWatchlist}>Хочу посмотреть</button>
            </div>
          </div>
        </div>
      </div>
      <div className="tabs-bar-wrap" ref={tabsBarRef} style={{ marginTop: 24 }}>
        <div className="tabs">
          {['screenings', 'reviews', 'comments'].map((t) => (
            <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} data-tab={t} onClick={() => setTab(t)}>
              {t === 'screenings' && 'Сеансы'}
              {t === 'reviews' && 'Отзывы'}
              {t === 'comments' && 'Обсуждение'}
            </button>
          ))}
        </div>
        <div className="home-tabs-indicator" style={tabIndicatorStyle} />
      </div>

      {tab === 'screenings' && (
        <div className="glass-card" style={{ padding: 24 }}>
          {screenings.length === 0 ? <p>Нет доступных сеансов</p> : (
            Object.entries(screeningsByDate).map(([date, items]) => (
              <div key={date} className="screenings-day">
                <div className="screenings-day-header">{date}</div>
                <div className="screenings-grid">
                  {items.map((s) => (
                    <div key={s.id} className="screening-card">
                      <div className="screening-main">
                        <span className="screening-time">{s._timeStr}</span>
                        <span className="screening-meta">{s.hallName} · {s.format}</span>
                      </div>
                      <div className="screening-bottom">
                        <span className="screening-price">{s.basePrice} BYN</span>
                        <Link to={`/booking?screeningId=${s.id}`} className="btn btn-primary btn-sm">Выбрать</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <>
          {isAuthenticated && (
            <form onSubmit={handleSubmitReview} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label>Ваш отзыв</label>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} />
              </div>
              <button type="submit" className="btn btn-primary">Отправить</button>
            </form>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="glass-card review-card">
              <div className="review-header">
                <div className="review-avatar">{r.userName?.[0]}</div>
                <div>
                  <span className="review-author">{r.userName}</span>
                  <span className="review-date"> · {new Date(r.createdAt).toLocaleDateString('ru')}</span>
                </div>
              </div>
              <div className="review-text">{r.text}</div>
            </div>
          ))}
        </>
      )}

      {tab === 'comments' && (
        <>
          {isAuthenticated && (
            <form onSubmit={handleSubmitComment} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label>Комментарий</label>
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} />
              </div>
              <button type="submit" className="btn btn-primary">Отправить</button>
            </form>
          )}
          {comments.map((c) => (
            <div key={c.id} className="glass-card comment-card">
              <div className="comment-header">
                <div className="comment-avatar">{c.userName?.[0]}</div>
                <span className="comment-author">{c.userName}</span>
                <span className="comment-date">{new Date(c.createdAt).toLocaleDateString('ru')}</span>
              </div>
              <div className="comment-text">{c.text}</div>
              {c.replies?.length > 0 && (
                <div className="comment-replies">
                  {c.replies.map((r) => (
                    <div key={r.id} className="comment-card">
                      <div className="comment-header">
                        <div className="comment-avatar">{r.userName?.[0]}</div>
                        <span className="comment-author">{r.userName}</span>
                      </div>
                      <div className="comment-text">{r.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div className="section">
        <h2 className="section-title">Похожие фильмы</h2>
        <div className="movies-row">
          {(similar || []).filter((m) => m && m.id).map((m) => <MovieCard key={m.id} movie={m} />)}
        </div>
        {(!similar || similar.length === 0) && (
          <p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>Нет похожих фильмов</p>
        )}
      </div>
    </div>
  );
}
