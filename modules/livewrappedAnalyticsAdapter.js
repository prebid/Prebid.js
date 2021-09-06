import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';

const ANALYTICSTYPE = 'endpoint';
const URL = 'https://lwadm.com/analytics/10';
const EMPTYURL = '';
const REQUESTSENT = 1;
const RESPONSESENT = 2;
const WINSENT = 4;
const TIMEOUTSENT = 8;

let initOptions;
export const BID_WON_TIMEOUT = 500;

const cache = {
  auctions: {}
};

let livewrappedAnalyticsAdapter = Object.assign(adapter({EMPTYURL, ANALYTICSTYPE}), {
  track({eventType, args}) {
    const time = utils.timestamp();
    utils.logInfo('LIVEWRAPPED_EVENT:', [eventType, args]);

    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        utils.logInfo('LIVEWRAPPED_AUCTION_INIT:', args);
        cache.auctions[args.auctionId] = {bids: {}, bidAdUnits: {}};
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        utils.logInfo('LIVEWRAPPED_BID_REQUESTED:', args);
        cache.auctions[args.auctionId].timeStamp = args.start;

        args.bids.forEach(function(bidRequest) {
          cache.auctions[args.auctionId].gdprApplies = args.gdprConsent ? args.gdprConsent.gdprApplies : undefined;
          cache.auctions[args.auctionId].gdprConsent = args.gdprConsent ? args.gdprConsent.consentString : undefined;
          let lwFloor;

          if (bidRequest.lwflr) {
            lwFloor = bidRequest.lwflr.flr;

            let buyerFloor = bidRequest.lwflr.bflrs ? bidRequest.lwflr.bflrs[bidRequest.bidder] : undefined;

            lwFloor = buyerFloor || lwFloor;
          }

          cache.auctions[args.auctionId].bids[bidRequest.bidId] = {
            bidder: bidRequest.bidder,
            adUnit: bidRequest.adUnitCode,
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
          }

          utils.logInfo(bidRequest);
        })
        utils.logInfo(livewrappedAnalyticsAdapter.requestEvents);
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        utils.logInfo('LIVEWRAPPED_BID_RESPONSE:', args);

        let bidResponse = cache.auctions[args.auctionId].bids[args.requestId];
        bidResponse.isBid = args.getStatusCode() === CONSTANTS.STATUS.GOOD;
        bidResponse.width = args.width;
        bidResponse.height = args.height;
        bidResponse.cpm = args.cpm;
        bidResponse.ttr = args.timeToRespond;
        bidResponse.readyToSend = 1;
        bidResponse.mediaType = args.mediaType == 'native' ? 2 : (args.mediaType == 'video' ? 4 : 1);
        if (!bidResponse.ttr) {
          bidResponse.ttr = time - bidResponse.start;
        }
        if (!cache.auctions[args.auctionId].bidAdUnits[bidResponse.adUnit]) {
          cache.auctions[args.auctionId].bidAdUnits[bidResponse.adUnit] =
            {
              sent: 0,
              lw: bidResponse.lw,
              timeStamp: cache.auctions[args.auctionId].timeStamp
            };
        }
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        utils.logInfo('LIVEWRAPPED_BIDDER_DONE:', args);
        args.bids.forEach(doneBid => {
          let bid = cache.auctions[doneBid.auctionId].bids[doneBid.bidId || doneBid.requestId];
          if (!bid.ttr) {
            bid.ttr = time - bid.start;
          }
          bid.readyToSend = 1;
        });
        break;
      case CONSTANTS.EVENTS.BID_WON:
        utils.logInfo('LIVEWRAPPED_BID_WON:', args);
        let wonBid = cache.auctions[args.auctionId].bids[args.requestId];
        wonBid.won = true;
        if (wonBid.sendStatus != 0) {
          livewrappedAnalyticsAdapter.sendEvents();
        }
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        utils.logInfo('LIVEWRAPPED_BID_TIMEOUT:', args);
        args.forEach(timeout => {
          cache.auctions[timeout.auctionId].bids[timeout.bidId].timeout = true;
        });
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        utils.logInfo('LIVEWRAPPED_AUCTION_END:', args);
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
    timeouts: getTimeouts(sentRequests.auctionIds),
    bidAdUnits: getbidAdUnits(),
    rcv: getAdblockerRecovered()
  };

  if (events.requests.length == 0 &&
      events.responses.length == 0 &&
      events.wins.length == 0 &&
      events.timeouts.length == 0) {
    return;
  }

  ajax(initOptions.endpoint || URL, undefined, JSON.stringify(events), {method: 'POST'});
}

function getAdblockerRecovered() {
  try {
    return utils.getWindowTop().I12C && utils.getWindowTop().I12C.Morph === 1;
  } catch (e) {}
}

function getSentRequests() {
  var sentRequests = [];
  var gdpr = [];
  var auctionIds = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    let auction = cache.auctions[auctionId];
    let gdprPos = getGdprPos(gdpr, auction);
    let auctionIdPos = getAuctionIdPos(auctionIds, auctionId);

    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & REQUESTSENT)) {
        bid.sendStatus |= REQUESTSENT;

        sentRequests.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
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
      let auction = cache.auctions[auctionId];
      let gdprPos = getGdprPos(gdpr, auction);
      let auctionIdPos = getAuctionIdPos(auctionIds, auctionId)
      let bid = auction.bids[bidId];
      if (bid.readyToSend && !(bid.sendStatus & RESPONSESENT) && !bid.timeout) {
        bid.sendStatus |= RESPONSESENT;

        responses.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          bidder: bid.bidder,
          width: bid.width,
          height: bid.height,
          cpm: bid.cpm,
          ttr: bid.ttr,
          IsBid: bid.isBid,
          mediaType: bid.mediaType,
          gdpr: gdprPos,
          floor: bid.floorData ? bid.floorData.floorValue : bid.lwFloor,
          floorCur: bid.floorData ? bid.floorData.floorCurrency : undefined,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw
        });
      }
    });
  });

  return responses;
}

