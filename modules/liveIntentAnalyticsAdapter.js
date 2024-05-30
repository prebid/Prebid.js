import {ajax} from '../src/ajax.js';
import { generateUUID, logInfo, logWarn } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { auctionManager } from '../src/auctionManager.js';
import { getRefererInfo } from '../src/refererDetection.js';

const ANALYTICS_TYPE = 'endpoint';
const URL = 'https://wba.liadm.com/analytic-events';
const GVL_ID = 148;
const ADAPTER_CODE = 'liveintent';
const DEFAULT_BID_WON_TIMEOUT = 2000;
const { AUCTION_END } = EVENTS;
let bidWonTimeout;

function handleAuctionEnd(args) {
  setTimeout(() => {
    const auction = auctionManager.index.getAuction(args.auctionId);
    const winningBids = (auction) ? auction.getWinningBids() : [];
    const data = createAnalyticsEvent(args, winningBids);
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

function getBannerSizes(banner) {
  if (banner && banner.sizes) {
    return banner.sizes.map(size => {
      const [width, height] = size;
      return {w: width, h: height};
    });
  } else return [];
}

function getUniqueBy(arr, key) {
  return [...new Map(arr.map(item => [item[key], item])).values()]
}

function createAnalyticsEvent(args, winningBids) {
  let payload = {
    instanceId: generateUUID(),
    url: getRefererInfo().page,
    bidsReceived: getAnalyticsEventBids(args.bidsReceived),
    auctionStart: args.timestamp,
    auctionEnd: args.auctionEnd,
    adUnits: [],
    userIds: [],
    bidders: []
  }
  let allUserIds = [];

  if (args.adUnits) {
    args.adUnits.forEach(unit => {
      if (unit.mediaTypes && unit.mediaTypes.banner) {
        payload['adUnits'].push({
          code: unit.code,
          mediaType: 'banner',
          sizes: getBannerSizes(unit.mediaTypes.banner),
          ortb2Imp: unit.ortb2Imp
        });
      }
      if (unit.bids) {
        let userIds = unit.bids.flatMap(getAnalyticsEventUserIds);
        allUserIds.push(...userIds);
        let bidders = unit.bids.map(({bidder, params}) => {
          return { bidder, params }
        });

        payload['bidders'].push(...bidders);
      }
    })
    let uniqueUserIds = getUniqueBy(allUserIds, 'source');
    payload['userIds'] = uniqueUserIds;
  }
  payload['winningBids'] = getAnalyticsEventBids(winningBids);
  payload['auctionId'] = args.auctionId;
  return payload;
}

function getAnalyticsEventUserIds(bid) {
  if (bid && bid.userIdAsEids) {
    return bid.userIdAsEids.map(({source, uids, ext}) => {
      let analyticsEventUserId = {source, uids, ext};
      return ignoreUndefined(analyticsEventUserId)
    });
  } else { return []; }
}

function sendAnalyticsEvent(data) {
  ajax(URL, {
    success: function () {
      logInfo('LiveIntent Prebid Analytics: send data success');
    },
    error: function (e) {
      logWarn('LiveIntent Prebid Analytics: send data error' + e);
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

let liAnalytics = Object.assign(adapter({URL, ANALYTICS_TYPE}), {
  track({ eventType, args }) {
    if (eventType == AUCTION_END && args) { handleAuctionEnd(args); }
  }
});

// save the base class function
liAnalytics.originEnableAnalytics = liAnalytics.enableAnalytics;
// override enableAnalytics so we can get access to the config passed in from the page
liAnalytics.enableAnalytics = function (config) {
  bidWonTimeout = config?.options?.bidWonTimeout ?? DEFAULT_BID_WON_TIMEOUT;
  liAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: ADAPTER_CODE,
  gvlid: GVL_ID
});

export default liAnalytics;
