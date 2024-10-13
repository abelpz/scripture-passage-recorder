// Import versification schemas directly
import engSchema from './eng.json';
import lxxSchema from './lxx.json';
import vulSchema from './vul.json';

export interface VersificationSchema {
  maxVerses: {
    [book: string]: number[];
  };
  excludedVerses?: string[];
  mappedVerses?: {
    [range: string]: string;
  };
  mergedVerses?: string[];
}

// Predefined versification schemas
export const predefinedSchemas = [
  { name: 'English Standard (KJV)', file: 'eng.json' },
  { name: 'Septuagint (LXX)', file: 'lxx.json' },
  { name: 'Vulgate', file: 'vul.json' },
];

// Define versifications as a constant object instead of state
export const versifications: { [key: string]: VersificationSchema } = {
  'eng.json': {
    ...engSchema,
    maxVerses: Object.fromEntries(
      Object.entries(engSchema.maxVerses).map(([book, verses]) => [book, verses.map(Number)])
    )
  },
  'lxx.json': {
    ...lxxSchema,
    maxVerses: Object.fromEntries(
      Object.entries(lxxSchema.maxVerses).map(([book, verses]) => [book, verses.map(Number)])
    )
  },
  'vul.json': {
    ...vulSchema,
    maxVerses: Object.fromEntries(
      Object.entries(vulSchema.maxVerses).map(([book, verses]) => [book, verses.map(Number)])
    )
  },
};

