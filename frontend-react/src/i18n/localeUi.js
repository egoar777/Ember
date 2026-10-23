/** Локаль для Intl (даты/время) по коду UI из I18nContext */
export function dateLocaleForUi(locale) {
  if (locale === 'en') return 'en-GB';
  if (locale === 'be-tarask') return 'be';
  return 'ru-RU';
}
