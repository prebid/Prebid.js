import Adapter from '../../src/adapter.js';
import {createBid} from '../../src/bidfactory.js';
import {
  bind,
  cleanObj,
  createTrackPixelHtml,
  deepAccess,
  deepClone,
  deepSetValue,
  flatten,
  generateUUID,
  getBidRequest,
  getDefinedParams,
  getPrebidInternal,
  insertUserSyncIframe,
  isArray,
  isEmpty,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logInfo,
  logMessage,
  logWarn,
  mergeDeep,
  parseSizesInput,
  pick, timestamp,
  triggerPixel,
  uniques
} from '../../src/utils.js';
import CONSTANTS from '../../src/constants.json';
import adapterManager from '../../src/adapterManager.js';
import { config } from '../../src/config.js';
import { VIDEO, NATIVE } from '../../src/mediaTypes.js';
import { isValid } from '../../src/adapters/bidderFactory.js';
import * as events from '../../src/events.js';
import {find, includes} from '../../src/polyfill.js';
import { S2S_VENDORS } from './config.js';
import { ajax } from '../../src/ajax.js';
import {hook} from '../../src/hook.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {hasPurpose1Consent} from '../../src/utils/gpdr.js';

const getConfig = config.getConfig;

const TYPE = CONSTANTS.S2S.SRC;
let _syncCount = 0;
const DEFAULT_S2S_TTL = 60;
const DEFAULT_S2S_CURRENCY = 'USD';
const DEFAULT_S2S_NETREVENUE = true;

let _s2sConfigs;

let eidPermissions;

/**
 * @typedef {Object} AdapterOptions
 * @summary s2sConfig parameter that adds arguments to resulting OpenRTB payload that goes to Prebid Server
 * @property {string} adapter
 * @property {boolean} enabled
 * @property {string} endpoint
 * @property {string} syncEndpoint
 * @property {number} timeout
 * @example
 * // example of multiple bidder configuration
 * pbjs.setConfig({
 *    s2sConfig: {
 *       adapterOptions: {
 *          rubicon: {singleRequest: false}
 *          appnexus: {key: "value"}
 *       }
 *    }
 * });
 */

/**
 * @typedef {Object} S2SDefaultConfig
 * @summary Base config properties for server to server header bidding
 * @property {string} [adapter='prebidServer'] adapter code to use for S2S
 * @property {boolean} [allowUnknownBidderCodes=false] allow bids from bidders that were not explicitly requested
 * @property {boolean} [enabled=false] enables S2S bidding
 * @property {number} [timeout=1000] timeout for S2S bidders - should be lower than `pbjs.requestBids({timeout})`
 * @property {number} [syncTimeout=1000] timeout for cookie sync iframe / image rendering
 * @property {number} [maxBids=1]
 * @property {AdapterOptions} [adapterOptions] adds arguments to resulting OpenRTB payload to Prebid Server
 * @property {Object} [syncUrlModifier]
 */

/**
 * @typedef {S2SDefaultConfig} S2SConfig
 * @summary Configuration for server to server header bidding
 * @property {string[]} bidders bidders to request S2S
 * @property {string} endpoint endpoint to contact
 * @property {string} [defaultVendor] used as key to select the bidder's default config from ßprebidServer/config.js
 * @property {boolean} [cacheMarkup] whether to cache the adm result
 * @property {string} [syncEndpoint] endpoint URL for syncing cookies
 * @property {Object} [extPrebid] properties will be merged into request.ext.prebid
 */

/**
 * @type {S2SDefaultConfig}
 */
const s2sDefaultConfig = {
  bidders: Object.freeze([]),
  timeout: 1000,
  syncTimeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  allowUnknownBidderCodes: false,
  adapterOptions: {},
  syncUrlModifier: {}
};

config.setDefaults({
  's2sConfig': s2sDefaultConfig
});

/**
 * @param {S2SConfig} option
 * @return {boolean}
 */
function updateConfigDefaultVendor(option) {
  if (option.defaultVendor) {
    let vendor = option.defaultVendor;
    let optionKeys = Object.keys(option);
    if (S2S_VENDORS[vendor]) {
      // vendor keys will be set if either: the key was not specified by user
      // or if the user did not set their own distinct value (ie using the system default) to override the vendor
      Object.keys(S2S_VENDORS[vendor]).forEach((vendorKey) => {
        if (s2sDefaultConfig[vendorKey] === option[vendorKey] || !includes(optionKeys, vendorKey)) {
          option[vendorKey] = S2S_VENDORS[vendor][vendorKey];
        }
      });
    } else {
      logError('Incorrect or unavailable prebid server default vendor option: ' + vendor);
      return false;
    }
  }
  // this is how we can know if user / defaultVendor has set it, or if we should default to false
  return option.enabled = typeof option.enabled === 'boolean' ? option.enabled : false;
}

/**
 * @param {S2SConfig} option
 * @return {boolean}
 */
function validateConfigRequiredProps(option) {
  const keys = Object.keys(option);
  if (['accountId', 'endpoint'].filter(key => {
    if (!includes(keys, key)) {
      logError(key + ' missing in server to server config');
      return true;
    }
    return false;
  }).length > 0) {
    return false;
  }
}

// temporary change to modify the s2sConfig for new format used for endpoint URLs;
// could be removed later as part of a major release, if we decide to not support the old format
function formatUrlParams(option) {
  ['endpoint', 'syncEndpoint'].forEach((prop) => {
    if (isStr(option[prop])) {
      let temp = option[prop];
      option[prop] = { p1Consent: temp, noP1Consent: temp };
    }
    if (isPlainObject(option[prop]) && (!option[prop].p1Consent || !option[prop].noP1Consent)) {
      ['p1Consent', 'noP1Consent'].forEach((conUrl) => {
        if (!option[prop][conUrl]) {
          logWarn(`s2sConfig.${prop}.${conUrl} not defined.  PBS request will be skipped in some P1 scenarios.`);
        }
      });
    }
  });
}

