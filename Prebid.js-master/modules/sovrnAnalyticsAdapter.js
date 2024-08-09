import {logError, timestamp} from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adaptermanager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import {ajaxBuilder} from '../src/ajax.js';
import {config} from '../src/config.js';
import {find, includes} from '../src/polyfill.js';

const ajax = ajaxBuilder(0)

const {
  EVENTS: {
    AUCTION_END,
    BID_REQUESTED,
    BID_ADJUSTMENT,
    BID_RESPONSE,
    BID_WON
  }
} = CONSTANTS

let pbaUrl = 'https://pba.aws.lijit.com/analytics'
let currentAuctions = {};
const analyticsType = 'endpoint'

const getClosestTop = () => {
  let topFrame = window;
  let err = false;
  try {
    while (topFrame.parent.document !== topFrame.document) {
      if (topFrame.parent.document) {
        topFrame = topFrame.parent;
      } else {
        throw new Error();
      }
    }
  } catch (e) {
    // bException = true;
  }

  return {
    topFrame,
    err
  };
};

const getBestPageUrl = ({err: crossDomainError, topFrame}) => {
  let sBestPageUrl = '';

  if (!crossDomainError) {
    // easy case- we can get top frame location
    sBestPageUrl = topFrame.location.href;
  } else {
    try {
      try {
        sBestPageUrl = window.top.location.href;
      } catch (e) {
        let aOrigins = window.location.ancestorOrigins;
        sBestPageUrl = aOrigins[aOrigins.length - 1];
      }
    } catch (e) {
      sBestPageUrl = topFrame.document.referrer;
    }
  }

  return sBestPageUrl;
};
const rootURL = getBestPageUrl(getClosestTop())

let sovrnAnalyticsAdapter = Object.assign(adapter({url: pbaUrl, analyticsType}), {
  track({ eventType, args }) {
    try {
      if (eventType === BID_WON) {
        new BidWinner(this.sovrnId, args).send();
        return
      }
      if (args && args.auctionId && currentAuctions[args.auctionId] && currentAuctions[args.auctionId].status === 'complete') {
        throw new Error('Event Received after Auction Close Auction Id ' + args.auctionId)
      }
      if (args && args.auctionId && currentAuctions[args.auctionId] === undefined) {
        currentAuctions[args.auctionId] = new AuctionData(this.sovrnId, args.auctionId)
      }
      switch (eventType) {
        case BID_REQUESTED:
          currentAuctions[args.auctionId].bidRequested(args)
          break
        case BID_ADJUSTMENT:
          currentAuctions[args.auctionId].originalBid(args)
          break
        case BID_RESPONSE:
          currentAuctions[args.auctionId].adjustedBid(args)
          break
        case AUCTION_END:
          currentAuctions[args.auctionId].send();
          break
      }
    } catch (e) {
      new LogError(e, this.sovrnId, {eventType, args}).send()
    }
  },
})

sovrnAnalyticsAdapter.getAuctions = function () {
  return currentAuctions;
};

sovrnAnalyticsAdapter.originEnableAnalytics = sovrnAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
sovrnAnalyticsAdapter.enableAnalytics = function (config) {
  let sovrnId = ''
  if (config && config.options && (config.options.sovrnId || config.options.affiliateId)) {
    sovrnId = config.options.sovrnId || config.options.affiliateId;
  } else {
    logError('Need Sovrn Id to log auction results. Please contact a Sovrn representative if you do not know your Sovrn Id.')
    return
  }
  sovrnAnalyticsAdapter.sovrnId = sovrnId;
  if (config.options.pbaUrl) {
    pbaUrl = config.options.pbaUrl;
  }
  sovrnAnalyticsAdapter.originEnableAnalytics(config) // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: sovrnAnalyticsAdapter,
  code: 'sovrn'
});

/** Class Representing a Winning Bid */
class BidWinner {
  /**
   * Creates a new bid winner
   * @param {string} sovrnId - the affiliate id from the analytics config
   * @param {*} event - the args object from the auction event
   */
  constructor(sovrnId, event) {
    this.body = {}
    // eslint-disable-next-line no-undef
    this.body.prebidVersion = $$REPO_AND_VERSION$$
    this.body.sovrnId = sovrnId
    this.body.winningBid = JSON.parse(JSON.stringify(event))
    this.body.url = rootURL
    this.body.payload = 'winner'
    delete this.body.winningBid.ad
  }

  /**
   * Sends the auction to the the ingest server
   */
  send() {
    this.body.ts = timestamp()
    ajax(
      pbaUrl,
      null,
      JSON.stringify(this.body),
      {
        contentType: 'application/json',
        method: 'POST',
      }
    )
  }
}

