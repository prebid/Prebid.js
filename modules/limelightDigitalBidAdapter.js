import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'limelightDigital';

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} bid The bid to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency || !bid.meta.advertiserDomains) {
    return false;
  }
  switch (bid.meta.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastXml || bid.vastUrl);
  }
  return false;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['pll'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.host && bid.params.adUnitType &&
      (bid.params.adUnitId || bid.params.adUnitId === 0));
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

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: (bid) => {
    const cpm = bid.pbMg;
    if (bid.nurl !== '') {
      bid.nurl = bid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      ajax(bid.nurl, null);
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequest) => {
    const bidResponses = [];
    const serverBody = serverResponse.body;
    const len = serverBody.length;
    for (let i = 0; i < len; i++) {
      const bidResponse = serverBody[i];
      if (isBidResponseValid(bidResponse)) {
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
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
  let sizes;
  if (bidRequest.mediaTypes) {
    switch (bidRequest.params.adUnitType) {
      case BANNER:
        if (bidRequest.mediaTypes.banner && bidRequest.mediaTypes.banner.sizes) {
          sizes = bidRequest.mediaTypes.banner.sizes;
        }
        break;
      case VIDEO:
        if (bidRequest.mediaTypes.video && bidRequest.mediaTypes.video.playerSize) {
          sizes = [bidRequest.mediaTypes.video.playerSize];
        }
        break;
    }
  }
  sizes = (sizes || []).concat(bidRequest.sizes || []).filter(utils.uniques);
  return {
    host: bidRequest.params.host,
    adUnit: {
      id: bidRequest.params.adUnitId,
      bidId: bidRequest.bidId,
      transactionId: bidRequest.transactionId,
      sizes: sizes.map(size => {
        return {
          width: size[0],
          height: size[1]
        }
      }),
      type: bidRequest.params.adUnitType.toUpperCase()
    }
  }
}
