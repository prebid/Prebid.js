import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'huddledmasses';
const URL = '//huddledmassessupply.com/?c=o&m=multi';
const URL_SYNC = '//huddledmassessupply.com/?c=o&m=cookie';
const SIZE_INDEX = {
  '468x60': 1,
  '728x90': 2,
  '300x600': 10,
  '300x250': 15,
  '300x100': 19,
  '320x50': 43,
  '300x50': 44,
  '300x300': 48,
  '300x1050': 54,
  '970x90': 55,
  '970x250': 57,
  '1000x90': 58,
  '320x80': 59,
  '640x480': 65,
  '320x480': 67,
  '320x320': 72,
  '320x160': 73,
  '480x300': 83,
  '970x310': 94,
  '970x210': 96,
  '480x320': 101,
  '768x1024': 102,
  '1000x300': 113,
  '320x100': 117,
  '800x250': 118,
  '200x600': 119
};
const INDEX_SIZE = {
  1: '468x60',
  2: '728x90',
  10: '300x600',
  15: '300x250',
  19: '300x100',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  65: '640x480',
  67: '320x480',
  72: '320x320',
  73: '320x160',
  83: '480x300',
  94: '970x310',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  113: '1000x300',
  117: '320x100',
  118: '800x250',
  119: '200x600'
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
    ((bid.params.sizes != undefined && bid.params.sizes.length > 0 && bid.params.sizes.some((sizeIndex) => INDEX_SIZE[sizeIndex] != undefined)) ||
    (bid.sizes != undefined && bid.sizes.length > 0 && bid.sizes.map((size) => `${size[0]}x${size[1]}`).some((size) => SIZE_INDEX[size] != undefined))));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests) => {
    let winTop = window;
    try {
      window.top.location.toString();
      winTop = window.top;
    } catch (e) {
      console.log(e);
    };
    let location = winTop.location;
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': navigator ? navigator.language : '',
      'secure': location.protocol === 'https:' ? 1 : 0,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };
    for (let i = 0; i < validBidRequests.length; i++) {
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
    try {
      serverResponse = serverResponse.body;
      for (let i = 0; i < serverResponse.length; i++) {
        let resItem = serverResponse[i];
        if (resItem.width && !isNaN(resItem.width) &&
            resItem.height && !isNaN(resItem.height) &&
            resItem.requestId && typeof resItem.requestId === 'string' &&
            resItem.cpm && !isNaN(resItem.cpm) &&
            resItem.ad && typeof resItem.ad === 'string' &&
            resItem.ttl && !isNaN(resItem.ttl) &&
            resItem.creativeId && typeof resItem.creativeId === 'string' &&
            resItem.netRevenue && typeof resItem.netRevenue === 'boolean' &&
            resItem.currency && typeof resItem.currency === 'string') {
          response.push(resItem);
        }
      }
    } catch (e) {
      console.log(e);
    };
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
