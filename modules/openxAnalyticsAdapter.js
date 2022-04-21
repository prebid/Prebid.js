import {
  _each,
  _map,
  deepAccess,
  flatten,
  getWindowLocation,
  isEmpty,
  logError,
  logInfo,
  logMessage,
  logWarn,
  parseQS,
  parseSizesInput,
  uniques
} from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {ajax} from '../src/ajax.js';
import {find, includes} from '../src/polyfill.js';

export const AUCTION_STATES = {
  INIT: 'initialized', // auction has initialized
  ENDED: 'ended', // all auction requests have been accounted for
  COMPLETED: 'completed' // all slots have rendered
};

const ADAPTER_VERSION = '0.1';
const SCHEMA_VERSION = '0.1';

const AUCTION_END_WAIT_TIME = 1000;
const URL_PARAM = '';
const ANALYTICS_TYPE = 'endpoint';
const ENDPOINT = 'https://prebid.openx.net/ox/analytics/';

// Event Types
const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, BID_TIMEOUT, AUCTION_END, BID_WON }
} = CONSTANTS;
const SLOT_LOADED = 'slotOnload';

const UTM_TAGS = [
  'utm_campaign',
  'utm_source',
  'utm_medium',
  'utm_term',
  'utm_content'
];
const UTM_TO_CAMPAIGN_PROPERTIES = {
  'utm_campaign': 'name',
  'utm_source': 'source',
  'utm_medium': 'medium',
  'utm_term': 'term',
  'utm_content': 'content'
};

/**
 * @typedef {Object} OxAnalyticsConfig
 * @property {string} orgId
 * @property {string} publisherPlatformId
 * @property {number} publisherAccountId
 * @property {string} configId
 * @property {string} optimizerConfig
 * @property {number} sampling
 * @property {Object} campaign
 * @property {number} payloadWaitTime
 * @property {number} payloadWaitTimePadding
 * @property {Array<string>} adUnits
 */

/**
 * @type {OxAnalyticsConfig}
 */
const DEFAULT_ANALYTICS_CONFIG = {
  orgId: void (0),
  publisherPlatformId: void (0),
  publisherAccountId: void (0),
  sampling: 0.05, // default sampling rate of 5%
  testCode: 'default',
  campaign: {},
  adUnits: [],
  payloadWaitTime: AUCTION_END_WAIT_TIME,
  payloadWaitTimePadding: 2000
};

// Initialization
/**
 * @type {OxAnalyticsConfig}
 */
let analyticsConfig;
let auctionMap = {};
let auctionOrder = 1; // tracks the number of auctions ran on the page

let googletag = window.googletag || {};
googletag.cmd = googletag.cmd || [];

let openxAdapter = Object.assign(adapter({ urlParam: URL_PARAM, analyticsType: ANALYTICS_TYPE }));

openxAdapter.originEnableAnalytics = openxAdapter.enableAnalytics;

openxAdapter.enableAnalytics = function(adapterConfig = {options: {}}) {
  if (isValidConfig(adapterConfig)) {
    analyticsConfig = {...DEFAULT_ANALYTICS_CONFIG, ...adapterConfig.options};

    // campaign properties defined by config will override utm query parameters
    analyticsConfig.campaign = {...buildCampaignFromUtmCodes(), ...analyticsConfig.campaign};

    logInfo('OpenX Analytics enabled with config', analyticsConfig);

    // override track method with v2 handlers
    openxAdapter.track = prebidAnalyticsEventHandler;

    googletag.cmd.push(function () {
      let pubads = googletag.pubads();

      if (pubads.addEventListener) {
        pubads.addEventListener(SLOT_LOADED, args => {
          openxAdapter.track({eventType: SLOT_LOADED, args});
          logInfo('OX: SlotOnLoad event triggered');
        });
      }
    });

    openxAdapter.originEnableAnalytics(adapterConfig);
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: openxAdapter,
  code: 'openx'
});

export default openxAdapter;

/**
 * Test Helper Functions
 */

// reset the cache for unit tests
openxAdapter.reset = function() {
  auctionMap = {};
  auctionOrder = 1;
};

/**
 * Private Functions
 */

