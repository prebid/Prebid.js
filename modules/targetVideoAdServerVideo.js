import { registerVideoSupport } from 'src/adServerManager.js';
import { targeting } from 'src/targeting.js';
import { buildUrl, isPlainObject, logError } from 'src/utils.js';

/**
 * Merge all the bid data and publisher-supplied options into a single URL, and then return it.
 * @param {Object} options - The options object.
 * @param {Object} options.params - params property.
 * @param {string} options.params.iu - Required iu property.
 * @param {Object} options.adUnit - adUnit property.
 * @param {Object} [options.bid] - Optional bid property.
 * @returns {string|undefined} The generated URL (if neither bid nor adUnit property is provided the generated string is undefined).
 */
export function buildVideoUrl(options) {
  if (!options.params || !options.params?.iu) {
    logError('buildVideoUrl: Missing required properties.');
    return;
  }

  if (!isPlainObject(options.adUnit) && !isPlainObject(options.bid)) {
    logError('buildVideoUrl: Requires either \'adUnit\' or \'bid\' options value');
    return;
  }

  const isURL = /^(https?:\/\/)/i;
  const adUnit = options.adUnit;
  const bid = options.bid || targeting.getWinningBids(adUnit.code)[0];

  if (isURL.test(options.params.iu)) {
    const url = new URL(decodeURIComponent(options.params?.iu));

    for (const [key, value] of Object.entries(bid.adserverTargeting)) {
      url.searchParams.append(key, value);
    }

    return url.href;
  }

  let search = {
    iu: options.params.iu,
  };

  for (const [key, value] of Object.entries(bid.adserverTargeting)) {
    if (!search.hasOwnProperty(key) && value && typeof value === 'string') {
      search[key] = value;
    }
  }

  return buildUrl({
    protocol: 'https',
    host: 'go-eu.dipcod.com',
    pathname: '/ads/bid',
    search
  });
}

registerVideoSupport('targetVideo', {
  buildVideoUrl,
});
