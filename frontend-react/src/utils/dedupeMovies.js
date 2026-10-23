export function dedupeMovies(items) {
  const list = Array.isArray(items) ? items : [];
  const seenIds = new Set();
  const seenTitleYear = new Set();
  const result = [];

  for (const movie of list) {
    if (!movie) continue;

    const hasId = movie.id !== undefined && movie.id !== null;
    const idKey = hasId ? String(movie.id) : null;
    const titleYearKey = `${String(movie.title || '').trim().toLowerCase()}::${String(movie.year || '')}`;

    if (idKey && seenIds.has(idKey)) continue;
    if (seenTitleYear.has(titleYearKey)) continue;

    if (idKey) seenIds.add(idKey);
    seenTitleYear.add(titleYearKey);
    result.push(movie);
  }

  return result;
}
