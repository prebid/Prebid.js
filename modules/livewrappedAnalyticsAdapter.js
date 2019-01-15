import * as utils from '../src/utils';
import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const ANALYTICSTYPE = 'endpoint';
const URL = '//lwadm.com/analytics/10';
const EMPTYURL = '';
const REQUESTSENT = 1;
const RESPONSESENT = 2;
const WINSENT = 4;
const TIMEOUTSENT = 8;

let initOptions;
export const BID_WON_TIMEOUT = 500;

const cache = {
  auctions: {},
};

let livewrappedAnalyticsAdapter = Object.assign(adapter({EMPTYURL, ANALYTICSTYPE}), {
  track({eventType, args}) {
    utils.logInfo('LIVEWRAPPED_EVENT:', [eventType, args]);

    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        utils.logInfo('LIVEWRAPPED_AUCTION_INIT:', args);
        cache.auctions[args.auctionId] = {bids: {}};
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        utils.logInfo('LIVEWRAPPED_BID_REQUESTED:', args);

        args.bids.forEach(function(bidRequest) {
          cache.auctions[args.auctionId].timeStamp = args.start;
          cache.auctions[args.auctionId].bids[bidRequest.bidId] = {
            bidder: bidRequest.bidder,
            adUnit: bidRequest.adUnitCode,
            isBid: false,
            won: false,
            timeout: false,
            sendStatus: 0
          }

          utils.logInfo(bidRequest);
        })
        utils.logInfo(livewrappedAnalyticsAdapter.requestEvents);
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        utils.logInfo('LIVEWRAPPED_BID_RESPONSE:', args);

        let bidResponse = cache.auctions[args.auctionId].bids[args.adId];
        bidResponse.isBid = args.getStatusCode() === CONSTANTS.STATUS.GOOD;
        bidResponse.width = args.width;
        bidResponse.height = args.height;
        bidResponse.cpm = args.cpm;
        bidResponse.ttr = args.timeToRespond;
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        utils.logInfo('LIVEWRAPPED_BIDDER_DONE:', args);
        args.bids.forEach(doneBid => {
          let bid = cache.auctions[doneBid.auctionId].bids[doneBid.bidId];
          if (!bid.ttr) {
            bid.ttr = Date.now() - args.auctionStart;
          }
        });
        break;
      case CONSTANTS.EVENTS.BID_WON:
        utils.logInfo('LIVEWRAPPED_BID_WON:', args);
        let wonBid = cache.auctions[args.auctionId].bids[args.adId];
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
  var events = {
    publisherId: initOptions.publisherId,
    requests: getSentRequests(),
    responses: getResponses(),
    wins: getWins(),
    timeouts: getTimeouts()
  };

  if (events.requests.length == 0 &&
      events.responses.length == 0 &&
      events.wins.length == 0 &&
      events.timeouts.length == 0) {
    return;
  }

  ajax(URL, undefined, JSON.stringify(events), {method: 'POST'});
}

function getSentRequests() {
  var sentRequests = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & REQUESTSENT)) {
        bid.sendStatus |= REQUESTSENT;

        sentRequests.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          bidder: bid.bidder
        });
      }
    });
  });

  return sentRequests;
}

function getResponses() {
  var responses = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & RESPONSESENT) && !bid.timeout) {
        bid.sendStatus |= RESPONSESENT;

        responses.push({
          timeStamp: auction.timeStamp,
          adUnit: bid.adUnit,
          bidder: bid.bidder,
          width: bid.width,
          height: bid.height,
          cpm: bid.cpm,
          ttr: bid.ttr,
          IsBid: bid.isBid
        });
      }
    });
  });

  return responses;
}

function getWins() {
  var wins = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
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
        });
      }
    });
  });

  return wins;
}

function getTimeouts() {
  var timeouts = [];

  Object.keys(cache.auctions).forEach(auctionId => {
    Object.keys(cache.auctions[auctionId].bids).forEach(bidId => {
      let auction = cache.auctions[auctionId];
      let bid = auction.bids[bidId];
      if (!(bid.sendStatus & TIMEOUTSENT) && bid.timeout) {
        bid.sendStatus |= TIMEOUTSENT;

        timeouts.push({
          bidder: bid.bidder,
          adUnit: bid.adUnit,
          timeStamp: auction.timeStamp
        });
      }
    });
  });

  return timeouts;
}

adapterManager.registerAnalyticsAdapter({
  adapter: livewrappedAnalyticsAdapter,
  code: 'livewrapped'
});

export default livewrappedAnalyticsAdapter;
