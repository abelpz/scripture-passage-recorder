import languages from './languages.json';

export interface Language {
  ln: string;
  lc: string;
}

let cachedLanguages: Language[] = [];

export function getLanguages() {
  if (cachedLanguages.length > 0) {
    return cachedLanguages;
  }

  try {
    // Directly use the imported JSON
    cachedLanguages = languages as Language[];
    return cachedLanguages;
  } catch (error) {
    console.error('Error loading languages:', error);
    // Fallback to a hardcoded minimal set of languages
    return [
      { ln: 'English', lc: 'en' },
      { ln: 'Spanish', lc: 'es' },
      // Add more fallback languages as needed
    ];
  }
}
