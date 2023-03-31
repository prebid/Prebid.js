/* eslint-disable no-console */
import { logError, logWarn, logInfo } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
const { EVENTS } = CONSTANTS;

const ANALYTICS_VERSION = '1.0.0';
const PROVIDER_NAME = '33across';

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
 * @typedef {Object} Auction
 * @property {AdUnit[]} adUnits
 * @property {string} auctionId
 * @property {Object} userIds
 * @typedef {Object} BidResponse
 * @property {number} cpm
 * @property {string} cur
 * @property {number} cpmOrig
 * @property {number} cpmFloor
 * @property {string} mediaType
 * @property {string} size
 * @typedef {Object} Bid
 * @property {string} bidder
 * @property {string} source
 * @property {string} status
 * @property {BidResponse} bidResponse
 * @property {string} [auctionId] // do not include in report
 * @property {string} [transactionId] // do not include in report
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
 * We will listen for the `bidWon` event and for `slotRenderEnded` event from GAM to determine when
 * all bids are complete.
 */
class TransactionManager {
  timeoutId = null;

  #unsent = 0;
  get unsent() {
    return this.#unsent;
  }
  set unsent(value) {
    this.#unsent = value;
    if (this.#unsent <= 0) {
      sendReport(locals.analyticsCache);
      this.#transactions = {};
    }
  }

  #transactions = {};

  constructor({timeout}) {
    this.timeout = timeout;
  }

  add(transactionId) {
    if (this.#transactions[transactionId]) {
      log.warn(`transactionId "${transactionId}" already exists`);
    }
    this.#transactions[transactionId] = {
      status: 'waiting'
    };
    ++this.unsent;

    this.restartSendTimeout();
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

  restartSendTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      if (this.timeout !== 0) log.warn(`Timed out waiting for ad transactions to complete. Sending report.`);
      this.unsent = 0;
    }, this.timeout);
  }

  get() {
    return this.#transactions;
  }
}

/**
 * initialized during `enableAnalytics`
 */
export const locals = {
  /** @type {TransactionManager} */
  transactionManager: undefined,
  /** @type {string} */
  endpoint: undefined,
  /** @type {AnalyticsReport} */
  analyticsCache: undefined,
  /** sets all locals to undefined */
  reset: function () {
    this.transactionManager = undefined;
    this.endpoint = undefined;
    this.analyticsCache = undefined;
  }
}

let analyticsAdapter = Object.assign(
  adapter({ analyticsType: 'endpoint' }),
  { track: analyticEventHandler }
);

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;
analyticsAdapter.enableAnalytics = enableAnalyticsWrapper;

function enableAnalyticsWrapper(config) {
  locals.endpoint = config?.options?.endpoint;
  if (!locals.endpoint) {
    log.error(`No endpoint provided for "options.endpoint". No analytics will be sent.`);
    return;
  }

  const pid = config?.options?.pid;
  if (!pid) {
    log.error(`No partnerId provided for "options.pid". No analytics will be sent.`);
    return;
  }
  locals.analyticsCache = newAnalyticsReport(pid);

  let timeout = 3000; // default timeout
  if (typeof config?.options?.timeout === 'number' && config?.options?.timeout >= 0) {
    timeout = config.options.timeout;
  } else {
    log.info(`Invalid timeout provided for "options.timeout". Using default timeout of 3000ms.`);
  }
  locals.transactionManager = new TransactionManager({timeout});

  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => {
    window.googletag.pubads().addEventListener('slotRenderEnded', event => {
      log.info('slotRenderEnded', event);
      const slot = `${event.slot.getAdUnitPath()}:${event.slot.getSlotElementId()}`;
      locals.transactionManager.que(slot);
    });
  });

  analyticsAdapter.originEnableAnalytics(config);
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
 * @returns {AnalyticsReport}
 */
function newAnalyticsReport(pid) {
  return {
    siteId: '', // possibly remove, awaiting more information222222
    pid,
    src: 'pbjs',
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$', // replaced by build script
    auctions: [],
    bidsWon: [],
  };
}

/**
 * @returns {Auction}
 */
function parseAuction({adUnits, auctionId, bidderRequests}) {
  if (typeof auctionId !== 'string' || !Array.isArray(bidderRequests)) {
    log.error(`Analytics adapter failed to parse auction.`);
  }

  return {
    adUnits: adUnits.map(unit => parseAdUnit(unit)),
    auctionId,
    userIds: getGlobal().getUserIds()
  }
}

/**
 * @returns {AdUnit}
 */
function parseAdUnit({transactionId, code, slotId, mediaTypes, sizes, bids}) {
  log.warn(`parsing adUnit, slotId not yet implemented`);
  return {
    transactionId,
    adUnitCode: code,
    slotId: '',
    mediaTypes: Object.keys(mediaTypes),
    sizes: sizes.map(size => size.join('x')),
    bids: bids.map(bid => parseBid(bid)),
  }
}

/**
 * @returns {Bid}
 */
function parseBid({auctionId, bidder, source, status, transactionId}) {
  log.warn(`parsing bid: source and status may need to be populated by downstream event. bidResponse not yet implemented`);
  return {
    bidder,
    source,
    status,
    bidResponse: parseBidResponse(),
  }
}

/**
 * @returns {BidResponse}
 * @todo implement
 */
function parseBidResponse(args) {
  return {
    cpm: 0,
    cur: '',
    cpmOrig: 0,
    cpmFloor: 0,
    mediaType: '',
    size: '',
  }
}

/**
 * @param {Object} args
 * @param {EVENTS[keyof EVENTS]} args.eventType
 */
function analyticEventHandler({eventType, args}) {
  log.info(eventType, args);
  switch (eventType) {
    case EVENTS.AUCTION_INIT:
      for (let adUnit of args.adUnits) {
        locals.transactionManager.add(adUnit.transactionId);
      }
      break;
    case EVENTS.BID_REQUESTED:
      break;
    case EVENTS.AUCTION_END:
      const auction = parseAuction(args);
      locals.analyticsCache.auctions.push(auction);
      break;
    // see also `slotRenderEnded` GAM-event listener
    case EVENTS.BID_WON:
      const bidWon = parseBid(args);
      locals.analyticsCache.bidsWon.push(bidWon);
      locals.transactionManager.que(bidWon.transactionId);
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
 * @param {AnalyticsReport} report
 */
function sendReport(report) {
  if (navigator.sendBeacon(locals.endpoint, JSON.stringify(report))) {
    log.info(`Analytics report sent to ${locals.endpoint}`, report);
  } else {
    log.error(`Analytics report exceeded User-Agent data limits and was not sent.`, report);
  }
}

function getLogger() {
  const LPREFIX = `${PROVIDER_NAME} Analytics: `;
  return {
    info: (msg, ...args) => logInfo(`${LPREFIX}${msg}`, ...args),
    warn: (msg, ...args) => logWarn(`${LPREFIX}${msg}`, ...args),
    error: (msg, ...args) => logError(`${LPREFIX}${msg}`, ...args),
  }
}
