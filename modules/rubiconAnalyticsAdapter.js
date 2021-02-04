import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';

const RUBICON_GVL_ID = 52;
export const storage = getStorageManager(RUBICON_GVL_ID, 'rubicon');
const COOKIE_NAME = 'rpaSession';
const LAST_SEEN_EXPIRE_TIME = 1800000; // 30 mins
const END_EXPIRE_TIME = 21600000; // 6 hours

const pbsErrorMap = {
  1: 'timeout-error',
  2: 'input-error',
  3: 'connect-error',
  4: 'request-error',
  999: 'generic-error'
}

let prebidGlobal = getGlobal();
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_TIMEOUT,
    BID_WON,
    SET_TARGETING
  },
  STATUS: {
    GOOD,
    NO_BID
  },
  BID_STATUS: {
    BID_REJECTED
  }
} = CONSTANTS;

let serverConfig;
config.getConfig('s2sConfig', ({s2sConfig}) => {
  serverConfig = s2sConfig;
});

export const SEND_TIMEOUT = 3000;
const DEFAULT_INTEGRATION = 'pbjs';

const cache = {
  auctions: {},
  targeting: {},
  timeouts: {},
  gpt: {},
};

const BID_REJECTED_IPF = 'rejected-ipf';

export let rubiConf = {
  pvid: utils.generateUUID().slice(0, 8)
};
// we are saving these as global to this module so that if a pub accidentally overwrites the entire
// rubicon object, then we do not lose other data
config.getConfig('rubicon', config => {
  utils.mergeDeep(rubiConf, config.rubicon);
  if (utils.deepAccess(config, 'rubicon.updatePageView') === true) {
    rubiConf.pvid = utils.generateUUID().slice(0, 8)
  }
});

export function getHostNameFromReferer(referer) {
  try {
    rubiconAdapter.referrerHostname = utils.parseUrl(referer, {noDecodeWholeURL: true}).hostname;
  } catch (e) {
    utils.logError('Rubicon Analytics: Unable to parse hostname from supplied url: ', referer, e);
    rubiconAdapter.referrerHostname = '';
  }
  return rubiconAdapter.referrerHostname
};

function stringProperties(obj) {
  return Object.keys(obj).reduce((newObj, prop) => {
    let value = obj[prop];
    if (typeof value === 'number') {
      value = value.toFixed(3);
    } else if (typeof value !== 'string') {
      value = String(value);
    }
    newObj[prop] = value;
    return newObj;
  }, {});
}

