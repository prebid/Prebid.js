'use strict';
// LiftIgniter or Petametrics

import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { logError, logInfo, logWarn } from '../src/utils.js';

// Standard Analytics Adapter code
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT

// Internal controls
const BATCH_MESSAGE_FREQUENCY = 1000; // Send results batched on a 1s delay

const PROVIDER_CODE = 'mavenDistributionAnalyticsAdapter'
const MAVEN_DISTRIBUTION_GLOBAL = '$p'
const MAX_BATCH_SIZE_PER_EVENT_TYPE = 32

/**
 * We may add more fields in the future
 * @typedef {{
 *  provider: typeof PROVIDER_CODE
 *  options: {
 *     sampling?: number
 *     zoneMap?: {[adUnitCode: string]: {index?: number, zone?: string}}
 *  }
 * }} MavenDistributionAdapterConfig
 */

/**
 * import {AUCTION_STARTED, AUCTION_IN_PROGRESS, AUCTION_COMPLETED} from '../src/auction';
 * note: timestamp is _auctionStart in src/auction.js
 * and auctionEnd is _auctionEnd in src/auction.js
 * @typedef {{
 *   auctionId: string
 *   timestamp: number
 *   auctionEnd: number
 *   auctionStatus: typeof AUCTION_STARTED | typeof AUCTION_IN_PROGRESS | typeof AUCTION_COMPLETED
 *   adUnits: any[]
 *   adUnitCodes: any[]
 *   labels: any[]
 *   bidderRequests: any[]
 *   noBids: any[]
 *   bidsReceived: any[]
 *   winningBids: any[]
 *   timeout: number
 * }} AuctionEventArgs
 */

/**
 * // cpmms, zoneIndexes, and zoneNames all have the same length
 * @typedef {{
 *   auc: string
 *   codes?: string[]
 *   zoneIndexes?: number[]
 *   zoneNames?: string[]
 * }} AuctionInitSummary
 */

/**
 * @param {AuctionEventArgs} args
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @return {AuctionEndSummary}
 */
export function summarizeAuctionInit(args, adapterConfig) {
  const zoneNames = []
  const zoneIndexes = []
  const adUnitCodes = []
  const zoneMap = adapterConfig.options.zoneMap || {}
  let someZoneIndexNonNull = false
  let someZoneNameNonNull = false
  let allZoneNamesNonNull = true
  args.adUnits.forEach(adUnit => {
    adUnitCodes.push(adUnit.code)

    const zoneConfig = zoneMap[adUnit.code] || {}
    const zoneIndexNonNull = zoneConfig.index != null && isFinite(zoneConfig.index)
    someZoneIndexNonNull = someZoneIndexNonNull || zoneIndexNonNull

    let zoneIndex = zoneIndexNonNull ? +zoneConfig.index : null
    const zoneNameNonNull = zoneConfig.zone != null
    zoneIndexes.push(zoneIndex)
    zoneNames.push(zoneNameNonNull ? zoneConfig.zone : null)
    someZoneNameNonNull = someZoneNameNonNull || zoneNameNonNull
    allZoneNamesNonNull = allZoneNamesNonNull && zoneNameNonNull
  })

  /** @type {AuctionEndSummary} */
  const eventToSend = {
    auc: args.auctionId,
    ts: args.timestamp,
  }
  if (!allZoneNamesNonNull) eventToSend.codes = adUnitCodes
  if (someZoneNameNonNull) eventToSend.zoneNames = zoneNames
  if (someZoneIndexNonNull) eventToSend.zoneIndexes = zoneIndexes
  return eventToSend
}

/**
 * // cpmms, zoneIndexes, and zoneNames all have the same length
 * @typedef {{
 *   auc: string
 *   cpmms: number[]
 *   codes?: string[]
 *   zoneIndexes?: number[]
 *   zoneNames?: string[]
 * }} AuctionEndSummary
 */

/**
 * @param {AuctionEventArgs} args
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @return {AuctionEndSummary}
 */
