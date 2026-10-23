import { useState } from 'react';
import { getHeroObjectPosition } from '../heroPositionOverrides';
import { getMovieBackdropCandidates } from '../utils/movieImages';

export default function MovieBackdrop({ movie, className = 'hero-bg', eager = false }) {
  const candidates = getMovieBackdropCandidates(movie);
  return <MovieBackdropImage key={candidates.join('|')} candidates={candidates} movie={movie} className={className} eager={eager} />;
}

function MovieBackdropImage({ candidates, movie, className, eager }) {
  const [candidateIndex, setCandidateIndex] = useState(0);

  const src = candidates[candidateIndex];
  const objectPosition = getHeroObjectPosition(movie);

  if (!src || candidateIndex >= candidates.length) {
    return <div className={`${className} hero-bg-plank`} aria-hidden="true" />;
  }

  return (
    <img
      className={className}
      src={src}
      style={objectPosition ? { objectPosition } : undefined}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
      onError={() => {
        setCandidateIndex((i) => {
          const next = i + 1;
          return next < candidates.length ? next : candidates.length;
        });
      }}
    />
  );
}
