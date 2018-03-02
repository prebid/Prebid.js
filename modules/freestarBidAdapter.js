import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE, VIDEO} from "../src/mediaTypes";
const BIDDER_CODE = 'freestar';
// const ENDPOINT_URL = '//35.226.213.130:8080/open-ssp/BidRequestService?site='+location.hostname+'&';
const ENDPOINT_URL = '//testsite.com/openssp/response.json';
export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    console.log('freestar::', 'validBidRequests', validBidRequests);
    const bids = validBidRequests.map(formatBid);

    var cookie = window.document.cookie.split(';');
    var cookieObj = {};
    for (var i = 0; i < cookie.length; i++) {
      var tmp;
      // see if _fs* is within the string
      if (cookie[i].indexOf('_fs') != -1) {
        // if so, split it
        tmp = cookie[i].split('=');
        // check if _fsloc, whose values has = within it
        if(tmp[0].trim() == '_fsloc') {
          // and if so, manipulate differently
          tmp.shift();
          cookieObj['_fsloc'] = tmp.join('=');
        } else {
          // if not, add to obj
          cookieObj[tmp[0].trim()] = tmp[1].trim();
        }
      }
    }
    const payload = [];
    payload.push('site=' + encodeURIComponent(location.hostname));
    payload.push('page=' + encodeURIComponent(location.pathname));
    payload.push(bids);
    for (var key in cookieObj) {
      payload.push(key + '=' + encodeURIComponent(cookieObj[key]));
    }
    var payloadString = payload.join('&');
    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, {bidderRequest}) {
    console.log('freestar::', 'serverResponse', serverResponse, bidderRequest);
    serverResponse = serverResponse.body;
    const bids = [];
    // @TODO: add error handling
    if(typeof serverResponse.seatbid != 'undefined') {
      for(var i = 0; i < serverResponse.seatbid.length; i++) {
        var seatBid = serverResponse.seatbid[i].bid;
        if(seatBid.length != 0) {
          for(var j = 0; j < seatBid.length; j++) {
            bids.push(parseBid(seatBid[j]));
          }
        }
      }
    }
    return bids;
  },
  // @TODO: How are we doing user sync?
  getUserSyncs: function(syncOptions) {
    // if (syncOptions.iframeEnabled) {
    //   return [{
    //     type: 'iframe',
    //     url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
    //   }];
    // }
  }
}

function parseBid(bid) {
  console.log('freestar::', 'parseBid', 'bid', bid);
  const bidResponse = {
    requestId: bid.id,
    cpm: bid.price,
    width: 300,
    height: 250,
    creativeId: bid.cid, //@TODO: verify
    // dealId: DEAL_ID,
    currency: 'US',
    netRevenue: true,
    ttl: 60,
    ad: bid.adm
  };
  return bidResponse;
}

function formatBid(bid) {
  var str = {}, res = [];
  str.id = bid.bidId; //@TODO: This id needs to be reflected in the response
  str.adUnitCode = bid.adUnitCode;
  str.size = bid.size[0].join('x');
  str.promo_sizes = bid.size.slice(1).map(function(size) {
    return size.join('x');
  });
  str.promo_sizes = str.promo_sizes.join(',');
  for(var key in str) {
    res.push(key + '=' + encodeURIComponent(str[key]));
  }
  if(typeof bid.params != 'undefined') {
    for(var key in bid.params) {
      res.push(key + '=' + encodeURIComponent(bid.params[key]));
    }
  }
  str = res.join('&');
  return str;
}

registerBidder(spec);