function sizeToDimensions(size) {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

function validMediaType(type) {
  return ['banner', 'native', 'video'].indexOf(type) !== -1;
}

function formatSource(src) {
  if (typeof src === 'undefined') {
    src = 'client';
  } else if (src === 's2s') {
    src = 'server';
  }
  return src.toLowerCase();
}

function sendMessage(auctionId, bidWonId) {
  function formatBid(bid) {
    return utils.pick(bid, [
      'bidder',
      'bidId', bidId => utils.deepAccess(bid, 'bidResponse.pbsBidId') || utils.deepAccess(bid, 'bidResponse.seatBidId') || bidId,
      'status',
      'error',
      'source', (source, bid) => {
        if (source) {
          return source;
        }
        return serverConfig && Array.isArray(serverConfig.bidders) && serverConfig.bidders.some(s2sBidder => s2sBidder.toLowerCase() === bid.bidder) !== -1
          ? 'server' : 'client'
      },
      'clientLatencyMillis',
      'serverLatencyMillis',
      'params',
      'bidResponse', bidResponse => bidResponse ? utils.pick(bidResponse, [
        'bidPriceUSD',
        'dealId',
        'dimensions',
        'mediaType',
        'floorValue',
        'floorRuleValue',
        'floorRule'
      ]) : undefined
    ]);
  }
  function formatBidWon(bid) {
    return Object.assign(formatBid(bid), utils.pick(bid.adUnit, [
      'adUnitCode',
      'transactionId',
      'videoAdFormat', () => bid.videoAdFormat,
      'mediaTypes'
    ]), {
      adserverTargeting: stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {}),
      bidwonStatus: 'success', // hard-coded for now
      accountId,
      siteId: bid.siteId,
      zoneId: bid.zoneId,
      samplingFactor
    });
  }
  let auctionCache = cache.auctions[auctionId];
  let referrer = config.getConfig('pageUrl') || (auctionCache && auctionCache.referrer);
  let message = {
    eventTimeMillis: Date.now(),
    integration: rubiConf.int_type || DEFAULT_INTEGRATION,
    version: '$prebid.version$',
    referrerUri: referrer,
    referrerHostname: rubiconAdapter.referrerHostname || getHostNameFromReferer(referrer),
    channel: 'web',
  };
  if (rubiConf.wrapperName) {
    message.wrapper = {
      name: rubiConf.wrapperName,
      family: rubiConf.wrapperFamily,
      rule: rubiConf.rule_name
    }
  }
  if (auctionCache && !auctionCache.sent) {
    let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
      let bid = auctionCache.bids[bidId];
      let adUnit = adUnits[bid.adUnit.adUnitCode];
      if (!adUnit) {
        adUnit = adUnits[bid.adUnit.adUnitCode] = utils.pick(bid.adUnit, [
          'adUnitCode',
          'transactionId',
          'mediaTypes',
          'dimensions',
          'adserverTargeting', () => stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {}),
          'gam',
          'pbAdSlot',
          'pattern'
        ]);
        adUnit.bids = [];
        adUnit.status = 'no-bid'; // default it to be no bid
      }

      // Add site and zone id if not there and if we found a rubicon bidder
      if ((!adUnit.siteId || !adUnit.zoneId) && rubiconAliases.indexOf(bid.bidder) !== -1) {
        if (utils.deepAccess(bid, 'params.accountId') == accountId) {
          adUnit.accountId = parseInt(accountId);
          adUnit.siteId = parseInt(utils.deepAccess(bid, 'params.siteId'));
          adUnit.zoneId = parseInt(utils.deepAccess(bid, 'params.zoneId'));
        }
      }

      if (bid.videoAdFormat && !adUnit.videoAdFormat) {
        adUnit.videoAdFormat = bid.videoAdFormat;
      }

      // determine adUnit.status from its bid statuses.  Use priority below to determine, higher index is better
      let statusPriority = ['error', 'no-bid', 'success'];
      if (statusPriority.indexOf(bid.status) > statusPriority.indexOf(adUnit.status)) {
        adUnit.status = bid.status;
      }

      adUnit.bids.push(formatBid(bid));

      return adUnits;
    }, {});

    // We need to mark each cached bid response with its appropriate rubicon site-zone id
    // This allows the bidWon events to have these params even in the case of a delayed render
    Object.keys(auctionCache.bids).forEach(function (bidId) {
      let adCode = auctionCache.bids[bidId].adUnit.adUnitCode;
      Object.assign(auctionCache.bids[bidId], utils.pick(adUnitMap[adCode], ['accountId', 'siteId', 'zoneId']));
    });

    let auction = {
      clientTimeoutMillis: auctionCache.timeout,
      samplingFactor,
      accountId,
      adUnits: Object.keys(adUnitMap).map(i => adUnitMap[i])
    };

    // pick our of top level floor data we want to send!
    if (auctionCache.floorData) {
      if (auctionCache.floorData.location === 'noData') {
        auction.floors = utils.pick(auctionCache.floorData, [
          'location',
          'fetchStatus',
          'floorProvider as provider'
        ]);
      } else {
        auction.floors = utils.pick(auctionCache.floorData, [
          'location',
          'modelVersion as modelName',
          'modelWeight',
          'modelTimestamp',
          'skipped',
          'enforcement', () => utils.deepAccess(auctionCache.floorData, 'enforcements.enforceJS'),
          'dealsEnforced', () => utils.deepAccess(auctionCache.floorData, 'enforcements.floorDeals'),
          'skipRate',
          'fetchStatus',
          'floorMin',
          'floorProvider as provider'
        ]);
      }
    }

    // gather gdpr info
    if (auctionCache.gdprConsent) {
      auction.gdpr = utils.pick(auctionCache.gdprConsent, [
        'gdprApplies as applies',
        'consentString',
        'apiVersion as version'
      ]);
    }

    // gather session info
    if (auctionCache.session) {
      message.session = utils.pick(auctionCache.session, [
        'id',
        'pvid',
        'start',
        'expires'
      ]);
      if (!utils.isEmpty(auctionCache.session.fpkvs)) {
        message.fpkvs = Object.keys(auctionCache.session.fpkvs).map(key => {
          return { key, value: auctionCache.session.fpkvs[key] };
        });
      }
    }

    if (serverConfig) {
      auction.serverTimeoutMillis = serverConfig.timeout;
    }

    message.auctions = [auction];

    let bidsWon = Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
      let bidId = auctionCache.bidsWon[adUnitCode];
      if (bidId) {
        memo.push(formatBidWon(auctionCache.bids[bidId]));
      }
      return memo;
    }, []);

    if (bidsWon.length > 0) {
      message.bidsWon = bidsWon;
    }

    auctionCache.sent = true;
  } else if (bidWonId && auctionCache && auctionCache.bids[bidWonId]) {
    message.bidsWon = [
      formatBidWon(auctionCache.bids[bidWonId])
    ];
  }

  ajax(
    this.getUrl(),
    null,
    JSON.stringify(message),
    {
      contentType: 'application/json'
    }
  );
}

