import { timestamp, logInfo } from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { getGlobal } from '../src/prebidGlobal.js';

const ANALYTICSTYPE = 'endpoint';
const URL = 'https://lwadm.com/analytics/10';
const EMPTYURL = '';
const REQUESTSENT = 1;
const RESPONSESENT = 2;
const WINSENT = 4;
const TIMEOUTSENT = 8;
const ADRENDERFAILEDSENT = 16;

let initOptions;
const prebidGlobal = getGlobal();
export const BID_WON_TIMEOUT = 500;
const CACHE_CLEANUP_DELAY = BID_WON_TIMEOUT * 3;

const cache = {
  auctions: {}
};

const livewrappedAnalyticsAdapter = Object.assign(adapter({EMPTYURL, ANALYTICSTYPE}), {
  track({eventType, args}) {
    const time = timestamp();
    logInfo('LIVEWRAPPED_EVENT:', [eventType, args]);

    switch (eventType) {
      case EVENTS.AUCTION_INIT:
        logInfo('LIVEWRAPPED_AUCTION_INIT:', args);
        cache.auctions[args.auctionId] = {bids: {}, bidAdUnits: {}};
        break;
      case EVENTS.BID_REQUESTED:
        logInfo('LIVEWRAPPED_BID_REQUESTED:', args);
        cache.auctions[args.auctionId].timeStamp = args.start;

        args.bids.forEach(function(bidRequest) {
          cache.auctions[args.auctionId].gdprApplies = args.gdprConsent ? args.gdprConsent.gdprApplies : undefined;
          cache.auctions[args.auctionId].gdprConsent = args.gdprConsent ? args.gdprConsent.consentString : undefined;
          let lwFloor;
          const container = document.getElementById(bidRequest.adUnitCode);
          let adUnitId = container ? container.getAttribute('data-adunitid') : undefined;
          adUnitId = adUnitId != null ? adUnitId : undefined;

          if (bidRequest.lwflr) {
            lwFloor = bidRequest.lwflr.flr;

            const buyerFloor = bidRequest.lwflr.bflrs ? bidRequest.lwflr.bflrs[bidRequest.bidder] : undefined;

            lwFloor = buyerFloor || lwFloor;
          }

          cache.auctions[args.auctionId].bids[bidRequest.bidId] = {
            bidder: bidRequest.bidder,
            adUnit: bidRequest.adUnitCode,
            adUnitId: adUnitId,
            isBid: false,
            won: false,
            timeout: false,
            sendStatus: 0,
            readyToSend: 0,
            start: args.start,
            lwFloor: lwFloor,
            floorData: bidRequest.floorData,
            auc: bidRequest.auc,
            buc: bidRequest.buc,
            lw: bidRequest.lw
          };

          logInfo(bidRequest);
        });
        logInfo(livewrappedAnalyticsAdapter.requestEvents);
        break;
      case EVENTS.BID_RESPONSE:
        logInfo('LIVEWRAPPED_BID_RESPONSE:', args);

        const bidResponse = cache.auctions[args.auctionId].bids[args.requestId];
        if (bidResponse.cpm > args.cpm) break; // For now we only store the highest bid
        bidResponse.isBid = true;
        bidResponse.width = args.width;
        bidResponse.height = args.height;
        bidResponse.cpm = args.cpm;
        bidResponse.originalCpm = prebidGlobal.convertCurrency(args.originalCpm, args.originalCurrency, args.currency);
        bidResponse.ttr = args.timeToRespond;
        bidResponse.readyToSend = 1;
        bidResponse.mediaType = getMediaTypeEnum(args.mediaType);
        bidResponse.floorData = args.floorData;
        bidResponse.meta = args.meta;

        if (!bidResponse.ttr) {
          bidResponse.ttr = time - bidResponse.start;
        }
        if (!cache.auctions[args.auctionId].bidAdUnits[bidResponse.adUnit]) {
          cache.auctions[args.auctionId].bidAdUnits[bidResponse.adUnit] =
            {
              sent: 0,
              lw: bidResponse.lw,
              adUnitId: bidResponse.adUnitId,
              timeStamp: cache.auctions[args.auctionId].timeStamp
            };
        }
        break;
      case EVENTS.BIDDER_DONE:
        logInfo('LIVEWRAPPED_BIDDER_DONE:', args);
        args.bids.forEach(doneBid => {
          const bid = cache.auctions[doneBid.auctionId].bids[doneBid.bidId || doneBid.requestId];
          if (!bid.ttr) {
            bid.ttr = time - bid.start;
          }
          bid.readyToSend = 1;
        });
        break;
      case EVENTS.BID_WON:
        logInfo('LIVEWRAPPED_BID_WON:', args);
        const wonBid = cache.auctions[args.auctionId].bids[args.requestId];
        wonBid.won = true;
        wonBid.width = args.width;
        wonBid.height = args.height;
        wonBid.cpm = args.cpm;
        wonBid.originalCpm = prebidGlobal.convertCurrency(args.originalCpm, args.originalCurrency, args.currency);
        wonBid.mediaType = getMediaTypeEnum(args.mediaType);
        wonBid.floorData = args.floorData;
        wonBid.rUp = args.rUp;
        wonBid.meta = args.meta;
        wonBid.dealId = args.dealId;
        if (wonBid.sendStatus !== 0) {
          livewrappedAnalyticsAdapter.sendEvents();
        }
        break;
      case EVENTS.AD_RENDER_FAILED:
        logInfo('LIVEWRAPPED_AD_RENDER_FAILED:', args);
        const adRenderFailedBid = cache.auctions[args.bid.auctionId].bids[args.bid.requestId];
        adRenderFailedBid.adRenderFailed = true;
        adRenderFailedBid.reason = args.reason;
        adRenderFailedBid.message = args.message;
        if (adRenderFailedBid.sendStatus !== 0) {
          livewrappedAnalyticsAdapter.sendEvents();
        }
        break;
      case EVENTS.BID_TIMEOUT:
        logInfo('LIVEWRAPPED_BID_TIMEOUT:', args);
        args.forEach(timeout => {
          cache.auctions[timeout.auctionId].bids[timeout.bidId].timeout = true;
        });
        break;
      case EVENTS.AUCTION_END:
        logInfo('LIVEWRAPPED_AUCTION_END:', args);
        setTimeout(() => {
          livewrappedAnalyticsAdapter.sendEvents();
        }, BID_WON_TIMEOUT);
        break;
    }
  }
});

