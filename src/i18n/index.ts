import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';
import { DEFAULT_SETTINGS, type UiLanguage } from '../domain/types';

export const resources = { vi: { translation: vi }, en: { translation: en } } as const;

// Initialised synchronously on import, so the very first render (loading or error screen) is
// already translated, even if stored settings can never be read. index.html starts with lang="vi".
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_SETTINGS.uiLanguage,
  fallbackLng: 'vi',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export function setLanguage(language: UiLanguage) {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

export default i18n;
