import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'medscape';

const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: (bid) => {
    return !!bid.params.placementId;
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    debugger;
    // See what happens here
    // send bid request to medscape
  },
  interpretResponse: (serverResponse, request) => {
    debugger;
    // again see what happens
  },
  getUserSyncs: () => {
    // Do we need this?
    return [];
  }
}

registerBidder(spec);
