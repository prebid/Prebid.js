/**
 * This module adds [DFP support]{@link https://www.doubleclickbygoogle.com/} for Video to Prebid.
 */

import { registerVideoSupport } from '../src/adServerManager';
import { targeting } from '../src/targeting';
import { formatQS, format as buildUrl, parse } from '../src/url';
import { deepAccess, isEmpty, logError, parseSizesInput } from '../src/utils';
import { config } from '../src/config';
import { getHook, submodule } from '../src/hook';
import { auctionManager } from '../src/auctionManager';

/**
 * @typedef {Object} DfpVideoParams
 *
 * This object contains the params needed to form a URL which hits the
 * [DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en}.
 *
 * All params (except iu, mentioned below) should be considered optional. This module will choose reasonable
 * defaults for all of the other required params.
 *
 * The cust_params property, if present, must be an object. It will be merged with the rest of the
 * standard Prebid targeting params (hb_adid, hb_bidder, etc).
 *
 * @param {string} iu This param *must* be included, in order for us to create a valid request.
 * @param [string] description_url This field is required if you want Ad Exchange to bid on our ad unit...
 *   but otherwise optional
 */

/**
 * @typedef {Object} DfpVideoOptions
 *
 * @param {Object} adUnit The adUnit which this bid is supposed to help fill.
 * @param [Object] bid The bid which should be considered alongside the rest of the adserver's demand.
 *   If this isn't defined, then we'll use the winning bid for the adUnit.
 *
 * @param {DfpVideoParams} [params] Query params which should be set on the DFP request.
 *   These will override this module's defaults whenever they conflict.
 * @param {string} [url] video adserver url
 */

/** Safe defaults which work on pretty much all video calls. */
const defaultParamConstants = {
  env: 'vp',
  gdfp_req: 1,
  output: 'xml_vast3',
  unviewed_position_start: 1,
};

export const adpodUtils = {};

/**
 * Merge all the bid data and publisher-supplied options into a single URL, and then return it.
 *
 * @see [The DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en#env} for details.
 *
 * @param {DfpVideoOptions} options Options which should be used to construct the URL.
 *
 * @return {string} A URL which calls DFP, letting options.bid
 *   (or the auction's winning bid for this adUnit, if undefined) compete alongside the rest of the
 *   demand in DFP.
 */
export function buildDfpVideoUrl(options) {
  if (!options.params && !options.url) {
    logError(`A params object or a url is required to use $$PREBID_GLOBAL$$.adServers.dfp.buildVideoUrl`);
    return;
  }

  const adUnit = options.adUnit;
  const bid = options.bid || targeting.getWinningBids(adUnit.code)[0];

  let urlComponents = {};

  if (options.url) {
    // when both `url` and `params` are given, parsed url will be overwriten
    // with any matching param components
    urlComponents = parse(options.url, {noDecodeWholeURL: true});

    if (isEmpty(options.params)) {
      return buildUrlFromAdserverUrlComponents(urlComponents, bid, options);
    }
  }

  const derivedParams = {
    correlator: Date.now(),
    sz: parseSizesInput(adUnit.sizes).join('|'),
    url: encodeURIComponent(location.href),
  };
  const encodedCustomParams = getCustParams(bid, options);

  const queryParams = Object.assign({},
    defaultParamConstants,
    urlComponents.search,
    derivedParams,
    options.params,
    { cust_params: encodedCustomParams }
  );

  const descriptionUrl = getDescriptionUrl(bid, options, 'params');
  if (descriptionUrl) { queryParams.description_url = descriptionUrl; }

  return buildUrl({
    protocol: 'https',
    host: 'pubads.g.doubleclick.net',
    pathname: '/gampad/ads',
    search: queryParams
  });
}

export function notifyTranslationModule(fn) {
  fn.call(this, 'dfp');
}

getHook('registerAdserver').before(notifyTranslationModule);

/**
 * @typedef {Object} DfpAdpodOptions
 *
 * @param {string} code Ad Unit code
 * @param {Object} params Query params which should be set on the DFP request.
 * These will override this module's defaults whenever they conflict.
 * @param {function} callback Callback function to execute when master tag is ready
 */

/**
 * Creates master tag url for long-form
 * @param {DfpAdpodOptions} options
 * @returns {string} A URL which calls DFP with custom adpod targeting key values to compete with rest of the demand in DFP
 */
