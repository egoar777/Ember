/** Сжатие пробелов и обрезка — для ручного и голосового ввода. */
export function normalizeSearchQuery(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Убирает типичные служебные слова в начале фразы (голос: «найди фильм аватар» → «аватар»).
 */
export function normalizeVoiceSearchQuery(raw) {
  let s = normalizeSearchQuery(raw);
  if (!s) return '';
  s = s.replace(/^(найди|найти|покажи|показать|открой|открыть|поиск|ищи|ищем|где)\s+/gi, '');
  s = s.replace(/^(фильм|кино|картину|мультфильм)\s+/gi, '');
  s = s.replace(/\s+(фильм|кино)\s*$/gi, '');
  return normalizeSearchQuery(s);
}
