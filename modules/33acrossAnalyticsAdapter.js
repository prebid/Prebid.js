/* eslint-disable no-console */
import { logError, logWarn, logInfo, deepAccess } from '../src/utils.js';
import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
const { EVENTS } = CONSTANTS;

const ANALYTICS_VERSION = '1.0.0';
const PROVIDER_NAME = '33across';
const DEFAULT_TRANSACTION_TIMEOUT = 3000;

const log = getLogger();

/**
 * @typedef {Object} AnalyticsReport Sent when all bids are complete (as determined by `bidWon` and `slotRenderEnded` events)
 * @property {string} siteId
 * @property {string} pid Partner ID
 * @property {string} src Source of the report (pbjs)
 * @property {string} analyticsVersion
 * @property {string} pbjsVersion
 * @property {Auction[]} auctions
 * @property {Bid[]} bidsWon
 */

/**
 * @typedef {Object} AnalyticsCache
 * @property {string} pid Partner ID
 * @property {Object<string><Auction>} auctions
 * @property {Object<string><Bid[]>} bidsWon
 */

/**
 * @typedef {Object} Auction
 * @property {AdUnit[]} adUnits
 * @property {string} auctionId
 * @property {Object} userIds
 */

/**
 * @typedef {Object} BidResponse
 * @property {number} cpm
 * @property {string} cur
 * @property {number} cpmOrig
 * @property {number} cpmFloor
 * @property {string} mediaType
 * @property {string} size
 */

/**
 * @typedef {Object} Bid
 * @property {string} bidder
 * @property {string} source
 * @property {string} status
 * @property {BidResponse} bidResponse
 * @property {string} [auctionId] // do not include in report
 * @property {string} [transactionId] // do not include in report
 */

/**
 * @typedef {Object} AdUnit
 * @property {string} transactionId
 * @property {string} adUnitCode
 * @property {string} slotId
 * @property {Array<string>} mediaTypes
 * @property {Array<string>} sizes
 * @property {Array<Bid>} bids
 */

/**
 * After the first bid is initiated, we wait until every bid is completed before sending the report.
 *
 * We will listen for the `bidWon` event and for `slotRenderEnded` event from GAM to determine when
 * all bids are complete.
 */
class TransactionManager {
  #timeoutId = null;
  #unsent = 0;
  #timeout;
  #transactions = {};
  #onComplete;

  get unsent() {
    return this.#unsent;
  }

  set unsent(value) {
    this.#unsent = value;

    if (this.#unsent <= 0) {
      this.#clearTimeout();

      this.#onComplete();

      this.#transactions = {};
    }
  }

  constructor({ timeout, onComplete }) {
    this.#timeout = timeout;
    this.#onComplete = onComplete;
  }

  add(transactionId) {
    if (this.#transactions[transactionId]) {
      log.warn(`transactionId "${transactionId}" already exists`);

      return;
    }

    this.#transactions[transactionId] = {
      status: 'waiting'
    };
    ++this.unsent;

    this.#restartSendTimeout();
  }

  que(transactionId) {
    if (!this.#transactions[transactionId]) {
      log.warn(`transactionId "${transactionId}" was not found. Nothing to enqueue.`);
      return;
    }
    this.#transactions[transactionId].status = 'queued';
    --this.unsent;

    log.info(`Queued transaction "${transactionId}". ${this.#unsent} unsent.`, this.#transactions);
  }

  #restartSendTimeout() {
    this.#clearTimeout();

    this.#timeoutId = setTimeout(() => {
      if (this.#timeout !== 0) {
        log.warn(`Timed out waiting for ad transactions to complete. Sending report.`);
      }

      this.unsent = 0;
    }, this.#timeout);
  }

  #clearTimeout() {
    return clearTimeout(this.#timeoutId);
  }
}

/**
 * initialized during `enableAnalytics`
 */
export const locals = {
  /** @type {TransactionManager} */
  transactionManagers: {},
  /** @type {string} */
  endpoint: undefined,
  /** @type {AnalyticsReport} */
  analyticsCache: undefined,
  /** sets all locals to undefined */
  reset() {
    this.transactionManagers = {};
    this.endpoint = undefined;
    this.analyticsCache = undefined;
  }
}

const analyticsAdapter = Object.assign(
  buildAdapter({ analyticsType: 'endpoint' }),
  { track: analyticEventHandler }
);

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;
analyticsAdapter.enableAnalytics = enableAnalyticsWrapper;

function enableAnalyticsWrapper(config = {}) {
  const { options = {} } = config;
  const endpoint = options.endpoint;

  if (!endpoint) {
    log.error('No endpoint provided for "options.endpoint". No analytics will be sent.');

    return;
  }

  const pid = options.pid;
  if (!pid) {
    log.error('No partnerId provided for "options.pid". No analytics will be sent.');

    return;
  }

  this.getUrl = () => endpoint;

  const timeout = calculateTransactionTimeout(options.timeout);
  this.getTimeout = () => timeout;

  locals.analyticsCache = newAnalyticsCache(pid);

  // const transactionManager = locals.transactionManager =
  // createTransactionManager({ options.timeout, analyticsCache });
  // subscribeToGamSlotRenderEvent(transactionManager);

  analyticsAdapter.originEnableAnalytics(config);
}

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