function isValidConfig({options: analyticsOptions}) {
  let hasOrgId = analyticsOptions && analyticsOptions.orgId !== void (0);

  const fieldValidations = [
    // tuple of property, type, required
    ['orgId', 'string', hasOrgId],
    ['publisherPlatformId', 'string', !hasOrgId],
    ['publisherAccountId', 'number', !hasOrgId],
    ['configId', 'string', false],
    ['optimizerConfig', 'string', false],
    ['sampling', 'number', false],
    ['adIdKey', 'string', false],
    ['payloadWaitTime', 'number', false],
    ['payloadWaitTimePadding', 'number', false],
  ];

  let failedValidation = find(fieldValidations, ([property, type, required]) => {
    // if required, the property has to exist
    // if property exists, type check value
    return (required && !analyticsOptions.hasOwnProperty(property)) ||
      /* eslint-disable valid-typeof */
      (analyticsOptions.hasOwnProperty(property) && typeof analyticsOptions[property] !== type);
  });
  if (failedValidation) {
    let [property, type, required] = failedValidation;

    if (required) {
      logError(`OpenXAnalyticsAdapter: Expected '${property}' to exist and of type '${type}'`);
    } else {
      logError(`OpenXAnalyticsAdapter: Expected '${property}' to be type '${type}'`);
    }
  }

  return !failedValidation;
}

function buildCampaignFromUtmCodes() {
  const location = getWindowLocation();
  const queryParams = parseQS(location && location.search);
  let campaign = {};

  UTM_TAGS.forEach(function(utmKey) {
    let utmValue = queryParams[utmKey];
    if (utmValue) {
      let key = UTM_TO_CAMPAIGN_PROPERTIES[utmKey];
      campaign[key] = decodeURIComponent(utmValue);
    }
  });
  return campaign;
}

function detectMob() {
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
  ) {
    return true;
  } else {
    return false;
  }
}

function detectOS() {
  if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
  if (navigator.userAgent.indexOf('like Mac') != -1) return 'iOS';
  if (navigator.userAgent.indexOf('Win') != -1) return 'Windows';
  if (navigator.userAgent.indexOf('Mac') != -1) return 'Macintosh';
  if (navigator.userAgent.indexOf('Linux') != -1) return 'Linux';
  if (navigator.appVersion.indexOf('X11') != -1) return 'Unix';
  return 'Others';
}

function detectBrowser() {
  var isChrome =
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  var isCriOS = navigator.userAgent.match('CriOS');
  var isSafari =
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor);
  var isFirefox = /Firefox/.test(navigator.userAgent);
  var isIE =
    /Trident/.test(navigator.userAgent) || /MSIE/.test(navigator.userAgent);
  var isEdge = /Edge/.test(navigator.userAgent);
  if (isIE) return 'Internet Explorer';
  if (isEdge) return 'Microsoft Edge';
  if (isCriOS) return 'Chrome';
  if (isSafari) return 'Safari';
  if (isFirefox) return 'Firefox';
  if (isChrome) return 'Chrome';
  return 'Others';
}

function prebidAnalyticsEventHandler({eventType, args}) {
  logMessage(eventType, Object.assign({}, args));
  switch (eventType) {
    case AUCTION_INIT:
      onAuctionInit(args);
      break;
    case BID_REQUESTED:
      onBidRequested(args);
      break;
    case BID_RESPONSE:
      onBidResponse(args);
      break;
    case BID_TIMEOUT:
      onBidTimeout(args);
      break;
    case AUCTION_END:
      onAuctionEnd(args);
      break;
    case BID_WON:
      onBidWon(args);
      break;
    case SLOT_LOADED:
      onSlotLoadedV2(args);
      break;
  }
}

/**
 * @typedef {Object} PbAuction
 * @property {string} auctionId - Auction ID of the request this bid responded to
 * @property {number} timestamp //: 1586675964364
 * @property {number} auctionEnd - timestamp of when auction ended //: 1586675964364
 * @property {string} auctionStatus //: "inProgress"
 * @property {Array<Adunit>} adUnits //: [{…}]
 * @property {string} adUnitCodes //: ["video1"]
 * @property {string} labels //: undefined
 * @property {Array<BidRequest>} bidderRequests //: (2) [{…}, {…}]
 * @property {Array<BidRequest>} noBids //: []
 * @property {Array<BidResponse>} bidsReceived //: []
 * @property {Array<BidResponse>} winningBids //: []
 * @property {number} timeout //: 3000
 * @property {Object} config //: {publisherPlatformId: "a3aece0c-9e80-4316-8deb-faf804779bd1", publisherAccountId: 537143056, sampling: 1}/*
 */

function onAuctionInit({auctionId, timestamp: startTime, timeout, adUnitCodes}) {
  auctionMap[auctionId] = {
    id: auctionId,
    startTime,
    endTime: void (0),
    timeout,
    auctionOrder,
    userIds: [],
    adUnitCodesCount: adUnitCodes.length,
    adunitCodesRenderedCount: 0,
    state: AUCTION_STATES.INIT,
    auctionSendDelayTimer: void (0),
  };

  // setup adunit properties in map
  auctionMap[auctionId].adUnitCodeToAdUnitMap = adUnitCodes.reduce((obj, adunitCode) => {
    obj[adunitCode] = {
      code: adunitCode,
      adPosition: void (0),
      bidRequestsMap: {}
    };
    return obj;
  }, {});

  auctionOrder++;
}

