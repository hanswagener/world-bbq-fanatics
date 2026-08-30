export const languageFlags = {
  'nl': '🇳🇱',
  'en': '🇬🇧',
  'de': '🇩🇪',
  'fr': '🇫🇷',
  'es': '🇪🇸',
  'it': '🇮🇹',
}

export function getLanguageFlag(language) {
  const code = typeof language === 'string'
    ? language.trim().toLowerCase().split('-')[0]
    : ''
  return languageFlags[code] ?? '🌐'
}