/**
 * @param {(S2SConfig[]|S2SConfig)} options
 */
function setS2sConfig(options) {
  if (!options) {
    return;
  }
  const normalizedOptions = Array.isArray(options) ? options : [options];

  const activeBidders = [];
  const optionsValid = normalizedOptions.every((option, i, array) => {
    formatUrlParams(options);
    const updateSuccess = updateConfigDefaultVendor(option);
    if (updateSuccess !== false) {
      const valid = validateConfigRequiredProps(option);
      if (valid !== false) {
        if (Array.isArray(option['bidders'])) {
          array[i]['bidders'] = option['bidders'].filter(bidder => {
            if (activeBidders.indexOf(bidder) === -1) {
              activeBidders.push(bidder);
              return true;
            }
            return false;
          });
        }
        return true;
      }
    }
    logWarn('prebidServer: s2s config is disabled');
    return false;
  });

  if (optionsValid) {
    return _s2sConfigs = normalizedOptions;
  }
}
getConfig('s2sConfig', ({s2sConfig}) => setS2sConfig(s2sConfig));

/**
 * resets the _synced variable back to false, primiarily used for testing purposes
*/
export function resetSyncedStatus() {
  _syncCount = 0;
}

/**
 * @param  {Array} bidderCodes list of bidders to request user syncs for.
 */
function queueSync(bidderCodes, gdprConsent, uspConsent, s2sConfig) {
  if (_s2sConfigs.length === _syncCount) {
    return;
  }
  _syncCount++;

  const payload = {
    uuid: generateUUID(),
    bidders: bidderCodes,
    account: s2sConfig.accountId
  };

  let userSyncLimit = s2sConfig.userSyncLimit;
  if (isNumber(userSyncLimit) && userSyncLimit > 0) {
    payload['limit'] = userSyncLimit;
  }

  if (gdprConsent) {
    payload.gdpr = (gdprConsent.gdprApplies) ? 1 : 0;
    // attempt to populate gdpr_consent if we know gdprApplies or it may apply
    if (gdprConsent.gdprApplies !== false) {
      payload.gdpr_consent = gdprConsent.consentString;
    }
  }

  // US Privacy (CCPA) support
  if (uspConsent) {
    payload.us_privacy = uspConsent;
  }

  if (typeof s2sConfig.coopSync === 'boolean') {
    payload.coopSync = s2sConfig.coopSync;
  }

  const jsonPayload = JSON.stringify(payload);
  ajax(getMatchingConsentUrl(s2sConfig.syncEndpoint, gdprConsent),
    (response) => {
      try {
        response = JSON.parse(response);
        doAllSyncs(response.bidder_status, s2sConfig);
      } catch (e) {
        logError(e);
      }
    },
    jsonPayload,
    {
      contentType: 'text/plain',
      withCredentials: true
    });
}

function doAllSyncs(bidders, s2sConfig) {
  if (bidders.length === 0) {
    return;
  }

  // pull the syncs off the list in the order that prebid server sends them
  const thisSync = bidders.shift();

  // if PBS reports this bidder doesn't have an ID, then call the sync and recurse to the next sync entry
  if (thisSync.no_cookie) {
    doPreBidderSync(thisSync.usersync.type, thisSync.usersync.url, thisSync.bidder, bind.call(doAllSyncs, null, bidders, s2sConfig), s2sConfig);
  } else {
    // bidder already has an ID, so just recurse to the next sync entry
    doAllSyncs(bidders, s2sConfig);
  }
}

/**
 * Modify the cookie sync url from prebid server to add new params.
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 * @param {function} done an exit callback; to signify this pixel has either: finished rendering or something went wrong
 * @param {S2SConfig} s2sConfig
 */
function doPreBidderSync(type, url, bidder, done, s2sConfig) {
  if (s2sConfig.syncUrlModifier && typeof s2sConfig.syncUrlModifier[bidder] === 'function') {
    url = s2sConfig.syncUrlModifier[bidder](type, url, bidder);
  }
  doBidderSync(type, url, bidder, done, s2sConfig.syncTimeout)
}

/**
 * Run a cookie sync for the given type, url, and bidder
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 * @param {function} done an exit callback; to signify this pixel has either: finished rendering or something went wrong
 * @param {number} timeout: maximum time to wait for rendering in milliseconds
 */
function doBidderSync(type, url, bidder, done, timeout) {
  if (!url) {
    logError(`No sync url for bidder "${bidder}": ${url}`);
    done();
  } else if (type === 'image' || type === 'redirect') {
    logMessage(`Invoking image pixel user sync for bidder: "${bidder}"`);
    triggerPixel(url, done, timeout);
  } else if (type === 'iframe') {
    logMessage(`Invoking iframe user sync for bidder: "${bidder}"`);
    insertUserSyncIframe(url, done, timeout);
  } else {
    logError(`User sync type "${type}" not supported for bidder: "${bidder}"`);
    done();
  }
}

/**
 * Do client-side syncs for bidders.
 *
 * @param {Array} bidders a list of bidder names
 */
function doClientSideSyncs(bidders, gdprConsent, uspConsent) {
  bidders.forEach(bidder => {
    let clientAdapter = adapterManager.getBidAdapter(bidder);
    if (clientAdapter && clientAdapter.registerSyncs) {
      config.runWithBidder(
        bidder,
        bind.call(
          clientAdapter.registerSyncs,
          clientAdapter,
          [],
          gdprConsent,
          uspConsent
        )
      );
    }
  });
}

