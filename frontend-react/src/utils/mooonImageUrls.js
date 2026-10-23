/** mooon: photo — широкий кадр (фон), medium/small — афиша с текстом (постер). */

export function toMooonPosterUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/\/eventsphoto\/photo\//i.test(trimmed)) {
    return trimmed.replace(/\/eventsphoto\/photo\//i, '/eventsphoto/medium/');
  }
  if (/\/eventsphoto\/small\//i.test(trimmed)) {
    return trimmed.replace(/\/eventsphoto\/small\//i, '/eventsphoto/medium/');
  }
  return trimmed;
}

export function toMooonBackdropUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/\/eventsphoto\/(medium|small)\//i.test(trimmed)) return null;
  return trimmed;
}

export function isRemoteImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}
