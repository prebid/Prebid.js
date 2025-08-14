import { timestamp, logInfo } from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS, STATUS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';

const URL = 'https://analytics.adnuntius.com/prebid';
const REQUEST_SENT = 1;
const RESPONSE_SENT = 2;
const WIN_SENT = 4;
const TIMEOUT_SENT = 8;
const AD_RENDER_FAILED_SENT = 16;

let initOptions;
export const BID_WON_TIMEOUT = 500;

const cache = {
  auctions: {}
};

const adnAnalyticsAdapter = Object.assign(adapter({url: '', analyticsType: 'endpoint'}), {
  track({eventType, args}) {
    const time = timestamp();
    logInfo('ADN_EVENT:', [eventType, args]);

    switch (eventType) {
      case EVENTS.AUCTION_INIT:
        logInfo('ADN_AUCTION_INIT:', args);
        cache.auctions[args.auctionId] = {bids: {}, bidAdUnits: {}};
        break;
      case EVENTS.BID_REQUESTED:
        logInfo('ADN_BID_REQUESTED:', args);
        cache.auctions[args.auctionId].timeStamp = args.start;

        args.bids.forEach(function(bidReq) {
          cache.auctions[args.auctionId].gdprApplies = args.gdprConsent ? args.gdprConsent.gdprApplies : undefined;
          cache.auctions[args.auctionId].gdprConsent = args.gdprConsent ? args.gdprConsent.consentString : undefined;

          const container = document.getElementById(bidReq.adUnitCode);
          const containerAttr = container ? container.getAttribute('data-adunitid') : undefined;
          const adUnitId = containerAttr || undefined;

          cache.auctions[args.auctionId].bids[bidReq.bidId] = {
            bidder: bidReq.bidder,
            adUnit: bidReq.adUnitCode,
            adUnitId: adUnitId,
            isBid: false,
            won: false,
            timeout: false,
            sendStatus: 0,
            readyToSend: 0,
            start: args.start,
            auc: bidReq.auc,
            buc: bidReq.buc,
            lw: bidReq.lw
          };

          logInfo(bidReq);
        });
        logInfo(adnAnalyticsAdapter.requestEvents);
        break;
      case EVENTS.BID_RESPONSE:
        logInfo('ADN_BID_RESPONSE:', args);

        const bidResp = cache.auctions[args.auctionId].bids[args.requestId];
        bidResp.isBid = args.getStatusCode() === STATUS.GOOD;
        bidResp.width = args.width;
        bidResp.height = args.height;
        bidResp.cpm = args.cpm;
        bidResp.currency = args.currency;
        bidResp.originalCpm = args.originalCpm;
        bidResp.originalCurrency = args.originalCurrency;
        bidResp.ttr = args.timeToRespond;
        bidResp.readyToSend = 1;
        bidResp.mediaType = args.mediaType === 'native' ? 2 : (args.mediaType === 'video' ? 4 : 1);
        bidResp.meta = args.meta;

        if (!bidResp.ttr) {
          bidResp.ttr = time - bidResp.start;
        }
        if (!cache.auctions[args.auctionId].bidAdUnits[bidResp.adUnit]) {
          cache.auctions[args.auctionId].bidAdUnits[bidResp.adUnit] =
            {
              sent: 0,
              lw: bidResp.lw,
              adUnitId: bidResp.adUnitId,
              timeStamp: cache.auctions[args.auctionId].timeStamp
            };
        }
        break;
      case EVENTS.BIDDER_DONE:
        logInfo('ADN_BIDDER_DONE:', args);
        args.bids.forEach(doneBid => {
          let bid = cache.auctions[doneBid.auctionId].bids[doneBid.bidId || doneBid.requestId];
          if (!bid.ttr) {
            bid.ttr = time - bid.start;
          }
          bid.readyToSend = 1;
        });
        break;
      case EVENTS.BID_WON:
        logInfo('ADN_BID_WON:', args);
        const wonBid = cache.auctions[args.auctionId].bids[args.requestId];
        wonBid.won = true;
        wonBid.rUp = args.rUp;
        wonBid.meta = args.meta;
        wonBid.dealId = args.dealId;
        if (wonBid.sendStatus !== 0) {
          adnAnalyticsAdapter.sendEvents();
        }
        break;
      case EVENTS.AD_RENDER_SUCCEEDED:
        logInfo('ADN_AD_RENDER_SUCCEEDED:', args);
        const adRenderSucceeded = cache.auctions[args.bid.auctionId].bids[args.bid.requestId];
        adRenderSucceeded.renderedTimestamp = Date.now();
        break;
      case EVENTS.AD_RENDER_FAILED:
        logInfo('ADN_AD_RENDER_FAILED:', args);
        const adRenderFailedBid = cache.auctions[args.bid.auctionId].bids[args.bid.requestId];
        adRenderFailedBid.adRenderFailed = true;
        adRenderFailedBid.reason = args.reason;
        adRenderFailedBid.message = args.message;
        if (adRenderFailedBid.sendStatus !== 0) {
          adnAnalyticsAdapter.sendEvents();
        }
        break;
      case EVENTS.BID_TIMEOUT:
        logInfo('ADN_BID_TIMEOUT:', args);
        args.forEach(timeout => {
          cache.auctions[timeout.auctionId].bids[timeout.bidId].timeout = true;
        });
        break;
      case EVENTS.AUCTION_END:
        logInfo('ADN_AUCTION_END:', args);
        setTimeout(() => {
          adnAnalyticsAdapter.sendEvents();
        }, BID_WON_TIMEOUT);
        break;
    }
  }
});

