import * as utils from '../src/utils';
import { format } from '../src/url';
// import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
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
    const sizes = getSize(getSizeArray(bid));
    if (!bid.params || !bid.params.placement || !sizes.width || !sizes.height) {
      return false;
    }
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidRequests} - bidRequests.bids[] is an array of AdUnits and bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const payload = {
      Version: VERSION,
      Bids: bidRequests.reduce((accumulator, bid) => {
        let sizesArray = getSizeArray(bid);
        let size = getSize(sizesArray);
        accumulator[bid.bidId] = {};
        accumulator[bid.bidId].PlacementID = bid.params.placement;
        accumulator[bid.bidId].TransactionID = bid.transactionId;
        accumulator[bid.bidId].Width = size.width;
        accumulator[bid.bidId].Height = size.height;
        accumulator[bid.bidId].AvailableSizes = sizesArray.join(',');
        return accumulator;
      }, {}),
      PageRefreshed: getPageRefreshed()
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdprConsent = {
        consentString: bidderRequest.gdprConsent.consentString,
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.uspConsent = bidderRequest.uspConsent;
    }

    const data = JSON.stringify(payload);
    const options = {
      withCredentials: true
    };

    return {
      method: 'POST',
      url: createEndpoint(bidRequests, bidderRequest),
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
  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];
    var bidRequests = {};

    try {
      bidRequests = JSON.parse(request.data).Bids;
    } catch (e) {
      // json error initial request can't be read
    }

    // For this adapter, serverResponse is a list
    serverResponse.body.forEach(response => {
      const bid = createBid(response, bidRequests);
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
function getReferrerUrl(bidderRequest) {
  let referer = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    referer = bidderRequest.refererInfo.referer;
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
function createEndpoint(bidRequests, bidderRequest) {
  let host = getHostname(bidRequests);
  return format({
    protocol: 'https',
    host: `${DEFAULT_DC}${host}.omnitagjs.com`,
    pathname: '/hb-api/prebid/v1',
    search: createEndpointQS(bidderRequest)
  });
}

/* Create endpoint query string */
function createEndpointQS(bidderRequest) {
  const qs = {};

  const ref = getReferrerUrl(bidderRequest);
  if (ref) {
    qs.RefererUrl = encodeURIComponent(ref);
  }

  const can = getCanonicalUrl();
  if (can) {
    qs.CanonicalUrl = encodeURIComponent(can);
  }

  return qs;
}

function getSizeArray(bid) {
  let inputSize = bid.sizes;
  if (bid.mediaTypes && bid.mediaTypes.banner) {
    inputSize = bid.mediaTypes.banner.sizes;
  }

  return utils.parseSizesInput(inputSize);
}

/* Get parsed size from request size */
function getSize(sizesArray) {
  const parsed = {};
  // the main requested size is the first one
  const size = sizesArray[0];

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
function createBid(response, bidRequests) {
  if (!response || !response.Ad) {
    return
  }

  // In case we don't retreive the size from the adserver, use the given one.
  if (bidRequests && bidRequests[response.BidID]) {
    if (!response.Width || response.Width === '0') {
      response.Width = bidRequests[response.BidID].Width;
    }

    if (!response.Height || response.Height === '0') {
      response.Height = bidRequests[response.BidID].Height;
    }
  }

  return {
    requestId: response.BidID,
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