function getBidPrice(bid) {
  // get the cpm from bidResponse
  let cpm;
  let currency;
  if (bid.status === BID_REJECTED && utils.deepAccess(bid, 'floorData.cpmAfterAdjustments')) {
    // if bid was rejected and bid.floorData.cpmAfterAdjustments use it
    cpm = bid.floorData.cpmAfterAdjustments;
    currency = bid.floorData.floorCurrency;
  } else if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === 'USD') {
    // bid is in USD use it
    return Number(bid.cpm);
  } else {
    // else grab cpm
    cpm = bid.cpm;
    currency = bid.currency;
  }
  // if after this it is still going and is USD then return it.
  if (currency === 'USD') {
    return Number(cpm);
  }
  // otherwise we convert and return
  try {
    return Number(prebidGlobal.convertCurrency(cpm, currency, 'USD'));
  } catch (err) {
    utils.logWarn('Rubicon Analytics Adapter: Could not determine the bidPriceUSD of the bid ', bid);
  }
}

export function parseBidResponse(bid, previousBidResponse, auctionFloorData) {
  // The current bidResponse for this matching requestId/bidRequestId
  let responsePrice = getBidPrice(bid)
  // we need to compare it with the previous one (if there was one)
  if (previousBidResponse && previousBidResponse.bidPriceUSD > responsePrice) {
    return previousBidResponse;
  }
  return utils.pick(bid, [
    'bidPriceUSD', () => responsePrice,
    'dealId',
    'status',
    'mediaType',
    'dimensions', () => {
      const width = bid.width || bid.playerWidth;
      const height = bid.height || bid.playerHeight;
      return (width && height) ? {width, height} : undefined;
    },
    'seatBidId',
    'floorValue', () => utils.deepAccess(bid, 'floorData.floorValue'),
    'floorRuleValue', () => utils.deepAccess(bid, 'floorData.floorRuleValue'),
    'floorRule', () => utils.debugTurnedOn() ? utils.deepAccess(bid, 'floorData.floorRule') : undefined
  ]);
}

