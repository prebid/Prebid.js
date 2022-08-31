import {ajax} from '../src/ajax.js';
import { generateUUID, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adaptermanager.js';
import { auctionManager } from '../src/auctionManager.js';

const analyticsType = 'endpoint';
const url = 'https://wba.liadm.com/analytic-events';
const gvlid = 148;
const adapterCode = 'liAnalytics';
const bidWonTimeout = 2000; // TODO check
const { EVENTS: { AUCTION_END } } = CONSTANTS;
const payload = {}

function handleAuctionEnd(args) {
  setTimeout(() => {
    let auction = auctionManager.index.getAuction(args.auctionId);
    let winningBids = (auction)? auction.getWinningBids() : [];
    // sampling?
    let data = createAnalyticsEvent(args, winningBids);
    sendAnalyticsEvent(data);
  }, bidWonTimeout);
}

function getAnalyticsEventBids(bidsReceived) {
  return bidsReceived.map(bid => {
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

export function getBannerSizes(banner) {
  return banner.sizes.map(size => {
    const [width, height] = size;
    return {w: width, h: height};
  });
}

export function createAnalyticsEvent(args, winningBids) {
  payload['instanceId'] = generateUUID();
  payload['url'] = window.location.protocol + '//' + window.location.hostname + '/'; // window.location.href???
  payload['bidsReceived'] = getAnalyticsEventBids(args.bidsReceived);

  payload['auctionStart'] = (args.bidderRequests && args.bidderRequests[0]) ? args.bidderRequests[0].auctionStart : 0; // make it optional, now, auctionEnd, timestamp???
  payload['auctionEnd'] = args.auctionEnd;

  payload['adUnits'] = [];
  payload['userIds'] = [];
  payload['bidders'] = [];

  args.adUnits.forEach(unit => {
    if (unit.mediaType && unit.mediaType.banner) {
      payload['adUnits'].push({
        code: unit.code,
        mediaType: 'banner',
        sizes: getBannerSizes(unit.mediaType.banner),
        ortb2Imp: unit.ortb2Imp
      });
    }

    let userIds = unit.bids.flatMap(getUserIds); //remove duplicates????
    payload['userIds'].push(...userIds);
    
    let bidders = unit.bids.map(getBidder);
    payload['bidders'].push(...bidders);
  })

  payload['winningBids'] = getAnalyticsEventBids(winningBids);
  payload['auctionId'] = args.auctionId;
}

function getBidder(bid) {
  return {
    bidder: bid.bidder,
    params: bid.params
  };
}

function getUserIds(bid) {
  return bid.userIdAsEids.map(userId => {
    return {
      source: userId.source,
      uids: userId.uids,
      ext: userId.ext
    };
  }); 
}

function sendAnalyticsEvent(data) {
  ajax(url, {
    success: function () {
      logInfo('LiveIntent Prebid Analytics: send data success');
    },
    error: function (e) {
      logInfo('LiveIntent Prebid Analytics: send data error' + e);
    }
  }, JSON.stringify(data), {
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
  // initOptions = config.options;
  liAnalytics.originEnableAnalytics(config); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: adapterCode,
  gvlid: gvlid
});

export default liAnalytics;
