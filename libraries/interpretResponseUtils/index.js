import {logError} from '../../src/utils.js';

export function interpretResponseUtil(serverResponse, {bidderRequest}, eachBidCallback) {
  const bids = [];
  if (!serverResponse.body || serverResponse.body.error) {
    let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
    if (serverResponse.body && serverResponse.body.error) { errorMessage += `: ${serverResponse.body.error}`; }
    logError(errorMessage);
    return bids;
  }
  (serverResponse.body.tags || []).forEach(serverBid => {
    try {
      const bid = eachBidCallback(serverBid);
      if (bid) {
        bids.push(bid);
      }
    } catch (e) {
      // Do nothing
    }
  });
  return bids;
}