/*
  Filters and converts URL Params into an object and returns only KVs that match the 'utm_KEY' format
*/
function getUtmParams() {
  let search;

  try {
    search = utils.parseQS(utils.getWindowLocation().search);
  } catch (e) {
    search = {};
  }

  return Object.keys(search).reduce((accum, param) => {
    if (param.match(/utm_/)) {
      accum[param.replace(/utm_/, '')] = search[param];
    }
    return accum;
  }, {});
}

function getFpkvs() {
  rubiConf.fpkvs = Object.assign((rubiConf.fpkvs || {}), getUtmParams());

  // convert all values to strings
  Object.keys(rubiConf.fpkvs).forEach(key => {
    rubiConf.fpkvs[key] = rubiConf.fpkvs[key] + '';
  });

  return rubiConf.fpkvs;
}

let samplingFactor = 1;
let accountId;
// List of known rubicon aliases
// This gets updated on auction init to account for any custom aliases present
let rubiconAliases = ['rubicon'];

/*
  Checks the alias registry for any entries of the rubicon bid adapter.
  adds to the rubiconAliases list if found
*/
function setRubiconAliases(aliasRegistry) {
  Object.keys(aliasRegistry).forEach(function (alias) {
    if (aliasRegistry[alias] === 'rubicon') {
      rubiconAliases.push(alias);
    }
  });
}

function getRpaCookie() {
  let encodedCookie = storage.getDataFromLocalStorage(COOKIE_NAME);
  if (encodedCookie) {
    try {
      return JSON.parse(window.atob(encodedCookie));
    } catch (e) {
      utils.logError(`Rubicon Analytics: Unable to decode ${COOKIE_NAME} value: `, e);
    }
  }
  return {};
}

function setRpaCookie(decodedCookie) {
  try {
    storage.setDataInLocalStorage(COOKIE_NAME, window.btoa(JSON.stringify(decodedCookie)));
  } catch (e) {
    utils.logError(`Rubicon Analytics: Unable to encode ${COOKIE_NAME} value: `, e);
  }
}

function updateRpaCookie() {
  const currentTime = Date.now();
  let decodedRpaCookie = getRpaCookie();
  if (
    !Object.keys(decodedRpaCookie).length ||
    (currentTime - decodedRpaCookie.lastSeen) > LAST_SEEN_EXPIRE_TIME ||
    decodedRpaCookie.expires < currentTime
  ) {
    decodedRpaCookie = {
      id: utils.generateUUID(),
      start: currentTime,
      expires: currentTime + END_EXPIRE_TIME, // six hours later,
    }
  }
  // possible that decodedRpaCookie is undefined, and if it is, we probably are blocked by storage or some other exception
  if (Object.keys(decodedRpaCookie).length) {
    decodedRpaCookie.lastSeen = currentTime;
    decodedRpaCookie.fpkvs = {...decodedRpaCookie.fpkvs, ...getFpkvs()};
    decodedRpaCookie.pvid = rubiConf.pvid;
    setRpaCookie(decodedRpaCookie)
  }
  return decodedRpaCookie;
}

