import { deepAccess, logInfo, logWarn, logError } from '../src/utils.js';
import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager, { uspDataHandler } from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

/**
 * @typedef {typeof import('../src/constants.json').EVENTS} EVENTS
 */
const { EVENTS } = CONSTANTS;

const ANALYTICS_VERSION = '1.0.0';
const PROVIDER_NAME = '33across';
const GVLID = 58;
/** Time to wait for all transactions in an auction to complete before sending the report */
const DEFAULT_TRANSACTION_TIMEOUT = 10000;
/** Time to wait after all GAM slots have registered before sending the report */
const POST_GAM_TIMEOUT = 500;
export const DEFAULT_ENDPOINT = `${window.origin}/api`; // TODO: Update to production endpoint

export const log = getLogger();

/**
 * @typedef {Object} AnalyticsReport - Sent when all bids are complete (as determined by `bidWon` and `slotRenderEnded` events)
 * @property {string} analyticsVersion - Version of the Prebid.js 33Across Analytics Adapter
 * @property {string} pid - Partner ID
 * @property {string} src - Source of the report ('pbjs')
 * @property {string} pbjsVersion - Version of Prebid.js
 * @property {Auction[]} auctions
 */

/**
 * @typedef {Object} AnalyticsCache
 * @property {string} pid Partner ID
 * @property {Object<string, Auction>} auctions
 * @property {string} [usPrivacy]
 */

/**
 * @typedef {Object} Auction - Parsed auction data
 * @property {AdUnit[]} adUnits
 * @property {string} auctionId
 * @property {string[]} userIds
 */

/**
 * @typedef {`${number}x${number}`} AdUnitSize
 */

/**
 * @typedef {('banner'|'native'|'video')} AdUnitMediaType
 */

/**
 * @typedef {Object} BidResponse
 * @property {number} cpm
 * @property {string} cur
 * @property {number} [cpmOrig]
 * @property {number} cpmFloor
 * @property {AdUnitMediaType} mediaType
 * @property {AdUnitSize} size
 */

/**
 * @typedef {Object} Bid - Parsed bid data
 * @property {string} bidder
 * @property {string} bidId
 * @property {string} source
 * @property {string} status
 * @property {BidResponse} [bidResponse]
 * @property {1|0} [hasWon]
 */

/**
 * @typedef {Object} AdUnit - Parsed adUnit data
 * @property {string} transactionId - Primary key for *this* auction/adUnit combination
 * @property {string} adUnitCode
 * @property {string} slotId - Equivalent to GPID. (Note that
 * GPID supports adUnits where multiple units have the same `code` values
 * by appending a `#UNIQUIFIER`. The value of the UNIQUIFIER is likely to be the div-id,
 * but, if div-id is randomized / unavailable, may be something else like the media size)
 * @property {Array<AdUnitMediaType>} mediaTypes
 * @property {Array<AdUnitSize>} sizes
 * @property {Array<Bid>} bids
 */

/**
 * After the first transaction begins, wait until all transactions are complete
 * before calling `onComplete`. If the timeout is reached before all transactions
 * are complete, send the report anyway.
 *
 * Use this to track all transactions per auction, and send the report as soon
 * as all adUnits have been won (or after timeout) even if other bid/auction
 * activity is still happening.
 */
class TransactionManager {
  /**
   * Milliseconds between activity to allow until this collection automatically completes.
   * @type {number}
   */
  #sendTimeout;
  #sendTimeoutId;
  #transactionsPending = new Set();
  #transactionsCompleted = new Set();
  #onComplete;

  constructor({ timeout, onComplete }) {
    this.#sendTimeout = timeout;
    this.#onComplete = onComplete;
  }

  status() {
    return {
      pending: [...this.#transactionsPending],
      completed: [...this.#transactionsCompleted],
    };
  }

  initiate(transactionId) {
    this.#transactionsPending.add(transactionId);
    this.#restartSendTimeout();
  }

  complete(transactionId) {
    if (!this.#transactionsPending.has(transactionId)) {
      log.warn(`transactionId "${transactionId}" was not found. No transaction to mark as complete.`);
      return;
    }

    this.#transactionsPending.delete(transactionId);
    this.#transactionsCompleted.add(transactionId);

    if (this.#transactionsPending.size === 0) {
      this.#flushTransactions();
    }
  }

  #flushTransactions() {
    this.#clearSendTimeout();
    this.#transactionsPending = new Set();
    this.#onComplete();
  }

  // gulp-eslint is using eslint 6, a version that doesn't support private method syntax
  // eslint-disable-next-line no-dupe-class-members
  #clearSendTimeout() {
    return clearTimeout(this.#sendTimeoutId);
  }

  // eslint-disable-next-line no-dupe-class-members
  #restartSendTimeout() {
    this.#clearSendTimeout();

    this.#sendTimeoutId = setTimeout(() => {
      if (this.#sendTimeout !== 0) {
        log.warn(`Timed out waiting for ad transactions to complete. Sending report.`);
      }

      this.#flushTransactions();
    }, this.#sendTimeout);
  }
}

