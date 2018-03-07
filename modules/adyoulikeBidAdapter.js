import * as utils from 'src/utils';
import { format } from 'src/url';
// import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const VERSION = '1.0';
const BIDDER_CODE = 'adyoulike';
const DEFAULT_DC = 'hb-api';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ayl'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const sizes = getSize(bid.sizes);
    if (!bid.params || !bid.params.placement || !sizes.width || !sizes.height) {
      return false;
    }
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidderRequest} - bidderRequest.bids[] is an array of AdUnits and bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidderRequest) {
    let dcHostname = getHostname(bidderRequest);
    const payload = {
      Version: VERSION,
      Bids: bidderRequest.reduce((accumulator, bid) => {
        let size = getSize(bid.sizes);
        accumulator[bid.bidId] = {};
        accumulator[bid.bidId].PlacementID = bid.params.placement;
        accumulator[bid.bidId].TransactionID = bid.transactionId;
        accumulator[bid.bidId].Width = size.width;
        accumulator[bid.bidId].Height = size.height;
        return accumulator;
      }, {}),
      PageRefreshed: getPageRefreshed()
    };
    const data = JSON.stringify(payload);
    const options = {
      withCredentials: false
    };

    return {
      method: 'POST',
      url: createEndpoint(dcHostname),
      data,
      options
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    // For this adapter, serverResponse is a list
    serverResponse.body.forEach(response => {
      const bid = createBid(response);
      if (bid) {
        bidResponses.push(bid);
      }
    });
    return bidResponses;
  }
}

/* Get hostname from bids */
function getHostname(bidderRequest) {
  let dcHostname = find(bidderRequest, bid => bid.params.DC);
  if (dcHostname) {
    return ('-' + dcHostname.params.DC);
  }
  return '';
}

/* Get current page referrer url */
function getReferrerUrl() {
  let referer = '';
  if (window.self !== window.top) {
    try {
      referer = window.top.document.referrer;
    } catch (e) { }
  } else {
    referer = document.referrer;
  }
  return referer;
}

/* Get current page canonical url */
function getCanonicalUrl() {
  let link;
  if (window.self !== window.top) {
    try {
      link = window.top.document.head.querySelector('link[rel="canonical"][href]');
    } catch (e) { }
  } else {
    link = document.head.querySelector('link[rel="canonical"][href]');
  }

  if (link) {
    return link.href;
  }
  return '';
}

/* Get information on page refresh */
function getPageRefreshed() {
  try {
    if (performance && performance.navigation) {
      return performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }
  } catch (e) { }
  return false;
}

/* Create endpoint url */
function createEndpoint(host) {
  return format({
    protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
    host: `${DEFAULT_DC}${host}.omnitagjs.com`,
    pathname: '/hb-api/prebid/v1',
    search: createEndpointQS()
  });
}

/* Create endpoint query string */
function createEndpointQS() {
  const qs = {};

  const ref = getReferrerUrl();
  if (ref) {
    qs.RefererUrl = encodeURIComponent(ref);
  }

  const can = getCanonicalUrl();
  if (can) {
    qs.CanonicalUrl = encodeURIComponent(can);
  }

  return qs;
}

/* Get parsed size from request size */
function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

/* Create bid from response */
function createBid(response) {
  if (!response || !response.Ad) {
    return
  }

  return {
    requestId: response.BidID,
    bidderCode: spec.code,
    width: response.Width,
    height: response.Height,
    ad: response.Ad,
    ttl: 3600,
    creativeId: response.CreativeID,
    cpm: response.Price,
    netRevenue: true,
    currency: 'USD'
  };
}

registerBidder(spec);
