import { on as onEvent, off as offEvent } from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { config } from '../../src/config.js';
import { deepSetValue } from '../../src/utils.js';
import { startAuction } from '../../src/prebid.js';
export const CONFIG_NS = 'previousAuctionInfo';
export let previousAuctionInfoEnabled = false;
let enabledBidders = [];
// bidders Prebid Server asked us to relay for (bid.relayPreviousAuctionInfo), in addition to `enabledBidders`
let relayBidders = new Set();
let maxQueueLength = 10;
let handlersAttached = false;

export let auctionState = {};

export function resetPreviousAuctionInfo() {
  previousAuctionInfoEnabled = false;
  enabledBidders = [];
  relayBidders = new Set();
  auctionState = {};
  deinitHandlers();
}

function initPreviousAuctionInfo() {
  config.getConfig('previousAuctionInfo', ({ [CONFIG_NS]: config = {} }) => {
    if (!config?.enabled) {
      resetPreviousAuctionInfo();
      return;
    }

    if (config?.bidders) { enabledBidders = config.bidders; }
    if (config?.maxQueueLength) { maxQueueLength = config.maxQueueLength; }

    previousAuctionInfoEnabled = true;
    initHandlers();
  });
}

export const initHandlers = () => {
  if (!handlersAttached) {
    onEvent(EVENTS.AUCTION_END, onAuctionEndHandler);
    onEvent(EVENTS.BID_WON, onBidWonHandler);
    startAuction.before(startAuctionHook);
    handlersAttached = true;
  }
};

const deinitHandlers = () => {
  if (handlersAttached) {
    offEvent(EVENTS.AUCTION_END, onAuctionEndHandler);
    offEvent(EVENTS.BID_WON, onBidWonHandler);
    startAuction.getHooks({ hook: startAuctionHook }).remove();
    handlersAttached = false;
  }
};

export const onAuctionEndHandler = (auctionDetails) => {
  try {
    const receivedBidsMap = {};
    const rejectedBidsMap = {};
    const highestBidsByAdUnitCode = {};

    if (auctionDetails.bidsReceived?.length) {
      auctionDetails.bidsReceived.forEach((bid) => {
        receivedBidsMap[bid.requestId] = bid;
        if (!highestBidsByAdUnitCode[bid.adUnitCode] || bid.cpm > highestBidsByAdUnitCode[bid.adUnitCode].cpm) {
          highestBidsByAdUnitCode[bid.adUnitCode] = bid;
        }
      });
    }

    if (auctionDetails.bidsRejected?.length) {
      auctionDetails.bidsRejected.forEach(bidRejected => {
        rejectedBidsMap[bidRejected.requestId] = bidRejected;
      });
    }

    const relayRequestIds = new Set(
      [...(auctionDetails.bidsReceived || []), ...(auctionDetails.bidsRejected || [])]
        .filter(bid => bid.relayPreviousAuctionInfo === true)
        .map(bid => bid.requestId)
    );

    if (auctionDetails.bidderRequests?.length) {
      auctionDetails.bidderRequests.forEach(bidderRequest => {
        if (bidderRequest.bids?.some(bid => relayRequestIds.has(bid.bidId))) {
          relayBidders.add(bidderRequest.bidderCode);
        }
        const enabledBidder = isEnabledBidder(bidderRequest.bidderCode);

        if (enabledBidder) {
          auctionState[bidderRequest.bidderCode] = auctionState[bidderRequest.bidderCode] || [];

          bidderRequest.bids.forEach(bid => {
            const previousAuctionInfoPayload = {
              bidderRequestId: bidderRequest.bidderRequestId,
              bidId: bid.bidId,
              rendered: 0,
              source: 'pbjs',
              adUnitCode: bid.adUnitCode,
              highestBidCpm: highestBidsByAdUnitCode[bid.adUnitCode]?.cpm || null,
              highestBidCurrency: highestBidsByAdUnitCode[bid.adUnitCode]?.currency || null,
              bidderCpm: receivedBidsMap[bid.bidId]?.cpm || null,
              bidderOriginalCpm: receivedBidsMap[bid.bidId]?.originalCpm || null,
              bidderCurrency: receivedBidsMap[bid.bidId]?.currency || null,
              bidderOriginalCurrency: receivedBidsMap[bid.bidId]?.originalCurrency || null,
              rejectionReason: rejectedBidsMap[bid.bidId]?.rejectionReason || null,
              timestamp: auctionDetails.timestamp,
              transactionId: bid.transactionId, // this field gets removed before injecting previous auction info into the bid stream
            };

            if (auctionState[bidderRequest.bidderCode].length >= maxQueueLength) {
              auctionState[bidderRequest.bidderCode].shift();
            }

            auctionState[bidderRequest.bidderCode].push(previousAuctionInfoPayload);
          });
        }
      });
    }
  } catch (error) {}
};

function isEnabledBidder(bidderCode) {
  return enabledBidders.length === 0 || enabledBidders.includes(bidderCode) || relayBidders.has(bidderCode);
}

export const onBidWonHandler = (winningBid) => {
  const winningTid = winningBid.transactionId;

  Object.values(auctionState).flat().forEach(prevAuctPayload => {
    if (prevAuctPayload.transactionId === winningTid) {
      prevAuctPayload.rendered = 1;
    }
  });
};

export function startAuctionHook(next, req) {
  Object.keys(auctionState)
    .filter(bidder => isEnabledBidder(bidder) && auctionState[bidder]?.length)
    .forEach(bidder => {
      auctionState[bidder].forEach(payload => { delete payload.transactionId; });
      deepSetValue(req.ortb2Fragments, `bidder.${bidder}.ext.prebid.previousauctioninfo`, auctionState[bidder]);
      delete auctionState[bidder];
    });
  next.call(this, req);
}

initPreviousAuctionInfo();
