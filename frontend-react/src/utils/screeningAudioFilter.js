/** Согласовано с бэкендом MovieService (screeningLanguage). */
export function screeningMatchesAudioFilter(screeningLanguage, key) {
  if (!key || !screeningLanguage) return true;
  const l = String(screeningLanguage).toLowerCase();
  const k = String(key).toLowerCase().trim();
  switch (k) {
    case 'ru':
    case 'russian':
      return l.includes('русск');
    case 'en':
    case 'english':
      return l.includes('англ') || l.includes('english');
    case 'be':
    case 'belarusian':
      return (
        l.includes('беларус') ||
        l.includes('белорус') ||
        l.includes('беларуская')
      );
    case 'original':
      return l.includes('оригинал') || l.includes('субтит');
    default:
      return l.includes(k);
  }
}