export function summarizeAuctionEnd(args, adapterConfig) {
  /** @type {{[code: string]: number}} */
  const cpmmsMap = {}
  /** @type {AuctionEndSummary} */
  const eventToSend = summarizeAuctionInit(args, adapterConfig)
  args.adUnits.forEach(adUnit => {
    cpmmsMap[adUnit.code] = 0
  })
  args.bidsReceived.forEach(bid => {
    cpmmsMap[bid.adUnitCode] = Math.max(cpmmsMap[bid.adUnitCode], Math.round(bid.cpm * 1000 || 0))
  })
  const cpmms = args.adUnits.map(adUnit => cpmmsMap[adUnit.code])
  eventToSend.cpmms = cpmms
  // args.timestamp is only the _auctionStart in src/auction.js
  // so to get the time for this event we want args.auctionEnd
  eventToSend.ts = args.auctionEnd
  return eventToSend
}

/**
 * Price is in microdollars
 * @param {{auctionInit: AuctionInitSummary[], auctionEnd: AuctionEndSummary[]}} batch
 * @return {{auctionInit?: string, auctionEnd?: string, price: number}}
 */
export function createSendOptionsFromBatch(batch) {
  const price = batch[AUCTION_END]?.reduce(
    (sum, auctionEndSummary) =>
      sum + auctionEndSummary.cpmms.reduce((sum, cpmm) => sum + cpmm, 0),
    0
  )
  const result = { price: price }
  Object.keys(batch).forEach(eventType => {
    result[eventType] = JSON.stringify(batch[eventType])
  })
  return result
}

const STATE_DOM_CONTENT_LOADING = 'wait-for-$p-to-be-defined'
const STATE_LIFTIGNITER_LOADING = 'waiting-$p(\'onload\')'
const STATE_LIFTIGNITER_LOADED = 'loaded'
/**
 * Wrapper around $p that detects when $p is defined
 * and then detects when the script is loaded
 * so that the caller can discard events if the script never loads
 */
function LiftIgniterWrapper() {
  this._state = null
  this._onReadyStateChangeBound = this._onReadyStateChange.bind(this)
  this._init()
}
LiftIgniterWrapper.prototype = {
  _expectState(state) {
    if (this._state != state) {
      logError(`wrong state ${this._state}; expected ${state}`)
      return false
    } else {
      return true
    }
  },
  _init() {
    this._state = STATE_DOM_CONTENT_LOADING
    document.addEventListener('DOMContentLoaded', this._onReadyStateChangeBound)
    this._onReadyStateChange()
  },
  _onReadyStateChange() {
    if (!this._expectState(STATE_DOM_CONTENT_LOADING)) return
    const found = window[MAVEN_DISTRIBUTION_GLOBAL] != null
    logInfo(`wrap$p: onReadyStateChange; $p found = ${found}`)
    if (found) {
      document.removeEventListener('DOMContentLoaded', this._onReadyStateChangeBound)
      this._state = STATE_LIFTIGNITER_LOADING
      // note: $p('onload', cb) may synchronously call the callback
      window[MAVEN_DISTRIBUTION_GLOBAL]('onload', this._onLiftIgniterLoad.bind(this))
    }
  },
  _onLiftIgniterLoad() {
    if (!this._expectState(STATE_LIFTIGNITER_LOADING)) return
    this._state = STATE_LIFTIGNITER_LOADED
    logInfo(`wrap$p: onLiftIgniterLoad`)
  },
  checkIsLoaded() {
    if (this._state === STATE_DOM_CONTENT_LOADING) {
      this._onReadyStateChange()
    }
    return this._state === STATE_LIFTIGNITER_LOADED
  },
  sendPrebid(obj) {
    if (!this._expectState(STATE_LIFTIGNITER_LOADED)) return
    window[MAVEN_DISTRIBUTION_GLOBAL]('send', 'prebid', obj)
    logInfo(`wrap$p: $p('send')`)
  },
}

