import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'project-limelight';

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} bid The bid to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastXml || bid.vastUrl);
  }
  return false;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    let winTop;
    try {
      winTop = window.top;
      winTop.location.toString();
    } catch (e) {
      utils.logMessage(e);
      winTop = window;
    }
    const placements = utils.groupBy(validBidRequests.map(bidRequest => buildPlacement(bidRequest)), 'host')
    return Object.keys(placements)
      .map(host => buildRequest(winTop, host, placements[host].map(placement => placement.adUnit)));
  },

  onBidWon: (bid) => {
    const cpm = bid.pbMg;
    if (bid.nurl !== '') {
      bid.nurl = bid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      ajax(bid.nurl, null);
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (bidResponses) => {
    const res = [];
    const bidResponsesBody = bidResponses.body;
    const len = bidResponsesBody.length;
    for (let i = 0; i < len; i++) {
      const bid = bidResponsesBody[i];
      if (isBidResponseValid(bid)) {
        res.push(bid);
      }
    }
    return res;
  },
};

registerBidder(spec);

function buildRequest(winTop, host, adUnits) {
  return {
    method: 'POST',
    url: `https://${host}/hb`,
    data: {
      secure: (location.protocol === 'https:'),
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      adUnits: adUnits
    }
  }
}

function buildPlacement(bidRequest) {
  return {
    host: bidRequest.params.host,
    adUnit: {
      id: bidRequest.params.adUnitId,
      bidId: bidRequest.bidId,
      transactionId: bidRequest.transactionId,
      sizes: bidRequest.sizes.map(size => {
        return {
          width: size[0],
          height: size[1]
        }
      }),
      type: bidRequest.params.adUnitType.toUpperCase()
    }
  }
}