/** Class representing an Auction */
class AuctionData {
  /**
   * Create a new auction data collector
   * @param {string} sovrnId - the affiliate id from the analytics config
   * @param {string} auctionId - the auction id from the auction event
   */
  constructor(sovrnId, auctionId) {
    this.auction = {}
    // eslint-disable-next-line no-undef
    this.auction.prebidVersion = $$REPO_AND_VERSION$$
    this.auction.sovrnId = sovrnId
    this.auction.auctionId = auctionId
    this.auction.payload = 'auction'
    this.auction.timeouts = {
      buffer: config.getConfig('timeoutBuffer'),
      bidder: config.getConfig('bidderTimeout'),
    }
    this.auction.priceGranularity = config.getConfig('priceGranularity')
    this.auction.url = rootURL
    this.auction.requests = []
    this.auction.unsynced = []
    this.dropBidFields = ['auctionId', 'ad', 'requestId', 'bidderCode']

    setTimeout(function(id) {
      delete currentAuctions[id]
    }, 300000, this.auction.auctionId)
  }

  /**
   * Record a bid request event
   * @param {*} event - the args object from the auction event
   */
  bidRequested(event) {
    const eventCopy = JSON.parse(JSON.stringify(event))
    delete eventCopy.doneCbCallCount
    delete eventCopy.auctionId
    this.auction.requests.push(eventCopy)
  }

  /**
   * Finds the bid from the auction that the event is associated with
   * @param {*} event - the args object from the auction event
   * @return {*} - the bid
   */
  findBid(event) {
    const bidder = find(this.auction.requests, r => (r.bidderCode === event.bidderCode))
    if (!bidder) {
      this.auction.unsynced.push(JSON.parse(JSON.stringify(event)))
    }
    let bid = find(bidder.bids, b => (b.bidId === event.requestId))

    if (!bid) {
      event.unmatched = true
      bidder.bids.push(JSON.parse(JSON.stringify(event)))
    }
    return bid
  }

  /**
   * Records the original bid before any adjustments have been made
   * @param {*} event - the args object from the auction event
   * NOTE: the bid adjustment occurs before the bid response
   * the bid adjustment seems to be the bid ready to be adjusted
   */
  originalBid(event) {
    let bid = this.findBid(event)
    if (bid) {
      Object.assign(bid, JSON.parse(JSON.stringify(event)))
      this.dropBidFields.forEach((f) => delete bid[f])
    }
  }

  /**
   * Replaces original values with adjusted values and records the original values for changed values
   * in bid.originalValues
   * @param {*} event - the args object from the auction event
   */
  adjustedBid(event) {
    let bid = this.findBid(event)
    if (bid) {
      bid.originalValues = Object.keys(event).reduce((o, k) => {
        if (JSON.stringify(bid[k]) !== JSON.stringify(event[k]) && !includes(this.dropBidFields, k)) {
          o[k] = bid[k]
          bid[k] = event[k]
        }
        return o
      }, {})
    }
  }

  /**
   * Sends the auction to the the ingest server
   */
  send() {
    let maxBids = {}
    this.auction.requests.forEach(request => {
      request.bids.forEach(bid => {
        maxBids[bid.adUnitCode] = maxBids[bid.adUnitCode] || {cpm: 0}
        if (bid.cpm > maxBids[bid.adUnitCode].cpm) {
          maxBids[bid.adUnitCode] = bid
        }
      })
    })
    Object.keys(maxBids).forEach(unit => {
      maxBids[unit].isAuctionWinner = true
    })
    this.auction.ts = timestamp()
    ajax(
      pbaUrl,
      () => {
        currentAuctions[this.auction.auctionId] = {status: 'complete', auctionId: this.auction.auctionId}
      },
      JSON.stringify(this.auction),
      {
        contentType: 'application/json',
        method: 'POST',
      }
    )
  }
}
class LogError {
  constructor(e, sovrnId, data) {
    this.error = {}
    this.error.payload = 'error'
    this.error.message = e.message
    this.error.stack = e.stack
    this.error.data = data
    // eslint-disable-next-line no-undef
    this.error.prebidVersion = $$REPO_AND_VERSION$$
    this.error.sovrnId = sovrnId
    this.error.url = rootURL
    this.error.userAgent = navigator.userAgent
  }
  send() {
    if (this.error.data && this.error.data.requests) {
      this.error.data.requests.forEach(request => {
        if (request.bids) {
          request.bids.forEach(bid => {
            if (bid.ad) {
              delete bid.ad
            }
          })
        }
      })
    }
    if (ErrorEvent.data && this.error.data.ad) {
      delete this.error.data.ad
    }
    this.error.ts = timestamp()
    ajax(
      pbaUrl,
      null,
      JSON.stringify(this.error),
      {
        contentType: 'application/json',
        method: 'POST',
      }
    )
  }
}

export default sovrnAnalyticsAdapter;
