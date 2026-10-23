import { useState } from 'react';
import { getMoviePosterCandidates } from '../utils/movieImages';

export default function MoviePoster({ movie, className = 'movie-poster', alt = '' }) {
  const candidates = getMoviePosterCandidates(movie);
  return <MoviePosterImage key={candidates.join('|')} candidates={candidates} className={className} alt={alt} />;
}

function MoviePosterImage({ candidates, className, alt }) {
  const [candidateIndex, setCandidateIndex] = useState(0);

  const src = candidates[candidateIndex];

  if (!src || candidateIndex >= candidates.length) {
    return <div className={`${className} movie-poster--empty`} aria-hidden="true" />;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        setCandidateIndex((i) => {
          const next = i + 1;
          return next < candidates.length ? next : candidates.length;
        });
      }}
    />
  );
}
