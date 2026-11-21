import { on as onEvent, off as offEvent } from '../../src/events.js';
import { EVENTS, S2S } from '../../src/constants.js';
import { config } from '../../src/config.js';
import { deepSetValue } from '../../src/utils.js';
import { startAuction } from '../../src/prebid.js';
export const CONFIG_NS = 'previousAuctionInfo';
export let previousAuctionInfoEnabled = false;
let enabledBidders = [];
// Prebid Server bidders whose bids carried relayPreviousAuctionInfo (seatbid.bid.ext.prebid.relaypreviousauctioninfo)
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
    const highestBidsByAdUnitCode = {};
    const received = groupByRequestId(auctionDetails.bidsReceived);
    const rejected = groupByRequestId(auctionDetails.bidsRejected);

    (auctionDetails.bidsReceived || []).forEach((bid) => {
      if (!highestBidsByAdUnitCode[bid.adUnitCode] || bid.cpm > highestBidsByAdUnitCode[bid.adUnitCode].cpm) {
        highestBidsByAdUnitCode[bid.adUnitCode] = bid;
      }
    });

    // Prebid Server stored impressions are requested with a null bidder code; attribute their responses to the seat that answered
    function biddersFor(bidderRequest, bid) {
      const responses = [...(received[bid.bidId] || []), ...(rejected[bid.bidId] || [])];
      const bidderCodes = typeof bidderRequest.bidderCode === 'string'
        ? [bidderRequest.bidderCode]
        : [...new Set(responses.map(response => response.bidderCode).filter(bidderCode => typeof bidderCode === 'string'))];
      return bidderCodes.map(bidderCode => {
        const ownResponse = (response) => bidderCode === bidderRequest.bidderCode || response.bidderCode === bidderCode;
        return {
          bidderCode,
          received: (received[bid.bidId] || []).filter(ownResponse).pop(),
          rejected: (rejected[bid.bidId] || []).filter(ownResponse).pop(),
          relay: responses.some(response => ownResponse(response) && response.relayPreviousAuctionInfo === true)
        };
      });
    }

    const bidderRequests = auctionDetails.bidderRequests || [];

    bidderRequests
      .filter(bidderRequest => bidderRequest.src === S2S.SRC)
      .forEach(bidderRequest => bidderRequest.bids.forEach(bid => {
        biddersFor(bidderRequest, bid)
          .filter(({ relay }) => relay)
          .forEach(({ bidderCode }) => relayBidders.add(bidderCode));
      }));

    bidderRequests.forEach(bidderRequest => bidderRequest.bids.forEach(bid => {
      biddersFor(bidderRequest, bid)
        .filter(({ bidderCode }) => isRecorded(bidderCode, bidderRequest.src === S2S.SRC))
        .forEach(({ bidderCode, received, rejected }) => {
          const previousAuctionInfoPayload = {
            bidderRequestId: bidderRequest.bidderRequestId,
            bidId: bid.bidId,
            rendered: 0,
            source: 'pbjs',
            adUnitCode: bid.adUnitCode,
            highestBidCpm: highestBidsByAdUnitCode[bid.adUnitCode]?.cpm || null,
            highestBidCurrency: highestBidsByAdUnitCode[bid.adUnitCode]?.currency || null,
            bidderCpm: received?.cpm || null,
            bidderOriginalCpm: received?.originalCpm || null,
            bidderCurrency: received?.currency || null,
            bidderOriginalCurrency: received?.originalCurrency || null,
            rejectionReason: rejected?.rejectionReason || null,
            timestamp: auctionDetails.timestamp,
            transactionId: bid.transactionId, // this field gets removed before injecting previous auction info into the bid stream
          };

          auctionState[bidderCode] = auctionState[bidderCode] || [];
          if (auctionState[bidderCode].length >= maxQueueLength) {
            auctionState[bidderCode].shift();
          }
          auctionState[bidderCode].push(previousAuctionInfoPayload);
        });
    }));
  } catch (error) {}
};

function groupByRequestId(bids = []) {
  const groups = {};
  bids.forEach(bid => {
    (groups[bid.requestId] = groups[bid.requestId] || []).push(bid);
  });
  return groups;
}

/**
 * The publisher's `bidders` list decides who receives previous auction info. Without a list, client-side bidders
 * are all recorded, but Prebid Server bidders only once PBS has flagged them: PBS can narrow sharing, never widen it.
 */
function isRecorded(bidderCode, isS2s) {
  if (enabledBidders.length) {
    return enabledBidders.includes(bidderCode);
  }
  return !isS2s || relayBidders.has(bidderCode);
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
  const bidders = enabledBidders.length ? enabledBidders : Object.keys(auctionState);
  bidders
    .filter(bidder => auctionState[bidder]?.length)
    .forEach(bidder => {
      auctionState[bidder].forEach(payload => { delete payload.transactionId; });
      deepSetValue(req.ortb2Fragments, `bidder.${bidder}.ext.prebid.previousauctioninfo`, auctionState[bidder]);
      delete auctionState[bidder];
    });
  next.call(this, req);
}

initPreviousAuctionInfo();
