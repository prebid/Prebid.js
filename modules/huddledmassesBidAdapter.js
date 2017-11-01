import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

const BIDDER_CODE = 'huddledmasses';
const URL = '//huddledmassessupply.com/?c=o&m=multi';
const URL_SYNC = '//huddledmassessupply.com/?c=o&m=cookie';
const ALLOWED_SIZES = {
  1: '468x60', '468x60': 1,
  2: '728x90', '728x90': 2,
  10: '300x600', '300x600': 10,
  15: '300x250', '300x250': 15,
  19: '300x100', '300x100': 19,
  43: '320x50', '320x50': 43,
  44: '300x50', '300x50': 44,
  48: '300x300', '300x300': 48,
  54: '300x1050', '300x1050': 54,
  55: '970x90', '970x90': 55,
  57: '970x250', '970x250': 57,
  58: '1000x90', '1000x90': 58,
  59: '320x80', '320x80': 59,
  65: '640x480', '640x480': 65,
  67: '320x480', '320x480': 67,
  72: '320x320', '320x320': 72,
  73: '320x160', '320x160': 73,
  83: '480x300', '480x300': 83,
  94: '970x310', '970x310': 94,
  96: '970x210', '970x210': 96,
  101: '480x320', '480x320': 101,
  102: '768x1024', '768x1024': 102,
  113: '1000x300', '1000x300': 113,
  117: '320x100', '320x100': 117,
  118: '800x250', '800x250': 118,
  119: '200x600', '200x600': 119,
};

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return (!isNaN(bid.params.placement_id) &&
    ((bid.params.sizes != undefined && bid.params.sizes.length > 0 && bid.params.sizes.some((sizeIndex) => ALLOWED_SIZES[sizeIndex] != undefined)) ||
    (bid.sizes != undefined && bid.sizes.length > 0 && bid.sizes.map((size) => `${size[0]}x${size[1]}`).some((size) => ALLOWED_SIZES[size] != undefined))));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests) => {

    let data = [];
    let winTop = window;
    try{
      window.top.location.toString();
      winTop = window.top;
    }catch(e){};
    let location = winTop.location;
    let placements = [],
        request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': navigator ? navigator.language : '',
      'secure': location.protocol === 'https:' ? 1 : 0,
      'host': location.host,
      'page': location.pathname,
      'placements':placements
    };

    for(let i = 0; i < validBidRequests.length; i++) {
      let bid = validBidRequests[i];
      let placement = {};
      placement['placementId'] = bid.params.placement_id;
      placement['bidId'] = bid.bidId;
      placement['sizes'] = bid.sizes;
      placements.push(placement);
    }

    return {
      method: 'POST',
      url: URL,
      data: request
    };

  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    let response = [];

    try{
      serverResponse = serverResponse.body;
      if(serverResponse.length > 0) {
        for(let i = 0; i < serverResponse.length; i++) {
          let resItem = serverResponse[i];
          if(resItem.width && !isNaN(resItem.width)
          && resItem.height && !isNaN(resItem.height)
          && resItem.requestId && typeof resItem.requestId === 'string'
          && resItem.cpm && !isNaN(resItem.cpm)
          && resItem.ad && typeof resItem.ad === 'string'
          && resItem.ttl && !isNaN(resItem.ttl)
          && resItem.creativeId && typeof resItem.creativeId === 'string'
          && resItem.netRevenue && typeof resItem.netRevenue === 'boolean'
          && resItem.currency && typeof resItem.currency === 'string')
            response.push(resItem);
        }
      }
    }catch(e){};
    return response;

  },

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: URL_SYNC
    }];
  }
};

registerBidder(spec);
