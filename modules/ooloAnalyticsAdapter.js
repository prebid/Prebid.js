import { _each, deepClone, pick, deepSetValue, logError, logInfo } from '../src/utils.js';
import { getOrigin } from '../libraries/getOrigin/index.js';
import adapter from '../src/AnalyticsAdapter.js'
import adapterManager from '../src/adapterManager.js'
import CONSTANTS from '../src/constants.json'
import { ajax } from '../src/ajax.js'
import { config } from '../src/config.js'

const baseUrl = 'https://pbdata.oolo.io/'
const ENDPOINTS = {
  CONFIG: 'https://config-pbdata.oolo.io',
  PAGE_DATA: baseUrl + 'page',
  AUCTION: baseUrl + 'auctionData',
  BID_WON: baseUrl + 'bidWonData',
  AD_RENDER_FAILED: baseUrl + 'adRenderFailedData',
  RAW: baseUrl + 'raw',
  HBCONFIG: baseUrl + 'hbconfig',
}

const pbModuleVersion = '1.0.0'
const prebidVersion = '$prebid.version$'
const analyticsType = 'endpoint'
const ADAPTER_CODE = 'oolo'
const AUCTION_END_SEND_TIMEOUT = 1500
export const PAGEVIEW_ID = +generatePageViewId()

const {
  AUCTION_INIT,
  AUCTION_END,
  BID_REQUESTED,
  BID_RESPONSE,
  NO_BID,
  BID_WON,
  BID_TIMEOUT,
  AD_RENDER_FAILED
} = CONSTANTS.EVENTS

const SERVER_EVENTS = {
  AUCTION: 'auction',
  WON: 'bidWon',
  AD_RENDER_FAILED: 'adRenderFailed'
}

const SERVER_BID_STATUS = {
  NO_BID: 'noBid',
  BID_REQUESTED: 'bidRequested',
  BID_RECEIVED: 'bidReceived',
  BID_TIMEDOUT: 'bidTimedOut',
  BID_WON: 'bidWon'
}

let auctions = {}
let initOptions = {}
let eventsQueue = []

const onAuctionInit = (args) => {
  const { auctionId, adUnits, timestamp } = args

  let auction = auctions[auctionId] = {
    ...args,
    adUnits: {},
    auctionStart: timestamp,
    _sentToServer: false
  }

  handleCustomFields(auction, AUCTION_INIT, args)

  _each(adUnits, adUnit => {
    auction.adUnits[adUnit.code] = {
      ...adUnit,
      auctionId,
      adunid: adUnit.code,
      bids: {},
    }
  })
}

const onBidRequested = (args) => {
  const { auctionId, bids, start, timeout } = args
  const _start = start || Date.now()
  const auction = auctions[auctionId]
  const auctionAdUnits = auction.adUnits

  bids.forEach(bid => {
    const { adUnitCode } = bid
    const bidId = parseBidId(bid)

    auctionAdUnits[adUnitCode].bids[bidId] = {
      ...bid,
      timeout,
      start: _start,
      rs: _start - auction.auctionStart,
      bidStatus: SERVER_BID_STATUS.BID_REQUESTED,
    }
  })
}

const onBidResponse = (args) => {
  const { auctionId, adUnitCode } = args
  const auction = auctions[auctionId]
  const bidId = parseBidId(args)
  let bid = auction.adUnits[adUnitCode].bids[bidId]

  Object.assign(bid, args, {
    bidStatus: SERVER_BID_STATUS.BID_RECEIVED,
    end: args.responseTimestamp,
    re: args.responseTimestamp - auction.auctionStart
  })
}

const onNoBid = (args) => {
  const { auctionId, adUnitCode } = args
  const bidId = parseBidId(args)
  const end = Date.now()
  const auction = auctions[auctionId]
  let bid = auction.adUnits[adUnitCode].bids[bidId]

  Object.assign(bid, args, {
    bidStatus: SERVER_BID_STATUS.NO_BID,
    end,
    re: end - auction.auctionStart
  })
}

