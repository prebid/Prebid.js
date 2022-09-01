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

function handleAuctionEnd(args) {
  setTimeout(() => {
    let auction = auctionManager.index.getAuction(args.auctionId);
    let winningBids = (auction) ? auction.getWinningBids() : [];
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

function getUniqueBy(arr, key) {
  return [...new Map(arr.map(item => [item[key], item])).values()]
}

export function createAnalyticsEvent(args, winningBids) {
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
        sizes: getBannerSizes(unit.mediaTypes.banner),
        ortb2Imp: unit.ortb2Imp
      });
    }

    let userIds = unit.bids.flatMap(getAnalyticsEventUserIds);
    allUserIds.push(...userIds);

    let bidders = unit.bids.map(getBidder);
    payload['bidders'].push(...bidders);
  })

  let uniqueUserIds = getUniqueBy(allUserIds, 'source') // TODO remove duplicates????
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
