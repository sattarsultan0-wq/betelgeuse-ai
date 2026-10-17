import i18n from 'i18next';
import { createTranslator } from './translation.js';
import { initReactI18next, useTranslation } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';
import kk from './locales/kk.json';
import { languages, languageKey, readPreference, savePreference } from './preferences';

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en }, kk: { translation: kk } },
  lng: readPreference(
    languageKey,
    languages.map(({ code }) => code),
    'ru',
  ),
  supportedLngs: languages.map(({ code }) => code),
  fallbackLng: 'ru',
  initImmediate: false,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const translate = createTranslator(i18n, ru);

function applyLanguage(language) {
  document.documentElement.lang = language;
  savePreference(languageKey, language);
  document.title = translate('Betelgeuse — идеи обретают движение');
}
if (typeof document !== 'undefined') {
  applyLanguage(i18n.language);
  i18n.on('languageChanged', applyLanguage);
  window.addEventListener('storage', (event) => {
    if (event.key === languageKey)
      i18n.changeLanguage(
        languages.some(({ code }) => code === event.newValue) ? event.newValue : 'ru',
      );
  });
}
export function useI18n() {
  const { i18n: instance } = useTranslation();
  return {
    t: translate,
    language: instance.language,
    locale: { ru: 'ru-RU', en: 'en-US', kk: 'kk-KZ' }[instance.language],
    setLanguage: (value) => instance.changeLanguage(value),
  };
}
export default i18n;
