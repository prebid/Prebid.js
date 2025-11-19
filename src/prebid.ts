/** @module pbjs */

import {getGlobal, type PrebidJS} from './prebidGlobal.js';
import {
  deepAccess,
  deepClone,
  deepEqual,
  deepSetValue,
  flatten,
  generateUUID,
  isArray,
  isArrayOfNums,
  isEmpty,
  isFn,
  isGptPubadsDefined,
  isNumber,
  isPlainObject,
  logError,
  logInfo,
  logMessage,
  logWarn,
  mergeDeep,
  transformAdServerTargetingObj,
  uniques,
  unsupportedBidderMessage
} from './utils.js';
import {listenMessagesFromCreative} from './secureCreatives.js';
import {userSync} from './userSync.js';
import {config} from './config.js';
import {auctionManager} from './auctionManager.js';
import {isBidUsable, type SlotMatchingFn, targeting} from './targeting.js';
import {hook, wrapHook} from './hook.js';
import {loadSession} from './debugging.js';
import {storageCallbacks} from './storageManager.js';
import adapterManager, {
  type AliasBidderOptions,
  type BidRequest,
  getS2SBidderSet
} from './adapterManager.js';
import {BID_STATUS, EVENTS, NATIVE_KEYS} from './constants.js';
import type {EventHandler, EventIDs, Event} from "./events.js";
import * as events from './events.js';
import {type Metrics, newMetrics, useMetrics} from './utils/perfMetrics.js';
import {type Defer, defer, PbPromise} from './utils/promise.js';
import {pbYield} from './utils/yield.js';
import {enrichFPD} from './fpd/enrichment.js';
import {allConsent} from './consentHandler.js';
import {
  insertLocatorFrame,
  markBidAsRendered,
  markWinningBid,
  renderAdDirect,
  renderIfDeferred
} from './adRendering.js';
import {getHighestCpm} from './utils/reducers.js';
import {fillVideoDefaults, ORTB_VIDEO_PARAMS} from './video.js';
import {ORTB_BANNER_PARAMS} from './banner.js';
import {BANNER, VIDEO} from './mediaTypes.js';
import {delayIfPrerendering} from './utils/prerendering.js';
import {type BidAdapter, type BidderSpec, newBidder} from './adapters/bidderFactory.js';
import {normalizeFPD} from './fpd/normalize.js';
import type {Bid} from "./bidfactory.ts";
import type {AdUnit, AdUnitDefinition, BidderParams} from "./adUnits.ts";
import type {AdUnitCode, BidderCode, ByAdUnit, Identifier, ORTBFragments} from "./types/common.d.ts";
import type {ORTBRequest} from "./types/ortb/request.d.ts";
import type {DeepPartial} from "./types/objects.d.ts";
import type {AnyFunction, Wraps} from "./types/functions.d.ts";
import type {BidderScopedSettings, BidderSettings} from "./bidderSettings.ts";
import {ORTB_AUDIO_PARAMS, fillAudioDefaults} from './audio.ts';

import {getGlobalVarName} from "./buildOptions.ts";

const pbjsInstance = getGlobal();
const { triggerUserSyncs } = userSync;

/* private variables */
const { ADD_AD_UNITS, REQUEST_BIDS, SET_TARGETING } = EVENTS;

// initialize existing debugging sessions if present
loadSession();

declare module './prebidGlobal' {
  interface PrebidJS {
    bidderSettings: {
      standard?: BidderSettings<BidderCode>
    } & {
      [B in BidderCode]?: BidderScopedSettings<B>
    } & {
      [B in keyof BidderParams]?: BidderScopedSettings<B>
    };
    /**
     * True once Prebid is loaded.
     */
    libLoaded?: true;
    /**
     * Prebid version.
     */
    version: string;
    /**
     * Set this to true to delay processing of `que` / `cmd` until prerendering is complete
     * (applies only when the page is prerendering).
     */
    delayPrerendering?: boolean
    adUnits: AdUnitDefinition[];
    pageViewIdPerBidder: Map<string | null, string>
  }
}

pbjsInstance.bidderSettings = pbjsInstance.bidderSettings || {};
pbjsInstance.libLoaded = true;
// version auto generated from build
pbjsInstance.version = 'v$prebid.version$';
logInfo('Prebid.js v$prebid.version$ loaded');

// create adUnit array
pbjsInstance.adUnits = pbjsInstance.adUnits || [];
pbjsInstance.pageViewIdPerBidder = pbjsInstance.pageViewIdPerBidder || new Map<string | null, string>();

function validateSizes(sizes, targLength?: number) {
  let cleanSizes = [];
  if (isArray(sizes) && ((targLength) ? sizes.length === targLength : sizes.length > 0)) {
    // check if an array of arrays or array of numbers
    if (sizes.every(sz => isArrayOfNums(sz, 2))) {
      cleanSizes = sizes;
    } else if (isArrayOfNums(sizes, 2)) {
      cleanSizes.push(sizes);
    }
  }
  return cleanSizes;
}

// synchronize fields between mediaTypes[mediaType] and ortb2Imp[mediaType]
export function syncOrtb2(adUnit, mediaType) {
  const ortb2Imp = deepAccess(adUnit, `ortb2Imp.${mediaType}`);
  const mediaTypes = deepAccess(adUnit, `mediaTypes.${mediaType}`);

  if (!ortb2Imp && !mediaTypes) {
    // omitting sync due to not present mediaType
    return;
  }

  const fields = {
    [VIDEO]: FEATURES.VIDEO && ORTB_VIDEO_PARAMS,
    [BANNER]: ORTB_BANNER_PARAMS
  }[mediaType];

  if (!fields) {
    return;
  }

  [...fields].forEach(([key, validator]) => {
    const mediaTypesFieldValue = deepAccess(adUnit, `mediaTypes.${mediaType}.${key}`);
    const ortbFieldValue = deepAccess(adUnit, `ortb2Imp.${mediaType}.${key}`);

    if (mediaTypesFieldValue === undefined && ortbFieldValue === undefined) {
      // omitting the params if it's not defined on either of sides
    } else if (mediaTypesFieldValue === undefined) {
      deepSetValue(adUnit, `mediaTypes.${mediaType}.${key}`, ortbFieldValue);
    } else if (ortbFieldValue === undefined) {
      deepSetValue(adUnit, `ortb2Imp.${mediaType}.${key}`, mediaTypesFieldValue);
    } else if (!deepEqual(mediaTypesFieldValue, ortbFieldValue)) {
      logWarn(`adUnit ${adUnit.code}: specifies conflicting ortb2Imp.${mediaType}.${key} and mediaTypes.${mediaType}.${key}, the latter will be ignored`, adUnit);
      deepSetValue(adUnit, `mediaTypes.${mediaType}.${key}`, ortbFieldValue);
    }
  });
}

