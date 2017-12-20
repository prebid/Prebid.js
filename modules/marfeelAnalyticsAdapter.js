import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import includes from 'core-js/library/fn/array/includes';

const utils = require('src/utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';

let AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
let AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
let BID_WON = CONSTANTS.EVENTS.BID_WON;
let BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
let auctions = {};

function auctionEnd(auction, {timedOut}) {
  if (timedOut) auction.timedOut = true;

  window.mrfpb && window.mrfpb.trackAuction(auction)
}

function registerWinner(auction, args) {
  window.mrfpb && window.mrfpb.trackAuctionWinner(auction, args)
}

function registerBidResponse(currentAuction, bid) {
  currentAuction.bidders = currentAuction.bidders || [];
  currentAuction.bidders.push(bid)
}

let marfeelAnalyticsAdapter = Object.assign(adapter({url, analyticsType}),
  {
    track({eventType, args}) {
      if (eventType === AUCTION_INIT) {
        auctions[args.requestId] = args;
      } else if (eventType === BID_RESPONSE) {
        registerBidResponse(auctions[args.requestId], args);
      } else if (eventType === BID_WON) {
        registerWinner(auctions[args.requestId], args);
      } else if (eventType === AUCTION_END) {
        auctionEnd(auctions[args.requestId], args);
      }
    },

  });

adaptermanager.registerAnalyticsAdapter({
  adapter: marfeelAnalyticsAdapter,
  code: 'marfeel'
});

export default marfeelAnalyticsAdapter;