function getWins(gdpr, auctionIds) {
  var wins = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let gdprPos = getGdprPos(gdpr, auction);
      let auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
      let bid = auction.bids[bidId];

      if (!(bid.sendStatus & WINSENT) && bid.won) {
        bid.sendStatus |= WINSENT;

        wins.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          bidder: bid.bidder,
          width: bid.width,
          height: bid.height,
          cpm: bid.cpm,
          mediaType: bid.mediaType,
          gdpr: gdprPos,
          floor: bid.floorData ? bid.floorData.floorValue : bid.lwFloor,
          floorCur: bid.floorData ? bid.floorData.floorCurrency : undefined,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw
        });
      }
    });
  });

  return wins;
}

function getGdprPos(gdpr, auction) {
  var gdprPos = 0;
  for (gdprPos = 0; gdprPos < gdpr.length; gdprPos++) {
    if (gdpr[gdprPos].gdprApplies == auction.gdprApplies &&
        gdpr[gdprPos].gdprConsent == auction.gdprConsent) {
      break;
    }
  }

  if (gdprPos == gdpr.length) {
    gdpr[gdprPos] = {gdprApplies: auction.gdprApplies, gdprConsent: auction.gdprConsent};
  }

  return gdprPos;
}

function getAuctionIdPos(auctionIds, auctionId) {
  var auctionIdPos = 0;
  for (auctionIdPos = 0; auctionIdPos < auctionIds.length; auctionIdPos++) {
    if (auctionIds[auctionIdPos] == auctionId) {
      break;
    }
  }

  if (auctionIdPos == auctionIds.length) {
    auctionIds[auctionIdPos] = auctionId;
  }

  return auctionIdPos;
}

function getTimeouts(auctionIds) {
  var timeouts = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    let auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & TIMEOUTSENT) && bid.timeout) {
        bid.sendStatus |= TIMEOUTSENT;

        timeouts.push({
          bidder: bid.bidder,
          adUnit: bid.adUnit,
          timeStamp: auction.timeStamp,
          auctionId: auctionIdPos,
          auc: bid.auc,
          buc: bid.buc,
          lw: bid.lw
        });
      }
    });
  });

  return timeouts;
}

function getbidAdUnits() {
  var bidAdUnits = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    let auction = cache.auctions[auctionId];
    Object.keys(auction.bidAdUnits).forEach(adUnit => {
      let bidAdUnit = auction.bidAdUnits[adUnit];
      if (!bidAdUnit.sent) {
        bidAdUnit.sent = 1;

        bidAdUnits.push({
          adUnit: adUnit,
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

export default livewrappedAnalyticsAdapter;