function validateBannerMediaType(adUnit: AdUnit) {
  const validatedAdUnit = deepClone(adUnit);
  const banner = validatedAdUnit.mediaTypes.banner;
  const bannerSizes = banner.sizes == null ? null : validateSizes(banner.sizes);
  const format = adUnit.ortb2Imp?.banner?.format ?? banner?.format;
  let formatSizes;
  if (format != null) {
    deepSetValue(validatedAdUnit, 'ortb2Imp.banner.format', format);
    banner.format = format;
    try {
      formatSizes = format
        .filter(({w, h, wratio, hratio}) => {
          if ((w ?? h) != null && (wratio ?? hratio) != null) {
            logWarn(`Ad unit banner.format specifies both w/h and wratio/hratio`, adUnit);
            return false;
          }
          return (w != null && h != null) || (wratio != null && hratio != null);
        })
        .map(({w, h, wratio, hratio}) => [w ?? wratio, h ?? hratio]);
    } catch (e) {
      logError(`Invalid format definition on ad unit ${adUnit.code}`, format);
    }
    if (formatSizes != null && bannerSizes != null && !deepEqual(bannerSizes, formatSizes)) {
      logWarn(`Ad unit ${adUnit.code} has conflicting sizes and format definitions`, adUnit);
    }
  }
  const sizes = formatSizes ?? bannerSizes ?? [];
  const expdir = adUnit.ortb2Imp?.banner?.expdir ?? banner.expdir;
  if (expdir != null) {
    banner.expdir = expdir;
    deepSetValue(validatedAdUnit, 'ortb2Imp.banner.expdir', expdir);
  }
  if (sizes.length > 0) {
    banner.sizes = sizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.banner.sizes
    validatedAdUnit.sizes = sizes;
  } else {
    logError('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.');
    delete validatedAdUnit.mediaTypes.banner
  }
  validateOrtbFields(validatedAdUnit, 'banner');
  syncOrtb2(validatedAdUnit, 'banner')
  return validatedAdUnit;
}

function validateAudioMediaType(adUnit: AdUnit) {
  const validatedAdUnit = deepClone(adUnit);
  validateOrtbFields(validatedAdUnit, 'audio');
  syncOrtb2(validatedAdUnit, 'audio');
  return validatedAdUnit;
}