function subscribeToGamSlotRenderEvent(transactionManager) {
  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => {
    window.googletag.pubads().addEventListener('slotRenderEnded', event => {
      log.info('slotRenderEnded', event);

      const slot = `${event.slot.getAdUnitPath()}:${event.slot.getSlotElementId()}`;

      transactionManager.que(slot);
    });
  });
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
 * @param {string} pid Partner ID
 * @returns {AnalyticsCache}
 */
function newAnalyticsCache(pid) {
  return {
    pid,
    auctions: {},
    bidsWon: {},
  };
}

function createReportFromCache(analyticsCache) {
  const { pid, bidsWon, auctions } = analyticsCache;

  return {
    siteId: '', // possibly remove, awaiting more information222222
    pid,
    src: 'pbjs',
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$', // Replaced by build script
    auctions: Object.values(auctions),
    bidsWon: Object.values(bidsWon).flat()
  }
}

/**
 * @returns {Auction}
 */
function parseAuction({ adUnits, auctionId, bidderRequests, bidsReceived }) {
  if (typeof auctionId !== 'string' || !Array.isArray(bidderRequests)) {
    log.error('Analytics adapter failed to parse auction.');
  }

  return {
    adUnits: adUnits.map(unit => parseAdUnit(unit, bidsReceived)),
    auctionId,
    userIds: Object.keys(deepAccess(bidderRequests, '0.bids.0.userId', {}))
  }
}

/**
 * @returns {AdUnit}
 */
function parseAdUnit(adUnit, bidsReceived = []) {
  const { transactionId, code, slotId, mediaTypes, sizes, bids } = adUnit;

  log.warn(`parsing adUnit, slotId not yet implemented`);

  return {
    transactionId,
    adUnitCode: code,
    slotId: '',
    mediaTypes: Object.keys(mediaTypes),
    sizes: sizes.map(size => size.join('x')),
    bids: bidsReceived.map(bid => parseBid(bid)),
  }
}

/**
 * @returns {Bid}
 */
function parseBid({ auctionId, bidder, source, status, transactionId, ...args }) {
  return {
    bidder,
    source,
    status,
    transactionId,
    bidResponse: parseBidResponse(args)
  }
}

/**
 * @returns {BidResponse}
 * @todo implement
 */
function parseBidResponse({ cpm, currency, originalCpm, mediaType, size }) {
  return {
    cpm,
    cur: currency,
    cpmOrig: originalCpm,
    cpmFloor: 0,
    mediaType,
    size
  }
}

/**
 * @param {Object} args
 * @param {EVENTS[keyof EVENTS]} args.eventType
 */
function analyticEventHandler({ eventType, args }) {
  log.info(eventType, args);
  switch (eventType) {
    case EVENTS.AUCTION_INIT: // Move these events to top of fn.
      const transactionManager = locals.transactionManagers[args.auctionId] ||=
        new TransactionManager({
          timeout: analyticsAdapter.getTimeout(),
          onComplete() {
            sendReport(createReportFromCache(locals.analyticsCache),
              analyticsAdapter.getUrl());
          }
        });

      subscribeToGamSlotRenderEvent(transactionManager);

      for (let adUnit of args.adUnits) {
        transactionManager.add(adUnit.transactionId);
      }

      break;
    case EVENTS.BID_REQUESTED:
      // It's probably a better idea to do the add at trasaction manager.
      break;
    case EVENTS.AUCTION_END:
      const auction = parseAuction(args);

      locals.analyticsCache.auctions[auction.auctionId] = auction;

      break;
    // see also `slotRenderEnded` GAM-event listener
    case EVENTS.BID_WON:
      const bidWon = parseBid(args);
      const auctionBids = locals.analyticsCache.bidsWon[args.auctionId] ||= [];

      auctionBids.push(bidWon);

      locals.transactionManagers[args.auctionId]?.que(bidWon.transactionId);

      break;
    case EVENTS.AD_RENDER_SUCCEEDED:
      break;
    case EVENTS.AD_RENDER_FAILED:
      break;
    default:
      break;
  }
}

/**
 * Guarantees sending of data without waiting for response, even after page is left/closed
 *
 * @param {AnalyticsReport} report
 * @param {string}          endpoint
 */
function sendReport(report, endpoint) {
  if (navigator.sendBeacon(endpoint, JSON.stringify(report))) {
    log.info(`Analytics report sent to ${endpoint}`, report);

    return;
  }

  log.error('Analytics report exceeded User-Agent data limits and was not sent.', report);
}

function getLogger() {
  const LPREFIX = `${PROVIDER_NAME} Analytics: `;

  return {
    info: (msg, ...args) => logInfo(`${LPREFIX}${msg}`, ...args),
    warn: (msg, ...args) => logWarn(`${LPREFIX}${msg}`, ...args),
    error: (msg, ...args) => logError(`${LPREFIX}${msg}`, ...args),
  }
}
