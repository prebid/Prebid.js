'use strict';
// LiftIgniter or Petametrics

import { EVENTS } from '../src/constants.js';
import adaptermanager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { logError, logInfo, logWarn } from '../src/utils.js';

// Standard Analytics Adapter code
const AUCTION_END = EVENTS.AUCTION_END
const AUCTION_INIT = EVENTS.AUCTION_INIT

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

export const getFloor = (fbr) => {
  let floor = fbr?.getFloor?.()?.floor ?? null;
  if (floor) {
    floor = Math.round((floor || 0) * 1000);
  }
  return floor
}

export const getAdIndex = (adUnit) =>
  adUnit.model ? Number(adUnit.model.index) : null

export const filterDuplicateAdUnits = (adUnits) =>
  Array.from(new Map(adUnits.map(adUnit => [
    adUnit.code + getAdIndex(adUnit),
    adUnit
  ])).values())

/**
 * // cpmms, zoneIndexes, bidderss and zoneNames all have the same length
 * @typedef {{
 *   auc: string
 *   codes?: string[]
 *   zoneIndexes?: number[]
 *   zoneNames?: string[]
 *   bidderss: string[][]
 *   floor_price: Array<Array<number>>
 *   timeout: number
 * }} AuctionInitSummary
 */
/**
 * @param {AuctionEventArgs} args
 * @param {MavenDistributionAdapterConfig} adapterConfig
 * @return {AuctionEndSummary}
 */
export function summarizeAuctionInit(args, adapterConfig) {
  const flattenedBidRequests = args.bidderRequests.reduce((total, curr) => {
    return [...total, ...curr.bids]
  }, [])

  const zoneNames = []
  const zoneIndexes = []
  const adUnitCodes = []
  const podPos = []
  const bidderss = []
  const floorss = []
  let someZoneIndexNonNull = false
  let someZoneNameNonNull = false
  let allZoneNamesNonNull = true

  args.adUnits.forEach(adUnit => {
    const zoneIndex = getAdIndex(adUnit)
    const zoneName = adUnit.model?.zone ?? null
    const zoneIndexNonNull = zoneIndex != null
    const zoneNameNonNull = zoneName != null
    const bidders = []
    const floors = []

    someZoneIndexNonNull = someZoneIndexNonNull || zoneIndexNonNull
    someZoneNameNonNull = someZoneNameNonNull || zoneNameNonNull
    allZoneNamesNonNull = allZoneNamesNonNull && zoneNameNonNull

    flattenedBidRequests.forEach(fbr => {
      if (fbr.adUnitCode === adUnit.code) {
        bidders.push(fbr.bidder)
        floors.push(getFloor(fbr))
      }
    })

    // If video context is adpod we add to podPos array the ad position
    // in the pod. Also for every ad in the pod we add its cpmm,
    // index and zone.
    if (adUnit.mediaTypes.video?.context === 'adpod') {
      adUnit.mediaTypes.video?.durationRangeSec.forEach((value, podIndex) => {
        adUnitCodes.push(adUnit.code)
        zoneIndexes.push(zoneIndex)
        zoneNames.push(zoneName)
        podPos.push(podIndex + 1)
        bidderss.push(bidders)
        floorss.push(floors)
      })
    } else {
      adUnitCodes.push(adUnit.code)
      zoneIndexes.push(zoneIndex)
      zoneNames.push(zoneName)
      podPos.push(0)
      bidderss.push(bidders)
      floorss.push(floors)
    }
  })

  /** @type {AuctionEndSummary} */
  const eventToSend = {
    auc: args.auctionId,
    ts: args.timestamp,
    tspl: args.timestamp - (Date.now() - (window.performance.now() | 0)),
    tspl_q: window.performance.now() | 0,
  }
  if (!allZoneNamesNonNull) eventToSend.codes = adUnitCodes
  if (someZoneNameNonNull) eventToSend.zoneNames = zoneNames
  if (someZoneNameNonNull) eventToSend.podPositions = podPos
  if (someZoneIndexNonNull) eventToSend.zoneIndexes = zoneIndexes
  eventToSend.bidderss = bidderss
  eventToSend.floor_pricess = floorss
  eventToSend.timeout = args.timeout
  return eventToSend
}