/**
 * initialized during `enableAnalytics`
 */
const locals = {
  /** @type {Object<string, TransactionManager>} - one manager per auction */
  transactionManagers: {},
  /** @type {AnalyticsCache} */
  cache: {
    auctions: {},
    pid: '',
  },
  /** @type {Object<string, Object>} */
  adUnitMap: {},
  reset() {
    this.transactionManagers = {};
    this.cache = {
      auctions: {},
      pid: '',
    };
    this.adUnitMap = {};
  }
}

/**
 * @typedef {Object} AnalyticsAdapter
 * @property {function} track
 * @property {function} enableAnalytics
 * @property {function} disableAnalytics
 * @property {function} [originEnableAnalytics]
 * @property {function} [originDisableAnalytics]
 * @property {function} [_oldEnable]
 */

/**
 * @type {AnalyticsAdapter}
 */
const analyticsAdapter = Object.assign(
  buildAdapter({ analyticsType: 'endpoint' }),
  { track: analyticEventHandler }
);

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;
analyticsAdapter.enableAnalytics = enableAnalyticsWrapper;

/**
 * @typedef {Object} AnalyticsConfig
 * @property {string} provider - set by pbjs at module registration time
 * @property {Object} options
 * @property {string} options.pid - Publisher/Partner ID
 * @property {string} [options.endpoint=DEFAULT_ENDPOINT] - Endpoint to send analytics data
 * @property {number} [options.timeout=DEFAULT_TRANSACTION_TIMEOUT] - Timeout for sending analytics data
 */

/**
 * @param {AnalyticsConfig} config Analytics module configuration
 */
function enableAnalyticsWrapper(config) {
  const { options } = config;

  const pid = options.pid;
  if (!pid) {
    log.error('No partnerId provided for "options.pid". No analytics will be sent.');

    return;
  }

  const endpoint = calculateEndpoint(options.endpoint);
  this.getUrl = () => endpoint;

  const timeout = calculateTransactionTimeout(options.timeout);
  this.getTimeout = () => timeout;

  locals.cache = {
    pid,
    auctions: {},
  };

  window.googletag = window.googletag || { cmd: [] };
  window.googletag.cmd.push(subscribeToGamSlots);

  analyticsAdapter.originEnableAnalytics(config);

  function subscribeToGamSlots() {
    window.googletag.pubads().addEventListener('slotRenderEnded', event => {
      setTimeout(() => {
        const { transactionId, auctionId } = getAdUnitMetadata(event.slot.getAdUnitPath());
        locals.transactionManagers[auctionId] &&
          locals.transactionManagers[auctionId].complete(transactionId);
      }, POST_GAM_TIMEOUT);
    });
  }
}

/**
 * @param {string} [endpoint]
 * @returns {string}
 */
function calculateEndpoint(endpoint = DEFAULT_ENDPOINT) {
  if (typeof endpoint === 'string' && endpoint.startsWith('http')) {
    return endpoint;
  }

  log.info(`Invalid endpoint provided for "options.endpoint". Using default endpoint.`);

  return DEFAULT_ENDPOINT;
}
/**
 * @param {number} [configTimeout]
 * @returns {number} Transaction Timeout
 */
function calculateTransactionTimeout(configTimeout = DEFAULT_TRANSACTION_TIMEOUT) {
  if (typeof configTimeout === 'number' && configTimeout >= 0) {
    return configTimeout;
  }

  log.info(`Invalid timeout provided for "options.timeout". Using default timeout of ${DEFAULT_TRANSACTION_TIMEOUT}ms.`);

  return DEFAULT_TRANSACTION_TIMEOUT;
}

