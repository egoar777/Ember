import { Link } from 'react-router-dom';
import { getPosterOverride } from '../posterOverrides';
import { getTitleOverride } from '../titleOverrides';
import { getGenresOverride } from '../genreOverrides';

export default function MovieCard({ movie }) {
  const overrideGenres = getGenresOverride(movie);
  const genres = (overrideGenres || movie.genres || []).join(', ');
  const override = getPosterOverride(movie);
  const posterSrc = override || movie.posterUrl || 'https://picsum.photos/seed/placeholder/400/600';
  const displayTitle = getTitleOverride(movie) || movie.title;
  return (
    <Link to={`/movie/${movie.id}`} className="movie-card">
      <div className="movie-poster-wrap">
        <img
          className="movie-poster"
          src={posterSrc}
          alt={displayTitle}
          loading="lazy"
        />
        <div className="movie-poster-overlay" />
        {movie.isExclusive && (
          <div className="movie-poster-exclusive">Эксклюзив</div>
        )}
      </div>
      <div className="movie-title">{displayTitle}</div>
      <div className="movie-info">{movie.year} · {genres}</div>
    </Link>
  );
}
