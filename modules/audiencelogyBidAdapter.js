import {
  generateUUID,
  logError
} from '../src/utils.js';
import {
  BANNER
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  getBanner,
  getFloor,
  getSite,
  formatResponse,
  buildUser
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
      // Create the bid request object
      const request = {
        id: generateUUID(),
        imp: [{
          id: bid.bidId,
          bidfloor: getFloor(bid),
          banner: getBanner(bid)
        }],
        placementId: bid.params.placement_id,
        site: getSite(bidderRequest),
        user: buildUser(bid)
      };
      // Get GPP Consent from bidderRequest
      if (bidderRequest?.gppConsent?.gppString) {
        request.gpp = bidderRequest.gppConsent.gppString;
        request.gpp_sid = bidderRequest.gppConsent.applicableSections;
      } else if (bidderRequest?.ortb2?.regs?.gpp) {
        request.gpp = bidderRequest.ortb2.regs.gpp;
        request.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
      }
      // Get coppa compliance from bidderRequest
      if (bidderRequest?.ortb2?.regs?.coppa) {
        request.coppa = 1;
      }
      // Get uspConsent from bidderRequest
      if (bidderRequest && bidderRequest.uspConsent) {
        request.us_privacy = bidderRequest.uspConsent;
      }
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