const getBidStatusAmtsAndResponseTime = (key, bidRequest, args) => {
  // Config decribing the various bidStatus, bidAmount and bidResponseTime
  // values for each bid condition
  const BID_STATUS_MAP = {
    bidsRejected: (bid) => ({
      bidStatus: `error: ${bid.rejectionReason || 'generic'}`,
      bidAmount: Math.round((bid.cpm || 0) * 1000),
      bidResponseTime: bid.timeToRespond || null,
    }),
    noBids: () => ({
      bidStatus: 'nobid',
      bidAmount: 0,
      bidResponseTime: null,
    }),
    timeout: () => ({
      bidStatus: 'timeout',
      bidAmount: 0,
      bidResponseTime: args.timeout,
    }),
    bid: (bid) => ({
      bidStatus: 'bid',
      bidAmount: Math.round((bid.cpm || 0) * 1000),
      bidResponseTime: bid.timeToRespond,
    })
  }
  const filteredBids = (args[key] || []).filter((bid) => (
    (bid.bidId || bid.requestId) === bidRequest.bidId
  ))
  if (filteredBids?.length > 0) {
    const bid = filteredBids[0]
    if (key === 'bidsRejected') {
      return BID_STATUS_MAP[key](bid)
    }
    if (key === 'noBids') {
      return BID_STATUS_MAP[key]()
    }
    // Look in bidsRequested and compare with timeout
    // If bid.timeToRespond > args.timeout then
    // the bid is considered to be a timed out bid
    if (bid.timeToRespond < args.timeout) {
      return BID_STATUS_MAP.bid(bid)
    }
    return BID_STATUS_MAP.timeout()
  }
  return false
}

