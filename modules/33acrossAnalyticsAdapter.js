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
const DEFAULT_TRANSACTION_TIMEOUT = 10000;
const DEFAULT_ENDPOINT = `${window.origin}/api`; // TODO: Update to production endpoint

export const log = getLogger();

/**
 * @typedef {Object} AnalyticsReport - Sent when all bids are complete (as determined by `bidWon` event)
 * @property {string} analyticsVersion - Version of the Prebid.js 33Across Analytics Adapter
 * @property {string} pid - Partner ID
 * @property {'pbjs'} src - Source of the report
 * @property {string} pbjsVersion - Version of Prebid.js
 * @property {Auction[]} auctions
 */

/**
 * @typedef {Object} AnalyticsCache
 * @property {string} pid Partner ID
 * @property {Object<string, Auction>} auctions
 * @property {Object<string, Bid[]>} bidsWon
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

  completeAll(reason) {
    for (let transactionId of this.#transactionsPending) {
      this.complete(transactionId);
    };

    log.info('All remaining transactions flushed.' + (reason ? ` Reason: ${reason}` : ''));
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
  /** @type {AnalyticsCache=} */
  cache: undefined,
  /** sets all locals to undefined */
  reset() {
    this.transactionManagers = {};
    this.cache = undefined;
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

  const usPrivacy = uspDataHandler.getConsentData();
  if (/^1[Y|N|-]{3}$/.test(usPrivacy)) {
    locals.cache.usPrivacy = usPrivacy;
  }

  analyticsAdapter.originEnableAnalytics(config);
}

/**
 * @param {string} [endpoint]
 * @returns {string}
 */
function calculateEndpoint(endpoint) {
  if (typeof endpoint === 'string' && endpoint.length > 0 && endpoint.startsWith('http')) {
    return endpoint;
  }

  log.info(`Invalid endpoint provided for "options.endpoint". Using default endpoint.`);

  return DEFAULT_ENDPOINT;
}
/**
 * @param {number} [configTimeout]
 * @returns {number} Transaction Timeout
 */
function calculateTransactionTimeout(configTimeout) {
  if (typeof configTimeout === 'undefined') {
    return DEFAULT_TRANSACTION_TIMEOUT;
  }

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
  gvlid: 58,
});

export default analyticsAdapter;

/**
 * @param {AnalyticsCache} analyticsCache
 * @param {string} completedAuctionId value of auctionId
 * @return {AnalyticsReport} Analytics report
 */
function createReportFromCache(analyticsCache, completedAuctionId) {
  const { pid, auctions, usPrivacy } = analyticsCache;

  const report = {
    pid,
    src: 'pbjs',
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$', // Replaced by build script
    auctions: [ auctions[completedAuctionId] ],
  }
  if (usPrivacy) {
    report.usPrivacy = usPrivacy;
  }

  return report;
}

function getBidsForTransaction(auctionId, transactionId) {
  const auction = locals.cache.auctions[auctionId];
  return auction.adUnits.find(adUnit => adUnit.transactionId === transactionId).bids;
}

function getBid(auctionId, bidId) {
  const auction = locals.cache.auctions[auctionId];
  for (let adUnit of auction.adUnits) {
    for (let bid of adUnit.bids) {
      if (bid.bidId === bidId) {
        return bid;
      }
    }
  }
}

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
    case EVENTS.BID_REQUESTED:
      onBidRequested(args);
      break;
    case EVENTS.BID_RESPONSE:
      onBidResponse(args);
      break;
    case EVENTS.BID_WON:
      onBidWon(args);
      break;
    case EVENTS.AUCTION_END:
      onAuctionEnd(args);
      break;
    default:
      break;
  }
}

function onAuctionInit({ adUnits, auctionId, bidderRequests }) {
  if (typeof auctionId !== 'string' || !Array.isArray(bidderRequests)) {
    log.error('Analytics adapter failed to parse auction.');
  }

  locals.cache.auctions[auctionId] = {
    auctionId,
    adUnits: adUnits.map(au => {
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
    getBidsForTransaction(auctionId, transactionId).push({
      bidder,
      bidId,
      status: 'pending',
      hasWon: 0,
      source: src,
    });

    // if there is no manager for this auction, then the auction has already been completed
    // eslint-disable-next-line no-unused-expressions
    locals.transactionManagers[auctionId]?.initiate(transactionId);
  }
}

function onBidResponse({ requestId, auctionId, cpm, currency, originalCpm, floorData, mediaType, size, source, status }) {
  Object.assign(getBid(auctionId, requestId),
    {
      bidResponse: {
        cpm,
        cur: currency,
        cpmOrig: originalCpm,
        cpmFloor: floorData?.cpmAfterAdjustments,
        mediaType,
        size
      },
      status,
      source
    }
  );
}

function onBidWon({ auctionId, requestId, transactionId }) {
  const bid = getBid(auctionId, requestId);
  if (!bid) {
    log.error(`Cannot find bid "${requestId}". Auction ID: "${auctionId}". Transaction ID: "${transactionId}".`);
    return;
  }

  Object.assign(bid,
    {
      hasWon: 1
    }
  );

  // eslint-disable-next-line no-unused-expressions
  locals.transactionManagers[auctionId]?.complete(transactionId);
}

function onAuctionEnd({ auctionId }) {
  // auctionEnd event *sometimes* fires before bidWon events,
  // even when auction is ending because all bids have been won.
  setTimeout(() => {
    // eslint-disable-next-line no-unused-expressions
    locals.transactionManagers[auctionId]?.completeAll('auctionEnd');
  }, 0);
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
 * Encapsute certain logger functions and add a prefix to the final messages.
 *
 * @return {Object} New logger functions
 */
function getLogger() {
  const LPREFIX = `${PROVIDER_NAME} Analytics: `;

  return {
    info: (msg, ...args) => logInfo(`${LPREFIX}${msg}`, ...args),
    warn: (msg, ...args) => logWarn(`${LPREFIX}${msg}`, ...args),
    error: (msg, ...args) => logError(`${LPREFIX}${msg}`, ...args),
  }
}
