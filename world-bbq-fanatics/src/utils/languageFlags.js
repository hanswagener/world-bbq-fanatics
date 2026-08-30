const LANGUAGE_FLAGS = {
  nl: '🇳🇱',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
}

export function getLanguageFlag(language) {
  return LANGUAGE_FLAGS[language?.split('-')[0]] ?? '🌐'
}