const onBidWon = (args) => {
  const { auctionId, adUnitCode } = args
  const bidId = parseBidId(args)
  const bid = auctions[auctionId].adUnits[adUnitCode].bids[bidId]

  Object.assign(bid, args, {
    bidStatus: SERVER_BID_STATUS.BID_WON,
    isW: true,
    isH: true
  })

  if (auctions[auctionId]._sentToServer) {
    const payload = {
      auctionId,
      adunid: adUnitCode,
      bid: mapBid(bid, BID_WON)
    }

    sendEvent(SERVER_EVENTS.WON, payload)
  }
}

const onBidTimeout = (args) => {
  _each(args, bid => {
    const { auctionId, adUnitCode } = bid
    const bidId = parseBidId(bid)
    let bidCache = auctions[auctionId].adUnits[adUnitCode].bids[bidId]

    Object.assign(bidCache, bid, {
      bidStatus: SERVER_BID_STATUS.BID_TIMEDOUT,
    })
  })
}

const onAuctionEnd = (args) => {
  const { auctionId, adUnits, ...restAuctionEnd } = args

  Object.assign(auctions[auctionId], restAuctionEnd, {
    auctionEnd: args.auctionEnd || Date.now()
  })

  // wait for bidWon before sending to server
  setTimeout(() => {
    auctions[auctionId]._sentToServer = true
    const finalAuctionData = buildAuctionData(auctions[auctionId])

    sendEvent(SERVER_EVENTS.AUCTION, finalAuctionData)
  }, initOptions.serverConfig.BID_WON_TIMEOUT || AUCTION_END_SEND_TIMEOUT)
}

const onAdRenderFailed = (args) => {
  const data = deepClone(args)
  data.timestamp = Date.now()

  if (data.bid) {
    data.bid = mapBid(data.bid, AD_RENDER_FAILED)
  }

  sendEvent(SERVER_EVENTS.AD_RENDER_FAILED, data)
}

var ooloAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      // wait for server configuration before processing the events
      if (typeof initOptions.serverConfig !== 'undefined' && eventsQueue.length === 0) {
        handleEvent(eventType, args)
      } else {
        eventsQueue.push({ eventType, args })
      }
    }
  }
)

function handleEvent(eventType, args) {
  try {
    const { sendRaw } = initOptions.serverConfig.events[eventType]
    if (sendRaw) {
      sendEvent(eventType, args, true)
    }
  } catch (e) { }

  switch (eventType) {
    case AUCTION_INIT:
      onAuctionInit(args)
      break
    case BID_REQUESTED:
      onBidRequested(args)
      break
    case NO_BID:
      onNoBid(args)
      break
    case BID_RESPONSE:
      onBidResponse(args)
      break
    case BID_WON:
      onBidWon(args)
      break
    case BID_TIMEOUT:
      onBidTimeout(args)
      break
    case AUCTION_END:
      onAuctionEnd(args)
      break
    case AD_RENDER_FAILED:
      onAdRenderFailed(args)
      break
  }
}

function sendEvent(eventType, args, isRaw) {
  let data = deepClone(args)

  Object.assign(data, buildCommonDataProperties(), {
    eventType
  })

  if (isRaw) {
    let rawEndpoint
    try {
      const { endpoint, omitRawFields } = initOptions.serverConfig.events[eventType]
      rawEndpoint = endpoint
      handleCustomRawFields(data, omitRawFields)
    } catch (e) { }
    ajaxCall(rawEndpoint || ENDPOINTS.RAW, () => { }, JSON.stringify(data))
  } else {
    let endpoint
    if (eventType === SERVER_EVENTS.AD_RENDER_FAILED) {
      endpoint = ENDPOINTS.AD_RENDER_FAILED
    } else if (eventType === SERVER_EVENTS.WON) {
      endpoint = ENDPOINTS.BID_WON
    } else {
      endpoint = ENDPOINTS.AUCTION
    }

    ajaxCall(endpoint, () => { }, JSON.stringify(data))
  }
}