function subscribeToGamSlots() {
  window.googletag.pubads().addEventListener('slotRenderEnded', event => {
    const isMatchingAdSlot = utils.isAdUnitCodeMatchingSlot(event.slot);
    // loop through auctions and adUnits and mark the info
    Object.keys(cache.auctions).forEach(auctionId => {
      (Object.keys(cache.auctions[auctionId].bids) || []).forEach(bidId => {
        let bid = cache.auctions[auctionId].bids[bidId];
        // if this slot matches this bids adUnit, add the adUnit info
        if (isMatchingAdSlot(bid.adUnit.adUnitCode)) {
          // mark this adUnit as having been rendered by gam
          cache.auctions[auctionId].gamHasRendered[bid.adUnit.adUnitCode] = true;

          bid.adUnit.gam = utils.pick(event, [
            // these come in as `null` from Gpt, which when stringified does not get removed
            // so set explicitly to undefined when not a number
            'advertiserId', advertiserId => utils.isNumber(advertiserId) ? advertiserId : undefined,
            'creativeId', creativeId => utils.isNumber(creativeId) ? creativeId : undefined,
            'lineItemId', lineItemId => utils.isNumber(lineItemId) ? lineItemId : undefined,
            'adSlot', () => event.slot.getAdUnitPath(),
            'isSlotEmpty', () => event.isEmpty || undefined
          ]);
        }
      });
      // Now if all adUnits have gam rendered, send the payload
      if (rubiConf.waitForGamSlots && !cache.auctions[auctionId].sent && Object.keys(cache.auctions[auctionId].gamHasRendered).every(adUnitCode => cache.auctions[auctionId].gamHasRendered[adUnitCode])) {
        clearTimeout(cache.timeouts[auctionId]);
        delete cache.timeouts[auctionId];
        sendMessage.call(rubiconAdapter, auctionId);
      }
    });
  });
}

