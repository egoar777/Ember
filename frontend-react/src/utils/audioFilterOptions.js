/** Опции фильтра озвучки (value + ключ i18n label через t). */
export function getAudioFilterOptions(t) {
  return [
    { value: '', label: t('catalog.audioAll') },
    { value: 'ru', label: t('catalog.audioRu') },
    { value: 'en', label: t('catalog.audioEn') },
    { value: 'be', label: t('catalog.audioBe') },
    { value: 'original', label: t('catalog.audioOriginal') },
  ];
}