function _appendSiteAppDevice(request, pageUrl, accountId) {
  if (!request) return;

  // ORTB specifies app OR site
  if (typeof config.getConfig('app') === 'object') {
    request.app = config.getConfig('app');
    request.app.publisher = {id: accountId}
  } else {
    request.site = {};
    if (isPlainObject(config.getConfig('site'))) {
      request.site = config.getConfig('site');
    }
    // set publisher.id if not already defined
    if (!deepAccess(request.site, 'publisher.id')) {
      deepSetValue(request.site, 'publisher.id', accountId);
    }
    // set site.page if not already defined
    if (!request.site.page) {
      request.site.page = pageUrl;
    }
  }
  if (typeof config.getConfig('device') === 'object') {
    request.device = config.getConfig('device');
  }
  if (!request.device) {
    request.device = {};
  }
  if (!request.device.w) {
    request.device.w = window.innerWidth;
  }
  if (!request.device.h) {
    request.device.h = window.innerHeight;
  }
}

function addBidderFirstPartyDataToRequest(request, bidderFpd) {
  const fpdConfigs = Object.entries(bidderFpd).reduce((acc, [bidder, bidderOrtb2]) => {
    const ortb2 = mergeDeep({}, bidderOrtb2);
    acc.push({
      bidders: [ bidder ],
      config: { ortb2 }
    });
    return acc;
  }, []);

  if (fpdConfigs.length) {
    deepSetValue(request, 'ext.prebid.bidderconfig', fpdConfigs);
  }
}

// https://iabtechlab.com/wp-content/uploads/2016/07/OpenRTB-Native-Ads-Specification-Final-1.2.pdf#page=40
let nativeDataIdMap = {
  sponsoredBy: 1, // sponsored
  body: 2, // desc
  rating: 3,
  likes: 4,
  downloads: 5,
  price: 6,
  salePrice: 7,
  phone: 8,
  address: 9,
  body2: 10, // desc2
  cta: 12 // ctatext
};
let nativeDataNames = Object.keys(nativeDataIdMap);

let nativeImgIdMap = {
  icon: 1,
  image: 3
};

let nativeEventTrackerEventMap = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4,
};

let nativeEventTrackerMethodMap = {
  img: 1,
  js: 2
};

if (FEATURES.NATIVE) {
  // enable reverse lookup
  [
    nativeDataIdMap,
    nativeImgIdMap,
    nativeEventTrackerEventMap,
    nativeEventTrackerMethodMap
  ].forEach(map => {
    Object.keys(map).forEach(key => {
      map[map[key]] = key;
    });
  });
}
/*
 * Protocol spec for OpenRTB endpoint
 * e.g., https://<prebid-server-url>/v1/openrtb2/auction
 */
let nativeAssetCache = {}; // store processed native params to preserve

/**
 * map wurl to auction id and adId for use in the BID_WON event
 */
let wurlMap = {};

/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 * @param {string} wurl events.winurl passed from prebidServer as wurl
 */
function addWurl(auctionId, adId, wurl) {
  if ([auctionId, adId].every(isStr)) {
    wurlMap[`${auctionId}${adId}`] = wurl;
  }
}

function getPbsResponseData(bidderRequests, response, pbsName, pbjsName) {
  const bidderValues = deepAccess(response, `ext.${pbsName}`);
  if (bidderValues) {
    Object.keys(bidderValues).forEach(bidder => {
      let biddersReq = find(bidderRequests, bidderReq => bidderReq.bidderCode === bidder);
      if (biddersReq) {
        biddersReq[pbjsName] = bidderValues[bidder];
      }
    });
  }
}

/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 */
function removeWurl(auctionId, adId) {
  if ([auctionId, adId].every(isStr)) {
    wurlMap[`${auctionId}${adId}`] = undefined;
  }
}
/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 * @return {(string|undefined)} events.winurl which was passed as wurl
 */
function getWurl(auctionId, adId) {
  if ([auctionId, adId].every(isStr)) {
    return wurlMap[`${auctionId}${adId}`];
  }
}

/**
 * remove all cached wurls
 */
export function resetWurlMap() {
  wurlMap = {};
}

function ORTB2(s2sBidRequest, bidderRequests, adUnits, requestedBidders) {
  this.s2sBidRequest = s2sBidRequest;
  this.bidderRequests = bidderRequests;
  this.adUnits = adUnits;
  this.s2sConfig = s2sBidRequest.s2sConfig;
  this.requestedBidders = requestedBidders;

  this.bidIdMap = {};
  this.adUnitsByImp = {};
  this.impRequested = {};
  this.auctionId = bidderRequests.map(br => br.auctionId).reduce((l, r) => (l == null || l === r) && r);
  this.requestTimestamp = timestamp();
}

