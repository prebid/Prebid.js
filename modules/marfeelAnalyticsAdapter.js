import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adapterManager';
import includes from 'core-js/library/fn/array/includes';

const utils = require('src/utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';

let AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
let AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
let BID_WON = CONSTANTS.EVENTS.BID_WON;
let BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
let CONSENT_UPDATE = CONSTANTS.EVENTS.CMP_UPDATE;
const ERROR_SECURE_CREATIVE = CONSTANTS.EVENTS.ERROR_SECURE_CREATIVE;

let auctions = {};

function auctionEnd(auction, {timedOut}) {
  if (timedOut) auction.timedOut = true;

  window.mrfpb && window.mrfpb.trackAuction(auction)
}

function registerCMPState(state) {
  window.mrfpb && window.mrfpb.setCMPState && window.mrfpb.setCMPState(state);
}

function registerWinner(auction, args) {
  window.mrfpb && window.mrfpb.trackAuctionWinner(auction, args)
}

function registerBidResponse(currentAuction, bid) {
  currentAuction.bidders = currentAuction.bidders || [];
  currentAuction.bidders.push(bid)
}

function sendErrorEvent(errorType, payload) {
  const errorObject = {
    category: errorType
  };
  Object.assign(errorObject, payload);
  window.mrfpb && window.mrfpb.trackError && window.mrfpb.trackError(errorObject);
}

let marfeelAnalyticsAdapter = Object.assign(adapter({url, analyticsType}),
  {
    track({eventType, args}) {
      if (args) args.requestId = args.auctionId; // BackwardsCompatibility
      if (eventType === AUCTION_INIT) {
        auctions[args.auctionId] = args;
      } else if (eventType === BID_RESPONSE) {
        registerBidResponse(auctions[args.auctionId], args);
      } else if (eventType === BID_WON) {
        registerWinner(auctions[args.auctionId], args);
      } else if (eventType === AUCTION_END) {
        auctionEnd(auctions[args.auctionId], args);
      } else if (eventType === CONSENT_UPDATE) {
        registerCMPState(args);
      } else if (eventType === ERROR_SECURE_CREATIVE) {
        sendErrorEvent(eventType, args);
      }
    },

  });

adaptermanager.registerAnalyticsAdapter({
  adapter: marfeelAnalyticsAdapter,
  code: 'marfeel'
});

export default marfeelAnalyticsAdapter;