let baseAdapter = adapter({analyticsType: 'endpoint'});
let rubiconAdapter = Object.assign({}, baseAdapter, {
  referrerHostname: '',
  enableAnalytics(config = {}) {
    let error = false;
    samplingFactor = 1;

    if (typeof config.options === 'object') {
      if (config.options.accountId) {
        accountId = Number(config.options.accountId);
      }
      if (config.options.endpoint) {
        this.getUrl = () => config.options.endpoint;
      } else {
        utils.logError('required endpoint missing from rubicon analytics');
        error = true;
      }
      if (typeof config.options.sampling !== 'undefined') {
        samplingFactor = 1 / parseFloat(config.options.sampling);
      }
      if (typeof config.options.samplingFactor !== 'undefined') {
        if (typeof config.options.sampling !== 'undefined') {
          utils.logWarn('Both options.samplingFactor and options.sampling enabled in rubicon analytics, defaulting to samplingFactor');
        }
        samplingFactor = parseFloat(config.options.samplingFactor);
        config.options.sampling = 1 / samplingFactor;
      }
    }

    let validSamplingFactors = [1, 10, 20, 40, 100];
    if (validSamplingFactors.indexOf(samplingFactor) === -1) {
      error = true;
      utils.logError('invalid samplingFactor for rubicon analytics: ' + samplingFactor + ', must be one of ' + validSamplingFactors.join(', '));
    } else if (!accountId) {
      error = true;
      utils.logError('required accountId missing for rubicon analytics');
    }

    if (!error) {
      baseAdapter.enableAnalytics.call(this, config);
    }
  },
  disableAnalytics() {
    this.getUrl = baseAdapter.getUrl;
    accountId = undefined;
    rubiConf = {};
    cache.gpt.registered = false;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },
  track({eventType, args}) {
    switch (eventType) {
      case AUCTION_INIT:
        // set the rubicon aliases
        setRubiconAliases(adapterManager.aliasRegistry);
        let cacheEntry = utils.pick(args, [
          'timestamp',
          'timeout'
        ]);
        cacheEntry.bids = {};
        cacheEntry.bidsWon = {};
        cacheEntry.gamHasRendered = {};
        cacheEntry.referrer = utils.deepAccess(args, 'bidderRequests.0.refererInfo.referer');
        const floorData = utils.deepAccess(args, 'bidderRequests.0.bids.0.floorData');
        if (floorData) {
          cacheEntry.floorData = {...floorData};
        }
        cacheEntry.gdprConsent = utils.deepAccess(args, 'bidderRequests.0.gdprConsent');
        cacheEntry.session = storage.localStorageIsEnabled() && updateRpaCookie();
        cache.auctions[args.auctionId] = cacheEntry;
        // register to listen to gpt events if not done yet
        if (!cache.gpt.registered && utils.isGptPubadsDefined()) {
          subscribeToGamSlots();
          cache.gpt.registered = true;
        } else if (!cache.gpt.registered) {
          cache.gpt.registered = true;
          let googletag = window.googletag || {};
          googletag.cmd = googletag.cmd || [];
          googletag.cmd.push(function() {
            subscribeToGamSlots();
          });
        }
        break;
      case BID_REQUESTED:
        Object.assign(cache.auctions[args.auctionId].bids, args.bids.reduce((memo, bid) => {
          // mark adUnits we expect bidWon events for
          cache.auctions[args.auctionId].bidsWon[bid.adUnitCode] = false;

          if (rubiConf.waitForGamSlots) {
            cache.auctions[args.auctionId].gamHasRendered[bid.adUnitCode] = false;
          }

          memo[bid.bidId] = utils.pick(bid, [
            'bidder', bidder => bidder.toLowerCase(),
            'bidId',
            'status', () => 'no-bid', // default a bid to no-bid until response is recieved or bid is timed out
            'source', () => formatSource(bid.src),
            'params', (params, bid) => {
              switch (bid.bidder) {
                // specify bidder params we want here
                case 'rubicon':
                  return utils.pick(params, [
                    'accountId',
                    'siteId',
                    'zoneId'
                  ]);
              }
            },
            'videoAdFormat', (_, cachedBid) => {
              if (cachedBid.bidder === 'rubicon') {
                return ({
                  201: 'pre-roll',
                  202: 'interstitial',
                  203: 'outstream',
                  204: 'mid-roll',
                  205: 'post-roll',
                  207: 'vertical'
                })[utils.deepAccess(bid, 'params.video.size_id')];
              } else {
                let startdelay = parseInt(utils.deepAccess(bid, 'params.video.startdelay'), 10);
                if (!isNaN(startdelay)) {
                  if (startdelay > 0) {
                    return 'mid-roll';
                  }
                  return ({
                    '0': 'pre-roll',
                    '-1': 'mid-roll',
                    '-2': 'post-roll'
                  })[startdelay]
                }
              }
            },
            'adUnit', () => utils.pick(bid, [
              'adUnitCode',
              'transactionId',
              'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
              'mediaTypes', (types) => {
                if (bid.mediaType && validMediaType(bid.mediaType)) {
                  return [bid.mediaType];
                }
                if (Array.isArray(types)) {
                  return types.filter(validMediaType);
                }
                if (typeof types === 'object') {
                  if (!bid.sizes) {
                    bid.dimensions = [];
                    utils._each(types, (type) =>
                      bid.dimensions = bid.dimensions.concat(
                        type.sizes.map(sizeToDimensions)
                      )
                    );
                  }
                  return Object.keys(types).filter(validMediaType);
                }
                return ['banner'];
              },
              'gam', () => {
                if (utils.deepAccess(bid, 'fpd.context.adServer.name') === 'gam') {
                  return {adSlot: bid.fpd.context.adServer.adSlot}
                }
              },
              'pbAdSlot', () => utils.deepAccess(bid, 'fpd.context.pbAdSlot'),
              'pattern', () => utils.deepAccess(bid, 'fpd.context.aupName')
            ])
          ]);
          return memo;
        }, {}));
        break;
      case BID_RESPONSE:
        let auctionEntry = cache.auctions[args.auctionId];
        let bid = auctionEntry.bids[args.requestId];
        // If floor resolved gptSlot but we have not yet, then update the adUnit to have the adSlot name
        if (!utils.deepAccess(bid, 'adUnit.gam.adSlot') && utils.deepAccess(args, 'floorData.matchedFields.gptSlot')) {
          utils.deepSetValue(bid, 'adUnit.gam.adSlot', args.floorData.matchedFields.gptSlot);
        }
        // if we have not set enforcements yet set it
        if (!utils.deepAccess(auctionEntry, 'floorData.enforcements') && utils.deepAccess(args, 'floorData.enforcements')) {
          auctionEntry.floorData.enforcements = {...args.floorData.enforcements};
        }
        if (!bid) {
          utils.logError('Rubicon Anlytics Adapter Error: Could not find associated bid request for bid response with requestId: ', args.requestId);
          break;
        }
        bid.source = formatSource(bid.source || args.source);
        switch (args.getStatusCode()) {
          case GOOD:
            bid.status = 'success';
            delete bid.error; // it's possible for this to be set by a previous timeout
            break;
          case NO_BID:
            bid.status = args.status === BID_REJECTED ? BID_REJECTED_IPF : 'no-bid';
            delete bid.error;
            break;
          default:
            bid.status = 'error';
            bid.error = {
              code: 'request-error'
            };
        }
        bid.clientLatencyMillis = bid.timeToRespond || Date.now() - cache.auctions[args.auctionId].timestamp;
        bid.bidResponse = parseBidResponse(args, bid.bidResponse);
        break;
      case BIDDER_DONE:
        const serverError = utils.deepAccess(args, 'serverErrors.0');
        const serverResponseTimeMs = args.serverResponseTimeMs;
        args.bids.forEach(bid => {
          let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId || bid.requestId];
          if (typeof bid.serverResponseTimeMs !== 'undefined') {
            cachedBid.serverLatencyMillis = bid.serverResponseTimeMs;
          } else if (serverResponseTimeMs && bid.source === 's2s') {
            cachedBid.serverLatencyMillis = serverResponseTimeMs;
          }
          // if PBS said we had an error, and this bid has not been processed by BID_RESPONSE YET
          if (serverError && (!cachedBid.status || ['no-bid', 'error'].indexOf(cachedBid.status) !== -1)) {
            cachedBid.status = 'error';
            cachedBid.error = {
              code: pbsErrorMap[serverError.code] || pbsErrorMap[999],
              description: serverError.message
            }
          }
          if (!cachedBid.status) {
            cachedBid.status = 'no-bid';
          }
          if (!cachedBid.clientLatencyMillis) {
            cachedBid.clientLatencyMillis = Date.now() - cache.auctions[bid.auctionId].timestamp;
          }
        });
        break;
      case SET_TARGETING:
        Object.assign(cache.targeting, args);
        break;
      case BID_WON:
        let auctionCache = cache.auctions[args.auctionId];
        auctionCache.bidsWon[args.adUnitCode] = args.requestId;

        // check if this BID_WON missed the boat, if so send by itself
        if (auctionCache.sent === true) {
          sendMessage.call(this, args.auctionId, args.requestId);
        } else if (!rubiConf.waitForGamSlots && Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
          // only send if we've received bidWon events for all adUnits in auction
          memo = memo && auctionCache.bidsWon[adUnitCode];
          return memo;
        }, true)) {
          clearTimeout(cache.timeouts[args.auctionId]);
          delete cache.timeouts[args.auctionId];

          sendMessage.call(this, args.auctionId);
        }
        break;
      case AUCTION_END:
        // start timer to send batched payload just in case we don't hear any BID_WON events
        cache.timeouts[args.auctionId] = setTimeout(() => {
          sendMessage.call(this, args.auctionId);
        }, rubiConf.analyticsBatchTimeout || SEND_TIMEOUT);
        break;
      case BID_TIMEOUT:
        args.forEach(badBid => {
          let auctionCache = cache.auctions[badBid.auctionId];
          let bid = auctionCache.bids[badBid.bidId || badBid.requestId];
          // might be set already by bidder-done, so do not overwrite
          if (bid.status !== 'error') {
            bid.status = 'error';
            bid.error = {
              code: 'timeout-error',
              message: 'marked by prebid.js as timeout' // will help us diff if timeout was set by PBS or PBJS
            };
          }
        });
        break;
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: rubiconAdapter,
  code: 'rubicon',
  gvlid: RUBICON_GVL_ID
});

export default rubiconAdapter;