// save the base class function
adnAnalyticsAdapter.originEnableAnalytics = adnAnalyticsAdapter.enableAnalytics;
adnAnalyticsAdapter.allRequestEvents = [];

// override enableAnalytics so we can get access to the config passed in from the page
adnAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  adnAnalyticsAdapter.originEnableAnalytics(config);
};

adnAnalyticsAdapter.sendEvents = function() {
  const sentRequests = getSentRequests();
  const events = {
    publisherId: initOptions.publisherId,
    gdpr: sentRequests.gdpr,
    auctionIds: sentRequests.auctionIds,
    requests: sentRequests.sentRequests,
    responses: getResponses(sentRequests.gdpr, sentRequests.auctionIds),
    wins: getWins(sentRequests.gdpr, sentRequests.auctionIds),
    timeouts: getTimeouts(sentRequests.gdpr, sentRequests.auctionIds),
    bidAdUnits: getBidAdUnits(),
    rf: getAdRenderFailed(sentRequests.auctionIds),
    ext: initOptions.ext
  };

  if (events.requests.length === 0 && events.responses.length === 0 && events.wins.length === 0 && events.timeouts.length === 0 && events.rf.length === 0) {
    return;
  }

  ajax(initOptions.endPoint || URL, undefined, JSON.stringify(events), {method: 'POST'});
};

function getSentRequests() {
  const sentRequests = [];
  const gdpr = [];
  const auctionIds = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auction = cache.auctions[auctionId];
    const gdprPos = getGdprPos(gdpr, auction);
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);

    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & REQUEST_SENT)) {
        bid.sendStatus |= REQUEST_SENT;

        sentRequests.push({
          adUnit: bid.adUnit,
          adUnitId: bid.adUnitId,
          bidder: bid.bidder,
          timeStamp: auction.timeStamp,
          gdpr: gdprPos,
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
  const responses = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let gdprPos = getGdprPos(gdpr, auction);
      let auctionIdPos = getAuctionIdPos(auctionIds, auctionId)
      let bid = auction.bids[bidId];
      if (bid.readyToSend && !(bid.sendStatus & RESPONSE_SENT) && !bid.timeout) {
        bid.sendStatus |= RESPONSE_SENT;

        let response = getResponseObject(auction, bid, gdprPos, auctionIdPos);

        responses.push(response);
      }
    });
  });

  return responses;
}

function getWins(gdpr, auctionIds) {
  const wins = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const gdprPos = getGdprPos(gdpr, auction);
      const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
      const bid = auction.bids[bidId];

      if (!(bid.sendStatus & WIN_SENT) && bid.won) {
        bid.sendStatus |= WIN_SENT;

        wins.push({
          adUnit: bid.adUnit,
          adUnitId: bid.adUnitId,
          bidder: bid.bidder,
          timeStamp: auction.timeStamp,
          width: bid.width,
          height: bid.height,
          cpm: bid.cpm,
          currency: bid.currency,
          originalCpm: bid.originalCpm,
          originalCurrency: bid.originalCurrency,
          mediaType: bid.mediaType,
          gdpr: gdprPos,
          auctionId: auctionIdPos,
          auc: bid.auc,
          lw: bid.lw,
          buc: bid.buc,
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
  let gdprPos;
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

function getAuctionIdPos(auIds, auId) {
  let auctionIdPos;
  for (auctionIdPos = 0; auctionIdPos < auIds.length; auctionIdPos++) {
    if (auIds[auctionIdPos] === auId) {
      break;
    }
  }

  if (auctionIdPos === auIds.length) {
    auIds[auctionIdPos] = auId;
  }

  return auctionIdPos;
}

function getResponseObject(auction, bid, gdprPos, auctionIdPos) {
  return {
    adUnit: bid.adUnit,
    adUnitId: bid.adUnitId,
    bidder: bid.bidder,
    timeStamp: auction.timeStamp,
    renderedTimestamp: bid.renderedTimestamp,
    width: bid.width,
    height: bid.height,
    cpm: bid.cpm,
    currency: bid.currency,
    originalCpm: bid.originalCpm,
    originalCurrency: bid.originalCurrency,
    ttr: bid.ttr,
    isBid: bid.isBid,
    mediaType: bid.mediaType,
    gdpr: gdprPos,
    auctionId: auctionIdPos,
    auc: bid.auc,
    buc: bid.buc,
    lw: bid.lw,
    meta: bid.meta
  };
}

function getTimeouts(gdpr, auctionIds) {
  const timeouts = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const gdprPos = getGdprPos(gdpr, auction);
      const bid = auction.bids[bidId];
      if (!(bid.sendStatus & TIMEOUT_SENT) && bid.timeout) {
        bid.sendStatus |= TIMEOUT_SENT;

        let timeout = getResponseObject(auction, bid, gdprPos, auctionIdPos);

        timeouts.push(timeout);
      }
    });
  });

  return timeouts;
}

function getAdRenderFailed(auctionIds) {
  const adRenderFails = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    const auctionIdPos = getAuctionIdPos(auctionIds, auctionId);
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      const auction = cache.auctions[auctionId];
      const bid = auction.bids[bidId];
      if (!(bid.sendStatus & AD_RENDER_FAILED_SENT) && bid.adRenderFailed) {
        bid.sendStatus |= AD_RENDER_FAILED_SENT;

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

function getBidAdUnits() {
  const bidAdUnits = [];

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
  adapter: adnAnalyticsAdapter,
  code: 'adnuntius'
});

export default adnAnalyticsAdapter;