/**
 * // cpmms, zoneIndexes, bidderss, bid_statusss, bid_response_timess
 * // and zoneNames all have the same length
 * @typedef {{
 *   auc: string
 *   cpmms: number[]
 *   codes?: string[]
 *   zoneIndexes?: number[]
 *   zoneNames?: string[]
 *   bidderss: string[][]
 *   bid_statusss: Array<Array<nobid | bid | timeout | error>>
 *   bid_amountss: Array<Array<number>>
 *   bid_response_timess: Array<Array<number | null>>
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
  const cpmms = []
  const bidderss = []
  const bidStatusss = []
  const bidAmountss = []
  const bidResponseTimess = []
  const floorss = []
  const flattenedBidRequests = args.bidderRequests.reduce((total, curr) => {
    return [...total, ...curr.bids]
  }, [])

  const zoneNames = []
  const zoneIndexes = []
  const adUnitCodes = []
  const podPos = []
  let someZoneIndexNonNull = false
  let someZoneNameNonNull = false
  let allZoneNamesNonNull = true

  args.bidsReceived.forEach(bid => {
    cpmmsMap[bid.adUnitCode] = Math.max(cpmmsMap[bid.adUnitCode] || 0, Math.round(bid.cpm * 1000 || 0))
  })

  args.adUnits.forEach(adUnit => {
    const zoneIndex = getAdIndex(adUnit)
    const zoneName = adUnit.model?.zone ?? null
    const zoneIndexNonNull = zoneIndex != null
    const zoneNameNonNull = zoneName != null

    someZoneIndexNonNull = someZoneIndexNonNull || zoneIndexNonNull
    someZoneNameNonNull = someZoneNameNonNull || zoneNameNonNull
    allZoneNamesNonNull = allZoneNamesNonNull && zoneNameNonNull

    const bidders = []
    const bidStatuss = []
    const bidAmounts = []
    const bidResponseTimes = []
    const floors = []
    
    flattenedBidRequests.forEach(fbr => {
      if (fbr.adUnitCode === adUnit.code) {
        bidders.push(fbr.bidder)
        // To Find bidStatuss, bidAmounts, bidResponseTimes we go through the
        // bidsRejected array for the given bidder, adUnitCode combo
        // followed by search in noBids array. If the given bidder + adUnitCode combo is not
        // found we look into the bidsReceived and check whether the responsetime is greater
        // or less than timeout and assign it either a timeout bid or a valid valid
        // The bidsReceived array has both timeout bids and the valid bids
        const keys = ['bidsRejected', 'noBids', 'bidsReceived']
        let bidStatus = null; let bidAmount = null; let bidResponseTime = null;
        for (let i = 0; i < keys.length; i += 1) {
          const status = keys[i]
          const data = getBidStatusAmtsAndResponseTime(status, fbr, args)
          if (data) {
            bidStatus = data.bidStatus;
            bidAmount = data.bidAmount;
            bidResponseTime = data.bidResponseTime;
            break
          }
        }
        floors.push(getFloor(fbr))
        bidStatuss.push(bidStatus)
        bidAmounts.push(bidAmount)
        bidResponseTimes.push(bidResponseTime)
      }
    })
    // If video context is adpod we add to podPos array the ad position
    // in the pod. Also for every ad in the pod we add its cpmm,
    // index and zone.
    if (adUnit.mediaTypes.video?.context === 'adpod') {
      adUnit.mediaTypes.video?.durationRangeSec.forEach((value, podIndex) => {
        adUnitCodes.push(adUnit.code)
        zoneIndexes.push(zoneIndex)
        zoneNames.push(zoneName)
        podPos.push(podIndex + 1)

        bidderss.push(bidders)
        bidStatusss.push(bidStatuss)
        bidAmountss.push(bidAmounts)
        bidResponseTimess.push(bidResponseTimes)
        floorss.push(floors)
        cpmms.push(cpmmsMap[adUnit.code])
      })
    } else {
      adUnitCodes.push(adUnit.code)
      zoneIndexes.push(zoneIndex)
      zoneNames.push(zoneName)
      podPos.push(0)

      bidderss.push(bidders)
      bidStatusss.push(bidStatuss)
      bidAmountss.push(bidAmounts)
      bidResponseTimess.push(bidResponseTimes)
      floorss.push(floors)
      cpmms.push(cpmmsMap[adUnit.code])
    }
  })

  /** @type {AuctionEndSummary} */
  const eventToSend = {
    auc: args.auctionId,
    ts: args.timestamp,
    tspl: args.timestamp - (Date.now() - (window.performance.now() | 0)),
    tspl_q: window.performance.now() | 0,
  }
  if (!allZoneNamesNonNull) eventToSend.codes = adUnitCodes
  if (someZoneNameNonNull) eventToSend.zoneNames = zoneNames
  if (someZoneNameNonNull) eventToSend.podPositions = podPos
  if (someZoneIndexNonNull) eventToSend.zoneIndexes = zoneIndexes
  eventToSend.cpmms = cpmms
  // args.timestamp is only the _auctionStart in src/auction.js
  // so to get the time for this event we want args.auctionEnd
  eventToSend.ts = args.auctionEnd
  eventToSend.tspl = args.auctionEnd - (Date.now() - (window.performance.now() | 0))
  eventToSend.tspl_q = window.performance.now() | 0
  eventToSend.bidderss = bidderss
  eventToSend.bid_statusss = bidStatusss
  eventToSend.bid_amountss = bidAmountss
  eventToSend.bid_response_timess = bidResponseTimess
  eventToSend.floor_pricess = floorss
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
    result[eventType] = (batch[eventType] || []).map((x) => JSON.stringify(x))
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
      eventToSend = summarizeAuctionInit(
        {
          ...args,
          adUnits: filterDuplicateAdUnits(args.adUnits),
        },
        this.adapterConfig
      )
    } else if (eventType === AUCTION_END) {
      eventToSend = summarizeAuctionEnd(
        {
          ...args,
          adUnits: filterDuplicateAdUnits(args.adUnits),
        },
        this.adapterConfig
      )
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
    } else if (this.timeout == null) {
      this.timeout = setTimeout(this._sendBatch.bind(this), BATCH_MESSAGE_FREQUENCY);
      logInfo(`$p: LiftIgniter not loaded during run of _sendBatch; will retry after ${BATCH_MESSAGE_FREQUENCY}ms`);
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
