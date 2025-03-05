import {on as onEvent, off as offEvent} from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { config } from '../../src/config.js';

export let previousAuctionInfoEnabled = false;
let enabledBidders = [];

export let auctionState = {};

export const resetPreviousAuctionInfo = (cb = deinitHandlers) => {
  previousAuctionInfoEnabled = false;
  enabledBidders = [];
  auctionState = {};
  cb();
};

export const initPreviousAuctionInfo = (cb = initHandlers) => {
  config.getConfig('previousAuctionInfo', (conf) => {
    if (!conf.previousAuctionInfo) {
      if (previousAuctionInfoEnabled) { resetPreviousAuctionInfo(); }
      return;
    }

    previousAuctionInfoEnabled = true;
    cb();
  });
};

export const enablePreviousAuctionInfo = (sspConfig) => {
  const { bidderCode } = sspConfig;
  const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidderCode);

  if (!enabledBidder) enabledBidders.push({ bidderCode, maxQueueLength: sspConfig.maxQueueLength || 10 });
}

export const initHandlers = () => {
  onEvent(EVENTS.AUCTION_END, onAuctionEndHandler);
  onEvent(EVENTS.BID_WON, onBidWonHandler);
  onEvent(EVENTS.BID_REQUESTED, onBidRequestedHandler);
};

const deinitHandlers = () => {
  offEvent(EVENTS.AUCTION_END, onAuctionEndHandler);
  offEvent(EVENTS.BID_WON, onBidWonHandler);
  offEvent(EVENTS.BID_REQUESTED, onBidRequestedHandler);
}

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

    if (auctionDetails.bidderRequests?.length) {
      auctionDetails.bidderRequests.forEach(bidderRequest => {
        const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidderRequest.bidderCode);

        if (enabledBidder) {
          auctionState[bidderRequest.bidderCode] = auctionState[bidderRequest.bidderCode] || [];

          bidderRequest.bids.forEach(bid => {
            const previousAuctionInfoPayload = {
              bidderRequestId: bidderRequest.bidderRequestId,
              bidId: bid.bidId,
              rendered: 0,
              source: 'pbjs',
              adUnitCode: bid.adUnitCode,
              highestTargetedBidCpm: highestBidsByAdUnitCode[bid.adUnitCode]?.adserverTargeting?.hb_pb || '',
              targetedBidCpm: receivedBidsMap[bid.bidId]?.adserverTargeting?.hb_pb || '',
              highestBidCpm: highestBidsByAdUnitCode[bid.adUnitCode]?.cpm || 0,
              bidderCpm: receivedBidsMap[bid.bidId]?.cpm || 'nobid',
              bidderOriginalCpm: receivedBidsMap[bid.bidId]?.originalCpm || 'nobid',
              bidderCurrency: receivedBidsMap[bid.bidId]?.currency || 'nobid',
              bidderOriginalCurrency: receivedBidsMap[bid.bidId]?.originalCurrency || 'nobid',
              bidderErrorCode: rejectedBidsMap[bid.bidId] ? rejectedBidsMap[bid.bidId].rejectionReason : -1,
              timestamp: auctionDetails.timestamp,
              transactionId: bid.transactionId, // this field gets removed before injecting previous auction info into the bid stream
            }

            if (auctionState[bidderRequest.bidderCode].length > enabledBidder.maxQueueLength) {
              auctionState[bidderRequest.bidderCode].shift();
            }

            auctionState[bidderRequest.bidderCode].push(previousAuctionInfoPayload);
          });
        }
      });
    }
  } catch (error) {}
}

export const onBidWonHandler = (winningBid) => {
  const winningTid = winningBid.transactionId;

  Object.values(auctionState).flat().forEach(prevAuctPayload => {
    if (prevAuctPayload.transactionId === winningTid) {
      prevAuctPayload.rendered = 1;
    }
  });
};

export const onBidRequestedHandler = (bidRequest) => {
  try {
    const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidRequest.bidderCode);
    if (enabledBidder && auctionState[bidRequest.bidderCode]) {
      auctionState[bidRequest.bidderCode].forEach(prevAuctPayload => {
        if (prevAuctPayload.transactionId) delete prevAuctPayload.transactionId;
      });

      bidRequest.ortb2 = Object.assign({}, bidRequest.ortb2);
      bidRequest.ortb2.ext = Object.assign({}, bidRequest.ortb2.ext);
      bidRequest.ortb2.ext.prebid = Object.assign({}, bidRequest.ortb2.ext.prebid);

      bidRequest.ortb2.ext.prebid.previousauctioninfo = auctionState[bidRequest.bidderCode];
      delete auctionState[bidRequest.bidderCode];
    }
  } catch (error) {}
}

initPreviousAuctionInfo();