function checkEventsQueue() {
  while (eventsQueue.length) {
    const event = eventsQueue.shift()
    handleEvent(event.eventType, event.args)
  }
}

function buildAuctionData(auction) {
  const auctionData = deepClone(auction)
  const keysToRemove = ['adUnitCodes', 'auctionStatus', 'bidderRequests', 'bidsReceived', 'noBids', 'winningBids', 'timestamp', 'config']

  keysToRemove.forEach(key => {
    delete auctionData[key]
  })

  handleCustomFields(auctionData, AUCTION_END, auction)

  // turn bids object into array of objects
  Object.keys(auctionData.adUnits).forEach(adUnit => {
    const adUnitObj = auctionData.adUnits[adUnit]
    adUnitObj.bids = Object.keys(adUnitObj.bids).map(key => mapBid(adUnitObj.bids[key]))
    delete adUnitObj['adUnitCode']
    delete adUnitObj['code']
    delete adUnitObj['transactionId']
  })

  // turn adUnits objects into array of adUnits
  auctionData.adUnits = Object.keys(auctionData.adUnits).map(key => auctionData.adUnits[key])

  return auctionData
}

function buildCommonDataProperties() {
  return {
    pvid: PAGEVIEW_ID,
    pid: initOptions.pid,
    pbModuleVersion
  }
}

function buildLogMessage(message) {
  return `oolo: ${message}`
}

function parseBidId(bid) {
  return bid.bidId || bid.requestId
}

function mapBid({
  bidStatus,
  start,
  end,
  mediaType,
  creativeId,
  originalCpm,
  originalCurrency,
  source,
  netRevenue,
  currency,
  width,
  height,
  timeToRespond,
  responseTimestamp,
  ...rest
}, eventType) {
  const bidObj = {
    bst: bidStatus,
    s: start,
    e: responseTimestamp || end,
    mt: mediaType,
    crId: creativeId,
    oCpm: originalCpm,
    oCur: originalCurrency,
    src: source,
    nrv: netRevenue,
    cur: currency,
    w: width,
    h: height,
    ttr: timeToRespond,
    ...rest,
  }

  delete bidObj['bidRequestsCount']
  delete bidObj['bidderRequestId']
  delete bidObj['bidderRequestsCount']
  delete bidObj['bidderWinsCount']
  delete bidObj['schain']
  delete bidObj['refererInfo']
  delete bidObj['statusMessage']
  delete bidObj['status']
  delete bidObj['adUrl']
  delete bidObj['ad']
  delete bidObj['usesGenericKeys']
  delete bidObj['requestTimestamp']

  try {
    handleCustomFields(bidObj, eventType || BID_RESPONSE, rest)
  } catch (e) { }

  return bidObj
}

function handleCustomFields(obj, eventType, args) {
  try {
    const { pickFields, omitFields } = initOptions.serverConfig.events[eventType]

    if (pickFields && obj && args) {
      Object.assign(obj, pick(args, pickFields))
    }

    if (omitFields && obj && args) {
      omitFields.forEach(field => {
        deepSetValue(obj, field, undefined)
      })
    }
  } catch (e) { }
}

function handleCustomRawFields(obj, omitRawFields) {
  try {
    if (omitRawFields && obj) {
      omitRawFields.forEach(field => {
        deepSetValue(obj, field, undefined)
      })
    }
  } catch (e) { }
}

function getServerConfig() {
  const defaultConfig = { events: {} }

  ajaxCall(
    ENDPOINTS.CONFIG + '?pid=' + initOptions.pid,
    {
      success: function (data) {
        try {
          initOptions.serverConfig = JSON.parse(data) || defaultConfig
        } catch (e) {
          initOptions.serverConfig = defaultConfig
        }
        checkEventsQueue()
      },
      error: function () {
        initOptions.serverConfig = defaultConfig
        checkEventsQueue()
      }
    },
    null
  )
}