/**
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @property { | null} batch
 * @property {number | null} batchTimeout
 * @property {MavenDistributionAdapterConfig} adapterConfig
 * @property {LiftIgniterWrapper} liftIgniterWrapper
 */
function MavenDistributionAnalyticsAdapterInner(adapterConfig, liftIgniterWrapper) {
  this.batch = {}
  this.batchTimeout = null
  this.adapterConfig = adapterConfig
  this.liftIgniterWrapper = liftIgniterWrapper
}
MavenDistributionAnalyticsAdapterInner.prototype = {
  /**
   * @param {{eventType: string, args: any}} typeAndArgs
   */
  track(typeAndArgs) {
    const {eventType, args} = typeAndArgs
    let eventToSend
    if (eventType === AUCTION_INIT) {
      eventToSend = summarizeAuctionInit(args, this.adapterConfig)
    } else if (eventType === AUCTION_END) {
      eventToSend = summarizeAuctionEnd(args, this.adapterConfig)
    }
    if (eventToSend !== undefined) {
      this.batch[eventType] ||= []
      this.batch[eventType].push(eventToSend)
      if (this.timeout == null) {
        this.timeout = setTimeout(this._sendBatch.bind(this), BATCH_MESSAGE_FREQUENCY)
        logInfo(`$p: added ${eventType} to new batch`)
      } else {
        logInfo(`$p: added ${eventType} to existing batch`)
      }
      this.batch.push(eventToSend)
    }
  },

  _sendBatch() {
    this.timeout = null
    Object.keys(this.batch).forEach(eventType => {
      const countToDiscard = this.batch[eventType].length - MAX_BATCH_SIZE_PER_EVENT_TYPE
      if (countToDiscard > 0) {
        logWarn(`$p: Discarding ${countToDiscard} old ${eventType}s`)
        this.batch[eventType].splice(0, countToDiscard)
      }
    })
    if (this.liftIgniterWrapper.checkIsLoaded()) {
      const countsString = Object.keys(this.batch).map(eventType => `${this.batch[eventType].length} ${eventType}s`).join(', ')
      logInfo(`$p: Sending ${countsString}`)
      const sendOptions = createSendOptionsFromBatch(this.batch)
      this.liftIgniterWrapper.sendPrebid(sendOptions)
      this.batch = {}
    }
  },
}

/**
 * @property {MavenDistributionAnalyticsAdapterInner | null} inner
 * @property {AnalyticsAdapter | null} adapter
 */
function MavenDistributionAnalyticsAdapter() {
  this.base = null
  this.inner = null
}
MavenDistributionAnalyticsAdapter.prototype = {
  /**
   * @param {MavenDistributionAdapterConfig} adapterConfig
   * @returns {void}
   */
  enableAnalytics(adapterConfig) {
    if (this.base != null) {
      // call base implementation which prints a warning
      return this.base.enableAnalytics(adapterConfig)
    }
    if (adapterConfig.options == null) {
      return logError(`Adapter ${PROVIDER_CODE}: options null; disabling`)
    }
    const liftIgniterWrapper = new LiftIgniterWrapper()
    const inner = new MavenDistributionAnalyticsAdapterInner(adapterConfig, liftIgniterWrapper)
    const base = adapter({global: MAVEN_DISTRIBUTION_GLOBAL})
    base.track = inner.track.bind(inner)
    base.enableAnalytics(adapterConfig)
    this.inner = inner
    this.base = base
  },
  disableAnalytics() {
    if (this.base != null) {
      this.base.disableAnalytics()
      this.base = null
      this.inner = null
    }
  }
}

const mavenDistributionAnalyticsAdapter = new MavenDistributionAnalyticsAdapter()
adaptermanager.registerAnalyticsAdapter({
  adapter: mavenDistributionAnalyticsAdapter,
  code: PROVIDER_CODE,
});

// export for unit test
export const testables = {
  LiftIgniterWrapper,
}

export default mavenDistributionAnalyticsAdapter;
