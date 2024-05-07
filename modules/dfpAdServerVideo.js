/**
 * This module adds [DFP support]{@link https://www.doubleclickbygoogle.com/} for Video to Prebid.
 */

import {registerVideoSupport} from '../src/adServerManager.js';
import {targeting} from '../src/targeting.js';
import {
  isNumber,
  buildUrl,
  deepAccess,
  formatQS,
  isEmpty,
  logError,
  parseSizesInput,
  parseUrl,
  uniques
} from '../src/utils.js';
import {config} from '../src/config.js';
import {getHook, submodule} from '../src/hook.js';
import {auctionManager} from '../src/auctionManager.js';
import {gdprDataHandler} from '../src/adapterManager.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import {getPPID} from '../src/adserver.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {CLIENT_SECTIONS} from '../src/fpd/oneClient.js';

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
  output: 'vast',
  unviewed_position_start: 1,
};

export const adpodUtils = {};

export const dep = {
  ri: getRefererInfo
}

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
    urlComponents = parseUrl(options.url, {noDecodeWholeURL: true});

    if (isEmpty(options.params)) {
      return buildUrlFromAdserverUrlComponents(urlComponents, bid, options);
    }
  }

  const derivedParams = {
    correlator: Date.now(),
    sz: parseSizesInput(deepAccess(adUnit, 'mediaTypes.video.playerSize')).join('|'),
    url: encodeURIComponent(location.href),
  };

  const urlSearchComponent = urlComponents.search;
  const urlSzParam = urlSearchComponent && urlSearchComponent.sz;
  if (urlSzParam) {
    derivedParams.sz = urlSzParam + '|' + derivedParams.sz;
  }

  let encodedCustomParams = getCustParams(bid, options, urlSearchComponent && urlSearchComponent.cust_params);

  const queryParams = Object.assign({},
    defaultParamConstants,
    urlComponents.search,
    derivedParams,
    options.params,
    { cust_params: encodedCustomParams }
  );

  const descriptionUrl = getDescriptionUrl(bid, options, 'params');
  if (descriptionUrl) { queryParams.description_url = descriptionUrl; }
  const gdprConsent = gdprDataHandler.getConsentData();
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') { queryParams.gdpr = Number(gdprConsent.gdprApplies); }
    if (gdprConsent.consentString) { queryParams.gdpr_consent = gdprConsent.consentString; }
    if (gdprConsent.addtlConsent) { queryParams.addtl_consent = gdprConsent.addtlConsent; }
  }

  if (!queryParams.ppid) {
    const ppid = getPPID();
    if (ppid != null) {
      queryParams.ppid = ppid;
    }
  }

  const video = options.adUnit?.mediaTypes?.video;
  Object.entries({
    plcmt: () => video?.plcmt,
    min_ad_duration: () => isNumber(video?.minduration) ? video.minduration * 1000 : null,
    max_ad_duration: () => isNumber(video?.maxduration) ? video.maxduration * 1000 : null,
    vpos() {
      const startdelay = video?.startdelay;
      if (isNumber(startdelay)) {
        if (startdelay === -2) return 'postroll';
        if (startdelay === -1 || startdelay > 0) return 'midroll';
        return 'preroll';
      }
    },
    vconp: () => Array.isArray(video?.playbackmethod) && video.playbackmethod.every(m => m === 7) ? '2' : undefined,
    vpa() {
      // playbackmethod = 3 is play on click; 1, 2, 4, 5, 6 are autoplay
      if (Array.isArray(video?.playbackmethod)) {
        const click = video.playbackmethod.some(m => m === 3);
        const auto = video.playbackmethod.some(m => [1, 2, 4, 5, 6].includes(m));
        if (click && !auto) return 'click';
        if (auto && !click) return 'auto';
      }
    },
    vpmute() {
      // playbackmethod = 2, 6 are muted; 1, 3, 4, 5 are not
      if (Array.isArray(video?.playbackmethod)) {
        const muted = video.playbackmethod.some(m => [2, 6].includes(m));
        const talkie = video.playbackmethod.some(m => [1, 3, 4, 5].includes(m));
        if (muted && !talkie) return '1';
        if (talkie && !muted) return '0';
      }
    }
  }).forEach(([param, getter]) => {
    if (!queryParams.hasOwnProperty(param)) {
      const val = getter();
      if (val != null) {
        queryParams[param] = val;
      }
    }
  });
  const fpd = auctionManager.index.getBidRequest(options.bid || {})?.ortb2 ??
    auctionManager.index.getAuction(options.bid || {})?.getFPD()?.global;

  function getSegments(sections, segtax) {
    return sections
      .flatMap(section => deepAccess(fpd, section) || [])
      .filter(datum => datum.ext?.segtax === segtax)
      .flatMap(datum => datum.segment?.map(seg => seg.id))
      .filter(ob => ob)
      .filter(uniques)
  }

  const signals = Object.entries({
    IAB_AUDIENCE_1_1: getSegments(['user.data'], 4),
    IAB_CONTENT_2_2: getSegments(CLIENT_SECTIONS.map(section => `${section}.content.data`), 6)
  }).map(([taxonomy, values]) => values.length ? {taxonomy, values} : null)
    .filter(ob => ob);

  if (signals.length) {
    queryParams.ppsj = btoa(JSON.stringify({
      PublisherProvidedTaxonomySignals: signals
    }))
  }

  return buildUrl(Object.assign({
    protocol: 'https',
    host: 'securepubads.g.doubleclick.net',
    pathname: '/gampad/ads'
  }, urlComponents, { search: queryParams }));
}