function sendPage() {
  setTimeout(() => {
    const payload = {
      timestamp: Date.now(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      url: window.location.href,
      protocol: window.location.protocol,
      origin: getOrigin(),
      referrer: getTopWindowReferrer(),
      pbVersion: prebidVersion,
    }

    Object.assign(payload, buildCommonDataProperties(), getPagePerformance())
    ajaxCall(ENDPOINTS.PAGE_DATA, () => { }, JSON.stringify(payload))
  }, 0)
}

function sendHbConfigData() {
  const conf = {}
  const pbjsConfig = config.getConfig()

  Object.keys(pbjsConfig).forEach(key => {
    if (key[0] !== '_') {
      conf[key] = pbjsConfig[key]
    }
  })

  ajaxCall(ENDPOINTS.HBCONFIG, () => { }, JSON.stringify(conf))
}

function getPagePerformance() {
  let timing

  try {
    timing = window.top.performance.timing
  } catch (e) { }

  if (!timing) {
    return
  }

  const { navigationStart, domContentLoadedEventEnd, loadEventEnd } = timing
  const domContentLoadTime = domContentLoadedEventEnd - navigationStart
  const pageLoadTime = loadEventEnd - navigationStart

  return {
    domContentLoadTime,
    pageLoadTime,
  }
}

function getTopWindowReferrer() {
  try {
    return window.top.document.referrer
  } catch (e) {
    return ''
  }
}

function generatePageViewId(min = 10000, max = 90000) {
  var randomNumber = Math.floor((Math.random() * max) + min)
  var currentdate = new Date()
  var currentTime = {
    getDate: currentdate.getDate(),
    getMonth: currentdate.getMonth(),
    getFullYear: currentdate.getFullYear(),
    getHours: currentdate.getHours(),
    getMinutes: currentdate.getMinutes(),
    getSeconds: currentdate.getSeconds(),
    getMilliseconds: currentdate.getMilliseconds()
  }
  return ((currentTime.getDate <= 9) ? '0' + (currentTime.getDate) : (currentTime.getDate)) + '' +
    (currentTime.getMonth + 1 <= 9 ? '0' + (currentTime.getMonth + 1) : (currentTime.getMonth + 1)) + '' +
    currentTime.getFullYear % 100 + '' +
    (currentTime.getHours <= 9 ? '0' + currentTime.getHours : currentTime.getHours) + '' +
    (currentTime.getMinutes <= 9 ? '0' + currentTime.getMinutes : currentTime.getMinutes) + '' +
    (currentTime.getSeconds <= 9 ? '0' + currentTime.getSeconds : currentTime.getSeconds) + '' +
    (currentTime.getMilliseconds % 100 <= 9 ? '0' + (currentTime.getMilliseconds % 100) : (currentTime.getMilliseconds % 100)) + '' +
    (randomNumber)
}

function ajaxCall(endpoint, callback, data, options = {}) {
  if (data) {
    options.contentType = 'application/json'
  }

  return ajax(endpoint, callback, data, options)
}

ooloAdapter.originEnableAnalytics = ooloAdapter.enableAnalytics
ooloAdapter.enableAnalytics = function (config) {
  ooloAdapter.originEnableAnalytics(config)
  initOptions = config ? config.options : {}

  if (!initOptions.pid) {
    logError(buildLogMessage('enableAnalytics missing config object with "pid"'))
    return
  }

  getServerConfig()
  sendHbConfigData()

  if (document.readyState === 'complete') {
    sendPage()
  } else {
    window.addEventListener('load', sendPage)
  }

  logInfo(buildLogMessage('enabled analytics adapter'), config)
  ooloAdapter.enableAnalytics = function () {
    logInfo(buildLogMessage('Analytics adapter already enabled..'))
  }
}

ooloAdapter.originDisableAnalytics = ooloAdapter.disableAnalytics
ooloAdapter.disableAnalytics = function () {
  auctions = {}
  initOptions = {}
  ooloAdapter.originDisableAnalytics()
}

adapterManager.registerAnalyticsAdapter({
  adapter: ooloAdapter,
  code: ADAPTER_CODE
})

// export for testing
export {
  buildAuctionData,
  generatePageViewId
}

export default ooloAdapter
