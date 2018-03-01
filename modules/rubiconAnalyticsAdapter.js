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

const ENDPOINT = '//localhost:9999/test';
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

function sizeToDimensions(size) {
  return {
    width: size[0],
    height: size[1]
  };
}

function validMediaType(type) {
  return ['display', 'native', 'video'].indexOf(type) === -1;
}

function parseUrl(url) {
  let parser = document.createElement('a');
  parser.href = url;
  return parser;
}

export function getDomain(referrer) {
  let parts = referrer.split('.');

  if (parts.length === 1) {
    return referrer;
  }

  if (parts[0] === 'www') {
    parts.shift();
  }
  let last = parts.length - 1;
  if (parts[last].length === 2 && parts[last - 1].length < 4) {

  }
  return parts[last - 1] + '.' + parts[last];
}

function getDeviceType() {
  // Get the width and height of the screen
  // Default to value that matches "desktop" (> 1024) if not supported
  // because that means this is probably an old browser and therefore definitely NOT a tablet or phone
  let height = window.screen.height || 1025;
  let width = window.screen.width || 1025;

  // Take the highest of the two, in case we are in portrait mode with a phone
  let nApplicableWidth = Math.max(height, width);

  let device = 'desktop';
  if (nApplicableWidth <= 736) {
    // Phones are 736px wide or less (iphone 6 = 667px, 6+ = 736px)
    device = 'phone';
  } else if (nApplicableWidth <= 1024) {
    // Tables are 1024 pixels wide or less
    device = 'tablet';
  }

  return device;
}

function sendMessage(auctionId, bidWonId) {
  function formatBid(bid) {
    return _pick(bid, [
      'bidder',
      'transactionId',
      'bidId',
      'status',
      'error',
      'source',
      'clientLatencyMillis',
      'params',
      'bidResponse', bidResponse => bidResponse ? _pick(bidResponse, [
        'bidPriceUSD',
        'dealId',
        'dimensions',
        'adserverTargeting'
      ]) : undefined
    ]);
  }
  let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl();
  let message = {
    eventTimeMillis: Date.now(),
    integration: INTEGRATION,
    version: '$prebid.version$',
    referrerUri: referrer,
    domain: getDomain(parseUrl(referrer).hostname),
    client: {
      deviceClass: getDeviceType()
    }
  };
  let auctionCache = cache.auctions[auctionId];
  if (auctionCache && !auctionCache.sent) {
    let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
      let bid = auctionCache.bids[bidId];
      let adUnit = adUnits[bid.adUnit.adUnitCode];
      if (!adUnit) {
        adUnit = adUnits[bid.adUnit.adUnitCode] = _pick(bid.adUnit, [
          'adUnitCode',
          'mediaTypes',
          'dimensions',
          'adserverTargeting', () => cache.targeting[bid.adUnit.adUnitCode]
        ]);
        adUnit.bids = [];
      }

      adUnit.bids.push(formatBid(bid));

      return adUnits;
    }, {});

    let serverConfig = config.getConfig('s2sConfig');

    let auction = {
      clientTimeoutMillis: auctionCache.timeout,
      adUnits: Object.keys(adUnitMap).map(i => adUnitMap[i])
    };

    if (serverConfig) {
      auction.serverAccountId = serverConfig.accountId;
      auction.serverTimeoutMillis = serverConfig.timeout;
    }

    message.auctions = [auction];

    message.bidsWon = Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
      let bidId = auctionCache.bidsWon[adUnitCode];
      if (bidId) {
        memo.push(formatBid(auctionCache.bids[bidId]));
      }
      return memo;
    }, []);

    auctionCache.sent = true;
  } else if (bidWonId && auctionCache && auctionCache.bids[bidWonId]) {
    message.bidsWon = [
      formatBid(auctionCache.bids[bidWonId])
    ];
  }

  ajax(this.getUrl(), null, JSON.stringify(message));
}

function parseBidResponse(bid) {
  return _pick(bid, [
    'bidPriceUSD', () => {
      if (bid.currency === 'USD') {
        return bid.cpm;
      }
      // TODO: throw error or something if not USD?
    },
    'adserverTargeting',
    'dealId',
    'status',
    'dimensions', () => _pick(bid, [
      'width',
      'height'
    ])
  ]);
}

let baseAdapter = adapter({url: ENDPOINT, analyticsType: 'endpoint'});
let rubiconAdapter = Object.assign({}, baseAdapter, {
  enableAnalytics(config = {}) {
    if (typeof config.options === 'object') {
      if (config.options.endpoint) {
        this.getUrl = () => config.options.endpoint;
      }
    }
    baseAdapter.enableAnalytics.apply(this, arguments);
  },
  disableAnalytics() {
    this.getUrl = baseAdapter.getUrl;
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
            'transactionId',
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
            'adUnit', () => _pick(bid, [
              'adUnitCode',
              'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
              'mediaTypes', (types, bid) => {
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
        bid.source = args.source;
        switch (args.getStatusCode()) {
          case GOOD:
            bid.status = 'success';
            break;
          case NO_BID:
            bid.status = 'nobid';
            break;
          default:
            bid.status = 'error';
            bid.error = 'request-error';
        }
        bid.clientLatencyMillis = Date.now() - cache.auctions[args.auctionId].timestamp;
        bid.bidResponse = parseBidResponse(args);
        break;
      case BIDDER_DONE:
        args.bids.forEach(bid => {
          let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId];
          if (!cachedBid.status) {
            cachedBid.status = 'noBid';
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
          let bid = auctionCache.bids[badBid.bidId];
          bid.status = 'error';
          bid.error = 'timeout-error';
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
