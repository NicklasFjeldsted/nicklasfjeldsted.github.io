/** Categories a customer can pick in the quote form. Labels live in i18n under quote.categories.<key>. */
export const QUOTE_CATEGORIES = [
  'bathroom',
  'tiles',
  'masonry',
  'plaster',
  'renovation',
  'repair',
  'other',
] as const;

export type QuoteCategory = typeof QUOTE_CATEGORIES[number];
