import {ajax} from '../src/ajax.js'
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js'
import CONSTANTS from '../src/constants.json'
import adapterManager from '../src/adapterManager.js'
import {getGlobal} from '../src/prebidGlobal.js'
import {logInfo, logError, deepClone} from '../src/utils.js'

const analyticsType = 'endpoint'
export const ANALYTICS_VERSION = '1.0.0'
export const DEFAULT_SERVER = 'https://central.mall.tv/analytics'

const {
  EVENTS: {
    AUCTION_END,
    BID_TIMEOUT
  }
} = CONSTANTS

export const BIDDER_STATUS = {
  BID: 1,
  NO_BID: 2,
  BID_WON: 3,
  TIMEOUT: 4
}

export const getCpmInEur = function (bid) {
  if (bid.currency !== 'EUR' && typeof bid.getCpmInNewCurrency === 'function') {
    return bid.getCpmInNewCurrency('EUR');
  }

  return bid.cpm;
}

const analyticsOptions = {}

export const parseBidderCode = function (bid) {
  let bidderCode = bid.bidderCode || bid.bidder
  return bidderCode.toLowerCase()
}

export const parseAdUnitCode = function (bidResponse) {
  return bidResponse.adUnitCode.toLowerCase()
}

export const malltvAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {

  cachedAuctions: {},

  initConfig(config) {
    /**
     * Required option: propertyId
     *
     * Optional option: server
     * @type {boolean}
     */
    analyticsOptions.options = deepClone(config.options)
    if (typeof config.options.propertyId !== 'string' || config.options.propertyId.length < 1) {
      logError('"options.propertyId" is required.')
      return false
    }

    analyticsOptions.propertyId = config.options.propertyId
    analyticsOptions.server = config.options.server || DEFAULT_SERVER

    return true
  },
  track({eventType, args}) {
    switch (eventType) {
      case BID_TIMEOUT:
        this.handleBidTimeout(args)
        break
      case AUCTION_END:
        this.handleAuctionEnd(args)
        break
    }
  },
  handleBidTimeout(timeoutBids) {
    timeoutBids.forEach((bid) => {
      const cachedAuction = this.getCachedAuction(bid.auctionId)
      cachedAuction.timeoutBids.push(bid)
    })
  },
  handleAuctionEnd(auctionEndArgs) {
    const cachedAuction = this.getCachedAuction(auctionEndArgs.auctionId)
    const highestCpmBids = getGlobal().getHighestCpmBids()
    this.sendEventMessage('end',
      this.createBidMessage(auctionEndArgs, highestCpmBids, cachedAuction.timeoutBids)
    )
  },
  createBidMessage(auctionEndArgs, winningBids, timeoutBids) {
    const {auctionId, timestamp, timeout, auctionEnd, adUnitCodes, bidsReceived, noBids} = auctionEndArgs
    const message = this.createCommonMessage(auctionId)

    message.auctionElapsed = (auctionEnd - timestamp)
    message.timeout = timeout

    adUnitCodes.forEach((adUnitCode) => {
      message.adUnits[adUnitCode] = {}
    })

    // We handled noBids first because when currency conversion is enabled, a bid with a foreign currency
    // will be set to NO_BID initially, and then set to BID after the currency rate json file is fully loaded.
    // In this situation, the bid exists in both noBids and bids arrays.
    noBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.NO_BID))

    // This array may contain some timeout bids (responses come back after auction timeout)
    bidsReceived.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID))

    // We handle timeout after bids since it's possible that a bid has a response, but the response comes back
    // after auction end. In this case, the bid exists in both bidsReceived and timeoutBids arrays.
    timeoutBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.TIMEOUT))

    // mark the winning bids with prebidWon = true
    winningBids.forEach(bid => {
      const adUnitCode = parseAdUnitCode(bid)
      const bidder = parseBidderCode(bid)
      message.adUnits[adUnitCode][bidder].prebidWon = true
    })
    return message
  },
  createCommonMessage(auctionId) {
    return {
      analyticsVersion: ANALYTICS_VERSION,
      auctionId: auctionId,
      propertyId: analyticsOptions.propertyId,
      referrer: window.location.href,
      prebidVersion: '$prebid.version$',
      adUnits: {},
    }
  },
  addBidResponseToMessage(message, bid, status) {
    const adUnitCode = parseAdUnitCode(bid)
    message.adUnits[adUnitCode] = message.adUnits[adUnitCode] || {}
    const bidder = parseBidderCode(bid)
    const bidResponse = this.serializeBidResponse(bid, status)
    message.adUnits[adUnitCode][bidder] = bidResponse
  },
  serializeBidResponse(bid, status) {
    const result = {
      prebidWon: (status === BIDDER_STATUS.BID_WON),
      isTimeout: (status === BIDDER_STATUS.TIMEOUT),
      status: status,
    }
    if (status === BIDDER_STATUS.BID || status === BIDDER_STATUS.BID_WON) {
      Object.assign(result, {
        time: bid.timeToRespond,
        cpm: bid.cpm,
        currency: bid.currency,
        originalCpm: bid.originalCpm || bid.cpm,
        cpmEur: getCpmInEur(bid),
        originalCurrency: bid.originalCurrency || bid.currency,
        vastUrl: bid.vastUrl
      })
    }
    return result
  },
  sendEventMessage(endPoint, data) {
    logInfo(`AJAX: ${endPoint}: ` + JSON.stringify(data))

    ajax(`${analyticsOptions.server}/${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json'
    })
  },
  getCachedAuction(auctionId) {
    this.cachedAuctions[auctionId] = this.cachedAuctions[auctionId] || {
      timeoutBids: [],
    }
    return this.cachedAuctions[auctionId]
  },
  getAnalyticsOptions() {
    return analyticsOptions
  },
})

// save the base class function
malltvAnalyticsAdapter.originEnableAnalytics = malltvAnalyticsAdapter.enableAnalytics

// override enableAnalytics so we can get access to the config passed in from the page
malltvAnalyticsAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    malltvAnalyticsAdapter.originEnableAnalytics(config) // call the base class function
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: malltvAnalyticsAdapter,
  code: 'malltv'
})