Object.assign(ORTB2.prototype, {
  buildRequest() {
    const {s2sBidRequest, bidderRequests: bidRequests, adUnits, s2sConfig, requestedBidders} = this;

    let imps = [];
    let aliases = {};
    const firstBidRequest = bidRequests[0];

    // transform ad unit into array of OpenRTB impression objects
    let impIds = new Set();
    adUnits.forEach(adUnit => {
      // TODO: support labels / conditional bids
      // for now, just warn about them
      adUnit.bids.forEach((bid) => {
        if (bid.mediaTypes != null) {
          logWarn(`Prebid Server adapter does not (yet) support bidder-specific mediaTypes for the same adUnit. Size mapping configuration will be ignored for adUnit: ${adUnit.code}, bidder: ${bid.bidder}`);
        }
      })

      // in case there is a duplicate imp.id, add '-2' suffix to the second imp.id.
      // e.g. if there are 2 adUnits (case of twin adUnit codes) with code 'test',
      // first imp will have id 'test' and second imp will have id 'test-2'
      let impressionId = adUnit.code;
      let i = 1;
      while (impIds.has(impressionId)) {
        i++;
        impressionId = `${adUnit.code}-${i}`;
      }
      impIds.add(impressionId);
      this.adUnitsByImp[impressionId] = adUnit;

      const nativeParams = adUnit.nativeParams;
      let nativeAssets;
      if (FEATURES.NATIVE && nativeParams) {
        let idCounter = -1;
        try {
          nativeAssets = nativeAssetCache[impressionId] = Object.keys(nativeParams).reduce((assets, type) => {
            let params = nativeParams[type];

            function newAsset(obj) {
              idCounter++;
              return Object.assign({
                required: params.required ? 1 : 0,
                id: (isNumber(params.id)) ? idCounter = params.id : idCounter
              }, obj ? cleanObj(obj) : {});
            }

            switch (type) {
              case 'image':
              case 'icon':
                let imgTypeId = nativeImgIdMap[type];
                let asset = cleanObj({
                  type: imgTypeId,
                  w: deepAccess(params, 'sizes.0'),
                  h: deepAccess(params, 'sizes.1'),
                  wmin: deepAccess(params, 'aspect_ratios.0.min_width'),
                  hmin: deepAccess(params, 'aspect_ratios.0.min_height')
                });
                if (!((asset.w && asset.h) || (asset.hmin && asset.wmin))) {
                  throw 'invalid img sizes (must provide sizes or min_height & min_width if using aspect_ratios)';
                }
                if (Array.isArray(params.aspect_ratios)) {
                  // pass aspect_ratios as ext data I guess?
                  const aspectRatios = params.aspect_ratios
                    .filter((ar) => ar.ratio_width && ar.ratio_height)
                    .map(ratio => `${ratio.ratio_width}:${ratio.ratio_height}`);
                  if (aspectRatios.length > 0) {
                    asset.ext = {
                      aspectratios: aspectRatios
                    }
                  }
                }
                assets.push(newAsset({
                  img: asset
                }));
                break;
              case 'title':
                if (!params.len) {
                  throw 'invalid title.len';
                }
                assets.push(newAsset({
                  title: {
                    len: params.len
                  }
                }));
                break;
              default:
                let dataAssetTypeId = nativeDataIdMap[type];
                if (dataAssetTypeId) {
                  assets.push(newAsset({
                    data: {
                      type: dataAssetTypeId,
                      len: params.len
                    }
                  }))
                }
            }
            return assets;
          }, []);
        } catch (e) {
          logError('error creating native request: ' + String(e))
        }
      }
      const videoParams = deepAccess(adUnit, 'mediaTypes.video');
      const bannerParams = deepAccess(adUnit, 'mediaTypes.banner');

      adUnit.bids.forEach(bid => {
        this.setBidRequestId(impressionId, bid.bidder, bid.bid_id);
        // check for and store valid aliases to add to the request
        if (adapterManager.aliasRegistry[bid.bidder]) {
          const bidder = adapterManager.bidderRegistry[bid.bidder];
          // adding alias only if alias source bidder exists and alias isn't configured to be standalone
          // pbs adapter
          if (bidder && !bidder.getSpec().skipPbsAliasing) {
            aliases[bid.bidder] = adapterManager.aliasRegistry[bid.bidder];
          }
        }
      });

      let mediaTypes = {};
      if (bannerParams && bannerParams.sizes) {
        const sizes = parseSizesInput(bannerParams.sizes);

        // get banner sizes in form [{ w: <int>, h: <int> }, ...]
        const format = sizes.map(size => {
          const [ width, height ] = size.split('x');
          const w = parseInt(width, 10);
          const h = parseInt(height, 10);
          return { w, h };
        });

        mediaTypes['banner'] = {format};

        if (bannerParams.pos) mediaTypes['banner'].pos = bannerParams.pos;
      }

      if (!isEmpty(videoParams)) {
        if (videoParams.context === 'outstream' && !videoParams.renderer && !adUnit.renderer) {
          // Don't push oustream w/o renderer to request object.
          logError('Outstream bid without renderer cannot be sent to Prebid Server.');
        } else {
          if (videoParams.context === 'instream' && !videoParams.hasOwnProperty('placement')) {
            videoParams.placement = 1;
          }

          mediaTypes['video'] = Object.keys(videoParams).filter(param => param !== 'context')
            .reduce((result, param) => {
              if (param === 'playerSize') {
                result.w = deepAccess(videoParams, `${param}.0.0`);
                result.h = deepAccess(videoParams, `${param}.0.1`);
              } else {
                result[param] = videoParams[param];
              }
              return result;
            }, {});
        }
      }

      if (FEATURES.NATIVE && nativeAssets) {
        try {
          mediaTypes['native'] = {
            request: JSON.stringify({
              // TODO: determine best way to pass these and if we allow defaults
              context: 1,
              plcmttype: 1,
              eventtrackers: [
                {event: 1, methods: [1]}
              ],
              // TODO: figure out how to support privacy field
              // privacy: int
              assets: nativeAssets
            }),
            ver: '1.2'
          }
        } catch (e) {
          logError('error creating native request: ' + String(e))
        }
      }

      // get bidder params in form { <bidder code>: {...params} }
      // initialize reduce function with the user defined `ext` properties on the ad unit
      const ext = adUnit.bids.reduce((acc, bid) => {
        if (bid.bidder == null) return acc;
        const adapter = adapterManager.bidderRegistry[bid.bidder];
        if (adapter && adapter.getSpec().transformBidParams) {
          bid.params = adapter.getSpec().transformBidParams(bid.params, true, adUnit, bidRequests);
        }
        deepSetValue(acc,
          `prebid.bidder.${bid.bidder}`,
          (s2sConfig.adapterOptions && s2sConfig.adapterOptions[bid.bidder]) ? Object.assign({}, bid.params, s2sConfig.adapterOptions[bid.bidder]) : bid.params
        );
        return acc;
      }, {...deepAccess(adUnit, 'ortb2Imp.ext')});

      const imp = { ...adUnit.ortb2Imp, id: impressionId, ext, secure: s2sConfig.secure };

      const ortb2 = {...deepAccess(adUnit, 'ortb2Imp.ext.data')};
      Object.keys(ortb2).forEach(prop => {
        /**
          * Prebid AdSlot
          * @type {(string|undefined)}
        */
        if (prop === 'pbadslot') {
          if (typeof ortb2[prop] === 'string' && ortb2[prop]) {
            deepSetValue(imp, 'ext.data.pbadslot', ortb2[prop]);
          } else {
            // remove pbadslot property if it doesn't meet the spec
            delete imp.ext.data.pbadslot;
          }
        } else if (prop === 'adserver') {
          /**
           * Copy GAM AdUnit and Name to imp
           */
          ['name', 'adslot'].forEach(name => {
            /** @type {(string|undefined)} */
            const value = deepAccess(ortb2, `adserver.${name}`);
            if (typeof value === 'string' && value) {
              deepSetValue(imp, `ext.data.adserver.${name.toLowerCase()}`, value);
            }
          });
        } else {
          deepSetValue(imp, `ext.data.${prop}`, ortb2[prop]);
        }
      });

      mergeDeep(imp, mediaTypes);

      const floor = (() => {
        // we have to pick a floor for the imp - here we attempt to find the minimum floor
        // across all bids for this adUnit

        const convertCurrency = typeof getGlobal().convertCurrency !== 'function'
          ? (amount) => amount
          : (amount, from, to) => {
            if (from === to) return amount;
            let result = null;
            try {
              result = getGlobal().convertCurrency(amount, from, to);
            } catch (e) {
            }
            return result;
          }
        const s2sCurrency = config.getConfig('currency.adServerCurrency') || DEFAULT_S2S_CURRENCY;

        return adUnit.bids
          .map((bid) => this.getBidRequest(imp.id, bid.bidder))
          .map((bid) => {
            if (!bid || typeof bid.getFloor !== 'function') return;
            try {
              const {currency, floor} = bid.getFloor({
                currency: s2sCurrency
              });
              return {
                currency,
                floor: parseFloat(floor)
              }
            } catch (e) {
              logError('PBS: getFloor threw an error: ', e);
            }
          })
          .reduce((min, floor) => {
            // if any bid does not have a valid floor, do not attempt to send any to PBS
            if (floor == null || floor.currency == null || floor.floor == null || isNaN(floor.floor)) {
              min.min = null;
            }
            if (min.min === null) {
              return min;
            }
            // otherwise, pick the minimum one (or, in some strange confluence of circumstances, the one in the best currency)
            if (min.ref == null) {
              min.ref = min.min = floor;
            } else {
              const value = convertCurrency(floor.floor, floor.currency, min.ref.currency);
              if (value != null && value < min.ref.floor) {
                min.ref.floor = value;
                min.min = floor;
              }
            }
            return min;
          }, {}).min
      })();

      if (floor) {
        imp.bidfloor = floor.floor;
        imp.bidfloorcur = floor.currency
      }

      if (imp.banner || imp.video || imp.native) {
        imps.push(imp);
      }
    });

    if (!imps.length) {
      logError('Request to Prebid Server rejected due to invalid media type(s) in adUnit.');
      return;
    }
    const request = {
      id: firstBidRequest.auctionId,
      source: {tid: s2sBidRequest.tid},
      tmax: s2sConfig.timeout,
      imp: imps,
      // to do: add setconfig option to pass test = 1
      test: 0,
      ext: {
        prebid: {
          // set ext.prebid.auctiontimestamp with the auction timestamp. Data type is long integer.
          auctiontimestamp: firstBidRequest.auctionStart,
          targeting: {
            // includewinners is always true for openrtb
            includewinners: true,
            // includebidderkeys always false for openrtb
            includebidderkeys: false
          }
        }
      }
    };

    // If the price floors module is active, then we need to signal to PBS! If floorData obj is present is best way to check
    if (typeof deepAccess(firstBidRequest, 'bids.0.floorData') === 'object') {
      request.ext.prebid.floors = { enabled: false };
    }

    // This is no longer overwritten unless name and version explicitly overwritten by extPrebid (mergeDeep)
    request.ext.prebid = Object.assign(request.ext.prebid, {channel: {name: 'pbjs', version: $$PREBID_GLOBAL$$.version}})

    // set debug flag if in debug mode
    if (getConfig('debug')) {
      request.ext.prebid = Object.assign(request.ext.prebid, {debug: true})
    }

    // s2sConfig video.ext.prebid is passed through openrtb to PBS
    if (s2sConfig.extPrebid && typeof s2sConfig.extPrebid === 'object') {
      request.ext.prebid = mergeDeep(request.ext.prebid, s2sConfig.extPrebid);
    }

    /**
     * @type {(string[]|string|undefined)} - OpenRTB property 'cur', currencies available for bids
     */
    const adServerCur = config.getConfig('currency.adServerCurrency');
    if (adServerCur && typeof adServerCur === 'string') {
      // if the value is a string, wrap it with an array
      request.cur = [adServerCur];
    } else if (Array.isArray(adServerCur) && adServerCur.length) {
      // if it's an array, get the first element
      request.cur = [adServerCur[0]];
    }

    _appendSiteAppDevice(request, bidRequests[0].refererInfo.page, s2sConfig.accountId);

    // pass schain object if it is present
    const schain = deepAccess(bidRequests, '0.bids.0.schain');
    if (schain) {
      request.source.ext = {
        schain: schain
      };
    }

    if (!isEmpty(aliases)) {
      request.ext.prebid.aliases = {...request.ext.prebid.aliases, ...aliases};
    }

    const bidUserIdAsEids = deepAccess(bidRequests, '0.bids.0.userIdAsEids');
    if (isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
      deepSetValue(request, 'user.ext.eids', bidUserIdAsEids);
    }

    if (isArray(eidPermissions) && eidPermissions.length > 0) {
      if (requestedBidders && isArray(requestedBidders)) {
        eidPermissions.forEach(i => {
          if (i.bidders) {
            i.bidders = i.bidders.filter(bidder => includes(requestedBidders, bidder))
          }
        });
      }
      deepSetValue(request, 'ext.prebid.data.eidpermissions', eidPermissions);
    }

    const multibid = config.getConfig('multibid');
    if (multibid) {
      deepSetValue(request, 'ext.prebid.multibid', multibid.reduce((result, i) => {
        let obj = {};

        Object.keys(i).forEach(key => {
          obj[key.toLowerCase()] = i[key];
        });

        result.push(obj);

        return result;
      }, []));
    }

    if (bidRequests) {
      if (firstBidRequest.gdprConsent) {
        // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
        let gdprApplies;
        if (typeof firstBidRequest.gdprConsent.gdprApplies === 'boolean') {
          gdprApplies = firstBidRequest.gdprConsent.gdprApplies ? 1 : 0;
        }
        deepSetValue(request, 'regs.ext.gdpr', gdprApplies);
        deepSetValue(request, 'user.ext.consent', firstBidRequest.gdprConsent.consentString);
        if (firstBidRequest.gdprConsent.addtlConsent && typeof firstBidRequest.gdprConsent.addtlConsent === 'string') {
          deepSetValue(request, 'user.ext.ConsentedProvidersSettings.consented_providers', firstBidRequest.gdprConsent.addtlConsent);
        }
      }

      // US Privacy (CCPA) support
      if (firstBidRequest.uspConsent) {
        deepSetValue(request, 'regs.ext.us_privacy', firstBidRequest.uspConsent);
      }
    }

    if (getConfig('coppa') === true) {
      deepSetValue(request, 'regs.coppa', 1);
    }

    const commonFpd = s2sBidRequest.ortb2Fragments?.global || {};
    mergeDeep(request, commonFpd);

    addBidderFirstPartyDataToRequest(request, s2sBidRequest.ortb2Fragments?.bidder || {});

    request.imp.forEach((imp) => this.impRequested[imp.id] = imp);
    return request;
  },

  interpretResponse(response) {
    const {bidderRequests, s2sConfig} = this;
    const bids = [];

    [['errors', 'serverErrors'], ['responsetimemillis', 'serverResponseTimeMs']]
      .forEach(info => getPbsResponseData(bidderRequests, response, info[0], info[1]))

    if (response.seatbid) {
      // a seatbid object contains a `bid` array and a `seat` string
      response.seatbid.forEach(seatbid => {
        (seatbid.bid || []).forEach(bid => {
          let bidRequest = this.getBidRequest(bid.impid, seatbid.seat);
          if (bidRequest == null) {
            if (!s2sConfig.allowUnknownBidderCodes) {
              logWarn(`PBS adapter received bid from unknown bidder (${seatbid.seat}), but 's2sConfig.allowUnknownBidderCodes' is not set. Ignoring bid.`);
              return;
            }
            // for stored impression, a request was made with bidder code `null`. Pick it up here so that NO_BID, BID_WON, etc events
            // can work as expected (otherwise, the original request will always result in NO_BID).
            bidRequest = this.getBidRequest(bid.impid, null);
          }

          const cpm = bid.price;
          const status = cpm !== 0 ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID;
          let bidObject = createBid(status, {
            bidder: seatbid.seat,
            src: TYPE,
            bidId: bidRequest ? (bidRequest.bidId || bidRequest.bid_Id) : null,
            transactionId: this.adUnitsByImp[bid.impid].transactionId,
            auctionId: this.auctionId,
          });
          bidObject.requestTimestamp = this.requestTimestamp;
          bidObject.cpm = cpm;

          // temporarily leaving attaching it to each bidResponse so no breaking change
          // BUT: this is a flat map, so it should be only attached to bidderRequest, a the change above does
          let serverResponseTimeMs = deepAccess(response, ['ext', 'responsetimemillis', seatbid.seat].join('.'));
          if (bidRequest && serverResponseTimeMs) {
            bidRequest.serverResponseTimeMs = serverResponseTimeMs;
          }

          // Look for seatbid[].bid[].ext.prebid.bidid and place it in the bidResponse object for use in analytics adapters as 'pbsBidId'
          const bidId = deepAccess(bid, 'ext.prebid.bidid');
          if (isStr(bidId)) {
            bidObject.pbsBidId = bidId;
          }

          // store wurl by auctionId and adId so it can be accessed from the BID_WON event handler
          if (isStr(deepAccess(bid, 'ext.prebid.events.win'))) {
            addWurl(this.auctionId, bidObject.adId, deepAccess(bid, 'ext.prebid.events.win'));
          }

          let extPrebidTargeting = deepAccess(bid, 'ext.prebid.targeting');

          // If ext.prebid.targeting exists, add it as a property value named 'adserverTargeting'
          // The removal of hb_winurl and hb_bidid targeting values is temporary
          // once we get through the transition, this block will be removed.
          if (isPlainObject(extPrebidTargeting)) {
            // If wurl exists, remove hb_winurl and hb_bidid targeting attributes
            if (isStr(deepAccess(bid, 'ext.prebid.events.win'))) {
              extPrebidTargeting = getDefinedParams(extPrebidTargeting, Object.keys(extPrebidTargeting)
                .filter(i => (i.indexOf('hb_winurl') === -1 && i.indexOf('hb_bidid') === -1)));
            }
            bidObject.adserverTargeting = extPrebidTargeting;
          }

          bidObject.seatBidId = bid.id;

          if (deepAccess(bid, 'ext.prebid.type') === VIDEO) {
            bidObject.mediaType = VIDEO;
            const impReq = this.impRequested[bid.impid];
            [bidObject.playerWidth, bidObject.playerHeight] = [impReq.video.w, impReq.video.h];

            // try to get cache values from 'response.ext.prebid.cache.js'
            // else try 'bid.ext.prebid.targeting' as fallback
            if (bid.ext.prebid.cache && typeof bid.ext.prebid.cache.vastXml === 'object' && bid.ext.prebid.cache.vastXml.cacheId && bid.ext.prebid.cache.vastXml.url) {
              bidObject.videoCacheKey = bid.ext.prebid.cache.vastXml.cacheId;
              bidObject.vastUrl = bid.ext.prebid.cache.vastXml.url;
            } else if (extPrebidTargeting && extPrebidTargeting.hb_uuid && extPrebidTargeting.hb_cache_host && extPrebidTargeting.hb_cache_path) {
              bidObject.videoCacheKey = extPrebidTargeting.hb_uuid;
              // build url using key and cache host
              bidObject.vastUrl = `https://${extPrebidTargeting.hb_cache_host}${extPrebidTargeting.hb_cache_path}?uuid=${extPrebidTargeting.hb_uuid}`;
            }

            if (bid.adm) { bidObject.vastXml = bid.adm; }
            if (!bidObject.vastUrl && bid.nurl) { bidObject.vastUrl = bid.nurl; }
          } else if (FEATURES.NATIVE && deepAccess(bid, 'ext.prebid.type') === NATIVE) {
            bidObject.mediaType = NATIVE;
            let adm;
            if (typeof bid.adm === 'string') {
              adm = bidObject.adm = JSON.parse(bid.adm);
            } else {
              adm = bidObject.adm = bid.adm;
            }

            let trackers = {
              [nativeEventTrackerMethodMap.img]: adm.imptrackers || [],
              [nativeEventTrackerMethodMap.js]: adm.jstracker ? [adm.jstracker] : []
            };
            if (adm.eventtrackers) {
              adm.eventtrackers.forEach(tracker => {
                switch (tracker.method) {
                  case nativeEventTrackerMethodMap.img:
                    trackers[nativeEventTrackerMethodMap.img].push(tracker.url);
                    break;
                  case nativeEventTrackerMethodMap.js:
                    trackers[nativeEventTrackerMethodMap.js].push(tracker.url);
                    break;
                }
              });
            }

            if (isPlainObject(adm) && Array.isArray(adm.assets)) {
              let origAssets = nativeAssetCache[bid.impid];
              bidObject.native = cleanObj(adm.assets.reduce((native, asset) => {
                let origAsset = origAssets[asset.id];
                if (isPlainObject(asset.img)) {
                  native[origAsset.img.type ? nativeImgIdMap[origAsset.img.type] : 'image'] = pick(
                    asset.img,
                    ['url', 'w as width', 'h as height']
                  );
                } else if (isPlainObject(asset.title)) {
                  native['title'] = asset.title.text
                } else if (isPlainObject(asset.data)) {
                  nativeDataNames.forEach(dataType => {
                    if (nativeDataIdMap[dataType] === origAsset.data.type) {
                      native[dataType] = asset.data.value;
                    }
                  });
                }
                return native;
              }, cleanObj({
                clickUrl: adm.link,
                clickTrackers: deepAccess(adm, 'link.clicktrackers'),
                impressionTrackers: trackers[nativeEventTrackerMethodMap.img],
                javascriptTrackers: trackers[nativeEventTrackerMethodMap.js]
              })));
            } else {
              logError('prebid server native response contained no assets');
            }
          } else { // banner
            if (bid.adm && bid.nurl) {
              bidObject.ad = bid.adm;
              bidObject.ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
            } else if (bid.adm) {
              bidObject.ad = bid.adm;
            } else if (bid.nurl) {
              bidObject.adUrl = bid.nurl;
            }
          }

          bidObject.width = bid.w;
          bidObject.height = bid.h;
          if (bid.dealid) { bidObject.dealId = bid.dealid; }
          bidObject.creative_id = bid.crid;
          bidObject.creativeId = bid.crid;
          if (bid.burl) { bidObject.burl = bid.burl; }
          bidObject.currency = (response.cur) ? response.cur : DEFAULT_S2S_CURRENCY;
          bidObject.meta = {};
          let extPrebidMeta = deepAccess(bid, 'ext.prebid.meta');
          if (extPrebidMeta && isPlainObject(extPrebidMeta)) { bidObject.meta = deepClone(extPrebidMeta); }
          if (bid.adomain) { bidObject.meta.advertiserDomains = bid.adomain; }

          // the OpenRTB location for "TTL" as understood by Prebid.js is "exp" (expiration).
          const configTtl = s2sConfig.defaultTtl || DEFAULT_S2S_TTL;
          bidObject.ttl = (bid.exp) ? bid.exp : configTtl;
          bidObject.netRevenue = (bid.netRevenue) ? bid.netRevenue : DEFAULT_S2S_NETREVENUE;

          bids.push({ adUnit: this.adUnitsByImp[bid.impid].code, bid: bidObject });
        });
      });
    }

    return bids;
  },
  setBidRequestId(impId, bidderCode, bidId) {
    this.bidIdMap[this.impBidderKey(impId, bidderCode)] = bidId;
  },
  getBidRequest(impId, bidderCode) {
    const key = this.impBidderKey(impId, bidderCode);
    return this.bidIdMap[key] && getBidRequest(this.bidIdMap[key], this.bidderRequests);
  },
  impBidderKey(impId, bidderCode) {
    return `${impId}${bidderCode}`;
  }
});

