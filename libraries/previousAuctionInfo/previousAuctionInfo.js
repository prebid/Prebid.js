import {on as onEvent} from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';

export let previousAuctionInfoEnabled = false;
let enabledBidders = [];
export let winningBidsMap = {};

export const resetPreviousAuctionInfo = () => {
  previousAuctionInfoEnabled = false;
  enabledBidders = [];
  winningBidsMap = {};
};

export const enablePreviousAuctionInfo = (config, cb = initHandlers) => {
  const { bidderCode, isBidRequestValid } = config;
  const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidderCode);
  if (!enabledBidder) enabledBidders.push({ bidderCode, isBidRequestValid, maxQueueLength: config.maxQueueLength || 10 });
  if (previousAuctionInfoEnabled) return;
  previousAuctionInfoEnabled = true;
  cb();
}

export const initHandlers = () => {
  onEvent(EVENTS.AUCTION_END, onAuctionEndHandler);
  onEvent(EVENTS.BID_WON, onBidWonHandler);
  onEvent(EVENTS.BID_REQUESTED, onBidRequestedHandler);
};

export const onAuctionEndHandler = (auctionDetails) => {
  // eslint-disable-next-line no-console
  console.log('onAuctionEndHandler', auctionDetails);

  try {
    let highestCpmBid = 0;
    const receivedBidsMap = {};
    const rejectedBidsMap = {};

    if (auctionDetails.bidsReceived && auctionDetails.bidsReceived.length) {
      highestCpmBid = auctionDetails.bidsReceived.reduce((highestBid, currentBid) => {
        return currentBid.cpm > highestBid.cpm ? currentBid : highestBid;
      }, auctionDetails.bidsReceived[0]);

      auctionDetails.bidsReceived.forEach(bidReceived => {
        receivedBidsMap[bidReceived.requestId] = bidReceived;
      });
    }

    if (auctionDetails.bidsRejected && auctionDetails.bidsRejected.length) {
      auctionDetails.bidsRejected.forEach(bidRejected => {
        rejectedBidsMap[bidRejected.requestId] = bidRejected;
      });
    }

    if (auctionDetails.bidderRequests && auctionDetails.bidderRequests.length) {
      auctionDetails.bidderRequests.forEach(bidderRequest => {
        const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidderRequest.bidderCode);

        if (enabledBidder) {
          bidderRequest.bids.forEach(bid => {
            const isValidBid = enabledBidder.isBidRequestValid(bid);

            if (!isValidBid) return;

            const previousAuctionInfoPayload = {
              bidderRequestId: bidderRequest.bidderRequestId,
              minBidToWin: highestCpmBid?.cpm || 0,
              rendered: 0,
              transactionId: bid.ortb2Imp.ext.tid || bid.transactionId,
              source: 'pbjs',
              auctionId: auctionDetails.auctionId,
              impId: bid.adUnitCode,
              // bidResponseId: FLOAT, // don't think this is available client side?
              // targetedbidcpm: FLOAT, // don't think this is available client side?
              highestcpm: highestCpmBid?.cpm || 0,
              cur: bid.ortb2.cur,
              bidderCpm: receivedBidsMap[bid.bidId] ? receivedBidsMap[bid.bidId].cpm : 'nobid',
              biddererrorcode: rejectedBidsMap[bid.bidId] ? rejectedBidsMap[bid.bidId].rejectionReason : -1,
              timestamp: auctionDetails.timestamp,
            }

            window.pbpai = window.pbpai || {};
            if (!window.pbpai[bidderRequest.bidderCode]) {
              window.pbpai[bidderRequest.bidderCode] = [];
            }

            if (window.pbpai[bidderRequest.bidderCode].length > enabledBidder.maxQueueLength) {
              window.pbpai[bidderRequest.bidderCode].shift();
            }

            window.pbpai[bidderRequest.bidderCode].push(previousAuctionInfoPayload);
          });
        }
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

const onBidWonHandler = (winningBid) => {
  // // eslint-disable-next-line no-console
  // console.log('onBidWonHandler', winningBid);
  winningBidsMap[winningBid.transactionId] = winningBid;
}

export const onBidRequestedHandler = (bidRequest) => {
  try {
    const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidRequest.bidderCode);
    window.pbpai = window.pbpai || {};

    if (enabledBidder && window.pbpai[bidRequest.bidderCode]) {
      window.pbpai[bidRequest.bidderCode].forEach(prevAuctPayload => {
        if (winningBidsMap[prevAuctPayload.transactionId]) {
          prevAuctPayload.minBidToWin = winningBidsMap[prevAuctPayload.transactionId].cpm;
          prevAuctPayload.rendered = 1;
        }
      });

      bidRequest.ortb2 ??= {};
      bidRequest.ortb2.ext ??= {};
      bidRequest.ortb2.ext.prebid ??= {};
      bidRequest.ortb2.ext.prebid.previousauctioninfo = window.pbpai[bidRequest.bidderCode];
      delete window.pbpai[bidRequest.bidderCode];
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
