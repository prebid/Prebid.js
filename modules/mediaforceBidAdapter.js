import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'mediaforce';
const ENDPOINT_URL = 'https://rtb.mfadsrvr.com/header_bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: function(bid) {
    return !!((typeof bid.params === 'object') && bid.params.placement_id && bid.params.publisher_id);
  },

  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return;
    }

    const referer = bidderRequest && bidderRequest.refererInfo ? encodeURIComponent(bidderRequest.refererInfo.referer) : '';
    const dnt = utils.getDNT() ? 1 : 0;
    let imp = [];
    let requests = []
    validBidRequests.forEach(bid => {
      let tagid = bid.params.placement_id;
      let bidfloor = bid.params.bidfloor ? parseFloat(bid.params.bidfloor) : 0;
      let impObj = {
        id: bid.bidId,
        tagid: tagid,
        secure: 1,
        bidfloor: bidfloor,
      };
      for (let mediaTypes in bid.mediaTypes) {
        switch (mediaTypes) {
          case BANNER:
            impObj.banner = createBannerRequest(bid);
            imp.push(impObj);
            break;
          default: return;
        }
      }

      let request = {
        id: bid.transactionId,
        site: {
          page: referer,
          ref: referer,
          id: bid.params.publisher_id,
          publisher: {
            id: bid.params.publisher_id
          },
        },
        device: {
          ua: navigator.userAgent,
          js: 1,
          dnt: dnt,
          language: getLanguage()
        },
        imp
      };
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(request)
      });
    });
    return requests;
  },

  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const responseBody = serverResponse.body;
    const bidResponses = [];
    const cur = responseBody.cur;
    responseBody.seatbid.forEach((bids) => {
      bids.bid.forEach((serverBid) => {
        const bid = {
          requestId: serverBid.impid,
          cpm: parseFloat(serverBid.price),
          width: serverBid.w,
          height: serverBid.h,
          creativeId: serverBid.adid,
          currency: cur,
          netRevenue: true,
          ttl: serverBid.ttl || 300,
          ad: serverBid.adm,
          burl: serverBid.burl,
        };

        bidResponses.push(bid);
      })
    });

    return bidResponses;
  },

  /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
  onBidWon: function(bid) {
    const cpm = utils.deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    if (utils.isStr(bid.burl) && bid.burl !== '') {
      bid.burl = utils.replaceAuctionPrice(bid.burl, cpm);
      utils.triggerPixel(bid.burl);
    }
  },
}
registerBidder(spec);

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function createBannerRequest(bid) {
  const sizes = bid.mediaTypes.banner.sizes;
  if (!sizes.length) return;

  let format = [];
  let r = utils.parseGPTSingleSizeArrayToRtbSize(sizes[0]);
  for (let f = 1; f < sizes.length; f++) {
    format.push(utils.parseGPTSingleSizeArrayToRtbSize(sizes[f]));
  }
  if (format.length) {
    r.format = format
  }
  return r
}
