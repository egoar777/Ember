/** Преобразует путь картинки новости в URL для <img src>. */
export function resolveNewsImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5255/api';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${path}`;
  }
  return path;
}