export function notifyTranslationModule(fn) {
  fn.call(this, 'dfp');
}

if (config.getConfig('brandCategoryTranslation.translationFile')) { getHook('registerAdserver').before(notifyTranslationModule); }

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
  // TODO: the public API for this does not take in enough info to fill all DFP params (adUnit/bid),
  // and is marked "alpha": https://docs.prebid.org/dev-docs/publisher-api-reference/adServers.dfp.buildAdpodVideoUrl.html
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
    };
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

    const gdprConsent = gdprDataHandler.getConsentData();
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') { queryParams.gdpr = Number(gdprConsent.gdprApplies); }
      if (gdprConsent.consentString) { queryParams.gdpr_consent = gdprConsent.consentString; }
      if (gdprConsent.addtlConsent) { queryParams.addtl_consent = gdprConsent.addtlConsent; }
    }

    const masterTag = buildUrl({
      protocol: 'https',
      host: 'securepubads.g.doubleclick.net',
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
  if (descriptionUrl) {
    components.search.description_url = descriptionUrl;
  }

  components.search.cust_params = getCustParams(bid, options, components.search.cust_params);
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
  return deepAccess(components, `${prop}.description_url`) || encodeURIComponent(dep.ri().page);
}

/**
 * Returns the encoded `cust_params` from the bid.adserverTargeting and adds the `hb_uuid`, and `hb_cache_id`. Optionally the options.params.cust_params
 * @param {AdapterBidResponse} bid
 * @param {Object} options this is the options passed in from the `buildDfpVideoUrl` function
 * @return {Object} Encoded key value pairs for cust_params
 */
function getCustParams(bid, options, urlCustParams) {
  const adserverTargeting = (bid && bid.adserverTargeting) || {};

  let allTargetingData = {};
  const adUnit = options && options.adUnit;
  if (adUnit) {
    let allTargeting = targeting.getAllTargeting(adUnit.code);
    allTargetingData = (allTargeting) ? allTargeting[adUnit.code] : {};
  }

  const prebidTargetingSet = Object.assign({},
    // Why are we adding standard keys here ? Refer https://github.com/prebid/Prebid.js/issues/3664
    { hb_uuid: bid && bid.videoCacheKey },
    // hb_cache_id became optional in prebid 5.0 after 4.x enabled the concept of optional keys. Discussion led to reversing the prior expectation of deprecating hb_uuid
    { hb_cache_id: bid && bid.videoCacheKey },
    allTargetingData,
    adserverTargeting,
  );

  // TODO: WTF is this? just firing random events, guessing at the argument, hoping noone notices?
  events.emit(EVENTS.SET_TARGETING, {[adUnit.code]: prebidTargetingSet});

  // merge the prebid + publisher targeting sets
  const publisherTargetingSet = deepAccess(options, 'params.cust_params');
  const targetingSet = Object.assign({}, prebidTargetingSet, publisherTargetingSet);
  let encodedParams = encodeURIComponent(formatQS(targetingSet));
  if (urlCustParams) {
    encodedParams = urlCustParams + '%26' + encodedParams;
  }

  return encodedParams;
}

registerVideoSupport('dfp', {
  buildVideoUrl: buildDfpVideoUrl,
  buildAdpodVideoUrl: buildAdpodVideoUrl,
  getAdpodTargeting: (args) => adpodUtils.getTargeting(args)
});

submodule('adpod', adpodUtils);
