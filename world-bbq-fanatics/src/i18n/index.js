import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import nl from './nl.json'
import en from './en.json'
import de from './de.json'
import fr from './fr.json'
import es from './es.json'
import it from './it.json'

const resources = {
  nl: { translation: nl },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    supportedLngs: ['nl', 'en', 'de', 'fr', 'es', 'it'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'bbq-fanatics-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    lng: 'nl',
  })

export default i18next
