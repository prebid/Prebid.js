import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax';
import { config } from '../src/config';
import * as utils from '../src/utils';

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
      'bidId', bidId => utils.deepAccess(bid, 'bidResponse.seatBidId') || bidId,
      'status',
      'error',
      'source', (source, bid) => {
        if (source) {
          return source;
        }
        return serverConfig && Array.isArray(serverConfig.bidders) && serverConfig.bidders.indexOf(bid.bidder) !== -1
          ? 'server' : 'client'
      },
      'clientLatencyMillis',
      'serverLatencyMillis',
      'params',
      'bidResponse', bidResponse => bidResponse ? utils.pick(bidResponse, [
        'bidPriceUSD',
        'dealId',
        'dimensions',
        'mediaType'
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
  let referrer = config.getConfig('pageUrl') || auctionCache.referrer;
  let message = {
    eventTimeMillis: Date.now(),
    integration: config.getConfig('rubicon.int_type') || DEFAULT_INTEGRATION,
    version: '$prebid.version$',
    referrerUri: referrer
  };
  const wrapperName = config.getConfig('rubicon.wrapperName');
  if (wrapperName) {
    message.wrapperName = wrapperName;
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
          'adserverTargeting', () => stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {})
        ]);
        adUnit.bids = [];
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
  if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === 'USD') {
    return Number(bid.cpm);
  }
  // use currency conversion function if present
  if (typeof bid.getCpmInNewCurrency === 'function') {
    return Number(bid.getCpmInNewCurrency('USD'));
  }
  utils.logWarn('Rubicon Analytics Adapter: Could not determine the bidPriceUSD of the bid ', bid);
}

export function parseBidResponse(bid, previousBidResponse) {
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
    'dimensions', () => utils.pick(bid, [
      'width',
      'height'
    ]),
    'seatBidId',
  ]);
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

let baseAdapter = adapter({analyticsType: 'endpoint'});
let rubiconAdapter = Object.assign({}, baseAdapter, {
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
    accountId = null;
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
        cacheEntry.referrer = args.bidderRequests[0].refererInfo.referer;
        cache.auctions[args.auctionId] = cacheEntry;
        break;
      case BID_REQUESTED:
        Object.assign(cache.auctions[args.auctionId].bids, args.bids.reduce((memo, bid) => {
          // mark adUnits we expect bidWon events for
          cache.auctions[args.auctionId].bidsWon[bid.adUnitCode] = false;

          memo[bid.bidId] = utils.pick(bid, [
            'bidder', bidder => bidder.toLowerCase(),
            'bidId',
            'status', () => 'no-bid', // default a bid to no-bid until response is recieved or bid is timed out
            'finalSource as source',
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
              }
            ])
          ]);
          return memo;
        }, {}));
        break;
      case BID_RESPONSE:
        let bid = cache.auctions[args.auctionId].bids[args.requestId];
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
            bid.status = 'no-bid';
            delete bid.error;
            break;
          default:
            bid.status = 'error';
            bid.error = {
              code: 'request-error'
            };
        }
        bid.clientLatencyMillis = Date.now() - cache.auctions[args.auctionId].timestamp;
        bid.bidResponse = parseBidResponse(args, bid.bidResponse);
        break;
      case BIDDER_DONE:
        args.bids.forEach(bid => {
          let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId || bid.requestId];
          if (typeof bid.serverResponseTimeMs !== 'undefined') {
            cachedBid.serverLatencyMillis = bid.serverResponseTimeMs;
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
        } else if (Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
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
        }, SEND_TIMEOUT);
        break;
      case BID_TIMEOUT:
        args.forEach(badBid => {
          let auctionCache = cache.auctions[badBid.auctionId];
          let bid = auctionCache.bids[badBid.bidId || badBid.requestId];
          bid.status = 'error';
          bid.error = {
            code: 'timeout-error'
          };
        });
        break;
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: rubiconAdapter,
  code: 'rubicon'
});

export default rubiconAdapter;
