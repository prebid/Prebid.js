import {on as onEvent} from './events.js';
import CONSTANTS from './constants.json';
import {getStorageManager} from '../src/storageManager.js';
import { MODULE_TYPE_PREBID } from '../src/activities/modules.js';

const MODULE_NAME = 'lossNotifications';
const storage = getStorageManager({moduleType: MODULE_TYPE_PREBID, moduleName: MODULE_NAME});
let tidMap = {};
let lossNotificationsEnabled = false;
let enabledBidders = [];

export function enableLossNotifications(config) {
  const { bidderCode, beaconUrl } = config;
  enabledBidders.push({bidderCode, beaconUrl});
  if (lossNotificationsEnabled) return;
  lossNotificationsEnabled = true;
  onEvent(CONSTANTS.EVENTS.AUCTION_END, onAuctionEndHandler);
  onEvent(CONSTANTS.EVENTS.BID_WON, onBidWonHandler);
  onEvent(CONSTANTS.EVENTS.BID_REQUESTED, onBidRequestedHandler);
}

function onAuctionEndHandler(auctionDetails) {
  let tid;
  let enabledBidderData;

  auctionDetails.bidderRequests.forEach(bidderRequest => {
    const enabledBidder = enabledBidders.find(bidder => bidder.bidderCode === bidderRequest.bidderCode);

    if (enabledBidder) {
      bidderRequest.bids.forEach(bid => {
        tid = bid.ortb2Imp.ext.tid || bid.ortb2.source.tid || bid.transactionId || null; // should we only check bid.ortb2Imp.ext.tid here?
        enabledBidderData = {
          bidderCode: bidderRequest.bidderCode,
          bidderRequestId: bidderRequest.bidderRequestId
        };

        if (enabledBidder.beaconUrl) (enabledBidderData.beaconUrl = enabledBidder.beaconUrl);
        if (tid) {
          if (!tidMap[tid]) {
            tidMap[tid] = [enabledBidderData];
          } else {
            tidMap[tid].push(enabledBidderData);
          }
        }
      });
    }
  });
}

function onBidWonHandler(bid) {
  const winningBidData = {
    bidderCode: bid.bidderCode,
    cpm: bid.cpm,
    status: bid.status,
    transactionId: bid.transactionId,
  };

  tidMap[winningBidData.transactionId].forEach(bidder => {
    if (bidder.bidderCode !== winningBidData.bidderCode) {
      const lossNotificationPayload = {
        bidderRequestId: bidder.bidderRequestId,
        auctionId: winningBidData.transactionId,
        minBidToWin: winningBidData.cpm,
        rendered: winningBidData.status === CONSTANTS.BID_STATUS.RENDERED ? 1 : 0,
      };

      if (bidder.beaconUrl) {
        // use  js beacon api to fire payload immediately to ssp provided endpoint
        navigator.sendBeacon(bidder.beaconUrl, JSON.stringify(lossNotificationPayload));
      } else {
        // store the payload in an array under bidder code in local storage and send it out with the respective bidder's next bid request
        let pbln = JSON.parse(storage.getDataFromLocalStorage('pbln'));
        if (pbln) {
          if (pbln[bidder.bidderCode]) {
            pbln[bidder.bidderCode].push(lossNotificationPayload);
          } else {
            pbln[bidder.bidderCode] = [lossNotificationPayload];
          }
          storage.setDataInLocalStorage('pbln', JSON.stringify(pbln));
        } else {
          pbln = {};
          pbln[bidder.bidderCode] = [lossNotificationPayload];
          storage.setDataInLocalStorage('pbln', JSON.stringify(pbln));
        }
      }
    }
  });
}

function onBidRequestedHandler(bidRequest) {
  let pbln = JSON.parse(storage.getDataFromLocalStorage('pbln'));
  if (pbln && pbln[bidRequest.bidderCode]) {
    bidRequest.lossNotification = pbln[bidRequest.bidderCode]
    delete pbln[bidRequest.bidderCode];
    storage.setDataInLocalStorage('pbln', JSON.stringify(pbln));
  }
}