function validateVideoMediaType(adUnit: AdUnit) {
  const validatedAdUnit = deepClone(adUnit);
  const video = validatedAdUnit.mediaTypes.video;
  if (video.playerSize) {
    const tarPlayerSizeLen = (typeof video.playerSize[0] === 'number') ? 2 : 1;

    const videoSizes = validateSizes(video.playerSize, tarPlayerSizeLen);
    if (videoSizes.length > 0) {
      if (tarPlayerSizeLen === 2) {
        logInfo('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
      }
      video.playerSize = videoSizes;
      // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.video.playerSize
      validatedAdUnit.sizes = videoSizes;
    } else {
      logError('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.');
      delete validatedAdUnit.mediaTypes.video.playerSize;
    }
  }
  validateOrtbFields(validatedAdUnit, 'video');
  syncOrtb2(validatedAdUnit, 'video');
  return validatedAdUnit;
}

export function validateOrtbFields(adUnit, type, onInvalidParam?) {
  const mediaTypes = adUnit?.mediaTypes || {};
  const params = mediaTypes[type];

  const ORTB_PARAMS = {
    banner: ORTB_BANNER_PARAMS,
    audio: ORTB_AUDIO_PARAMS,
    video: ORTB_VIDEO_PARAMS
  }[type]

  if (!isPlainObject(params)) {
    logWarn(`validateOrtb${type}Fields: ${type}Params must be an object.`);
    return;
  }

  if (params != null) {
    Object.entries(params)
      .forEach(([key, value]: any) => {
        if (!ORTB_PARAMS.has(key)) {
          return
        }
        const isValid = ORTB_PARAMS.get(key)(value);
        if (!isValid) {
          if (typeof onInvalidParam === 'function') {
            onInvalidParam(key, value, adUnit);
          } else {
            delete params[key];
            logWarn(`Invalid prop in adUnit "${adUnit.code}": Invalid value for mediaTypes.${type}.${key} ORTB property. The property has been removed.`);
          }
        }
      });
  }
}

function validateNativeMediaType(adUnit: AdUnit) {
  function err(msg) {
    logError(`Error in adUnit "${adUnit.code}": ${msg}. Removing native request from ad unit`, adUnit);
    delete validatedAdUnit.mediaTypes.native;
    return validatedAdUnit;
  }
  function checkDeprecated(onDeprecated) {
    for (const key of ['types']) {
      if (native.hasOwnProperty(key)) {
        const res = onDeprecated(key);
        if (res) return res;
      }
    }
  }
  const validatedAdUnit = deepClone(adUnit);
  const native = validatedAdUnit.mediaTypes.native;
  // if native assets are specified in OpenRTB format, remove legacy assets and print a warn.
  if (native.ortb) {
    if (native.ortb.assets?.some(asset => !isNumber(asset.id) || asset.id < 0 || asset.id % 1 !== 0)) {
      return err('native asset ID must be a nonnegative integer');
    }
    if (checkDeprecated(key => err(`ORTB native requests cannot specify "${key}"`))) {
      return validatedAdUnit;
    }
    const legacyNativeKeys = Object.keys(NATIVE_KEYS).filter(key => NATIVE_KEYS[key].includes('hb_native_'));
    const nativeKeys = Object.keys(native);
    const intersection = nativeKeys.filter(nativeKey => legacyNativeKeys.includes(nativeKey));
    if (intersection.length > 0) {
      logError(`when using native OpenRTB format, you cannot use legacy native properties. Deleting ${intersection} keys from request.`);
      intersection.forEach(legacyKey => delete validatedAdUnit.mediaTypes.native[legacyKey]);
    }
  } else {
    checkDeprecated(key => logWarn(`mediaTypes.native.${key} is deprecated, consider using native ORTB instead`, adUnit));
  }
  if (native.image && native.image.sizes && !Array.isArray(native.image.sizes)) {
    logError('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.image.sizes;
  }
  if (native.image && native.image.aspect_ratios && !Array.isArray(native.image.aspect_ratios)) {
    logError('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.');
    delete validatedAdUnit.mediaTypes.native.image.aspect_ratios;
  }
  if (native.icon && native.icon.sizes && !Array.isArray(native.icon.sizes)) {
    logError('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.icon.sizes;
  }
  return validatedAdUnit;
}

function validateAdUnitPos(adUnit, mediaType) {
  const pos = adUnit?.mediaTypes?.[mediaType]?.pos;

  if (!isNumber(pos) || isNaN(pos) || !isFinite(pos)) {
    const warning = `Value of property 'pos' on ad unit ${adUnit.code} should be of type: Number`;

    logWarn(warning);
    delete adUnit.mediaTypes[mediaType].pos;
  }

  return adUnit
}

function validateAdUnit(adUnitDef: AdUnitDefinition): AdUnit {
  const msg = (msg) => `adUnit.code '${adUnit.code}' ${msg}`;
  const adUnit = adUnitDef as AdUnit;
  const mediaTypes = adUnit.mediaTypes;
  const bids = adUnit.bids;

  if (bids != null && !isArray(bids)) {
    logError(msg(`defines 'adUnit.bids' that is not an array. Removing adUnit from auction`));
    return null;
  }
  if (bids == null && adUnit.ortb2Imp == null) {
    logError(msg(`has no 'adUnit.bids' and no 'adUnit.ortb2Imp'. Removing adUnit from auction`));
    return null;
  }
  if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
    logError(msg(`does not define a 'mediaTypes' object.  This is a required field for the auction, so this adUnit has been removed.`));
    return null;
  }
  if (adUnit.ortb2Imp != null && (bids == null || bids.length === 0)) {
    adUnit.bids = [{bidder: null}]; // the 'null' bidder is treated as an s2s-only placeholder by adapterManager
    logMessage(msg(`defines 'adUnit.ortb2Imp' with no 'adUnit.bids'; it will be seen only by S2S adapters`));
  }

  return adUnit;
}

export const adUnitSetupChecks = {
  validateAdUnit,
  validateBannerMediaType,
  validateSizes
};

if (FEATURES.NATIVE) {
  Object.assign(adUnitSetupChecks, { validateNativeMediaType });
}

if (FEATURES.VIDEO) {
  Object.assign(adUnitSetupChecks, { validateVideoMediaType });
}

if (FEATURES.AUDIO) {
  Object.assign(adUnitSetupChecks, { validateAudioMediaType });
}

export const checkAdUnitSetup = hook('sync', function (adUnits: AdUnitDefinition[]) {
  const validatedAdUnits = [];

  adUnits.forEach(adUnitDef => {
    const adUnit = validateAdUnit(adUnitDef);
    if (adUnit == null) return;

    const mediaTypes = adUnit.mediaTypes;
    let validatedBanner, validatedVideo, validatedNative, validatedAudio;

    if (mediaTypes.banner) {
      validatedBanner = validateBannerMediaType(adUnit);
      if (mediaTypes.banner.hasOwnProperty('pos')) validatedBanner = validateAdUnitPos(validatedBanner, 'banner');
    }

    if (FEATURES.VIDEO && mediaTypes.video) {
      validatedVideo = validatedBanner ? validateVideoMediaType(validatedBanner) : validateVideoMediaType(adUnit);
      if (mediaTypes.video.hasOwnProperty('pos')) validatedVideo = validateAdUnitPos(validatedVideo, 'video');
    }

    if (FEATURES.NATIVE && mediaTypes.native) {
      validatedNative = validatedVideo ? validateNativeMediaType(validatedVideo) : validatedBanner ? validateNativeMediaType(validatedBanner) : validateNativeMediaType(adUnit);
    }

    if (FEATURES.AUDIO && mediaTypes.audio) {
      validatedAudio = validatedNative ? validateAudioMediaType(validatedNative) : validateAudioMediaType(adUnit);
    }

    const validatedAdUnit = Object.assign({}, validatedBanner, validatedVideo, validatedNative, validatedAudio);

    validatedAdUnits.push(validatedAdUnit);
  });

  return validatedAdUnits;
}, 'checkAdUnitSetup');

function fillAdUnitDefaults(adUnits: AdUnitDefinition[]) {
  if (FEATURES.VIDEO) {
    adUnits.forEach(au => fillVideoDefaults(au))
  }
  if (FEATURES.AUDIO) {
    adUnits.forEach(au => fillAudioDefaults(au))
  }
}

function logInvocation<T extends AnyFunction>(name: string, fn: T): Wraps<T> {
  return function (...args) {
    logInfo(`Invoking ${getGlobalVarName()}.${name}`, args);
    return fn.apply(this, args);
  }
}

export function addApiMethod<N extends keyof PrebidJS>(name: N, method: PrebidJS[N], log = true) {
  getGlobal()[name] = log ? logInvocation(name, method) as PrebidJS[N] : method;
}

/// ///////////////////////////////
//                              //
//    Start Public APIs         //
//                              //
/// ///////////////////////////////

declare module './prebidGlobal' {
  interface PrebidJS {
    /**
     * Re-trigger user syncs. Requires the `userSync.enableOverride` config to be set.
     */
    triggerUserSyncs: typeof triggerUserSyncs;
    getAdserverTargetingForAdUnitCodeStr: typeof getAdserverTargetingForAdUnitCodeStr;
    getHighestUnusedBidResponseForAdUnitCode: typeof getHighestUnusedBidResponseForAdUnitCode;
    getAdserverTargetingForAdUnitCode: typeof getAdserverTargetingForAdUnitCode;
    getAdserverTargeting: typeof getAdserverTargeting;
    getConsentMetadata: typeof getConsentMetadata;
    getNoBids: typeof getNoBids;
    getNoBidsForAdUnitCode: typeof getNoBidsForAdUnitCode;
    getBidResponses: typeof getBidResponses;
    getBidResponsesForAdUnitCode: typeof getBidResponsesForAdUnitCode;
    setTargetingForGPTAsync: typeof setTargetingForGPTAsync;
    setTargetingForAst: typeof setTargetingForAst;
    renderAd: typeof renderAd;
    removeAdUnit: typeof removeAdUnit;
    requestBids: RequestBids;
    addAdUnits: typeof addAdUnits;
    onEvent: typeof onEvent;
    offEvent: typeof offEvent;
    getEvents: typeof getEvents;
    registerBidAdapter: typeof registerBidAdapter;
    registerAnalyticsAdapter: typeof adapterManager.registerAnalyticsAdapter;
    enableAnalytics: typeof adapterManager.enableAnalytics;
    aliasBidder: typeof aliasBidder;
    aliasRegistry: typeof adapterManager.aliasRegistry;
    getAllWinningBids: typeof getAllWinningBids;
    getAllPrebidWinningBids: typeof getAllPrebidWinningBids;
    getHighestCpmBids: typeof getHighestCpmBids;
    clearAllAuctions: typeof clearAllAuctions;
    markWinningBidAsUsed: typeof markWinningBidAsUsed;
    getConfig: typeof config.getConfig;
    readConfig: typeof config.readConfig;
    mergeConfig: typeof config.mergeConfig;
    mergeBidderConfig: typeof config.mergeBidderConfig;
    setConfig: typeof config.setConfig;
    setBidderConfig: typeof config.setBidderConfig;
    processQueue: typeof processQueue;
    triggerBilling: typeof triggerBilling;
    refreshPageViewId: typeof refreshPageViewId;
  }
}

// Allow publishers who enable user sync override to trigger their sync
addApiMethod('triggerUserSyncs', triggerUserSyncs);

/**
 * Return a query string with all available targeting parameters for the given ad unit.
 *
 * @param adUnitCode ad unit code to target
 */
function getAdserverTargetingForAdUnitCodeStr(adUnitCode: AdUnitCode): string {
  if (adUnitCode) {
    const res = getAdserverTargetingForAdUnitCode(adUnitCode);
    return transformAdServerTargetingObj(res);
  } else {
    logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
}
addApiMethod('getAdserverTargetingForAdUnitCodeStr', getAdserverTargetingForAdUnitCodeStr);

/**
 * Return the highest cpm, unused bid for the given ad unit.
 * @param adUnitCode
 */
function getHighestUnusedBidResponseForAdUnitCode(adUnitCode: AdUnitCode): Bid {
  if (adUnitCode) {
    const bid = auctionManager.getAllBidsForAdUnitCode(adUnitCode)
      .filter(isBidUsable)

    return bid.length ? bid.reduce(getHighestCpm) : null
  } else {
    logMessage('Need to call getHighestUnusedBidResponseForAdUnitCode with adunitCode');
  }
}
addApiMethod('getHighestUnusedBidResponseForAdUnitCode', getHighestUnusedBidResponseForAdUnitCode);

/**
 * Returns targeting key-value pairs available at this moment for a given ad unit.
 * @param adUnitCode adUnitCode to get the bid responses for
 */
function getAdserverTargetingForAdUnitCode(adUnitCode) {
  return getAdserverTargeting(adUnitCode)[adUnitCode];
}
addApiMethod('getAdserverTargetingForAdUnitCode', getAdserverTargetingForAdUnitCode);

/**
 * returns all ad server targeting, optionally scoped to the given ad unit(s).
 * @return Map of adUnitCodes to targeting key-value pairs
 */
function getAdserverTargeting(adUnitCode?: AdUnitCode | AdUnitCode[]) {
  return targeting.getAllTargeting(adUnitCode);
}
addApiMethod('getAdserverTargeting', getAdserverTargeting);

function getConsentMetadata() {
  return allConsent.getConsentMeta()
}
addApiMethod('getConsentMetadata', getConsentMetadata);

type WrapsInBids<T> = T[] & {
  bids: T[]
}

function wrapInBids(arr) {
  arr = arr.slice();
  arr.bids = arr;
  return arr;
}

function getBids<T>(type): ByAdUnit<WrapsInBids<T>> {
  const responses = auctionManager[type]()
    .filter(bid => auctionManager.getAdUnitCodes().includes(bid.adUnitCode))

  // find the last auction id to get responses for most recent auction only
  const currentAuctionId = auctionManager.getLastAuctionId();

  return responses
    .map(bid => bid.adUnitCode)
    .filter(uniques).map(adUnitCode => responses
      .filter(bid => bid.auctionId === currentAuctionId && bid.adUnitCode === adUnitCode))
    .filter(bids => bids && bids[0] && bids[0].adUnitCode)
    .map(bids => {
      return {
        [bids[0].adUnitCode]: wrapInBids(bids)
      };
    })
    .reduce((a, b) => Object.assign(a, b), {});
}

/**
 * @returns the bids requests involved in an auction but not bid on
 */
function getNoBids() {
  return getBids<BidRequest<BidderCode>>('getNoBids');
}
addApiMethod('getNoBids', getNoBids);

/**
 * @returns the bids requests involved in an auction but not bid on or the specified adUnitCode
 */
function getNoBidsForAdUnitCode(adUnitCode: AdUnitCode): WrapsInBids<BidRequest<BidderCode>> {
  const bids = auctionManager.getNoBids().filter(bid => bid.adUnitCode === adUnitCode);
  return wrapInBids(bids);
}
addApiMethod('getNoBidsForAdUnitCode', getNoBidsForAdUnitCode);

/**
 * @return a map from ad unit code to all bids received for that ad unit code.
 */
function getBidResponses() {
  return getBids<Bid>('getBidsReceived');
}
addApiMethod('getBidResponses', getBidResponses);

/**
 * Returns bids received for the specified ad unit.
 * @param adUnitCode ad unit code
 */
function getBidResponsesForAdUnitCode(adUnitCode: AdUnitCode): WrapsInBids<Bid> {
  const bids = auctionManager.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode);
  return wrapInBids(bids);
}
addApiMethod('getBidResponsesForAdUnitCode', getBidResponsesForAdUnitCode);

/**
 * Set query string targeting on one or more GPT ad units.
 * @param adUnit a single `adUnit.code` or multiple.
 * @param customSlotMatching gets a GoogleTag slot and returns a filter function for adUnitCode, so you can decide to match on either eg. return slot => { return adUnitCode => { return slot.getSlotElementId() === 'myFavoriteDivId'; } };
 */
function setTargetingForGPTAsync(adUnit?: AdUnitCode | AdUnitCode[], customSlotMatching?: SlotMatchingFn) {
  if (!isGptPubadsDefined()) {
    logError('window.googletag is not defined on the page');
    return;
  }
  targeting.setTargetingForGPT(adUnit, customSlotMatching);
}
addApiMethod('setTargetingForGPTAsync', setTargetingForGPTAsync);

/**
 * Set query string targeting on all AST (AppNexus Seller Tag) ad units. Note that this function has to be called after all ad units on page are defined. For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server](http://prebid.org/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).
 * @param adUnitCodes adUnitCode or array of adUnitCodes
 */
function setTargetingForAst(adUnitCodes?: AdUnitCode | AdUnitCode[]) {
  if (!targeting.isApntagDefined()) {
    logError('window.apntag is not defined on the page');
    return;
  }

  targeting.setTargetingForAst(adUnitCodes);
  events.emit(SET_TARGETING, targeting.getAllTargeting());
}

addApiMethod('setTargetingForAst', setTargetingForAst);

type RenderAdOptions = {
  /**
   * Click through URL. Used to replace ${CLICKTHROUGH} macro in ad markup.
   */
  clickThrough?: string;
}
/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  doc document
 * @param  id adId of the bid to render
 * @param options
 */
async function renderAd(doc: Document, id: Bid['adId'], options?: RenderAdOptions) {
  await pbYield();
  renderAdDirect(doc, id, options);
}
addApiMethod('renderAd', renderAd);

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration, if there are no addUnitCode(s) it will remove all
 * @param adUnitCode the adUnitCode(s) to remove
 * @alias module:pbjs.removeAdUnit
 */
function removeAdUnit(adUnitCode?: AdUnitCode) {
  if (!adUnitCode) {
    pbjsInstance.adUnits = [];
    return;
  }

  let adUnitCodes;

  if (isArray(adUnitCode)) {
    adUnitCodes = adUnitCode;
  } else {
    adUnitCodes = [adUnitCode];
  }

  adUnitCodes.forEach((adUnitCode) => {
    for (let i = pbjsInstance.adUnits.length - 1; i >= 0; i--) {
      if (pbjsInstance.adUnits[i].code === adUnitCode) {
        pbjsInstance.adUnits.splice(i, 1);
      }
    }
  });
}
addApiMethod('removeAdUnit', removeAdUnit);

export type RequestBidsOptions = {
  /**
   * Callback to execute when all the bid responses are back or the timeout hits. Parameters may be undefined
   * in situations where the auction is canceled prematurely (e.g. CMP errors)
   */
  bidsBackHandler?: (bids?: RequestBidsResult['bids'], timedOut?: RequestBidsResult['timedOut'], auctionId?: RequestBidsResult['auctionId']) => void;
  /**
   * TTL buffer override for this auction.
   */
  ttlBuffer?: number;
  /**
   * Timeout for requesting the bids specified in milliseconds
   */
  timeout?: number;
  /**
   * AdUnit definitions to request. Use this or adUnitCodes. Default to all adUnits if empty.
   */
  adUnits?: AdUnitDefinition[];
  /**
   * adUnit codes to request. Use this or adUnits. Default to all adUnits if empty.
   */
  adUnitCodes?: AdUnitCode[];
  /**
   * Defines labels that may be matched on ad unit targeting conditions.
   */
  labels?: string[];
  /**
   * Defines an auction ID to be used rather than having Prebid generate one.
   * This can be useful if there are multiple wrappers on a page and a single auction ID
   * is desired to tie them together in analytics.
   */
  auctionId?: string;
  /**
   * Additional first-party data to use for this auction only
   */
  ortb2?: DeepPartial<ORTBRequest>;
}

type RequestBidsResult = {
  /**
   * Bids received, grouped by ad unit.
   */
  bids?: ByAdUnit<WrapsInBids<Bid>>;
  /**
   * True if any bidder timed out.
   */
  timedOut?: boolean;
  /**
   * The auction's ID
   */
  auctionId?: Identifier;
}

export type PrivRequestBidsOptions = RequestBidsOptions & {
  defer: Defer<RequestBidsResult>;
  metrics: Metrics;
  /**
   * Ad units are always defined and fixed here (as opposed to the public API where we may fall back to
   * the global array).
   */
  adUnits: AdUnitDefinition[];
}

export type StartAuctionOptions = Omit<PrivRequestBidsOptions, 'ortb2'> & {
  ortb2Fragments: ORTBFragments
}

declare module './hook' {
  interface NamedHooks {
    requestBids: typeof requestBids;
    startAuction: typeof startAuction;
  }
}

interface RequestBids {
  (options?: RequestBidsOptions): Promise<RequestBidsResult>;
}

declare module './events' {
  interface Events {
    /**
     * Fired when `requestBids` is called.
     */
    [REQUEST_BIDS]: [];
  }
}

export const requestBids = (function() {
  const delegate = hook('async', function (reqBidOptions: PrivRequestBidsOptions): void {
    let { bidsBackHandler, timeout, adUnits, adUnitCodes, labels, auctionId, ttlBuffer, ortb2, metrics, defer } = reqBidOptions ?? {};
    events.emit(REQUEST_BIDS);
    const cbTimeout = timeout || config.getConfig('bidderTimeout');
    if (adUnitCodes != null && !Array.isArray(adUnitCodes)) {
      adUnitCodes = [adUnitCodes];
    }
    if (adUnitCodes && adUnitCodes.length) {
      // if specific adUnitCodes supplied filter adUnits for those codes
      adUnits = adUnits.filter(unit => adUnitCodes.includes(unit.code));
    } else {
      // otherwise derive adUnitCodes from adUnits
      adUnitCodes = adUnits && adUnits.map(unit => unit.code);
    }
    adUnitCodes = adUnitCodes.filter(uniques);
    let ortb2Fragments = {
      global: mergeDeep({}, config.getAnyConfig('ortb2') || {}, ortb2 || {}),
      bidder: Object.fromEntries(Object.entries<any>(config.getBidderConfig()).map(([bidder, cfg]) => [bidder, deepClone(cfg.ortb2)]).filter(([_, ortb2]) => ortb2 != null))
    }
    ortb2Fragments = normalizeFPD(ortb2Fragments);

    enrichFPD(PbPromise.resolve(ortb2Fragments.global)).then(global => {
      ortb2Fragments.global = global;
      return startAuction({bidsBackHandler, timeout: cbTimeout, adUnits, adUnitCodes, labels, auctionId, ttlBuffer, ortb2Fragments, metrics, defer});
    })
  }, 'requestBids');

  return wrapHook(delegate, logInvocation('requestBids', delayIfPrerendering(() => !config.getConfig('allowPrerendering'), function requestBids(options: RequestBidsOptions = {}) {
    // unlike the main body of `delegate`, this runs before any other hook has a chance to;
    // it's also not restricted in its return value in the way `async` hooks are.

    // if the request does not specify adUnits, clone the global adUnit array;
    // otherwise, if the caller goes on to use addAdUnits/removeAdUnits, any asynchronous logic
    // in any hook might see their effects.
    const req = options as PrivRequestBidsOptions;
    const adUnits = req.adUnits || pbjsInstance.adUnits;
    req.adUnits = (Array.isArray(adUnits) ? adUnits.slice() : [adUnits]);

    req.metrics = newMetrics();
    req.metrics.checkpoint('requestBids');
    req.defer = defer({ promiseFactory: (r) => new Promise(r)})
    delegate.call(this, req);
    return req.defer.promise;
  })));
})();

addApiMethod('requestBids', requestBids as unknown as RequestBids, false);

export const startAuction = hook('async', function ({ bidsBackHandler, timeout: cbTimeout, adUnits: adUnitDefs, ttlBuffer, adUnitCodes, labels, auctionId, ortb2Fragments, metrics, defer }: StartAuctionOptions = {} as any) {
  const s2sBidders = getS2SBidderSet(config.getConfig('s2sConfig') || []);
  fillAdUnitDefaults(adUnitDefs);
  const adUnits: AdUnit[] = useMetrics(metrics).measureTime('requestBids.validate', () => checkAdUnitSetup(adUnitDefs));

  function auctionDone(bids?, timedOut?: boolean, auctionId?: string) {
    if (typeof bidsBackHandler === 'function') {
      try {
        bidsBackHandler(bids, timedOut, auctionId);
      } catch (e) {
        logError('Error executing bidsBackHandler', null, e);
      }
    }
    defer.resolve({ bids, timedOut, auctionId })
  }

  const tids = {};
  /*
   * for a given adunit which supports a set of mediaTypes
   * and a given bidder which supports a set of mediaTypes
   * a bidder is eligible to participate on the adunit
   * if it supports at least one of the mediaTypes on the adunit
   */
  adUnits.forEach(adUnit => {
    // get the adunit's mediaTypes, defaulting to banner if mediaTypes isn't present
    const adUnitMediaTypes = Object.keys(adUnit.mediaTypes || { 'banner': 'banner' });

    // get the bidder's mediaTypes
    const allBidders = adUnit.bids.map(bid => bid.bidder).filter(Boolean);
    const bidderRegistry = adapterManager.bidderRegistry;

    const bidders = allBidders.filter(bidder => !s2sBidders.has(bidder));
    adUnit.adUnitId = generateUUID();
    const tid = adUnit.ortb2Imp?.ext?.tid;
    if (tid) {
      if (tids.hasOwnProperty(adUnit.code)) {
        logWarn(`Multiple distinct ortb2Imp.ext.tid were provided for twin ad units '${adUnit.code}'`)
      } else {
        tids[adUnit.code] = tid;
      }
    }
    if (ttlBuffer != null && !adUnit.hasOwnProperty('ttlBuffer')) {
      adUnit.ttlBuffer = ttlBuffer;
    }
    bidders.forEach(bidder => {
      const adapter = bidderRegistry[bidder];
      const spec = adapter && adapter.getSpec && adapter.getSpec();
      // banner is default if not specified in spec
      const bidderMediaTypes = (spec && spec.supportedMediaTypes) || ['banner'];

      // check if the bidder's mediaTypes are not in the adUnit's mediaTypes
      const bidderEligible = adUnitMediaTypes.some(type => bidderMediaTypes.includes(type));
      if (!bidderEligible) {
        // drop the bidder from the ad unit if it's not compatible
        logWarn(unsupportedBidderMessage(adUnit, bidder));
        adUnit.bids = adUnit.bids.filter(bid => bid.bidder !== bidder);
      }
    });
  });
  if (!adUnits || adUnits.length === 0) {
    logMessage('No adUnits configured. No bids requested.');
    auctionDone();
  } else {
    adUnits.forEach(au => {
      const tid = au.ortb2Imp?.ext?.tid || tids[au.code] || generateUUID();
      if (!tids.hasOwnProperty(au.code)) {
        tids[au.code] = tid;
      }
      au.transactionId = tid;
    });
    const auction = auctionManager.createAuction({
      adUnits,
      adUnitCodes,
      callback: auctionDone,
      cbTimeout,
      labels,
      auctionId,
      ortb2Fragments,
      metrics,
    });

    const adUnitsLen = adUnits.length;
    if (adUnitsLen > 15) {
      logInfo(`Current auction ${auction.getAuctionId()} contains ${adUnitsLen} adUnits.`, adUnits);
    }

    adUnitCodes.forEach(code => targeting.setLatestAuctionForAdUnit(code, auction.getAuctionId()));
    auction.callBids();
  }
}, 'startAuction');

export function executeCallbacks(fn, reqBidsConfigObj) {
  runAll(storageCallbacks);
  runAll(enableAnalyticsCallbacks);
  fn.call(this, reqBidsConfigObj);

  function runAll(queue) {
    let queued;
    while ((queued = queue.shift())) {
      queued();
    }
  }
}

// This hook will execute all storage callbacks which were registered before gdpr enforcement hook was added. Some bidders, user id modules use storage functions when module is parsed but gdpr enforcement hook is not added at that stage as setConfig callbacks are yet to be called. Hence for such calls we execute all the stored callbacks just before requestBids. At this hook point we will know for sure that tcfControl module is added or not
requestBids.before(executeCallbacks, 49);

declare module './events' {
  interface Events {
    /**
     * Fired when `.addAdUniuts` is called.
     */
    [ADD_AD_UNITS]: [];
  }
}
/**
 * Add ad unit(s)
 * @param adUnits
 */
function addAdUnits(adUnits: AdUnitDefinition | AdUnitDefinition[]) {
  pbjsInstance.adUnits.push(...(Array.isArray(adUnits) ? adUnits : [adUnits]))
  events.emit(ADD_AD_UNITS);
}

addApiMethod('addAdUnits', addAdUnits);

const eventIdValidators = {
  bidWon(id) {
    const adUnitCodes = auctionManager.getBidsRequested().map(bidSet => bidSet.bids.map(bid => bid.adUnitCode))
      .reduce(flatten)
      .filter(uniques);

    if (!adUnitCodes.includes(id)) {
      logError('The "' + id + '" placement is not defined.');
      return;
    }

    return true;
  }
};

function validateEventId(event, id) {
  return eventIdValidators.hasOwnProperty(event) && eventIdValidators[event](id);
}

/**
 * @param event the name of the event
 * @param handler a callback to set on event
 * @param id an identifier in the context of the event
 *
 * This API call allows you to register a callback to handle a Prebid.js event.
 * An optional `id` parameter provides more finely-grained event callback registration.
 * This makes it possible to register callback events for a specific item in the
 * event context. For example, `bidWon` events will accept an `id` for ad unit code.
 * `bidWon` callbacks registered with an ad unit code id will be called when a bid
 * for that ad unit code wins the auction. Without an `id` this method registers the
 * callback for every `bidWon` event.
 *
 * Currently `bidWon` is the only event that accepts an `id` parameter.
 */
function onEvent<E extends Event>(event: E, handler: EventHandler<E>, id?: EventIDs[E]) {
  if (!isFn(handler)) {
    logError('The event handler provided is not a function and was not set on event "' + event + '".');
    return;
  }

  if (id && !validateEventId(event, id)) {
    logError('The id provided is not valid for event "' + event + '" and no handler was set.');
    return;
  }

  events.on(event, handler, id);
}
addApiMethod('onEvent', onEvent);

/**
 * @param event the name of the event
 * @param handler a callback to remove from the event
 * @param id an identifier in the context of the event (see `$$PREBID_GLOBAL$$.onEvent`)
 */
function offEvent<E extends Event>(event: E, handler: EventHandler<E>, id?: EventIDs[E]) {
  if (id && !validateEventId(event, id)) {
    return;
  }
  events.off(event, handler, id);
}
addApiMethod('offEvent', offEvent);

/**
 * Return a copy of all events emitted
 */
function getEvents() {
  return events.getEvents();
}
addApiMethod('getEvents', getEvents);

function registerBidAdapter(adapter: BidAdapter, bidderCode: BidderCode): void;
function registerBidAdapter<B extends BidderCode>(adapter: void, bidderCode: B, spec: BidderSpec<B>): void;
function registerBidAdapter(bidderAdaptor, bidderCode, spec?) {
  try {
    const bidder = spec ? newBidder(spec) : bidderAdaptor();
    adapterManager.registerBidAdapter(bidder, bidderCode);
  } catch (e) {
    logError('Error registering bidder adapter : ' + e.message);
  }
}
addApiMethod('registerBidAdapter', registerBidAdapter);

function registerAnalyticsAdapter(options) {
  try {
    adapterManager.registerAnalyticsAdapter(options);
  } catch (e) {
    logError('Error registering analytics adapter : ' + e.message);
  }
}
addApiMethod('registerAnalyticsAdapter', registerAnalyticsAdapter);

const enableAnalyticsCallbacks = [];

const enableAnalyticsCb = hook('async', function (config) {
  if (config && !isEmpty(config)) {
    adapterManager.enableAnalytics(config);
  } else {
    logError(`${getGlobalVarName()}.enableAnalytics should be called with option {}`);
  }
}, 'enableAnalyticsCb');

function enableAnalytics(config) {
  enableAnalyticsCallbacks.push(enableAnalyticsCb.bind(this, config));
}
addApiMethod('enableAnalytics', enableAnalytics);

/**
 * Define an alias for a bid adapter.
 */
function aliasBidder(bidderCode: BidderCode, alias: BidderCode, options?: AliasBidderOptions) {
  if (bidderCode && alias) {
    adapterManager.aliasBidAdapter(bidderCode, alias, options);
  } else {
    logError('bidderCode and alias must be passed as arguments', `${getGlobalVarName()}.aliasBidder`);
  }
}
addApiMethod('aliasBidder', aliasBidder);

pbjsInstance.aliasRegistry = adapterManager.aliasRegistry;
config.getConfig('aliasRegistry', config => {
  if (config.aliasRegistry === 'private') delete pbjsInstance.aliasRegistry;
});

/**
 * @return All bids that have been rendered. Useful for [troubleshooting your integration](http://prebid.org/dev-docs/prebid-troubleshooting-guide.html).
 */
function getAllWinningBids(): Bid[] {
  return auctionManager.getAllWinningBids();
}

addApiMethod('getAllWinningBids', getAllWinningBids)

/**
 * @return Bids that have won their respective auctions but have not been rendered yet.
 */
function getAllPrebidWinningBids(): Bid[] {
  logWarn('getAllPrebidWinningBids may be removed or renamed in a future version. This function returns bids that have won in prebid and have had targeting set but have not (yet?) won in the ad server. It excludes bids that have been rendered.');
  return auctionManager.getBidsReceived()
    .filter(bid => bid.status === BID_STATUS.BID_TARGETING_SET);
}

addApiMethod('getAllPrebidWinningBids', getAllPrebidWinningBids);

/**
 * Get highest cpm bids for all adUnits, or highest cpm bid object for the given adUnit
 * @param adUnitCode - ad unit code
 */
function getHighestCpmBids(adUnitCode?: string): Bid[] {
  return targeting.getWinningBids(adUnitCode);
}

addApiMethod('getHighestCpmBids', getHighestCpmBids);

/**
 * Clear all auctions (and their bids) from the bid cache.
 */
function clearAllAuctions() {
  auctionManager.clearAllAuctions();
}
addApiMethod('clearAllAuctions', clearAllAuctions);

type MarkWinningBidAsUsedOptions = ({
  /**
   * The id representing the ad we want to mark
   */
  adId: string;
  adUnitCode?: undefined | null
} | {
  /**
   * The ad unit code
   */
  adUnitCode: AdUnitCode;
  adId?: undefined | null;

}) & {
  /**
   * If true, fires tracking pixels and BID_WON handlers
   */
  events?: boolean;
  /**
   * @deprecated - alias of `events`
   */
  analytics?: boolean
}

/**
 * Mark the winning bid as used, should only be used in conjunction with video
 */
function markWinningBidAsUsed({adId, adUnitCode, analytics = false, events = false}: MarkWinningBidAsUsedOptions) {
  let bids;
  if (adUnitCode && adId == null) {
    bids = targeting.getWinningBids(adUnitCode);
  } else if (adId) {
    bids = auctionManager.getBidsReceived().filter(bid => bid.adId === adId)
  } else {
    logWarn('Improper use of markWinningBidAsUsed. It needs an adUnitCode or an adId to function.');
  }
  if (bids.length > 0) {
    if (analytics || events) {
      markWinningBid(bids[0]);
    } else {
      auctionManager.addWinningBid(bids[0]);
    }
    markBidAsRendered(bids[0])
  }
}

if (FEATURES.VIDEO) {
  addApiMethod('markWinningBidAsUsed', markWinningBidAsUsed);
}

addApiMethod('getConfig', config.getAnyConfig);
addApiMethod('readConfig', config.readAnyConfig);
addApiMethod('mergeConfig', config.mergeConfig);
addApiMethod('mergeBidderConfig', config.mergeBidderConfig);
addApiMethod('setConfig', config.setConfig);
addApiMethod('setBidderConfig', config.setBidderConfig);

pbjsInstance.que.push(() => listenMessagesFromCreative());

let queSetupComplete;

export function resetQueSetup() {
  queSetupComplete = defer<void>();
}

resetQueSetup();

/**
 * This queue lets users load Prebid asynchronously, but run functions the same way regardless of whether it gets loaded
 * before or after their script executes. For example, given the code:
 *
 * <script src="url/to/Prebid.js" async></script>
 * <script>
 *   var pbjs = pbjs || {};
 *   pbjs.cmd = pbjs.cmd || [];
 *   pbjs.cmd.push(functionToExecuteOncePrebidLoads);
 * </script>
 *
 * If the page's script runs before prebid loads, then their function gets added to the queue, and executed
 * by prebid once it's done loading. If it runs after prebid loads, then this monkey-patch causes their
 * function to execute immediately.
 *
 * @param  {function} command A function which takes no arguments. This is guaranteed to run exactly once, and only after
 *                            the Prebid script has been fully loaded.
 * @alias module:pbjs.cmd.push
 * @alias module:pbjs.que.push
 */
function quePush(command) {
  queSetupComplete.promise.then(() => {
    if (typeof command === 'function') {
      try {
        command.call();
      } catch (e) {
        logError('Error processing command :', e.message, e.stack);
      }
    } else {
      logError(`Commands written into ${getGlobalVarName()}.cmd.push must be wrapped in a function`);
    }
  })
}

async function _processQueue(queue) {
  for (const cmd of queue) {
    if (typeof cmd.called === 'undefined') {
      try {
        cmd.call();
        cmd.called = true;
      } catch (e) {
        logError('Error processing command :', 'prebid.js', e);
      }
    }
    await pbYield();
  }
}

/**
 * Process the command queue, effectively booting up Prebid.
 * Bundles generated by the build automatically include a call to this; NPM consumers
 * should call this after loading all modules and before using other APIs.
 */
const processQueue = delayIfPrerendering(() => pbjsInstance.delayPrerendering, async function () {
  pbjsInstance.que.push = pbjsInstance.cmd.push = quePush;
  insertLocatorFrame();
  hook.ready();
  try {
    await _processQueue(pbjsInstance.que);
    await _processQueue(pbjsInstance.cmd);
  } finally {
    queSetupComplete.resolve();
  }
})
addApiMethod('processQueue', processQueue, false);

/**
 * Manually trigger billing for a winning bid, idendified either by ad ID or ad unit code.
 * Used in conjunction with `adUnit.deferBilling`.
 */
function triggerBilling({adId, adUnitCode}: {
  adId?: string;
  adUnitCode?: AdUnitCode
}) {
  auctionManager.getAllWinningBids()
    .filter((bid) => bid.adId === adId || (adId == null && bid.adUnitCode === adUnitCode))
    .forEach((bid) => {
      adapterManager.triggerBilling(bid);
      renderIfDeferred(bid);
    });
}
addApiMethod('triggerBilling', triggerBilling);

/**
 * Refreshes the previously generated page view ID. Can be used to instruct bidders
 * that use page view ID to consider future auctions as part of a new page load.
 */
function refreshPageViewId() {
  for (const key of pbjsInstance.pageViewIdPerBidder.keys()) {
    pbjsInstance.pageViewIdPerBidder.set(key, generateUUID());
  }
}
addApiMethod('refreshPageViewId', refreshPageViewId);

export default pbjsInstance;