/**
 * @typedef {Object} PbBidRequest
 * @property {string} auctionId - Auction ID of the request this bid responded to
 * @property {number} auctionStart //: 1586675964364
 * @property {Object} refererInfo
 * @property {PbBidderRequest} bids
 * @property {number} start - Start timestamp of the bidder request
 *
 */

/**
 * @typedef {Object} PbBidderRequest
 * @property {string} adUnitCode - Name of div or google adunit path
 * @property {string} bidder - Bame of bidder
 * @property {string} bidId - Identifies the bid request
 * @property {Object} mediaTypes
 * @property {Object} params
 * @property {string} src
 * @property {Object} userId - Map of userId module to module object
 */

/**
 * Tracks the bid request
 * @param {PbBidRequest} bidRequest
 */
function onBidRequested(bidRequest) {
  const {auctionId, bids: bidderRequests, start, timeout} = bidRequest;
  const auction = auctionMap[auctionId];
  const adUnitCodeToAdUnitMap = auction.adUnitCodeToAdUnitMap;

  bidderRequests.forEach(bidderRequest => {
    const { adUnitCode, bidder, bidId: requestId, mediaTypes, params, src, userId } = bidderRequest;

    auction.userIds.push(userId);
    adUnitCodeToAdUnitMap[adUnitCode].bidRequestsMap[requestId] = {
      bidder,
      params,
      mediaTypes,
      source: src,
      startTime: start,
      timedOut: false,
      timeLimit: timeout,
      bids: {}
    };
  });
}

/**
 *
 * @param {BidResponse} bidResponse
 */
function onBidResponse(bidResponse) {
  let {
    auctionId,
    adUnitCode,
    requestId,
    cpm,
    creativeId,
    requestTimestamp,
    responseTimestamp,
    ts,
    mediaType,
    dealId,
    ttl,
    netRevenue,
    currency,
    originalCpm,
    originalCurrency,
    width,
    height,
    timeToRespond: latency,
    adId,
    meta
  } = bidResponse;

  auctionMap[auctionId].adUnitCodeToAdUnitMap[adUnitCode].bidRequestsMap[requestId].bids[adId] = {
    cpm,
    creativeId,
    requestTimestamp,
    responseTimestamp,
    ts,
    adId,
    meta,
    mediaType,
    dealId,
    ttl,
    netRevenue,
    currency,
    originalCpm,
    originalCurrency,
    width,
    height,
    latency,
    winner: false,
    rendered: false,
    renderTime: 0,
  };
}

function onBidTimeout(args) {
  _each(args, ({auctionId, adUnitCode, bidId: requestId}) => {
    let timedOutRequest = deepAccess(auctionMap,
      `${auctionId}.adUnitCodeToAdUnitMap.${adUnitCode}.bidRequestsMap.${requestId}`);

    if (timedOutRequest) {
      timedOutRequest.timedOut = true;
    }
  });
}
/**
 *
 * @param {PbAuction} endedAuction
 */
function onAuctionEnd(endedAuction) {
  let auction = auctionMap[endedAuction.auctionId];

  if (!auction) {
    return;
  }

  clearAuctionTimer(auction);
  auction.endTime = endedAuction.auctionEnd;
  auction.state = AUCTION_STATES.ENDED;
  delayedSend(auction);
}

/**
 *
 * @param {BidResponse} bidResponse
 */
function onBidWon(bidResponse) {
  const { auctionId, adUnitCode, requestId, adId } = bidResponse;
  let winningBid = deepAccess(auctionMap,
    `${auctionId}.adUnitCodeToAdUnitMap.${adUnitCode}.bidRequestsMap.${requestId}.bids.${adId}`);

  if (winningBid) {
    winningBid.winner = true;
    const auction = auctionMap[auctionId];
    if (auction.sent) {
      const endpoint = (analyticsConfig.endpoint || ENDPOINT) + 'event';
      const bidder = auction.adUnitCodeToAdUnitMap[adUnitCode].bidRequestsMap[requestId].bidder;
      ajax(`${endpoint}?t=win&b=${adId}&a=${analyticsConfig.orgId}&bidder=${bidder}&ts=${auction.startTime}`,
        () => {
          logInfo(`Openx Analytics - Sending complete impression event for ${adId} at ${Date.now()}`)
        });
    } else {
      logInfo(`Openx Analytics - impression event for ${adId} will be sent with auction data`)
    }
  }
}