/** necessary for testing */
analyticsAdapter.originDisableAnalytics = analyticsAdapter.disableAnalytics;
analyticsAdapter.disableAnalytics = function () {
  analyticsAdapter._oldEnable = enableAnalyticsWrapper;
  locals.reset();
  analyticsAdapter.originDisableAnalytics();
};

adapterManager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: PROVIDER_NAME,
  gvlid: GVLID,
});

export default analyticsAdapter;

/**
 * @param {AnalyticsCache} analyticsCache
 * @param {string} completedAuctionId value of auctionId
 * @return {AnalyticsReport} Analytics report
 */
function createReportFromCache(analyticsCache, completedAuctionId) {
  const { pid, auctions } = analyticsCache;

  const report = {
    pid,
    src: 'pbjs',
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$', // Replaced by build script
    auctions: [ auctions[completedAuctionId] ],
  }
  if (uspDataHandler.getConsentData()) {
    report.usPrivacy = uspDataHandler.getConsentData();
  }

  return report;
}

function getCachedBid(auctionId, bidId) {
  const auction = locals.cache.auctions[auctionId];
  for (let adUnit of auction.adUnits) {
    for (let bid of adUnit.bids) {
      if (bid.bidId === bidId) {
        return bid;
      }
    }
  }
};

/**
 * @param {Object} args
 * @param {Object} args.args Event data
 * @param {EVENTS[keyof EVENTS]} args.eventType
 */
function analyticEventHandler({ eventType, args }) {
  if (!locals.cache) {
    log.error('Something went wrong. Analytics cache is not initialized.');
    return;
  }

  switch (eventType) {
    case EVENTS.AUCTION_INIT:
      onAuctionInit(args);
      break;
    case EVENTS.BID_REQUESTED: // set bid.status: 'pending'
      onBidRequested(args);
      break;
    case EVENTS.BID_TIMEOUT:
      setBidStatus(getCachedBid(args.auctionId, args.bidId), 'timeout');
      break;
    case EVENTS.BID_RESPONSE:
      onBidResponse(args);
      break;
    case EVENTS.BID_REJECTED:
      setBidStatus(getCachedBid(args.auctionId, args.bidId), 'rejected');
      break;
    case EVENTS.NO_BID:
    case EVENTS.SEAT_NON_BID:
      setBidStatus(getCachedBid(args.auctionId, args.bidId), 'noBid');
      break;
    case EVENTS.BIDDER_ERROR:
      if (args.bidderRequest && args.bidderRequest.bids) {
        for (let bid of args.bidderRequest.bids) {
          setBidStatus(getCachedBid(args.auctionId, bid.bidId), 'error');
        }
      }
      break;
    case EVENTS.AUCTION_END:
      onAuctionEnd(args);
      break;
    case EVENTS.BID_WON: // bid.status: 'targetingSet' | 'rendered' | 'error'
      onBidWon(args);
      break;
    default:
      break;
  }
}

function onAuctionEnd({ bidsReceived, auctionId }) {
  for (let bid of bidsReceived) {
    setBidStatus(getCachedBid(auctionId, bid.bidId), bid.status);
  }
}

function setAdUnitMap(adUnitCode, auctionId, transactionId) {
  if (locals.adUnitMap[adUnitCode]) {
    locals.adUnitMap[adUnitCode].push({
      auctionId,
      transactionId,
    });
  } else {
    locals.adUnitMap[adUnitCode] = [{
      auctionId,
      transactionId,
    }];
  }
}

function getAdUnitMetadata(adUnitCode) {
  const adUnitMeta = locals.adUnitMap[adUnitCode];
  if (adUnitMeta && adUnitMeta.length > 0) {
    return adUnitMeta[adUnitMeta.length - 1];
  }
}

function onAuctionInit({ adUnits, auctionId, bidderRequests }) {
  if (typeof auctionId !== 'string' || !Array.isArray(bidderRequests)) {
    log.error('Analytics adapter failed to parse auction.');
    return;
  }

  locals.cache.auctions[auctionId] = {
    auctionId,
    adUnits: adUnits.map(au => {
      setAdUnitMap(au.code, auctionId, au.transactionId);

      return {
        transactionId: au.transactionId,
        adUnitCode: au.code,
        // Note: GPID supports adUnits that have matching `code` values by appending a `#UNIQUIFIER`.
        // The value of the UNIQUIFIER is likely to be the div-id,
        // but, if div-id is randomized / unavailable, may be something else like the media size)
        slotId: deepAccess(au, 'ortb2Imp.ext.gpid') || deepAccess(au, 'ortb2Imp.ext.data.pbadslot', au.code),
        mediaTypes: Object.keys(au.mediaTypes),
        sizes: au.sizes.map(size => size.join('x')),
        bids: [],
      }
    }),
    userIds: Object.keys(deepAccess(bidderRequests, '0.bids.0.userId', {})),
  };

  locals.transactionManagers[auctionId] ||=
    new TransactionManager({
      timeout: analyticsAdapter.getTimeout(),
      onComplete() {
        sendReport(
          createReportFromCache(locals.cache, auctionId),
          analyticsAdapter.getUrl()
        );
        delete locals.transactionManagers[auctionId];
      }
    });
}

