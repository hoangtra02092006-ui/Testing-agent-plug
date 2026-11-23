import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';
import type { UiLanguage } from '../domain/types';

export const resources = { vi: { translation: vi }, en: { translation: en } } as const;

export function initI18n(language: UiLanguage) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'vi',
      interpolation: { escapeValue: false },
    });
  } else {
    void i18n.changeLanguage(language);
  }
  document.documentElement.lang = language;
  return i18n;
}
