import { generateUUID, getParameterByName, logError, logInfo, parseUrl } from '../src/utils.js'
import { ajaxBuilder } from '../src/ajax.js'
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js'
import adapterManager from '../src/adapterManager.js'
import { getStorageManager } from '../src/storageManager.js'
import { EVENTS } from '../src/constants.js'
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js'
import {getRefererInfo} from '../src/refererDetection.js';

/**
 * asteriobidAnalyticsAdapter.js - analytics adapter for AsterioBid
 */
export const storage = getStorageManager({ moduleType: MODULE_TYPE_ANALYTICS, moduleName: 'asteriobid' })
const DEFAULT_EVENT_URL = 'https://endpt.asteriobid.com/endpoint'
const analyticsType = 'endpoint'
const analyticsName = 'AsterioBid Analytics'
const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const _VERSION = 1

let ajax = ajaxBuilder(20000)
let initOptions
let auctionStarts = {}
let auctionTimeouts = {}
let sampling
let pageViewId
let flushInterval
let eventQueue = []
let asteriobidAnalyticsEnabled = false

let asteriobidAnalytics = Object.assign(adapter({ url: DEFAULT_EVENT_URL, analyticsType }), {
  track({ eventType, args }) {
    handleEvent(eventType, args)
  }
})

asteriobidAnalytics.originEnableAnalytics = asteriobidAnalytics.enableAnalytics
asteriobidAnalytics.enableAnalytics = function (config) {
  initOptions = config.options || {}

  pageViewId = initOptions.pageViewId || generateUUID()
  sampling = initOptions.sampling || 1

  if (Math.floor(Math.random() * sampling) === 0) {
    asteriobidAnalyticsEnabled = true
    flushInterval = setInterval(flush, 1000)
  } else {
    logInfo(`${analyticsName} isn't enabled because of sampling`)
  }

  asteriobidAnalytics.originEnableAnalytics(config)
}

asteriobidAnalytics.originDisableAnalytics = asteriobidAnalytics.disableAnalytics
asteriobidAnalytics.disableAnalytics = function () {
  if (!asteriobidAnalyticsEnabled) {
    return
  }
  flush()
  clearInterval(flushInterval)
  asteriobidAnalytics.originDisableAnalytics()
}

function collectUtmTagData() {
  let newUtm = false
  let pmUtmTags = {}
  try {
    utmTags.forEach(function (utmKey) {
      let utmValue = getParameterByName(utmKey)
      if (utmValue !== '') {
        newUtm = true
      }
      pmUtmTags[utmKey] = utmValue
    })
    if (newUtm === false) {
      utmTags.forEach(function (utmKey) {
        let itemValue = storage.getDataFromLocalStorage(`pm_${utmKey}`)
        if (itemValue && itemValue.length !== 0) {
          pmUtmTags[utmKey] = itemValue
        }
      })
    } else {
      utmTags.forEach(function (utmKey) {
        storage.setDataInLocalStorage(`pm_${utmKey}`, pmUtmTags[utmKey])
      })
    }
  } catch (e) {
    logError(`${analyticsName} Error`, e)
    pmUtmTags['error_utm'] = 1
  }
  return pmUtmTags
}

function collectPageInfo() {
  const pageInfo = {
    domain: window.location.hostname,
  }
  if (document.referrer) {
    pageInfo.referrerDomain = parseUrl(document.referrer).hostname
  }

  const refererInfo = getRefererInfo()
  pageInfo.page = refererInfo.page
  pageInfo.ref = refererInfo.ref

  return pageInfo
}

function flush() {
  if (!asteriobidAnalyticsEnabled) {
    return
  }

  if (eventQueue.length > 0) {
    const data = {
      pageViewId: pageViewId,
      ver: _VERSION,
      bundleId: initOptions.bundleId,
      events: eventQueue,
      utmTags: collectUtmTagData(),
      pageInfo: collectPageInfo(),
      sampling: sampling
    }
    eventQueue = []

    if ('version' in initOptions) {
      data.version = initOptions.version
    }
    if ('tcf_compliant' in initOptions) {
      data.tcf_compliant = initOptions.tcf_compliant
    }
    if ('adUnitDict' in initOptions) {
      data.adUnitDict = initOptions.adUnitDict;
    }
    if ('customParam' in initOptions) {
      data.customParam = initOptions.customParam;
    }

    const url = initOptions.url ? initOptions.url : DEFAULT_EVENT_URL
    ajax(
      url,
      () => logInfo(`${analyticsName} sent events batch`),
      _VERSION + ':' + JSON.stringify(data),
      {
        contentType: 'text/plain',
        method: 'POST',
        withCredentials: true
      }
    )
  }
}

function trimAdUnit(adUnit) {
  if (!adUnit) return adUnit
  const res = {}
  res.code = adUnit.code
  res.sizes = adUnit.sizes
  return res
}

function trimBid(bid) {
  if (!bid) return bid
  const res = {}
  res.auctionId = bid.auctionId
  res.bidder = bid.bidder
  res.bidderRequestId = bid.bidderRequestId
  res.bidId = bid.bidId
  res.crumbs = bid.crumbs
  res.cpm = bid.cpm
  res.currency = bid.currency
  res.mediaTypes = bid.mediaTypes
  res.sizes = bid.sizes
  res.transactionId = bid.transactionId
  res.adUnitCode = bid.adUnitCode
  res.bidRequestsCount = bid.bidRequestsCount
  res.serverResponseTimeMs = bid.serverResponseTimeMs
  return res
}

function trimBidderRequest(bidderRequest) {
  if (!bidderRequest) return bidderRequest
  const res = {}
  res.auctionId = bidderRequest.auctionId
  res.auctionStart = bidderRequest.auctionStart
  res.bidderRequestId = bidderRequest.bidderRequestId
  res.bidderCode = bidderRequest.bidderCode
  res.bids = bidderRequest.bids && bidderRequest.bids.map(trimBid)
  return res
}

