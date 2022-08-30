import {ajax} from '../src/ajax.js';
import { generateUUID, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adaptermanager.js';

const analyticsType = 'endpoint';
const url = 'https://wba.liadm.com/analytic-events';
const gvlid = 148;
const adapterCode = 'liAnalytics';
const bidWonTimeout = 2000; // TODO check
const { EVENTS: { AUCTION_END } } = CONSTANTS;
const payload = {}

function handleAuctionEnd(args) {
  setTimeout(() => {
    let winningBids = $$PREBID_GLOBAL$$.getAllWinningBids(); // wait/get winning bids
    // filter winningBids?
    let data = createAnalyticsEvent(args, winningBids); // transform data
    sendAnalyticsEvent(data); // send data
  }, bidWonTimeout);
}

function getAnalyticsEventBids(bidsReceived) {
  bidsReceived.map(bid => {
    return {
      adUnitCode: bid.adUnitCode,
      timeToRespond: bid.timeToRespond,
      cpm: bid.cpm,
      currency: bid.currency,
      ttl: bid.ttl,
      bidder: bid.bidder
    };
  });
}

function getBannerSizes(banner) {
  banner.sizes.map(size => {
    const [width, height] = size
    return {w: width, h: height}
  });
}

function createAnalyticsEvent(args, winningBids) {
  payload['instanceId'] = generateUUID();
  payload['url'] = window.location.protocol + '//' + window.location.hostname + '/';
  payload['bidsReceived'] = getAnalyticsEventBids(args.bidsReceived);

  payload['auctionStart'] = (args.bidderRequests && args.bidderRequests[0]) ? args.bidderRequests[0].auctionStart : 0;
  payload['auctionEnd'] = args.auctionEnd;

  payload['adUnits'] = []
  payload['userIds'] = []
  payload['bidders'] = []

  args.adUnits.forEach(unit => {
    if (unit.mediaType && unit.mediaType.banner) {
      payload['adUnits'].push({
        code: unit.code,
        mediaType: 'banner',
        sizes: getBannerSizes(unit.mediaType.banner),
        ortb2Imp: unit.ortb2Imp
      })
    }
    payload['userIds'].push(unit.bids.userIdAsEids)
    payload['bidders'].concat(unit.bids.map(bid => {
      return {
        bidder: bid.bidder,
        params: bid.params
      };
    }))
  })

  payload['winningBids'] = getAnalyticsEventBids(winningBids);
  payload['auctionId'] = args.auctionId
}

function sendAnalyticsEvent(data) {
  ajax(url, {
    success: function () {
      logInfo('LiveIntent Prebid Analytics: send data success');
    },
    error: function (e) {
      logInfo('LiveIntent Prebid Analytics: send data error' + e);
    }
  }, data, {
    contentType: 'application/json',
    method: 'POST'
  })
}

let liAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      switch (eventType) {
        case AUCTION_END:
          handleAuctionEnd(args);
          break;
        default: break;
      }
    }
  }
});

// save the base class function
liAnalytics.originEnableAnalytics = liAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
liAnalytics.enableAnalytics = function (config) {
//  initOptions = config.options;
  liAnalytics.originEnableAnalytics(config); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: adapterCode,
  gvlid: gvlid
});

export default liAnalytics;
