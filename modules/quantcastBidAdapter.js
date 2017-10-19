import adapterManager from "src/adaptermanager";
import * as utils from "src/utils";
import { registerBidder } from "src/adapters/bidderFactory";

const BIDDER_CODE = "quantcast";
const DEFAULT_BID_FLOOR = 0.0000000001;
const QUANTCAST_CALLBACK_URL = "global.qc.rtb.quantserve.com";
const QUANTCAST_CALLBACK_URL_TEST = "s2s-canary.quantserve.com";
const QUANTCAST_TEST_PUBLISHER = "test-publisher";

let publisherTagURL;
let publisherTagURLTest;

// TODO: Change the callback URL to Canary endpoint if under test
switch (window.location.protocol) {
  case "https:":
    publisherTagURL = `https://${QUANTCAST_CALLBACK_URL}:8080/qchb`;
    publisherTagURLTest = `https://${QUANTCAST_CALLBACK_URL_TEST}:8080/qchb`;
    break;
  default:
    publisherTagURL = `http://${QUANTCAST_CALLBACK_URL}:8443/qchb`;
    publisherTagURLTest = `https://${QUANTCAST_CALLBACK_URL_TEST}:8443/qchb`;
}

/**
 * The documentation for Prebid.js Adapter 1.0 can be found at link below,
 * http://prebid.org/dev-docs/bidder-adapter-1.html
 */
export const spec = {
  code: BIDDER_CODE,

  // `BaseAdapter` model saves adapter from having to make the AJAX call
  // provides consistency adapter structure.
  // `BaseAdapter` defines 4 entry points,
  // - `isBidRequestValid`
  // - `buildRequests`
  // - `interpretResponse`
  // - `getUserSyncs`

  /**
   * Verify the `AdUnits.bids` response with `true` for valid request and `false`
   * for invalid request.
   *
   * @param {object} bid
   * @return boolean `true` is this is a valid bid, and `false` otherwise
   */
  isBidRequestValid(bid) {
    if (bid.mediaType === "video") {
      return false;
    }

    return true;
  },

  /**
   * Make a server request when the page asks Prebid.js for bids from a list of
   * `BidRequests`.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be send to Quantcast server
   * @return ServerRequest information describing the request to the server.
   */
  buildRequests(bidRequests) {
    const bids = bidRequests || [];

    const referrer = utils.getTopWindowUrl();
    const loc = utils.getTopWindowLocation();
    const domain = loc.hostname;

    const bidRequestsList = bids.map(bid => {
      const bidSizes = [];

      bid.sizes.forEach(size => {
        bidSizes.push({
          width: size[0],
          height: size[1]
        });
      });

      // Request Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
      const requestData = {
        publisherId: bid.params.publisherId,
        requestId: bid.bidId,
        imp: [
          {
            banner: {
              battr: bid.params.battr,
              size: bidSizes
            },
            placementCode: bid.placementCode,
            bidFloor: bid.params.bidFloor || DEFAULT_BID_FLOOR
          }
        ],
        site: {
          page: loc.href,
          referrer,
          domain
        },
        bidId: bid.bidId
      };

      const url =
        bid.params.publisherId === QUANTCAST_TEST_PUBLISHER
          ? publisherTagURLTest
          : publisherTagURL;

      return {
        data: JSON.stringify(requestData),
        method: "POST",
        url,
        withCredentials: true
      };
    });

    return bidRequestsList;
  },

  /**
   * Function get called when the browser has received the response from Quantcast server.
   * The function parse the response and create a `bidResponse` object containing one/more bids.
   * Returns an empty array if no valid bids
   *
   * Response Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
   *
   * @param {*} serverResponse A successful response from Quantcast server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   *
   */
  interpretResponse(serverResponse) {
    if (utils.isEmpty(serverResponse)) {
      return [];
    }

    let response;
    try {
      response = JSON.parse(serverResponse);
    } catch (error) {
      utils.logError("Malformed JSON received from Quantcast server");
      return [];
    }

    if (
      response === null ||
      !response.hasOwnProperty("bids") ||
      utils.isEmpty(response.bids)
    ) {
      utils.logError("Sub-optimal JSON received from Quantcast server");
      return;
    }

    const bidResponsesList = response.bids.map(bid => {
      const { ad, cpm, width, height } = bid;

      return {
        ad,
        cpm,
        width,
        height,
        requestId: response.requestId,
        bidderCode: response.bidderCode || BIDDER_CODE
      };
    });

    return bidResponsesList;
  },

  getUserSyncs(syncOptions) {
    // Quantcast does not do `UserSyncs` at the moment.
    // This feature will be supported at a later time.
  }
};

registerBidder(spec);
