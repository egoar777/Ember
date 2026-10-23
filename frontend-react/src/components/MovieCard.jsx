import { Link } from 'react-router-dom';
import { useI18n } from '../context/useI18n';
import { getTitleOverride } from '../titleOverrides';
import { getGenresOverride } from '../genreOverrides';
import MoviePoster from './MoviePoster';

export default function MovieCard({ movie, audioParam }) {
  const { t } = useI18n();
  const overrideGenres = getGenresOverride(movie);
  const genres = (overrideGenres || movie.genres || []).join(', ');
  const displayTitle = getTitleOverride(movie) || movie.title;
  const to =
    audioParam ? `/movie/${movie.id}?audio=${encodeURIComponent(audioParam)}` : `/movie/${movie.id}`;
  return (
    <Link to={to} className="movie-card">
      <div className="movie-poster-wrap">
        <MoviePoster movie={movie} alt={displayTitle} />
        <div className="movie-poster-overlay" />
        {movie.isExclusive && <div className="movie-poster-exclusive">{t('movieCard.exclusive')}</div>}
      </div>
      <div className="movie-title">{displayTitle}</div>
      <div className="movie-info">
        {movie.year} · {genres}
      </div>
    </Link>
  );
}