function handleEvent(eventType, eventArgs) {
  if (!asteriobidAnalyticsEnabled) {
    return
  }

  try {
    eventArgs = eventArgs ? JSON.parse(JSON.stringify(eventArgs)) : {}
  } catch (e) {
    // keep eventArgs as is
  }

  const pmEvent = {}
  pmEvent.timestamp = eventArgs.timestamp || Date.now()
  pmEvent.eventType = eventType

  switch (eventType) {
    case EVENTS.AUCTION_INIT: {
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.timeout = eventArgs.timeout
      pmEvent.adUnits = eventArgs.adUnits && eventArgs.adUnits.map(trimAdUnit)
      pmEvent.bidderRequests = eventArgs.bidderRequests && eventArgs.bidderRequests.map(trimBidderRequest)
      auctionStarts[pmEvent.auctionId] = pmEvent.timestamp
      auctionTimeouts[pmEvent.auctionId] = pmEvent.timeout
      break
    }
    case EVENTS.AUCTION_END: {
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.end = eventArgs.end
      pmEvent.start = eventArgs.start
      pmEvent.adUnitCodes = eventArgs.adUnitCodes
      pmEvent.bidsReceived = eventArgs.bidsReceived && eventArgs.bidsReceived.map(trimBid)
      pmEvent.start = auctionStarts[pmEvent.auctionId]
      pmEvent.end = Date.now()
      break
    }
    case EVENTS.BID_ADJUSTMENT: {
      break
    }
    case EVENTS.BID_TIMEOUT: {
      pmEvent.bidders = eventArgs && eventArgs.map ? eventArgs.map(trimBid) : eventArgs
      pmEvent.duration = auctionTimeouts[pmEvent.auctionId]
      break
    }
    case EVENTS.BID_REQUESTED: {
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.bidderCode = eventArgs.bidderCode
      pmEvent.doneCbCallCount = eventArgs.doneCbCallCount
      pmEvent.start = eventArgs.start
      pmEvent.bidderRequestId = eventArgs.bidderRequestId
      pmEvent.bids = eventArgs.bids && eventArgs.bids.map(trimBid)
      pmEvent.auctionStart = eventArgs.auctionStart
      pmEvent.timeout = eventArgs.timeout
      break
    }
    case EVENTS.BID_RESPONSE: {
      pmEvent.bidderCode = eventArgs.bidderCode
      pmEvent.width = eventArgs.width
      pmEvent.height = eventArgs.height
      pmEvent.adId = eventArgs.adId
      pmEvent.mediaType = eventArgs.mediaType
      pmEvent.cpm = eventArgs.cpm
      pmEvent.currency = eventArgs.currency
      pmEvent.requestId = eventArgs.requestId
      pmEvent.adUnitCode = eventArgs.adUnitCode
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.timeToRespond = eventArgs.timeToRespond
      pmEvent.requestTimestamp = eventArgs.requestTimestamp
      pmEvent.responseTimestamp = eventArgs.responseTimestamp
      pmEvent.netRevenue = eventArgs.netRevenue
      pmEvent.size = eventArgs.size
      pmEvent.adserverTargeting = eventArgs.adserverTargeting
      break
    }
    case EVENTS.BID_WON: {
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.adId = eventArgs.adId
      pmEvent.adserverTargeting = eventArgs.adserverTargeting
      pmEvent.adUnitCode = eventArgs.adUnitCode
      pmEvent.bidderCode = eventArgs.bidderCode
      pmEvent.height = eventArgs.height
      pmEvent.mediaType = eventArgs.mediaType
      pmEvent.netRevenue = eventArgs.netRevenue
      pmEvent.cpm = eventArgs.cpm
      pmEvent.requestTimestamp = eventArgs.requestTimestamp
      pmEvent.responseTimestamp = eventArgs.responseTimestamp
      pmEvent.size = eventArgs.size
      pmEvent.width = eventArgs.width
      pmEvent.currency = eventArgs.currency
      pmEvent.bidder = eventArgs.bidder
      break
    }
    case EVENTS.BIDDER_DONE: {
      pmEvent.auctionId = eventArgs.auctionId
      pmEvent.auctionStart = eventArgs.auctionStart
      pmEvent.bidderCode = eventArgs.bidderCode
      pmEvent.bidderRequestId = eventArgs.bidderRequestId
      pmEvent.bids = eventArgs.bids && eventArgs.bids.map(trimBid)
      pmEvent.doneCbCallCount = eventArgs.doneCbCallCount
      pmEvent.start = eventArgs.start
      pmEvent.timeout = eventArgs.timeout
      pmEvent.tid = eventArgs.tid
      pmEvent.src = eventArgs.src
      break
    }
    case EVENTS.SET_TARGETING: {
      break
    }
    case EVENTS.REQUEST_BIDS: {
      break
    }
    case EVENTS.ADD_AD_UNITS: {
      break
    }
    case EVENTS.AD_RENDER_FAILED: {
      pmEvent.bid = eventArgs.bid
      pmEvent.message = eventArgs.message
      pmEvent.reason = eventArgs.reason
      break
    }
    default:
      return
  }

  sendEvent(pmEvent)
}

function sendEvent(event) {
  eventQueue.push(event)
  logInfo(`${analyticsName} Event ${event.eventType}:`, event)

  if (event.eventType === EVENTS.AUCTION_END) {
    flush()
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: asteriobidAnalytics,
  code: 'asteriobid'
})

asteriobidAnalytics.getOptions = function () {
  return initOptions
}

asteriobidAnalytics.flush = flush

export default asteriobidAnalytics
