import {
  logError
} from '../src/utils.js';
import {
  BANNER
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  getRequest,
  formatResponse,
} from '../libraries/audiencelogyUtils/bidderUtils.js';

const BIDDER_CODE = 'audiencelogy';
const ENDPOINT_URL = 'https://rtb.audiencelogy.com/prebid';

// Export const spec
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: BANNER,
  // Determines whether or not the given bid request is valid
  isBidRequestValid: function (bid) {
    return !!(bid.params.placement_id && bid.params.user_id && bid.params.nid);
  },
  // Make a server request from the list of BidRequests
  buildRequests: function (bidRequests, bidderRequest) {
    const requests = [];
    let nid = 0;
    // Loop for each bid request
    bidRequests.forEach(bid => {
      // Get the bid request object
      const request = getRequest(bid, bidderRequest);
      // Push the created bid request to the requests array
      requests.push(request);
      // Set nid value
      nid = bid.params.nid;
    });
    // Return the array of bid requests
    return {
      method: 'POST',
      url: `${ENDPOINT_URL}/${nid}`,
      data: JSON.stringify(requests),
      options: {
        contentType: 'application/json',
      }
    };
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: function (bidResponse, bidRequest) {
    let resp = [];
    if (bidResponse && bidResponse.body) {
      try {
        let bids = bidResponse.body.seatbid && bidResponse.body.seatbid[0] ? bidResponse.body.seatbid[0].bid : [];
        if (bids) {
          bids.forEach(bidObj => {
            let newBid = formatResponse(bidObj);
            newBid.mediaType = BANNER;
            resp.push(newBid);
          });
        }
      } catch (err) {
        logError(err);
      }
    }
    return resp;
  }
}

registerBidder(spec);