function onBidRequested({ auctionId, bids }) {
  for (let { bidder, bidId, transactionId, src } of bids) {
    const auction = locals.cache.auctions[auctionId];
    const adUnits = auction.adUnits.find(adUnit => adUnit.transactionId === transactionId);
    if (!adUnits) return;
    adUnits.bids.push({
      bidder,
      bidId,
      status: 'pending',
      hasWon: 0,
      source: src,
    });

    // if there is no manager for this auction, then the auction has already been completed
    locals.transactionManagers[auctionId] &&
      locals.transactionManagers[auctionId].initiate(transactionId);
  }
}

function onBidResponse({ requestId, auctionId, cpm, currency, originalCpm, floorData, mediaType, size, status, source }) {
  const bid = getCachedBid(auctionId, requestId);
  if (!bid) return;

  setBidStatus(bid, status);
  Object.assign(bid,
    {
      bidResponse: {
        cpm,
        cur: currency,
        cpmOrig: originalCpm,
        cpmFloor: floorData?.cpmAfterAdjustments,
        mediaType,
        size
      },
      source
    }
  );
}

function onBidWon(bidWon) {
  const { auctionId, requestId, transactionId } = bidWon;
  const bid = getCachedBid(auctionId, requestId);
  if (!bid) {
    log.error(`Cannot find bid "${requestId}". Auction ID: "${auctionId}". Transaction ID: "${transactionId}".`);
    return;
  }

  setBidStatus(bid, bidWon.status ?? 'error');

  locals.transactionManagers[auctionId] &&
    locals.transactionManagers[auctionId].complete(transactionId);
}

function setBidStatus(bid, status = 'available') {
  const statusStates = {
    pending: {
      next: ['available', 'targetingSet', 'rendered', 'timeout', 'rejected', 'noBid', 'error'],
    },
    available: {
      next: ['targetingSet', 'rendered', 'timeout', 'rejected', 'noBid', 'error'],
    },
    targetingSet: {
      next: ['rendered', 'error', 'timeout'],
    },
    rendered: {
      next: [],
    },
    timeout: {
      next: [],
    },
    rejected: {
      next: [],
    },
    noBid: {
      next: [],
    },
    error: {
      next: ['targetingSet', 'rendered', 'timeout', 'rejected', 'noBid', 'error'],
    },
  }

  const winningStatuses = ['targetingSet', 'rendered'];

  if (statusStates[bid.status].next.includes(status)) {
    bid.status = status;
    if (winningStatuses.includes(status)) {
      // occassionally we can detect a bidWon before prebid reports it as such
      bid.hasWon = 1;
    }
  }
}

/**
 * Guarantees sending of data without waiting for response, even after page is left/closed
 *
 * @param {AnalyticsReport} report Request payload
 * @param {string} endpoint URL
 */
function sendReport(report, endpoint) {
  if (navigator.sendBeacon(endpoint, JSON.stringify(report))) {
    log.info(`Analytics report sent to ${endpoint}`, report);

    return;
  }

  log.error('Analytics report exceeded User-Agent data limits and was not sent.', report);
}

/**
 * Encapsulate certain logger functions and add a prefix to the final messages.
 *
 * @return {Object} New logger functions
 */
function getLogger() {
  const LPREFIX = `${PROVIDER_NAME} Analytics: `;

  return {
    info: (msg, ...args) => logInfo(`${LPREFIX}${msg}`, ...JSON.parse(JSON.stringify(args))),
    warn: (msg, ...args) => logWarn(`${LPREFIX}${msg}`, ...JSON.parse(JSON.stringify(args))),
    error: (msg, ...args) => logError(`${LPREFIX}${msg}`, ...JSON.parse(JSON.stringify(args))),
  }
}