/**
 *
 * @param {GoogleTagSlot} slot
 * @param {string} serviceName
 */
function onSlotLoadedV2({ slot }) {
  const renderTime = Date.now();
  const elementId = slot.getSlotElementId();
  const bidId = slot.getTargeting('hb_adid')[0];

  let [auction, adUnit, bid] = getPathToBidResponseByBidId(bidId);

  if (!auction) {
    // attempt to get auction by adUnitCode
    auction = getAuctionByGoogleTagSLot(slot);

    if (!auction) {
      return; // slot is not participating in an active prebid auction
    }
  }

  clearAuctionTimer(auction);

  // track that an adunit code has completed within an auction
  auction.adunitCodesRenderedCount++;

  // mark adunit as rendered
  if (bid) {
    let {x, y} = getPageOffset();
    bid.rendered = true;
    bid.renderTime = renderTime;
    adUnit.adPosition = isAtf(elementId, x, y) ? 'ATF' : 'BTF';
  }

  if (auction.adunitCodesRenderedCount === auction.adUnitCodesCount) {
    auction.state = AUCTION_STATES.COMPLETED;
  }

  // prepare to send regardless if auction is complete or not as a failsafe in case not all events are tracked
  // add additional padding when not all slots are rendered
  delayedSend(auction);
}

function isAtf(elementId, scrollLeft = 0, scrollTop = 0) {
  let elem = document.querySelector('#' + elementId);
  let isAtf = false;
  if (elem) {
    let bounding = elem.getBoundingClientRect();
    if (bounding) {
      let windowWidth = (window.innerWidth || document.documentElement.clientWidth);
      let windowHeight = (window.innerHeight || document.documentElement.clientHeight);

      // intersection coordinates
      let left = Math.max(0, bounding.left + scrollLeft);
      let right = Math.min(windowWidth, bounding.right + scrollLeft);
      let top = Math.max(0, bounding.top + scrollTop);
      let bottom = Math.min(windowHeight, bounding.bottom + scrollTop);

      let intersectionWidth = right - left;
      let intersectionHeight = bottom - top;

      let intersectionArea = (intersectionHeight > 0 && intersectionWidth > 0) ? (intersectionHeight * intersectionWidth) : 0;
      let adSlotArea = (bounding.right - bounding.left) * (bounding.bottom - bounding.top);

      if (adSlotArea > 0) {
        // Atleast 50% of intersection in window
        isAtf = intersectionArea * 2 >= adSlotArea;
      }
    }
  } else {
    logWarn('OX: DOM element not for id ' + elementId);
  }
  return isAtf;
}

// backwards compatible pageOffset from https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX
function getPageOffset() {
  var x = (window.pageXOffset !== undefined)
    ? window.pageXOffset
    : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  var y = (window.pageYOffset !== undefined)
    ? window.pageYOffset
    : (document.documentElement || document.body.parentNode || document.body).scrollTop;
  return {x, y};
}

function delayedSend(auction) {
  if (auction.sent) {
    return;
  }
  const delayTime = auction.adunitCodesRenderedCount === auction.adUnitCodesCount
    ? analyticsConfig.payloadWaitTime
    : analyticsConfig.payloadWaitTime + analyticsConfig.payloadWaitTimePadding;

  auction.auctionSendDelayTimer = setTimeout(() => {
    auction.sent = true; // any BidWon emitted after this will be recorded separately
    let payload = JSON.stringify([buildAuctionPayload(auction)]);

    ajax(analyticsConfig.endpoint || ENDPOINT, () => {
      logInfo(`OpenX Analytics - Sending complete auction at ${Date.now()}`);
    }, payload, { contentType: 'application/json' });
  }, delayTime);
}

function clearAuctionTimer(auction) {
  // reset the delay timer to send the auction data
  if (auction.auctionSendDelayTimer) {
    clearTimeout(auction.auctionSendDelayTimer);
    auction.auctionSendDelayTimer = void (0);
  }
}

/**
 * Returns the path to a bid (auction, adunit, bidRequest, and bid) based on a bidId
 * @param {string} bidId
 * @returns {Array<*>}
 */
