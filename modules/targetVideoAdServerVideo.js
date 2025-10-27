import { registerVideoSupport } from '../src/adServerManager.js';
import { targeting } from '../src/targeting.js';
import { buildUrl, isEmpty, isPlainObject, logError, parseUrl } from '../src/utils.js';

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
  const defaultParameters = {
    autoplay: '[autoplay]',
    mute: '[vpmute]',
    page_url: '[page_url]',
    cachebuster: '[timestamp]',
    gdpr_consent: '[consent]',
  }

  const adUnit = options.adUnit;
  const bid = options.bid || targeting.getWinningBids(adUnit.code)[0];
  const allTargetingData = getAllTargetingData(options);
  const custParams = options.params.cust_params;
  let iu = options.params.iu;

  if (isURL.test(iu)) {
    const urlComponents = parseUrl(iu, {noDecodeWholeURL: true});

    for (const [key, value] of Object.entries({...allTargetingData, ...bid.adserverTargeting, ...defaultParameters})) {
      if (!urlComponents.search.hasOwnProperty(key)) {
        urlComponents.search[key] = value;
      }
    }

    if (urlComponents.search.cust_params) {
      for (const [key, value] of Object.entries(custParams)) {
        if (!urlComponents.search.cust_params.includes(key)) {
          urlComponents.search.cust_params += '%26' + key + '%3D' + value;
        }
      }
    }

    if (!isEmpty(custParams) && !urlComponents.search.cust_params) {
      urlComponents.search.cust_params = Object.entries(custParams).map(([key, value]) => key + '%3D' + value).join('%26');
    }

    return buildUrl(urlComponents);
  }

  const search = {
    iu,
    ...defaultParameters,
    ...allTargetingData,
    ...bid.adserverTargeting,
  };

  if (!isEmpty(custParams)) {
    search.cust_params = Object.entries(custParams).map(([key, value]) => key + '%3D' + value).join('%26');
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

registerVideoSupport('targetVideo', {
  buildVideoUrl,
});
