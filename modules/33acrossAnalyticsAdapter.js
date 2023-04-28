import { deepAccess, logInfo, logWarn, logError } from '../src/utils.js';
import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

/**
 * @typedef {typeof import('../src/constants.json').EVENTS} EVENTS
 */
const { EVENTS } = CONSTANTS;

const ANALYTICS_VERSION = '1.0.0';
const PROVIDER_NAME = '33across';
const DEFAULT_TRANSACTION_TIMEOUT = 3000;
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
 * After the first bid is initiated, we wait until every bid is completed before sending the report.
 *
 * We will listen for the `bidWon` event to determine when all bids are complete.
 */
class TransactionManager {
  #timeoutId;
  #pending = 0;
  #timeout;
  #transactions = {};
  #onComplete;

  get #unsent() {
    return this.#pending;
  }

  set #unsent(value) {
    this.#pending = value;

    if (this.#pending <= 0) {
      this.#clearTimeout();
      this.#onComplete();
      this.#transactions = {};
    }
  }

  constructor({ timeout, onComplete }) {
    this.#timeout = timeout;
    this.#onComplete = onComplete;
  }

  initiate(transactionId) {
    if (this.#transactions[transactionId]) return;

    this.#transactions[transactionId] = {
      status: 'waiting'
    };
    ++this.#unsent;

    this.#restartSendTimeout();
  }

  complete(transactionId) {
    if (!this.#transactions[transactionId]) {
      log.warn(`transactionId "${transactionId}" was not found. Nothing to enqueue.`);
      return;
    }
    this.#transactions[transactionId].status = 'queued';
    --this.#unsent;

    log.info(`Queued transaction "${transactionId}" for delivery. ${this.#unsent} transactions still pending.`, this.#transactions);
  }

  completeAll(reason) {
    Object.keys(this.#transactions).forEach(transactionId => {
      this.complete(transactionId);
    });

    log.info('All remaining transactions flushed.' + (reason ? ` Reason: ${reason}` : ''));
  }

  // gulp-eslint is using eslint 6, a version that doesn't support private method syntax
  // eslint-disable-next-line no-dupe-class-members
  #clearTimeout() {
    return window.clearTimeout(this.#timeoutId);
  }

  // eslint-disable-next-line no-dupe-class-members
  #restartSendTimeout() {
    this.#clearTimeout();

    this.#timeoutId = setTimeout(() => {
      if (this.#timeout !== 0) {
        log.warn(`Timed out waiting for ad transactions to complete. Sending report.`);
      }

      this.#unsent = 0;
    }, this.#timeout);
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

  log.info(`Invalid timeout provided for "options.timeout". Using default timeout of 3000ms.`);

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
  const { pid, auctions } = analyticsCache;

  return {
    pid,
    src: 'pbjs',
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$', // Replaced by build script
    auctions: [ auctions[completedAuctionId] ],
  }
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
      }
    });
}

function onBidRequested({ auctionId, bids }) {
  for (let { bidder, bidId, transactionId, src } of bids) {
    locals.transactionManagers[auctionId].initiate(transactionId);
    getBidsForTransaction(auctionId, transactionId).push({
      bidder,
      bidId,
      status: 'pending',
      hasWon: 0,
      source: src,
    });
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

  locals.transactionManagers[auctionId]?.complete(transactionId);
}

function onAuctionEnd({ auctionId }) {
  locals.transactionManagers[auctionId]?.completeAll('auctionEnd');
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
