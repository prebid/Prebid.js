import {ajax} from '../src/ajax.js';
import { generateUUID, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { auctionManager } from '../src/auctionManager.js';

const analyticsType = 'endpoint';
const url = 'https://wba.liadm.com/analytic-events';
const gvlid = 148;
const adapterCode = 'liveintent';
const { EVENTS: { AUCTION_END } } = CONSTANTS;
let initOptions = {}

let liAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      switch (eventType) {
        case AUCTION_END:
          liAnalytics.handleAuctionEnd(args);
          break;
        default: break;
      }
    }
  }
});

liAnalytics.handleAuctionEnd = function(args) {
  const bidWonTimeout = (initOptions && initOptions.bidWonTimeout) || 2000;
  const sampling = (initOptions && initOptions.sampling) || 0.1;
  const isSampled = Math.random() < parseFloat(sampling)
  if (isSampled) {
    setTimeout(() => {
      const auction = auctionManager.index.getAuction(args.auctionId);
      const winningBids = (auction) ? auction.getWinningBids() : [];
      const data = liAnalytics.createAnalyticsEvent(args, winningBids);
      sendAnalyticsEvent(data);
    }, bidWonTimeout);
  }
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

liAnalytics.getBannerSizes = function(banner) {
  return banner.sizes.map(size => {
    const [width, height] = size;
    return {w: width, h: height};
  });
}

function getUniqueBy(arr, key) {
  return [...new Map(arr.map(item => [item[key], item])).values()]
}

liAnalytics.createAnalyticsEvent = function(args, winningBids) {
  let payload = {}
  let allUserIds = [];

  payload['instanceId'] = generateUUID();
  payload['url'] = window.location.href;
  payload['bidsReceived'] = getAnalyticsEventBids(args.bidsReceived);

  payload['auctionStart'] = args.timestamp;
  payload['auctionEnd'] = args.auctionEnd;

  payload['adUnits'] = [];
  payload['userIds'] = [];
  payload['bidders'] = [];

  args.adUnits.forEach(unit => {
    if (unit.mediaTypes && unit.mediaTypes.banner) {
      payload['adUnits'].push({
        code: unit.code,
        mediaType: 'banner',
        sizes: liAnalytics.getBannerSizes(unit.mediaTypes.banner),
        ortb2Imp: unit.ortb2Imp
      });
    }

    let userIds = unit.bids.flatMap(getAnalyticsEventUserIds);
    allUserIds.push(...userIds);

    let bidders = unit.bids.map(getBidder);
    payload['bidders'].push(...bidders);
  })

  let uniqueUserIds = getUniqueBy(allUserIds, 'source')
  payload['userIds'] = uniqueUserIds
  payload['winningBids'] = getAnalyticsEventBids(winningBids);
  payload['auctionId'] = args.auctionId;
  return payload;
}

function getBidder(bid) {
  return {
    bidder: bid.bidder,
    params: bid.params
  };
}

function getAnalyticsEventUserIds(bid) {
  return bid.userIdAsEids.map(userId => {
    let analyticsEventUserId = {
      source: userId.source,
      uids: userId.uids,
      ext: userId.ext
    };
    return ignoreUndefined(analyticsEventUserId)
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

function ignoreUndefined(data) {
  const filteredData = Object.entries(data).filter(([key, value]) => value)
  return Object.fromEntries(filteredData)
}

// save the base class function
liAnalytics.originEnableAnalytics = liAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
liAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  liAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: adapterCode,
  gvlid: gvlid
});

export default liAnalytics;
