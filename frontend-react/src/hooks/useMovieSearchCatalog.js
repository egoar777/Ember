import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { loadMovieCatalog } from '../utils/movieSearchNavigate';

export function useMovieSearchCatalog() {
  const { onAuthChange } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMovieCatalog(onAuthChange)
      .then((items) => {
        if (!cancelled) {
          setCatalog(items);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onAuthChange]);

  return { catalog, ready };
}