/**
 * BID_WON event to request the wurl
 * @param {Bid} bid the winning bid object
 */
function bidWonHandler(bid) {
  const wurl = getWurl(bid.auctionId, bid.adId);
  if (isStr(wurl)) {
    logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`);
    triggerPixel(wurl);

    // remove from wurl cache, since the wurl url was called
    removeWurl(bid.auctionId, bid.adId);
  }
}

function getMatchingConsentUrl(urlProp, gdprConsent) {
  return hasPurpose1Consent(gdprConsent) ? urlProp.p1Consent : urlProp.noP1Consent;
}

function getConsentData(bidRequests) {
  let gdprConsent, uspConsent;
  if (Array.isArray(bidRequests) && bidRequests.length > 0) {
    gdprConsent = bidRequests[0].gdprConsent;
    uspConsent = bidRequests[0].uspConsent;
  }
  return { gdprConsent, uspConsent };
}

/**
 * Bidder adapter for Prebid Server
 */
export function PrebidServer() {
  const baseAdapter = new Adapter('prebidServer');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    let { gdprConsent, uspConsent } = getConsentData(bidRequests);

    if (Array.isArray(_s2sConfigs)) {
      if (s2sBidRequest.s2sConfig && s2sBidRequest.s2sConfig.syncEndpoint && getMatchingConsentUrl(s2sBidRequest.s2sConfig.syncEndpoint, gdprConsent)) {
        let syncBidders = s2sBidRequest.s2sConfig.bidders
          .map(bidder => adapterManager.aliasRegistry[bidder] || bidder)
          .filter((bidder, index, array) => (array.indexOf(bidder) === index));

        queueSync(syncBidders, gdprConsent, uspConsent, s2sBidRequest.s2sConfig);
      }

      processPBSRequest(s2sBidRequest, bidRequests, ajax, {
        onResponse: function (isValid, requestedBidders) {
          if (isValid) {
            bidRequests.forEach(bidderRequest => events.emit(CONSTANTS.EVENTS.BIDDER_DONE, bidderRequest));
          }
          done();
          doClientSideSyncs(requestedBidders, gdprConsent, uspConsent);
        },
        onError: done,
        onBid: function ({adUnit, bid}) {
          if (isValid(adUnit, bid)) {
            addBidResponse(adUnit, bid);
          }
        }
      })
    }
  };

  // Listen for bid won to call wurl
  events.on(CONSTANTS.EVENTS.BID_WON, bidWonHandler);

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

/**
 * Build and send the appropriate HTTP request over the network, then interpret the response.
 * @param s2sBidRequest
 * @param bidRequests
 * @param ajax
 * @param onResponse {function(boolean, Array[String])} invoked on a successful HTTP response - with a flag indicating whether it was successful,
 * and a list of the unique bidder codes that were sent in the request
 * @param onError {function(String, {})} invoked on HTTP failure - with status message and XHR error
 * @param onBid {function({})} invoked once for each bid in the response - with the bid as returned by interpretResponse
 */
export const processPBSRequest = hook('sync', function (s2sBidRequest, bidRequests, ajax, {onResponse, onError, onBid}) {
  let { gdprConsent } = getConsentData(bidRequests);
  const adUnits = deepClone(s2sBidRequest.ad_units);

  // in case config.bidders contains invalid bidders, we only process those we sent requests for
  const requestedBidders = adUnits
    .map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(uniques))
    .reduce(flatten, [])
    .filter(uniques);

  const ortb2 = new ORTB2(s2sBidRequest, bidRequests, adUnits, requestedBidders);
  const request = ortb2.buildRequest();
  const requestJson = request && JSON.stringify(request);
  logInfo('BidRequest: ' + requestJson);
  const endpointUrl = getMatchingConsentUrl(s2sBidRequest.s2sConfig.endpoint, gdprConsent);
  if (request && requestJson && endpointUrl) {
    ajax(
      endpointUrl,
      {
        success: function (response) {
          let result;
          try {
            result = JSON.parse(response);
            const bids = ortb2.interpretResponse(result);
            bids.forEach(onBid);
          } catch (error) {
            logError(error);
          }
          if (!result || (result.status && includes(result.status, 'Error'))) {
            logError('error parsing response: ', result ? result.status : 'not valid JSON');
            onResponse(false, requestedBidders);
          } else {
            onResponse(true, requestedBidders);
          }
        },
        error: onError
      },
      requestJson,
      {contentType: 'text/plain', withCredentials: true}
    );
  } else {
    logError('PBS request not made.  Check endpoints.');
  }
}, 'processPBSRequest');

/**
 * Global setter that sets eids permissions for bidders
 * This setter is to be used by userId module when included
 * @param {array} newEidPermissions
 */
function setEidPermissions(newEidPermissions) {
  eidPermissions = newEidPermissions;
}
getPrebidInternal().setEidPermissions = setEidPermissions;

adapterManager.registerBidAdapter(new PrebidServer(), 'prebidServer');
