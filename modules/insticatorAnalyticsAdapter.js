import adapter from '../src/AnalyticsAdapter.js'
import adapterManager from '../src/adapterManager.js'
import CONSTANTS from '../src/constants.json'
import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js'

const baseUrl = 'https://tr.ingage.tech/'
const ENDPOINTS = {
  AD_RENDER_FAILED: baseUrl + 'com.snowplowanalytics.iglu/v1?schema=iglu%3Acom.insticator%2Frender_failed%2Fjsonschema%2F3-0-0',
  AD_RENDER_SUCCEEDED: baseUrl + 'com.snowplowanalytics.iglu/v1?schema=iglu%3Acom.insticator%2Frender_succeeded%2Fjsonschema%2F3-0-1',
  BID_WON: baseUrl + 'com.snowplowanalytics.iglu/v1?schema=iglu%3Acom.insticator%2Fbid_won%2Fjsonschema%2F3-0-0'
}

const analyticsType = 'endpoint'
const ADAPTER_CODE = 'insticator'

const {
  AUCTION_INIT,
  BID_REQUESTED,
  BID_RESPONSE,
  BID_WON,
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED
} = CONSTANTS.EVENTS

const SERVER_EVENTS = {
  AD_RENDER_FAILED: 'adRenderFailed',
  AD_RENDER_SUCCEEDED: 'adRenderSucceeded',
  WON: 'bidWon'
}

const SERVER_BID_STATUS = {
  BID_REQUESTED: 'bidRequested',
  BID_RECEIVED: 'bidReceived',
  BID_WON: 'bidWon'
}

let auctions = {}

const onAuctionInit = (args) => {
  const { auctionId, adUnits, timestamp } = args

  let auction = auctions[auctionId] = {
    ...args,
    adUnits: {},
    auctionStart: timestamp,
  }

  utils._each(adUnits, adUnit => {
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

const onBidWon = (args) => {
  const { auctionId, adUnitCode } = args
  const bidId = parseBidId(args)
  const bid = auctions[auctionId].adUnits[adUnitCode].bids[bidId]

  Object.assign(bid, args, {
    bidStatus: SERVER_BID_STATUS.BID_WON,
    isW: true,
    isH: true
  })

  const payload = {
    auctionId,
    adunid: adUnitCode,
    bid: mapBid(bid, BID_WON)
  }

  sendEvent(SERVER_EVENTS.WON, payload)
}

const onAdRenderFailed = (args) => {
  const { bid } = args
  let data = {
    timestamp: Date.now()
  }

  if (bid) {
    data.bid = mapBid(bid, AD_RENDER_FAILED)
  }

  sendEvent(SERVER_EVENTS.AD_RENDER_FAILED, data)
}

const onAdRenderSucceeded = (args) => {
  const { bid } = args
  let data = {
    timestamp: Date.now()
  }

  if (bid) {
    data.bid = mapBid(bid, AD_RENDER_SUCCEEDED)
  }

  sendEvent(SERVER_EVENTS.AD_RENDER_SUCCEEDED, data)
}

var insticatorAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      handleEvent(eventType, args)
    }
  }
)

function handleEvent(eventType, args) {
  switch (eventType) {
    case AUCTION_INIT:
      onAuctionInit(args)
      break
    case BID_REQUESTED:
      onBidRequested(args)
      break
    case BID_RESPONSE:
      onBidResponse(args)
      break
    case BID_WON:
      onBidWon(args)
      break
    case AD_RENDER_FAILED:
      onAdRenderFailed(args)
      break
    case AD_RENDER_SUCCEEDED:
      onAdRenderSucceeded(args)
      break
  }
}

function sendEvent(eventType, data) {
  // let data = utils.deepClone(args)
  let payload = {
    eventType,
    domain: window.location.hostname
  }
  if (data.bid) {
    payload.bid = data.bid
  }
  if (data.timestamp) {
    payload.timestamp = data.timestamp
  }
  if (data.auctionId) {
    payload.auctionId = data.auctionId
  }
  if (data.adunid) {
    payload.adunid = data.adunid
  }
  let endpoint
  if (eventType === SERVER_EVENTS.AD_RENDER_FAILED) {
    endpoint = ENDPOINTS.AD_RENDER_FAILED
  } else if (eventType === SERVER_EVENTS.WON) {
    endpoint = ENDPOINTS.BID_WON
  } else if (eventType === SERVER_EVENTS.AD_RENDER_SUCCEEDED) {
    endpoint = ENDPOINTS.AD_RENDER_SUCCEEDED
  }

  if (endpoint) {
    ajaxCall(endpoint, () => { }, JSON.stringify(payload), {})
  }
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
  // delete bidObj['ad']
  delete bidObj['usesGenericKeys']
  delete bidObj['requestTimestamp']
  return bidObj
}

function ajaxCall(endpoint, callback, data, options = {}) {
  options.contentType = 'application/json'

  return ajax(endpoint, callback, data, options)
}

insticatorAdapter.originEnableAnalytics = insticatorAdapter.enableAnalytics
insticatorAdapter.enableAnalytics = function (config) {
  // initOptions = config.options;
  insticatorAdapter.originEnableAnalytics(config)
};

insticatorAdapter.originDisableAnalytics = insticatorAdapter.disableAnalytics
insticatorAdapter.disableAnalytics = function () {
  auctions = {}
  insticatorAdapter.originDisableAnalytics()
}

adapterManager.registerAnalyticsAdapter({
  adapter: insticatorAdapter,
  code: ADAPTER_CODE
})

export default insticatorAdapter