// save the base class function
livewrappedAnalyticsAdapter.originEnableAnalytics = livewrappedAnalyticsAdapter.enableAnalytics;
livewrappedAnalyticsAdapter.allRequestEvents = [];

// override enableAnalytics so we can get access to the config passed in from the page
livewrappedAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  livewrappedAnalyticsAdapter.originEnableAnalytics(config);
};

livewrappedAnalyticsAdapter.sendEvents = function() {
  var sentRequests = getSentRequests();
  var events = {
    publisherId: initOptions.publisherId,
    gdpr: sentRequests.gdpr,
    auctionIds: sentRequests.auctionIds,
    requests: sentRequests.sentRequests,
    responses: getResponses(sentRequests.gdpr, sentRequests.auctionIds),
    wins: getWins(sentRequests.gdpr, sentRequests.auctionIds),
    timeouts: getTimeouts(sentRequests.gdpr, sentRequests.auctionIds),
    bidAdUnits: getbidAdUnits(),
    rf: getAdRenderFailed(sentRequests.auctionIds),
    ext: initOptions.ext
  };

  if (events.requests.length === 0 &&
      events.responses.length === 0 &&
      events.wins.length === 0 &&
      events.timeouts.length === 0 &&
      events.rf.length === 0) {
    return;
  }

  ajax(initOptions.endpoint || URL, undefined, JSON.stringify(events), {method: 'POST'});

  setTimeout(() => {
    sentRequests.auctionIds.forEach(id => {
      delete cache.auctions[id];
    });
  }, CACHE_CLEANUP_DELAY);
};

function getMediaTypeEnum(mediaType) {
  return mediaType === 'native' ? 2 : (mediaType === 'video' ? 4 : 1);
}

function getSentRequests() {
  var sentRequests = [];
  var gdpr = [];
  var auctionIds = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auction = cache.auctions[auctionId];
    const gdprPos = getGdprPos(gdpr, auction);
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);

    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const bid = auction.bids[bidId];
      if (!(bid.sendStatus & REQUESTSENT)) {
        bid.sendStatus |= REQUESTSENT;

        sentRequests.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          adUnitId: bid.adUnitId,
          bidder: bid.bidder,
          gdpr: gdprPos,
          floor: bid.lwFloor,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw
        });
      }
    });
  });

  return {gdpr: gdpr, auctionIds: auctionIds, sentRequests: sentRequests};
}

function getResponses(gdpr, auctionIds) {
  var responses = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const gdprPos = getGdprPos(gdpr, auction);
      const auctionIdPos = getAuctionIdPos(auctionIds, auctionId)
      const bid = auction.bids[bidId];
      if (bid.readyToSend && !(bid.sendStatus & RESPONSESENT) && !bid.timeout) {
        bid.sendStatus |= RESPONSESENT;

        const response = getResponseObject(auction, bid, gdprPos, auctionIdPos);

        responses.push(response);
      }
    });
  });

  return responses;
}

