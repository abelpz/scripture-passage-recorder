import gatewayLanguages from './gatewaylanguages.json';

export interface Language {
  ln: string;
  lc: string;
}

let cachedLanguages: Language[] = [];

export async function getLanguages(): Promise<Language[]> {
  if (cachedLanguages.length > 0) {
    return cachedLanguages;
  }

  try {
    // Directly use the imported JSON
    cachedLanguages = gatewayLanguages as Language[];
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
