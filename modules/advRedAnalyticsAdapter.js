import {generateUUID, logInfo} from '../src/utils.js'
import {ajaxBuilder} from '../src/ajax.js'
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js'
import adapterManager from '../src/adapterManager.js'
import {EVENTS} from '../src/constants.js'
import {getRefererInfo} from '../src/refererDetection.js';

/**
 * advRedAnalyticsAdapter.js - analytics adapter for AdvRed
 */
const DEFAULT_EVENT_URL = 'https://api.adv.red/api/event'

let ajax = ajaxBuilder(10000)
let pwId
let initOptions
let flushInterval
let queue = []

let advRedAnalytics = Object.assign(adapter({url: DEFAULT_EVENT_URL, analyticsType: 'endpoint'}), {
  track({eventType, args}) {
    handleEvent(eventType, args)
  }
})

function sendEvents() {
  if (queue.length > 0) {
    const message = {
      pwId: pwId,
      publisherId: initOptions.publisherId,
      events: queue,
      pageUrl: getRefererInfo().page
    }
    queue = []

    const url = initOptions.url ? initOptions.url : DEFAULT_EVENT_URL
    ajax(
      url,
      () => logInfo('AdvRed Analytics sent ' + queue.length + ' events'),
      JSON.stringify(message),
      {
        method: 'POST',
        contentType: 'application/json',
        withCredentials: true
      }
    )
  }
}

function convertAdUnit(adUnit) {
  if (!adUnit) return adUnit

  const shortAdUnit = {}
  shortAdUnit.code = adUnit.code
  shortAdUnit.sizes = adUnit.sizes
  return shortAdUnit
}

function convertBid(bid) {
  if (!bid) return bid

  const shortBid = {}
  shortBid.adUnitCode = bid.adUnitCode
  shortBid.bidder = bid.bidder
  shortBid.cpm = bid.cpm
  shortBid.currency = bid.currency
  shortBid.mediaTypes = bid.mediaTypes
  shortBid.sizes = bid.sizes
  shortBid.serverResponseTimeMs = bid.serverResponseTimeMs
  return shortBid
}

function convertAuctionInit(origEvent) {
  let shortEvent = {}
  shortEvent.auctionId = origEvent.auctionId
  shortEvent.timeout = origEvent.timeout
  shortEvent.adUnits = origEvent.adUnits && origEvent.adUnits.map(convertAdUnit)
  return shortEvent
}

function convertBidRequested(origEvent) {
  let shortEvent = {}
  shortEvent.bidderCode = origEvent.bidderCode
  shortEvent.bids = origEvent.bids && origEvent.bids.map(convertBid)
  shortEvent.timeout = origEvent.timeout
  return shortEvent
}

function convertBidTimeout(origEvent) {
  let shortEvent = {}
  shortEvent.bids = origEvent && origEvent.map ? origEvent.map(convertBid) : origEvent
  return shortEvent
}

function convertBidderError(origEvent) {
  let shortEvent = {}
  shortEvent.bids = origEvent.bidderRequest && origEvent.bidderRequest.bids && origEvent.bidderRequest.bids.map(convertBid)
  return shortEvent
}

function convertAuctionEnd(origEvent) {
  let shortEvent = {}
  shortEvent.adUnitCodes = origEvent.adUnitCodes
  shortEvent.bidsReceived = origEvent.bidsReceived && origEvent.bidsReceived.map(convertBid)
  shortEvent.noBids = origEvent.noBids && origEvent.noBids.map(convertBid)
  return shortEvent
}

function convertBidWon(origEvent) {
  let shortEvent = {}
  shortEvent.adUnitCode = origEvent.adUnitCode
  shortEvent.bidderCode = origEvent.bidderCode
  shortEvent.mediaType = origEvent.mediaType
  shortEvent.netRevenue = origEvent.netRevenue
  shortEvent.cpm = origEvent.cpm
  shortEvent.size = origEvent.size
  shortEvent.currency = origEvent.currency
  return shortEvent
}

function handleEvent(eventType, origEvent) {
  try {
    origEvent = origEvent ? JSON.parse(JSON.stringify(origEvent)) : {}
  } catch (e) {
  }

  let shortEvent
  switch (eventType) {
    case EVENTS.AUCTION_INIT: {
      shortEvent = convertAuctionInit(origEvent)
      break
    }
    case EVENTS.BID_REQUESTED: {
      shortEvent = convertBidRequested(origEvent)
      break
    }
    case EVENTS.BID_TIMEOUT: {
      shortEvent = convertBidTimeout(origEvent)
      break
    }
    case EVENTS.BIDDER_ERROR: {
      shortEvent = convertBidderError(origEvent)
      break
    }
    case EVENTS.AUCTION_END: {
      shortEvent = convertAuctionEnd(origEvent)
      break
    }
    case EVENTS.BID_WON: {
      shortEvent = convertBidWon(origEvent)
      break
    }
    default:
      return
  }

  shortEvent.eventType = eventType
  shortEvent.auctionId = origEvent.auctionId
  shortEvent.timestamp = origEvent.timestamp || Date.now()

  sendEvent(shortEvent)
}

function sendEvent(event) {
  queue.push(event)

  if (event.eventType === EVENTS.AUCTION_END) {
    sendEvents()
  }
}

advRedAnalytics.originEnableAnalytics = advRedAnalytics.enableAnalytics
advRedAnalytics.enableAnalytics = function (config) {
  initOptions = config.options || {}
  pwId = generateUUID()
  flushInterval = setInterval(sendEvents, 1000)

  advRedAnalytics.originEnableAnalytics(config)
}

advRedAnalytics.originDisableAnalytics = advRedAnalytics.disableAnalytics
advRedAnalytics.disableAnalytics = function () {
  clearInterval(flushInterval)
  sendEvents()
  advRedAnalytics.originDisableAnalytics()
}

adapterManager.registerAnalyticsAdapter({
  adapter: advRedAnalytics,
  code: 'advRed'
})

advRedAnalytics.getOptions = function () {
  return initOptions
}

advRedAnalytics.sendEvents = sendEvents

export default advRedAnalytics