function getWins(gdpr, auctionIds) {
  var wins = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const gdprPos = getGdprPos(gdpr, auction);
      const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
      const bid = auction.bids[bidId];

      if (!(bid.sendStatus & WINSENT) && bid.won) {
        bid.sendStatus |= WINSENT;

        wins.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          adUnitId: bid.adUnitId,
          bidder: bid.bidder,
          width: bid.width,
          height: bid.height,
          cpm: bid.cpm,
          orgCpm: bid.originalCpm,
          mediaType: bid.mediaType,
          gdpr: gdprPos,
          floor: bid.lwFloor ? bid.lwFloor : (bid.floorData ? bid.floorData.floorValue : undefined),
          floorCur: bid.floorData ? bid.floorData.floorCurrency : undefined,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw,
          rUp: bid.rUp,
          meta: bid.meta,
          dealId: bid.dealId
        });
      }
    });
  });

  return wins;
}

function getGdprPos(gdpr, auction) {
  var gdprPos = 0;
  for (gdprPos = 0; gdprPos < gdpr.length; gdprPos++) {
    if (gdpr[gdprPos].gdprApplies === auction.gdprApplies &&
        gdpr[gdprPos].gdprConsent === auction.gdprConsent) {
      break;
    }
  }

  if (gdprPos === gdpr.length) {
    gdpr[gdprPos] = {gdprApplies: auction.gdprApplies, gdprConsent: auction.gdprConsent};
  }

  return gdprPos;
}

function getAuctionIdPos(auctionIds, auctionId) {
  var auctionIdPos = 0;
  for (auctionIdPos = 0; auctionIdPos < auctionIds.length; auctionIdPos++) {
    if (auctionIds[auctionIdPos] === auctionId) {
      break;
    }
  }

  if (auctionIdPos === auctionIds.length) {
    auctionIds[auctionIdPos] = auctionId;
  }

  return auctionIdPos;
}

function getResponseObject(auction, bid, gdprPos, auctionIdPos) {
  return {
    timeStamp: auction.timeStamp,
    adUnit: bid.adUnit,
    adUnitId: bid.adUnitId,
    bidder: bid.bidder,
    width: bid.width,
    height: bid.height,
    cpm: bid.cpm,
    orgCpm: bid.originalCpm,
    ttr: bid.ttr,
    IsBid: bid.isBid,
    mediaType: bid.mediaType,
    gdpr: gdprPos,
    floor: bid.lwFloor ? bid.lwFloor : (bid.floorData ? bid.floorData.floorValue : undefined),
    floorCur: bid.floorData ? bid.floorData.floorCurrency : undefined,
    auctionId: auctionIdPos,
    auc: bid.auc,
    buc: bid.buc,
    lw: bid.lw,
    meta: bid.meta
  };
}

function getTimeouts(gdpr, auctionIds) {
  var timeouts = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const gdprPos = getGdprPos(gdpr, auction);
      const bid = auction.bids[bidId];
      if (!(bid.sendStatus & TIMEOUTSENT) && bid.timeout) {
        bid.sendStatus |= TIMEOUTSENT;

        const timeout = getResponseObject(auction, bid, gdprPos, auctionIdPos);

        timeouts.push(timeout);
      }
    });
  });

  return timeouts;
}

function getAdRenderFailed(auctionIds) {
  var adRenderFails = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const bid = auction.bids[bidId];
      if (!(bid.sendStatus & ADRENDERFAILEDSENT) && bid.adRenderFailed) {
        bid.sendStatus |= ADRENDERFAILEDSENT;

        adRenderFails.push({
          bidder: bid.bidder,
          adUnit: bid.adUnit,
          adUnitId: bid.adUnitId,
          timeStamp: auction.timeStamp,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw,
          rsn: bid.reason,
          msg: bid.message
        });
      }
    });
  });

  return adRenderFails;
}

function getbidAdUnits() {
  var bidAdUnits = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auction = cache.auctions[auctionId];
    Object.keys(auction.bidAdUnits).forEach(adUnit => {
      const bidAdUnit = auction.bidAdUnits[adUnit];
      if (!bidAdUnit.sent) {
        bidAdUnit.sent = 1;

        bidAdUnits.push({
          adUnit: adUnit,
          adUnitId: bidAdUnit.adUnitId,
          timeStamp: bidAdUnit.timeStamp,
          lw: bidAdUnit.lw
        });
      }
    });
  });

  return bidAdUnits;
}

adapterManager.registerAnalyticsAdapter({
  adapter: livewrappedAnalyticsAdapter,
  code: 'livewrapped'
});

export function getAuctionCache() {
  return cache.auctions;
}

export { CACHE_CLEANUP_DELAY };

export default livewrappedAnalyticsAdapter;
