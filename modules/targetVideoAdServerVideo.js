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
  const allTargetingData = getAllTargetingData(options);
  const cust_params = options.params.cust_params;
  let iu = options.params.iu;

  if (isURL.test(iu)) {
    iu = appendCustParams(iu, cust_params);
    const url = new URL(iu);

    for (const [key, value] of Object.entries({...allTargetingData, ...bid.adserverTargeting})) {
      url.searchParams.append(key, value);
    }

    return url.toString();
  }

  const search = {
    iu,
  };

  for (const [key, value] of Object.entries({...allTargetingData, ...bid.adserverTargeting})) {
    if (!search.hasOwnProperty(key) && value && typeof value === 'string') {
      search[key] = value;
    }
  }

  return buildUrl({
    protocol: 'https',
    host: 'vid.tvserve.io',
    pathname: '/ads/bid',
    search
  });
}

function getAllTargetingData(options) {
  let allTargetingData = {};
  const adUnit = options && options.adUnit;
  if (adUnit) {
    let allTargeting = targeting.getAllTargeting(adUnit.code);
    allTargetingData = allTargeting ? allTargeting[adUnit.code] : {};
  }

  return allTargetingData;
}

function appendCustParams(iu, cust_params) {
  if (!Object.keys(cust_params).length) {
    return iu;
  }

  if (iu.includes('cust_params')) {
    const [url, search] = iu.split('?');
    const searchParams = new URLSearchParams(search);
    const merged = searchParams.get('cust_params') + "%26" + mergeCustParams();

    searchParams.delete('cust_params');
    searchParams.set('cust_params', merged);

    return url + '?' + searchParams.toString();
  } else {
    iu += "&cust_params=" + mergeCustParams();
  }

  function mergeCustParams() {
    let customParams = [];
    for (const [key, value] of Object.entries(cust_params)) {
      if (!iu.includes(key)) {
        customParams.push(key + "=" + value);
      }
    }

    return customParams.join("&");
  }
}

registerVideoSupport('targetVideo', {
  buildVideoUrl,
});
