'use strict';
// LiftIgniter or Petametrics

import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager.js';
import adapter from '../src/AnalyticsAdapter.js';
import { logError } from '../src/utils.js';

// Standard Analytics Adapter code
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END

// Internal controls
const BATCH_MESSAGE_FREQUENCY = 1000; // Send results batched on a 1s delay

const PROVIDER_CODE = 'mavenDistributionAnalyticsAdapter'
const MAVEN_DISTRIBUTION_GLOBAL = '$p'

/**
 * We may add more fields in the future
 * @typedef {{
 *  provider: typeof PROVIDER_CODE
 *  options: {
 *     sampling?: number
 *     zoneMap: {[adUnitCode: string]: {index?: number, zone?: string}}
 *  }
 * }} MavenDistributionAdapterConfig
 */

/**
 * import {AUCTION_STARTED, AUCTION_IN_PROGRESS, AUCTION_COMPLETED} from '../src/auction';
 * @typedef {{
 *   auctionId: string
 *   timestamp: Date
 *   auctionEnd: Date
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
 * // cpms, zoneIndexes, and zoneNames all have the same length
 * @typedef {{
 *   auc: string
 *   cpms: number[]
 *   zoneIndexes: number[]
 *   zoneNames: string[]
 * }} AuctionEndSummary
 */

/**
 * @param {AuctionEventArgs} args
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @return {AuctionEndSummary}
 */
export function summarizeAuctionEnd(args, adapterConfig) {
  /** @type {{[code: string]: number}} */
  const cpmsMap = {}
  const zoneNames = []
  const zoneIndexes = []
  args.adUnits.forEach(adUnit => {
    cpmsMap[adUnit.code] = 0
    const zoneConfig = adapterConfig.options.zoneMap[adUnit.code] || {}
    let zoneIndex = zoneConfig.index != null && isFinite(zoneConfig.index)
      ? +zoneConfig.index : null
    zoneIndexes.push(zoneIndex)
    zoneNames.push(zoneConfig.zone != null ? zoneConfig.zone : null)
  })
  args.bidsReceived.forEach(bid => {
    cpmsMap[bid.adUnitCode] = Math.max(cpmsMap[bid.adUnitCode], bid.cpm || 0)
  })
  const cpms = args.adUnits.map(adUnit => cpmsMap[adUnit.code])

  /** @type {AuctionEndSummary} */
  const eventToSend = {
    auc: args.auctionId,
    cpms: cpms,
    zoneIndexes: zoneIndexes,
    zoneNames: zoneNames,
  }
  return eventToSend
}

/**
 * @param {AuctionEndSummary[]} batch
 * @return {{batch: string}}
 */
export function createSendOptionsFromBatch(batch) {
  const batchJson = JSON.stringify(batch)
  return { batch: batchJson }
}

/**
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @property {object[] | null} batch
 * @property {number | null} batchTimeout
 * @property {MavenDistributionAdapterConfig} adapterConfig
 */
function MavenDistributionAnalyticsAdapterInner(adapterConfig) {
  this.batch = null
  this.batchTimeout = null
  this.adapterConfig = adapterConfig
}
MavenDistributionAnalyticsAdapterInner.prototype = {
  /**
   * @param {{eventType: string, args: any}} typeAndArgs
   */
  track(typeAndArgs) {
    const {eventType, args} = typeAndArgs
    if (eventType === AUCTION_END) {
      const eventToSend = summarizeAuctionEnd(args, this.adapterConfig)
      if (!this.batch) {
        this.batch = []
        this.timeout = setTimeout(this._sendBatch.bind(this), BATCH_MESSAGE_FREQUENCY)
      }
      this.batch.push(eventToSend)
    }
  },

  _sendBatch() {
    const sendOptions = createSendOptionsFromBatch(this.batch)
    if (window[MAVEN_DISTRIBUTION_GLOBAL]) {
      window[MAVEN_DISTRIBUTION_GLOBAL]('send', 'prebid', sendOptions)
      this.timeout = null
      this.batch = null
    } else {
      this.timeout = setTimeout(this._sendBatch.bind(this), BATCH_MESSAGE_FREQUENCY)
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
    if (adapterConfig.options.zoneMap == null) {
      return logError(`Adapter ${PROVIDER_CODE}: zoneMap null; disabling`)
    }
    const inner = new MavenDistributionAnalyticsAdapterInner(adapterConfig)
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

export default mavenDistributionAnalyticsAdapter;
