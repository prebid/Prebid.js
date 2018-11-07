import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'quantcast';
const DEFAULT_BID_FLOOR = 0.0000000001;

export const QUANTCAST_DOMAIN = 'qcx.quantserve.com';
export const QUANTCAST_TEST_DOMAIN = 's2s-canary.quantserve.com';
export const QUANTCAST_NET_REVENUE = true;
export const QUANTCAST_TEST_PUBLISHER = 'test-publisher';
export const QUANTCAST_TTL = 4;
export const QUANTCAST_PROTOCOL =
  window.location.protocol === 'http:'
    ? 'http'
    : 'https';
export const QUANTCAST_PORT =
  QUANTCAST_PROTOCOL === 'http'
    ? '8080'
    : '8443';

/**
 * The documentation for Prebid.js Adapter 1.0 can be found at link below,
 * http://prebid.org/dev-docs/bidder-adapter-1.html
 */
export const spec = {
  code: BIDDER_CODE,

  /**
   * Verify the `AdUnits.bids` response with `true` for valid request and `false`
   * for invalid request.
   *
   * @param {object} bid
   * @return boolean `true` is this is a valid bid, and `false` otherwise
   */
  isBidRequestValid(bid) {
    if (!bid) {
      return false;
    }

    if (bid.mediaType === 'video') {
      return false;
    }

    return true;
  },

  /**
   * Make a server request when the page asks Prebid.js for bids from a list of
   * `BidRequests`.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be send to Quantcast server
   * @param bidderRequest
   * @return ServerRequest information describing the request to the server.
   */
  buildRequests(bidRequests, bidderRequest) {
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

      const gdprConsent = (bidderRequest && bidderRequest.gdprConsent) ? bidderRequest.gdprConsent : {};

      // Request Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
      const requestData = {
        publisherId: bid.params.publisherId,
        requestId: bid.bidId,
        imp: [
          {
            banner: {
              battr: bid.params.battr,
              sizes: bidSizes
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
        bidId: bid.bidId,
        gdprSignal: gdprConsent.gdprApplies ? 1 : 0,
        gdprConsent: gdprConsent.consentString
      };

      const data = JSON.stringify(requestData);

      const qcDomain = bid.params.publisherId === QUANTCAST_TEST_PUBLISHER
        ? QUANTCAST_TEST_DOMAIN
        : QUANTCAST_DOMAIN;
      const url = `${QUANTCAST_PROTOCOL}://${qcDomain}:${QUANTCAST_PORT}/qchb`;

      return {
        data,
        method: 'POST',
        url
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
    if (serverResponse === undefined) {
      utils.logError('Server Response is undefined');
      return [];
    }

    const response = serverResponse['body'];

    if (
      response === undefined ||
      !response.hasOwnProperty('bids') ||
      utils.isEmpty(response.bids)
    ) {
      utils.logError('Sub-optimal JSON received from Quantcast server');
      return [];
    }

    const bidResponsesList = response.bids.map(bid => {
      const { ad, cpm, width, height, creativeId, currency } = bid;

      return {
        requestId: response.requestId,
        cpm,
        width,
        height,
        ad,
        ttl: QUANTCAST_TTL,
        creativeId,
        netRevenue: QUANTCAST_NET_REVENUE,
        currency
      };
    });

    return bidResponsesList;
  },
  onTimeout(timeoutData) {
    const url = `${QUANTCAST_PROTOCOL}://${QUANTCAST_DOMAIN}:${QUANTCAST_PORT}/qchb_notify?type=timeout`;
    ajax(url, null, null);
  }
};

registerBidder(spec);
