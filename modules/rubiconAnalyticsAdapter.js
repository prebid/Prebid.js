import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import { ajax } from 'src/ajax';
import { config } from 'src/config';
import * as utils from 'src/utils';

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
const INTEGRATION = 'pbjs';

const cache = {
  auctions: {},
  targeting: {},
  timeouts: {},
};

// basically lodash#pick that also allows transformation functions and property renaming
function _pick(obj, properties) {
  return properties.reduce((newObj, prop, i) => {
    if (typeof prop === 'function') {
      return newObj;
    }

    let newProp = prop;
    let match = prop.match(/^(.+?)\sas\s(.+?)$/i);

    if (match) {
      prop = match[1];
      newProp = match[2];
    }

    let value = obj[prop];
    if (typeof properties[i + 1] === 'function') {
      value = properties[i + 1](value, newObj);
    }
    if (typeof value !== 'undefined') {
      newObj[newProp] = value;
    }

    return newObj;
  }, {});
}

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
    return _pick(bid, [
      'bidder',
      'bidId',
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
      'bidResponse', bidResponse => bidResponse ? _pick(bidResponse, [
        'bidPriceUSD',
        'dealId',
        'dimensions',
        'mediaType'
      ]) : undefined
    ]);
  }
  function formatBidWon(bid) {
    return Object.assign(formatBid(bid), _pick(bid.adUnit, [
      'adUnitCode',
      'transactionId',
      'videoAdFormat', () => bid.videoAdFormat,
      'mediaTypes'
    ]), {
      adserverTargeting: stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {}),
      bidwonStatus: 'success', // hard-coded for now
      accountId,
      samplingFactor
    });
  }
  let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl();
  let message = {
    eventTimeMillis: Date.now(),
    integration: INTEGRATION,
    version: '$prebid.version$',
    referrerUri: referrer
  };
  let auctionCache = cache.auctions[auctionId];
  if (auctionCache && !auctionCache.sent) {
    let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
      let bid = auctionCache.bids[bidId];
      let adUnit = adUnits[bid.adUnit.adUnitCode];
      if (!adUnit) {
        adUnit = adUnits[bid.adUnit.adUnitCode] = _pick(bid.adUnit, [
          'adUnitCode',
          'transactionId',
          'mediaTypes',
          'dimensions',
          'adserverTargeting', () => stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {})
        ]);
        adUnit.bids = [];
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

function parseBidResponse(bid) {
  return _pick(bid, [
    'getCpmInNewCurrency as bidPriceUSD', (fn) => {
      if (bid.currency === 'USD') {
        return Number(bid.cpm);
      }
      // use currency conversion function if present
      if (typeof fn === 'function') {
        return Number(fn('USD'));
      }
      // TODO: throw error or something if not USD and currency module wasn't present?
    },
    'dealId',
    'status',
    'mediaType',
    'dimensions', () => _pick(bid, [
      'width',
      'height'
    ])
  ]);
}

let samplingFactor = 1;
let accountId;

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
        let cacheEntry = _pick(args, [
          'timestamp',
          'timeout'
        ]);
        cacheEntry.bids = {};
        cacheEntry.bidsWon = {};
        cache.auctions[args.auctionId] = cacheEntry;
        break;
      case BID_REQUESTED:
        Object.assign(cache.auctions[args.auctionId].bids, args.bids.reduce((memo, bid) => {
          // mark adUnits we expect bidWon events for
          cache.auctions[args.auctionId].bidsWon[bid.adUnitCode] = false;

          memo[bid.bidId] = _pick(bid, [
            'bidder', bidder => bidder.toLowerCase(),
            'bidId',
            'status', () => 'no-bid', // default a bid to no-bid until response is recieved or bid is timed out
            'finalSource as source',
            'params', (params, bid) => {
              switch (bid.bidder) {
                // specify bidder params we want here
                case 'rubicon':
                  return _pick(params, [
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
            'adUnit', () => _pick(bid, [
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
        let bid = cache.auctions[args.auctionId].bids[args.adId];
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
        bid.bidResponse = parseBidResponse(args);
        break;
      case BIDDER_DONE:
        args.bids.forEach(bid => {
          let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId || bid.adId];
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
        auctionCache.bidsWon[args.adUnitCode] = args.adId;

        // check if this BID_WON missed the boat, if so send by itself
        if (auctionCache.sent === true) {
          sendMessage.call(this, args.auctionId, args.adId);
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
          let bid = auctionCache.bids[badBid.bidId || badBid.adId];
          bid.status = 'error';
          bid.error = {
            code: 'timeout-error'
          };
        });
        break;
    }
  }
});

adaptermanager.registerAnalyticsAdapter({
  adapter: rubiconAdapter,
  code: 'rubicon'
});

export default rubiconAdapter;