function getPathToBidResponseByBidId(bidId) {
  let auction;
  let adUnit;
  let bidResponse;

  if (!bidId) {
    return [];
  }

  _each(auctionMap, currentAuction => {
    // skip completed auctions
    if (currentAuction.state === AUCTION_STATES.COMPLETED) {
      return;
    }

    _each(currentAuction.adUnitCodeToAdUnitMap, (currentAdunit) => {
      _each(currentAdunit.bidRequestsMap, currentBiddRequest => {
        _each(currentBiddRequest.bids, (currentBidResponse, bidResponseId) => {
          if (bidId === bidResponseId) {
            auction = currentAuction;
            adUnit = currentAdunit;
            bidResponse = currentBidResponse;
          }
        });
      });
    });
  });
  return [auction, adUnit, bidResponse];
}

function getAuctionByGoogleTagSLot(slot) {
  let slotAdunitCodes = [slot.getSlotElementId(), slot.getAdUnitPath()];
  let slotAuction;

  _each(auctionMap, auction => {
    if (auction.state === AUCTION_STATES.COMPLETED) {
      return;
    }

    _each(auction.adUnitCodeToAdUnitMap, (bidderRequestIdMap, adUnitCode) => {
      if (includes(slotAdunitCodes, adUnitCode)) {
        slotAuction = auction;
      }
    });
  });

  return slotAuction;
}

function buildAuctionPayload(auction) {
  let {startTime, endTime, state, timeout, auctionOrder, userIds, adUnitCodeToAdUnitMap, id} = auction;
  const auctionId = id;
  let {orgId, publisherPlatformId, publisherAccountId, campaign, testCode, configId, optimizerConfig} = analyticsConfig;

  return {
    auctionId,
    adapterVersion: ADAPTER_VERSION,
    schemaVersion: SCHEMA_VERSION,
    orgId,
    publisherPlatformId,
    publisherAccountId,
    configId,
    optimizerConfig,
    campaign,
    state,
    startTime,
    endTime,
    timeLimit: timeout,
    auctionOrder,
    deviceType: detectMob() ? 'Mobile' : 'Desktop',
    deviceOSType: detectOS(),
    browser: detectBrowser(),
    testCode: testCode,
    // return an array of module name that have user data
    userIdProviders: buildUserIdProviders(userIds),
    adUnits: buildAdUnitsPayload(adUnitCodeToAdUnitMap),
  };

  function buildAdUnitsPayload(adUnitCodeToAdUnitMap) {
    return _map(adUnitCodeToAdUnitMap, (adUnit) => {
      let {code, adPosition} = adUnit;

      return {
        code,
        adPosition,
        bidRequests: buildBidRequestPayload(adUnit.bidRequestsMap)
      };

      function buildBidRequestPayload(bidRequestsMap) {
        return _map(bidRequestsMap, (bidRequest) => {
          let {bidder, source, bids, mediaTypes, timeLimit, timedOut} = bidRequest;
          return {
            bidder,
            source,
            hasBidderResponded: Object.keys(bids).length > 0,
            availableAdSizes: getMediaTypeSizes(mediaTypes),
            availableMediaTypes: getMediaTypes(mediaTypes),
            timeLimit,
            timedOut,
            bidResponses: _map(bidRequest.bids, (bidderBidResponse) => {
              let {
                adId,
                cpm,
                creativeId,
                ts,
                meta,
                mediaType,
                dealId,
                ttl,
                netRevenue,
                currency,
                width,
                height,
                latency,
                winner,
                rendered,
                renderTime
              } = bidderBidResponse;

              return {
                bidId: adId,
                microCpm: cpm * 1000000,
                netRevenue,
                currency,
                mediaType,
                height,
                width,
                size: `${width}x${height}`,
                dealId,
                latency,
                ttl,
                winner,
                creativeId,
                ts,
                rendered,
                renderTime,
                meta
              }
            })
          }
        });
      }
    });
  }

  function buildUserIdProviders(userIds) {
    return _map(userIds, (userId) => {
      return _map(userId, (id, module) => {
        return hasUserData(module, id) ? module : false
      }).filter(module => module);
    }).reduce(flatten, []).filter(uniques).sort();
  }

  function hasUserData(module, idOrIdObject) {
    let normalizedId;

    switch (module) {
      case 'digitrustid':
        normalizedId = deepAccess(idOrIdObject, 'data.id');
        break;
      case 'lipb':
        normalizedId = idOrIdObject.lipbid;
        break;
      default:
        normalizedId = idOrIdObject;
    }

    return !isEmpty(normalizedId);
  }

  function getMediaTypeSizes(mediaTypes) {
    return _map(mediaTypes, (mediaTypeConfig, mediaType) => {
      return parseSizesInput(mediaTypeConfig.sizes)
        .map(size => `${mediaType}_${size}`);
    }).reduce(flatten, []);
  }

  function getMediaTypes(mediaTypes) {
    return _map(mediaTypes, (mediaTypeConfig, mediaType) => mediaType);
  }
}