export function buildAdpodVideoUrl({code, params, callback} = {}) {
  if (!params || !callback) {
    logError(`A params object and a callback is required to use pbjs.adServers.dfp.buildAdpodVideoUrl`);
    return;
  }

  const derivedParams = {
    correlator: Date.now(),
    sz: getSizeForAdUnit(code),
    url: encodeURIComponent(location.href),
  };

  function getSizeForAdUnit(code) {
    let adUnit = auctionManager.getAdUnits()
      .filter((adUnit) => adUnit.code === code)
    let sizes = deepAccess(adUnit[0], 'mediaTypes.video.playerSize');
    return parseSizesInput(sizes).join('|');
  }

  adpodUtils.getTargeting({
    'codes': [code],
    'callback': createMasterTag
  });

  function createMasterTag(err, targeting) {
    if (err) {
      callback(err, null);
      return;
    }

    let initialValue = {
      [adpodUtils.TARGETING_KEY_PB_CAT_DUR]: undefined,
      [adpodUtils.TARGETING_KEY_CACHE_ID]: undefined
    }
    let customParams = {};
    if (targeting[code]) {
      customParams = targeting[code].reduce((acc, curValue) => {
        if (Object.keys(curValue)[0] === adpodUtils.TARGETING_KEY_PB_CAT_DUR) {
          acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] = (typeof acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] !== 'undefined') ? acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] + ',' + curValue[adpodUtils.TARGETING_KEY_PB_CAT_DUR] : curValue[adpodUtils.TARGETING_KEY_PB_CAT_DUR];
        } else if (Object.keys(curValue)[0] === adpodUtils.TARGETING_KEY_CACHE_ID) {
          acc[adpodUtils.TARGETING_KEY_CACHE_ID] = curValue[adpodUtils.TARGETING_KEY_CACHE_ID]
        }
        return acc;
      }, initialValue);
    }

    let encodedCustomParams = encodeURIComponent(formatQS(customParams));

    const queryParams = Object.assign({},
      defaultParamConstants,
      derivedParams,
      params,
      { cust_params: encodedCustomParams }
    );

    const masterTag = buildUrl({
      protocol: 'https',
      host: 'pubads.g.doubleclick.net',
      pathname: '/gampad/ads',
      search: queryParams
    });

    callback(null, masterTag);
  }
}

/**
 * Builds a video url from a base dfp video url and a winning bid, appending
 * Prebid-specific key-values.
 * @param {Object} components base video adserver url parsed into components object
 * @param {AdapterBidResponse} bid winning bid object to append parameters from
 * @param {Object} options Options which should be used to construct the URL (used for custom params).
 * @return {string} video url
 */
function buildUrlFromAdserverUrlComponents(components, bid, options) {
  const descriptionUrl = getDescriptionUrl(bid, components, 'search');
  if (descriptionUrl) { components.search.description_url = descriptionUrl; }

  const encodedCustomParams = getCustParams(bid, options);
  components.search.cust_params = (components.search.cust_params) ? components.search.cust_params + '%26' + encodedCustomParams : encodedCustomParams;

  return buildUrl(components);
}

/**
 * Returns the encoded vast url if it exists on a bid object, only if prebid-cache
 * is disabled, and description_url is not already set on a given input
 * @param {AdapterBidResponse} bid object to check for vast url
 * @param {Object} components the object to check that description_url is NOT set on
 * @param {string} prop the property of components that would contain description_url
 * @return {string | undefined} The encoded vast url if it exists, or undefined
 */
function getDescriptionUrl(bid, components, prop) {
  if (config.getConfig('cache.url')) { return; }

  if (!deepAccess(components, `${prop}.description_url`)) {
    const vastUrl = bid && bid.vastUrl;
    if (vastUrl) { return encodeURIComponent(vastUrl); }
  } else {
    logError(`input cannnot contain description_url`);
  }
}

/**
 * Returns the encoded `cust_params` from the bid.adserverTargeting and adds the `hb_uuid`, and `hb_cache_id`. Optionally the options.params.cust_params
 * @param {AdapterBidResponse} bid
 * @param {Object} options this is the options passed in from the `buildDfpVideoUrl` function
 * @return {Object} Encoded key value pairs for cust_params
 */
function getCustParams(bid, options) {
  const adserverTargeting = (bid && bid.adserverTargeting) || {};

  let allTargetingData = {};
  const adUnit = options && options.adUnit;
  if (adUnit) {
    let allTargeting = targeting.getAllTargeting(adUnit.code);
    allTargetingData = (allTargeting) ? allTargeting[adUnit.code] : {};
  }

  const optCustParams = deepAccess(options, 'params.cust_params');
  let customParams = Object.assign({},
    // Why are we adding standard keys here ? Refer https://github.com/prebid/Prebid.js/issues/3664
    { hb_uuid: bid && bid.videoCacheKey },
    // hb_uuid will be deprecated and replaced by hb_cache_id
    { hb_cache_id: bid && bid.videoCacheKey },
    allTargetingData,
    adserverTargeting,
    optCustParams,
  );
  return encodeURIComponent(formatQS(customParams));
}

registerVideoSupport('dfp', {
  buildVideoUrl: buildDfpVideoUrl,
  buildAdpodVideoUrl: buildAdpodVideoUrl,
  getAdpodTargeting: (args) => adpodUtils.getTargeting(args)
});

submodule('adpod', adpodUtils);
