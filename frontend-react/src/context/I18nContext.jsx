import { I18nContext } from './useI18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { translate } from '../i18n/translations';

const STORAGE_KEY = 'ember_locale';

const VALID = new Set(['ru', 'en', 'be-tarask']);


function readStoredLocale() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID.has(v)) return v;
  } catch {
    /* ignore */
  }
  return 'ru';
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    const v = VALID.has(next) ? next : 'ru';
    setLocaleState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const htmlLang = locale === 'be-tarask' ? 'be' : locale;
    document.documentElement.lang = htmlLang;
  }, [locale]);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      locales: [
        { code: 'ru', labelKey: 'locale.ru' },
        { code: 'en', labelKey: 'locale.en' },
        { code: 'be-tarask', labelKey: 'locale.beTarask' },
      ],
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
