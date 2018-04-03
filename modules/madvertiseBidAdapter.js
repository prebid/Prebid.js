import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

// use protocol relative urls for http or https
const MADVERTISE_ENDPOINT = 'https://mobile.mng-ads.com/';

export const spec = {
  code: 'madvertise',
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    let sizes = utils.parseSizesInput(bid.sizes);
    if (!sizes || sizes.length === 0) {
      return false;
    }
    console.log(sizes[0]);
    if (sizes.length > 0 && sizes[0] === undefined) {
      return false;
    }
    if (typeof bid.params.floor == 'undefined' || parseFloat(bid.params.floor) < 0.01) {
      bid.params.floor = 0.01;
    }

    return typeof bid.params.s != 'undefined';
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @return ServerRequest[]
   */
  buildRequests: function (bidRequests) {
    return bidRequests.map(bidRequest => {
      bidRequest.startTime = new Date().getTime();

      // non-video request builder
      var src = '?rt=bid_request&v=1.0';

      for (var i = 0; i < bidRequest.sizes.length; i++) {
        if (Array.isArray(bidRequest.sizes[i]) && bidRequest.sizes[i].length == 2) {
          src = src + '&sizes[' + i + ']=' + bidRequest.sizes[i][0] + 'x' + bidRequest.sizes[i][1];
        }
      }

      utils._each(bidRequest.params, (item, key) => src = src + '&' + key + '=' + item);

      if (typeof bidRequest.params.u == 'undefined') {
        src = src + '&u=' + navigator.userAgent;
      }

      src = src + _getSeenAd();

      return {
        method: 'GET',
        url: MADVERTISE_ENDPOINT + src,
        options: {withCredentials: false},
        bidId: bidRequest.bidId
      };
    });
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, bidRequest) {
    responseObj = responseObj.body;
    // check overall response
    if (responseObj == null || typeof responseObj !== 'object' || !responseObj.hasOwnProperty('ad')) {
      return [];
    }

    _setSeenAd(responseObj.creativeId);

    let bid = {
      requestId: bidRequest.bidId,
      cpm: responseObj.cpm,
      width: responseObj.Width,
      height: responseObj.height,
      ad: responseObj.ad,
      ttl: responseObj.ttl,
      creativeId: responseObj.creativeId,
      netRevenue: responseObj.netRevenue,
      currency: responseObj.currency,
      dealId: responseObj.dealId
    };
    return [bid];
  },
  getUserSyncs: function (syncOptions) {
  }
};

function _getSeenAd() {
  var cookies = document.cookie.split(';');
  var src = '';
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    if (cookie.match(/seenad\[\d+\]=\d+/)) {
      src += '&' + cookie;
    }
  }
  return src;
}

function _setSeenAd(adid) {
  var dateNow = new Date();
  dateNow.setTime(dateNow.getTime() + (2 * 24 * 60 * 60 * 1000));
  var expires = 'expires=' + dateNow.toUTCString();
  var valuecookie = 'seenad[' + adid + ']=' + (Date.now() / 1000 | 0) + ';';
  var domain, domainParts, host;
  host = location.host;
  if (host.split('.').length === 1) {
    document.cookie = valuecookie + expires + '; path=/';
  } else {
    domainParts = host.split('.');
    domainParts.shift();
    domain = '.' + domainParts.join('.');
    document.cookie = valuecookie + expires + '; path=/; domain=' + domain;
  }
}
registerBidder(spec);
