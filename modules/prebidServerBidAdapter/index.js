import Adapter from '../../src/adapter.js';
import { createBid } from '../../src/bidfactory.js';
import * as utils from '../../src/utils.js';
import CONSTANTS from '../../src/constants.json';
import adapterManager from '../../src/adapterManager.js';
import { config } from '../../src/config.js';
import { VIDEO, NATIVE } from '../../src/mediaTypes.js';
import { processNativeAdUnitParams } from '../../src/native.js';
import { isValid } from '../../src/adapters/bidderFactory.js';
import events from '../../src/events.js';
import includes from 'core-js-pure/features/array/includes.js';
import { S2S_VENDORS } from './config.js';
import { ajax } from '../../src/ajax.js';
import find from 'core-js-pure/features/array/find.js';
import { getPrebidInternal } from '../../src/utils.js';

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
 * @property {boolean} [enabled=false] enables S2S bidding
 * @property {number} [timeout=1000] timeout for S2S bidders - should be lower than `pbjs.requestBids({timeout})`
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
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
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
      utils.logError('Incorrect or unavailable prebid server default vendor option: ' + vendor);
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
  if (['accountId', 'bidders', 'endpoint'].filter(key => {
    if (!includes(keys, key)) {
      utils.logError(key + ' missing in server to server config');
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
    if (utils.isStr(option[prop])) {
      let temp = option[prop];
      option[prop] = { p1Consent: temp, noP1Consent: temp };
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
    utils.logWarn('prebidServer: s2s config is disabled');
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
    uuid: utils.generateUUID(),
    bidders: bidderCodes,
    account: s2sConfig.accountId
  };

  let userSyncLimit = s2sConfig.userSyncLimit;
  if (utils.isNumber(userSyncLimit) && userSyncLimit > 0) {
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
        utils.logError(e);
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
    doPreBidderSync(thisSync.usersync.type, thisSync.usersync.url, thisSync.bidder, utils.bind.call(doAllSyncs, null, bidders, s2sConfig), s2sConfig);
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
    const newSyncUrl = s2sConfig.syncUrlModifier[bidder](type, url, bidder);
    doBidderSync(type, newSyncUrl, bidder, done)
  } else {
    doBidderSync(type, url, bidder, done)
  }
}

/**
 * Run a cookie sync for the given type, url, and bidder
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 * @param {function} done an exit callback; to signify this pixel has either: finished rendering or something went wrong
 */
function doBidderSync(type, url, bidder, done) {
  if (!url) {
    utils.logError(`No sync url for bidder "${bidder}": ${url}`);
    done();
  } else if (type === 'image' || type === 'redirect') {
    utils.logMessage(`Invoking image pixel user sync for bidder: "${bidder}"`);
    utils.triggerPixel(url, done);
  } else if (type == 'iframe') {
    utils.logMessage(`Invoking iframe user sync for bidder: "${bidder}"`);
    utils.insertUserSyncIframe(url, done);
  } else {
    utils.logError(`User sync type "${type}" not supported for bidder: "${bidder}"`);
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
        utils.bind.call(
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
    if (utils.isPlainObject(config.getConfig('site'))) {
      request.site = config.getConfig('site');
    }
    // set publisher.id if not already defined
    if (!utils.deepAccess(request.site, 'publisher.id')) {
      utils.deepSetValue(request.site, 'publisher.id', accountId);
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

function addBidderFirstPartyDataToRequest(request) {
  const bidderConfig = config.getBidderConfig();
  const fpdConfigs = Object.keys(bidderConfig).reduce((acc, bidder) => {
    const currBidderConfig = bidderConfig[bidder];
    if (currBidderConfig.ortb2) {
      const ortb2 = {};
      if (currBidderConfig.ortb2.site) {
        ortb2.site = currBidderConfig.ortb2.site;
      }
      if (currBidderConfig.ortb2.user) {
        ortb2.user = currBidderConfig.ortb2.user;
      }

      acc.push({
        bidders: [ bidder ],
        config: { ortb2 }
      });
    }
    return acc;
  }, []);

  if (fpdConfigs.length) {
    utils.deepSetValue(request, 'ext.prebid.bidderconfig', fpdConfigs);
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

/*
 * Protocol spec for OpenRTB endpoint
 * e.g., https://<prebid-server-url>/v1/openrtb2/auction
 */
let bidIdMap = {};
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
  if ([auctionId, adId].every(utils.isStr)) {
    wurlMap[`${auctionId}${adId}`] = wurl;
  }
}

function getPbsResponseData(bidderRequests, response, pbsName, pbjsName) {
  const bidderValues = utils.deepAccess(response, `ext.${pbsName}`);
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
  if ([auctionId, adId].every(utils.isStr)) {
    wurlMap[`${auctionId}${adId}`] = undefined;
  }
}
/**
 * @param {string} auctionId
 * @param {string} adId generated value set to bidObject.adId by bidderFactory Bid()
 * @return {(string|undefined)} events.winurl which was passed as wurl
 */
function getWurl(auctionId, adId) {
  if ([auctionId, adId].every(utils.isStr)) {
    return wurlMap[`${auctionId}${adId}`];
  }
}

/**
 * remove all cached wurls
 */
export function resetWurlMap() {
  wurlMap = {};
}

const OPEN_RTB_PROTOCOL = {
  buildRequest(s2sBidRequest, bidRequests, adUnits, s2sConfig, requestedBidders) {
    let imps = [];
    let aliases = {};
    const firstBidRequest = bidRequests[0];

    // transform ad unit into array of OpenRTB impression objects
    adUnits.forEach(adUnit => {
      const nativeParams = processNativeAdUnitParams(utils.deepAccess(adUnit, 'mediaTypes.native'));
      let nativeAssets;
      if (nativeParams) {
        try {
          nativeAssets = nativeAssetCache[adUnit.code] = Object.keys(nativeParams).reduce((assets, type) => {
            let params = nativeParams[type];

            function newAsset(obj) {
              return Object.assign({
                required: params.required ? 1 : 0
              }, obj ? utils.cleanObj(obj) : {});
            }

            switch (type) {
              case 'image':
              case 'icon':
                let imgTypeId = nativeImgIdMap[type];
                let asset = utils.cleanObj({
                  type: imgTypeId,
                  w: utils.deepAccess(params, 'sizes.0'),
                  h: utils.deepAccess(params, 'sizes.1'),
                  wmin: utils.deepAccess(params, 'aspect_ratios.0.min_width'),
                  hmin: utils.deepAccess(params, 'aspect_ratios.0.min_height')
                });
                if (!((asset.w && asset.h) || (asset.hmin && asset.wmin))) {
                  throw 'invalid img sizes (must provide sizes or min_height & min_width if using aspect_ratios)';
                }
                if (Array.isArray(params.aspect_ratios)) {
                  // pass aspect_ratios as ext data I guess?
                  asset.ext = {
                    aspectratios: params.aspect_ratios.map(
                      ratio => `${ratio.ratio_width}:${ratio.ratio_height}`
                    )
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
          utils.logError('error creating native request: ' + String(e))
        }
      }
      const videoParams = utils.deepAccess(adUnit, 'mediaTypes.video');
      const bannerParams = utils.deepAccess(adUnit, 'mediaTypes.banner');

      adUnit.bids.forEach(bid => {
        // OpenRTB response contains the adunit code and bidder name. These are
        // combined to create a unique key for each bid since an id isn't returned
        bidIdMap[`${adUnit.code}${bid.bidder}`] = bid.bid_id;

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
        const sizes = utils.parseSizesInput(bannerParams.sizes);

        // get banner sizes in form [{ w: <int>, h: <int> }, ...]
        const format = sizes.map(size => {
          const [ width, height ] = size.split('x');
          const w = parseInt(width, 10);
          const h = parseInt(height, 10);
          return { w, h };
        });

        mediaTypes['banner'] = {format};
      }

      if (!utils.isEmpty(videoParams)) {
        if (videoParams.context === 'outstream' && !adUnit.renderer) {
          // Don't push oustream w/o renderer to request object.
          utils.logError('Outstream bid without renderer cannot be sent to Prebid Server.');
        } else {
          if (videoParams.context === 'instream' && !videoParams.hasOwnProperty('placement')) {
            videoParams.placement = 1;
          }

          mediaTypes['video'] = Object.keys(videoParams).filter(param => param !== 'context')
            .reduce((result, param) => {
              if (param === 'playerSize') {
                result.w = utils.deepAccess(videoParams, `${param}.0.0`);
                result.h = utils.deepAccess(videoParams, `${param}.0.1`);
              } else {
                result[param] = videoParams[param];
              }
              return result;
            }, {});
        }
      }

      if (nativeAssets) {
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
          utils.logError('error creating native request: ' + String(e))
        }
      }

      // get bidder params in form { <bidder code>: {...params} }
      // initialize reduce function with the user defined `ext` properties on the ad unit
      const ext = adUnit.bids.reduce((acc, bid) => {
        const adapter = adapterManager.bidderRegistry[bid.bidder];
        if (adapter && adapter.getSpec().transformBidParams) {
          bid.params = adapter.getSpec().transformBidParams(bid.params, true);
        }
        acc[bid.bidder] = (s2sConfig.adapterOptions && s2sConfig.adapterOptions[bid.bidder]) ? Object.assign({}, bid.params, s2sConfig.adapterOptions[bid.bidder]) : bid.params;
        return acc;
      }, {...utils.deepAccess(adUnit, 'ortb2Imp.ext')});

      const imp = { id: adUnit.code, ext, secure: s2sConfig.secure };

      const ortb2 = {...utils.deepAccess(adUnit, 'ortb2Imp.ext.data')};
      Object.keys(ortb2).forEach(prop => {
        /**
          * Prebid AdSlot
          * @type {(string|undefined)}
        */
        if (prop === 'pbadslot') {
          if (typeof ortb2[prop] === 'string' && ortb2[prop]) {
            utils.deepSetValue(imp, 'ext.data.pbadslot', ortb2[prop]);
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
            const value = utils.deepAccess(ortb2, `adserver.${name}`);
            if (typeof value === 'string' && value) {
              utils.deepSetValue(imp, `ext.data.adserver.${name.toLowerCase()}`, value);
            }
          });
        } else {
          utils.deepSetValue(imp, `ext.data.${prop}`, ortb2[prop]);
        }
      });

      Object.assign(imp, mediaTypes);

      // if storedAuctionResponse has been set, pass SRID
      const storedAuctionResponseBid = find(firstBidRequest.bids, bid => (bid.adUnitCode === adUnit.code && bid.storedAuctionResponse));
      if (storedAuctionResponseBid) {
        utils.deepSetValue(imp, 'ext.prebid.storedauctionresponse.id', storedAuctionResponseBid.storedAuctionResponse.toString());
      }

      const getFloorBid = find(firstBidRequest.bids, bid => bid.adUnitCode === adUnit.code && typeof bid.getFloor === 'function');

      if (getFloorBid) {
        let floorInfo;
        try {
          floorInfo = getFloorBid.getFloor({
            currency: config.getConfig('currency.adServerCurrency') || DEFAULT_S2S_CURRENCY,
          });
        } catch (e) {
          utils.logError('PBS: getFloor threw an error: ', e);
        }
        if (floorInfo && floorInfo.currency && !isNaN(parseFloat(floorInfo.floor))) {
          imp.bidfloor = parseFloat(floorInfo.floor);
          imp.bidfloorcur = floorInfo.currency
        }
      }

      if (imp.banner || imp.video || imp.native) {
        imps.push(imp);
      }
    });

    if (!imps.length) {
      utils.logError('Request to Prebid Server rejected due to invalid media type(s) in adUnit.');
      return;
    }
    const request = {
      id: s2sBidRequest.tid,
      source: {tid: s2sBidRequest.tid},
      tmax: s2sConfig.timeout,
      imp: imps,
      test: getConfig('debug') ? 1 : 0,
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

    // Sets pbjs version, can be overwritten below if channel exists in s2sConfig.extPrebid
    request.ext.prebid = Object.assign(request.ext.prebid, {channel: {name: 'pbjs', version: $$PREBID_GLOBAL$$.version}})

    // s2sConfig video.ext.prebid is passed through openrtb to PBS
    if (s2sConfig.extPrebid && typeof s2sConfig.extPrebid === 'object') {
      request.ext.prebid = Object.assign(request.ext.prebid, s2sConfig.extPrebid);
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

    _appendSiteAppDevice(request, bidRequests[0].refererInfo.referer, s2sConfig.accountId);

    // pass schain object if it is present
    const schain = utils.deepAccess(bidRequests, '0.bids.0.schain');
    if (schain) {
      request.source.ext = {
        schain: schain
      };
    }

    if (!utils.isEmpty(aliases)) {
      request.ext.prebid.aliases = {...request.ext.prebid.aliases, ...aliases};
    }

    const bidUserIdAsEids = utils.deepAccess(bidRequests, '0.bids.0.userIdAsEids');
    if (utils.isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
      utils.deepSetValue(request, 'user.ext.eids', bidUserIdAsEids);
    }

    if (utils.isArray(eidPermissions) && eidPermissions.length > 0) {
      if (requestedBidders && utils.isArray(requestedBidders)) {
        eidPermissions.forEach(i => {
          if (i.bidders) {
            i.bidders = i.bidders.filter(bidder => requestedBidders.includes(bidder))
          }
        });
      }
      utils.deepSetValue(request, 'ext.prebid.data.eidpermissions', eidPermissions);
    }

    const multibid = config.getConfig('multibid');
    if (multibid) {
      utils.deepSetValue(request, 'ext.prebid.multibid', multibid.reduce((result, i) => {
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
        utils.deepSetValue(request, 'regs.ext.gdpr', gdprApplies);
        utils.deepSetValue(request, 'user.ext.consent', firstBidRequest.gdprConsent.consentString);
        if (firstBidRequest.gdprConsent.addtlConsent && typeof firstBidRequest.gdprConsent.addtlConsent === 'string') {
          utils.deepSetValue(request, 'user.ext.ConsentedProvidersSettings.consented_providers', firstBidRequest.gdprConsent.addtlConsent);
        }
      }

      // US Privacy (CCPA) support
      if (firstBidRequest.uspConsent) {
        utils.deepSetValue(request, 'regs.ext.us_privacy', firstBidRequest.uspConsent);
      }
    }

    if (getConfig('coppa') === true) {
      utils.deepSetValue(request, 'regs.coppa', 1);
    }

    const commonFpd = getConfig('ortb2') || {};
    if (commonFpd.site) {
      utils.mergeDeep(request, {site: commonFpd.site});
    }
    if (commonFpd.user) {
      utils.mergeDeep(request, {user: commonFpd.user});
    }
    addBidderFirstPartyDataToRequest(request);

    return request;
  },

  interpretResponse(response, bidderRequests, s2sConfig) {
    const bids = [];

    [['errors', 'serverErrors'], ['responsetimemillis', 'serverResponseTimeMs']]
      .forEach(info => getPbsResponseData(bidderRequests, response, info[0], info[1]))

    if (response.seatbid) {
      // a seatbid object contains a `bid` array and a `seat` string
      response.seatbid.forEach(seatbid => {
        (seatbid.bid || []).forEach(bid => {
          let bidRequest;
          let key = `${bid.impid}${seatbid.seat}`;
          if (bidIdMap[key]) {
            bidRequest = utils.getBidRequest(
              bidIdMap[key],
              bidderRequests
            );
          }

          const cpm = bid.price;
          const status = cpm !== 0 ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID;
          let bidObject = createBid(status, bidRequest || {
            bidder: seatbid.seat,
            src: TYPE
          });

          bidObject.cpm = cpm;

          // temporarily leaving attaching it to each bidResponse so no breaking change
          // BUT: this is a flat map, so it should be only attached to bidderRequest, a the change above does
          let serverResponseTimeMs = utils.deepAccess(response, ['ext', 'responsetimemillis', seatbid.seat].join('.'));
          if (bidRequest && serverResponseTimeMs) {
            bidRequest.serverResponseTimeMs = serverResponseTimeMs;
          }

          // Look for seatbid[].bid[].ext.prebid.bidid and place it in the bidResponse object for use in analytics adapters as 'pbsBidId'
          const bidId = utils.deepAccess(bid, 'ext.prebid.bidid');
          if (utils.isStr(bidId)) {
            bidObject.pbsBidId = bidId;
          }

          // store wurl by auctionId and adId so it can be accessed from the BID_WON event handler
          if (utils.isStr(utils.deepAccess(bid, 'ext.prebid.events.win'))) {
            addWurl(bidRequest.auctionId, bidObject.adId, utils.deepAccess(bid, 'ext.prebid.events.win'));
          }

          let extPrebidTargeting = utils.deepAccess(bid, 'ext.prebid.targeting');

          // If ext.prebid.targeting exists, add it as a property value named 'adserverTargeting'
          // The removal of hb_winurl and hb_bidid targeting values is temporary
          // once we get through the transition, this block will be removed.
          if (utils.isPlainObject(extPrebidTargeting)) {
            // If wurl exists, remove hb_winurl and hb_bidid targeting attributes
            if (utils.isStr(utils.deepAccess(bid, 'ext.prebid.events.win'))) {
              extPrebidTargeting = utils.getDefinedParams(extPrebidTargeting, Object.keys(extPrebidTargeting)
                .filter(i => (i.indexOf('hb_winurl') === -1 && i.indexOf('hb_bidid') === -1)));
            }
            bidObject.adserverTargeting = extPrebidTargeting;
          }

          bidObject.seatBidId = bid.id;

          if (utils.deepAccess(bid, 'ext.prebid.type') === VIDEO) {
            bidObject.mediaType = VIDEO;
            let sizes = bidRequest.sizes && bidRequest.sizes[0];
            bidObject.playerWidth = sizes[0];
            bidObject.playerHeight = sizes[1];

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
          } else if (utils.deepAccess(bid, 'ext.prebid.type') === NATIVE) {
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

            if (utils.isPlainObject(adm) && Array.isArray(adm.assets)) {
              let origAssets = nativeAssetCache[bidRequest.adUnitCode];
              bidObject.native = utils.cleanObj(adm.assets.reduce((native, asset) => {
                let origAsset = origAssets[asset.id];
                if (utils.isPlainObject(asset.img)) {
                  native[origAsset.img.type ? nativeImgIdMap[origAsset.img.type] : 'image'] = utils.pick(
                    asset.img,
                    ['url', 'w as width', 'h as height']
                  );
                } else if (utils.isPlainObject(asset.title)) {
                  native['title'] = asset.title.text
                } else if (utils.isPlainObject(asset.data)) {
                  nativeDataNames.forEach(dataType => {
                    if (nativeDataIdMap[dataType] === origAsset.data.type) {
                      native[dataType] = asset.data.value;
                    }
                  });
                }
                return native;
              }, utils.cleanObj({
                clickUrl: adm.link,
                clickTrackers: utils.deepAccess(adm, 'link.clicktrackers'),
                impressionTrackers: trackers[nativeEventTrackerMethodMap.img],
                javascriptTrackers: trackers[nativeEventTrackerMethodMap.js]
              })));
            } else {
              utils.logError('prebid server native response contained no assets');
            }
          } else { // banner
            if (bid.adm && bid.nurl) {
              bidObject.ad = bid.adm;
              bidObject.ad += utils.createTrackPixelHtml(decodeURIComponent(bid.nurl));
            } else if (bid.adm) {
              bidObject.ad = bid.adm;
            } else if (bid.nurl) {
              bidObject.adUrl = bid.nurl;
            }
          }

          bidObject.width = bid.w;
          bidObject.height = bid.h;
          if (bid.dealid) { bidObject.dealId = bid.dealid; }
          bidObject.requestId = bidRequest.bidId || bidRequest.bid_Id;
          bidObject.creative_id = bid.crid;
          bidObject.creativeId = bid.crid;
          if (bid.burl) { bidObject.burl = bid.burl; }
          bidObject.currency = (response.cur) ? response.cur : DEFAULT_S2S_CURRENCY;
          bidObject.meta = bidObject.meta || {};
          if (bid.ext && bid.ext.dchain) { bidObject.meta.dchain = utils.deepClone(bid.ext.dchain); }
          if (bid.adomain) { bidObject.meta.advertiserDomains = bid.adomain; }

          // the OpenRTB location for "TTL" as understood by Prebid.js is "exp" (expiration).
          const configTtl = s2sConfig.defaultTtl || DEFAULT_S2S_TTL;
          bidObject.ttl = (bid.exp) ? bid.exp : configTtl;
          bidObject.netRevenue = (bid.netRevenue) ? bid.netRevenue : DEFAULT_S2S_NETREVENUE;

          bids.push({ adUnit: bid.impid, bid: bidObject });
        });
      });
    }

    return bids;
  }
};

/**
 * BID_WON event to request the wurl
 * @param {Bid} bid the winning bid object
 */
function bidWonHandler(bid) {
  const wurl = getWurl(bid.auctionId, bid.adId);
  if (utils.isStr(wurl)) {
    utils.logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`);
    utils.triggerPixel(wurl);

    // remove from wurl cache, since the wurl url was called
    removeWurl(bid.auctionId, bid.adId);
  }
}

function hasPurpose1Consent(gdprConsent) {
  let result = true;
  if (gdprConsent) {
    if (gdprConsent.gdprApplies && gdprConsent.apiVersion === 2) {
      result = !!(utils.deepAccess(gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
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
    const adUnits = utils.deepClone(s2sBidRequest.ad_units);
    let { gdprConsent, uspConsent } = getConsentData(bidRequests);

    // at this point ad units should have a size array either directly or mapped so filter for that
    const validAdUnits = adUnits.filter(unit =>
      unit.mediaTypes && (unit.mediaTypes.native || (unit.mediaTypes.banner && unit.mediaTypes.banner.sizes) || (unit.mediaTypes.video && unit.mediaTypes.video.playerSize))
    );

    // in case config.bidders contains invalid bidders, we only process those we sent requests for
    const requestedBidders = validAdUnits
      .map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(utils.uniques))
      .reduce(utils.flatten)
      .filter(utils.uniques);

    if (Array.isArray(_s2sConfigs)) {
      if (s2sBidRequest.s2sConfig && s2sBidRequest.s2sConfig.syncEndpoint && getMatchingConsentUrl(s2sBidRequest.s2sConfig.syncEndpoint, gdprConsent)) {
        let syncBidders = s2sBidRequest.s2sConfig.bidders
          .map(bidder => adapterManager.aliasRegistry[bidder] || bidder)
          .filter((bidder, index, array) => (array.indexOf(bidder) === index));

        queueSync(syncBidders, gdprConsent, uspConsent, s2sBidRequest.s2sConfig);
      }

      const request = OPEN_RTB_PROTOCOL.buildRequest(s2sBidRequest, bidRequests, validAdUnits, s2sBidRequest.s2sConfig, requestedBidders);
      const requestJson = request && JSON.stringify(request);
      utils.logInfo('BidRequest: ' + requestJson);
      if (request && requestJson) {
        ajax(
          getMatchingConsentUrl(s2sBidRequest.s2sConfig.endpoint, gdprConsent),
          {
            success: response => handleResponse(response, requestedBidders, bidRequests, addBidResponse, done, s2sBidRequest.s2sConfig),
            error: done
          },
          requestJson,
          { contentType: 'text/plain', withCredentials: true }
        );
      }
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response, requestedBidders, bidderRequests, addBidResponse, done, s2sConfig) {
    let result;
    let bids = [];
    let { gdprConsent, uspConsent } = getConsentData(bidderRequests);

    try {
      result = JSON.parse(response);

      bids = OPEN_RTB_PROTOCOL.interpretResponse(
        result,
        bidderRequests,
        s2sConfig
      );

      bids.forEach(({adUnit, bid}) => {
        if (isValid(adUnit, bid, bidderRequests)) {
          addBidResponse(adUnit, bid);
        }
      });

      bidderRequests.forEach(bidderRequest => events.emit(CONSTANTS.EVENTS.BIDDER_DONE, bidderRequest));
    } catch (error) {
      utils.logError(error);
    }

    if (!result || (result.status && includes(result.status, 'Error'))) {
      utils.logError('error parsing response: ', result.status);
    }

    done();
    doClientSideSyncs(requestedBidders, gdprConsent, uspConsent);
  }

  // Listen for bid won to call wurl
  events.on(CONSTANTS.EVENTS.BID_WON, bidWonHandler);

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

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
