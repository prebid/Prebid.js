/**
 * IDs and asset types for native ad assets.
 */
export const NATIVE_ASSETS_IDS = {
  1: 'title',
  2: 'icon',
  3: 'image',
  4: 'body',
  5: 'sponsoredBy',
  6: 'cta'
};

/**
 * Native assets definition for mapping purposes.
 */
export const NATIVE_ASSETS = {
  title: { id: 1, name: 'title' },
  icon: { id: 2, type: 1, name: 'img' },
  image: { id: 3, type: 3, name: 'img' },
  body: { id: 4, type: 2, name: 'data' },
  sponsoredBy: { id: 5, type: 1, name: 'data' },
  cta: { id: 6, type: 12, name: 'data' }
};
