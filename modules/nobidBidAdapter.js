import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
const BIDDER_CODE = 'nobid';
window.nobid = window.nobid || {};
nobid.version = '1.1.0';
nobid.status = {};
nobid.status.bidResponseProcessed = false;
nobid.status.bidResponseTimeout = false;
nobid.timestamp = function() {
  var date = new Date();
  var zp = function (val) { return (val <= 9 ? '0' + val : '' + val); }
  var d = date.getDate();
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var h = date.getHours();
  var min = date.getMinutes();
  var s = date.getSeconds();
  return '' + y + '-' + zp(m) + '-' + zp(d) + ' ' + zp(h) + ':' + zp(min) + ':' + zp(s);
};
nobid.clientDim = function() {
  try {
    return `${screen.width}x${screen.height}`;
  } catch (e) {
    console.error(e);
  }
};
nobid.a = [];
nobid.tt = encodeURIComponent(document.title);
nobid.t = nobid.timestamp();
nobid.tz = Math.round(new Date().getTimezoneOffset());
nobid.r = nobid.clientDim();
nobid.log = function(msg, obj) {
  var debug = (typeof utils.getParameterByName === 'function') && (utils.getParameterByName('nobid-debug'));
  if (!debug) return;
  if (typeof obj != 'undefined') console.log('NoBid Prebid Adapter: ' + msg, obj);
  else console.log('NoBid Prebid Adapter: ' + msg);
}
nobid.getAdUnit = function(divid) {
  for (var i = 0; i < nobid.a.length; i++) {
    if (nobid.a[i].d === divid) {
      return nobid.a[i];
    }
  }
  return false;
};
nobid.resolveEndpoint = function() {
  var ret = 'https://ads.servenobid.com/';
  var env = (typeof utils.getParameterByName === 'function') && (utils.getParameterByName('nobid-env'));
  if (!env) ret = 'https://ads.servenobid.com/';
  else if (env == 'beta') ret = 'https://beta.servenobid.com/';
  else if (env == 'dev') ret = '//localhost:8282/';
  else if (env == 'qa') ret = 'https://qa-ads.nobid.com/';
  return ret;
}
nobid.triggerEvent = function(params, doc) {
  var r = Math.floor(Math.random() * 11000);
  var path = nobid.resolveEndpoint() + 'event.js?cb=' + r;
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.open('POST', path, true);
  if (!params['l']) params['l'] = doc.location.href;
  xhr.send(JSON.stringify(params));
}
nobid.adunit = function (adunitObject) {
  var removeByAttrValue = function(array, attribute, value) {
    for (var i = array.length - 1; i >= 0; i--) {
      var entry = array[i];
      if (entry[attribute] && entry[attribute] === value) {
        array.splice(i, 1);
      }
    }
  }
  var a = nobid.getAdUnit(adunitObject.div) || {};
  if (adunitObject.account) {
    a.s = adunitObject.account;
  } else if (nobid.s) {
    a.s = nobid.s;
  }
  if (adunitObject.sizes) {
    a.z = adunitObject.sizes;
  }
  if (adunitObject.div) {
    a.d = adunitObject.div;
  }
  if (adunitObject.targeting) {
    a.g = adunitObject.targeting;
  } else {
    a.g = {};
  }
  if (adunitObject.companion) {
    a.c = adunitObject.companion;
  }
  if (adunitObject.div) {
    removeByAttrValue(nobid.a, 'd', adunitObject.div);
  }
  if (adunitObject.sizeMapping) {
    a.sm = adunitObject.sizeMapping;
  }
  if (adunitObject.siteId) {
    a.sid = adunitObject.siteId;
  }
  /* {"BIDDER_ID":{"WxH":"TAG_ID", "WxH":"TAG_ID"}} */
  if (adunitObject.rtb) {
    a.rtb = adunitObject.rtb;
  }
  nobid.a.push(a);
  return a;
};
nobid.setup = function(bids, bidderRequest) {
  var serializeState = function(divIds, siteId) {
    var filterAdUnitsByIds = function(divIds, adUnits) {
      var filtered = [];
      if (!divIds || !divIds.length) {
        filtered = adUnits;
      } else if (adUnits) {
        var a = [];
        if (!(divIds instanceof Array)) a.push(divIds);
        else a = divIds;
        for (var i = 0, l = adUnits.length; i < l; i++) {
          var adUnit = adUnits[i];
          if (adUnit && adUnit.d && (a.indexOf(adUnit.d) > -1)) {
            filtered.push(adUnit);
          }
        }
      }
      return filtered;
    }
    var gdprConsent = function(bidderRequest) {
      var gdprConsent = {};
      if (bidderRequest && bidderRequest.gdprConsent) {
        gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          // will check if the gdprApplies field was populated with a boolean value (ie from page config).  If it's undefined, then default to true
          consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : false
        }
      }
      return gdprConsent;
    }
    var topLocation = function(bidderRequest) {
      var ret = '';
      if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        ret = bidderRequest.refererInfo.referer;
      } else {
        ret = (window.context && window.context.location && window.context.location.href) ? window.context.location.href : document.location.href;
      }
      return encodeURIComponent(ret.replace(/\%/g, ''));
    }
    var state = {};
    state['sid'] = siteId;
    state['l'] = topLocation(bidderRequest);
    state['tt'] = nobid['tt'];
    state['tt'] = state['tt'].replace(/'|;|quot;|39;|&amp;|&|#|\r\n|\r|\n|\t|\f|\%0A|\"|\%22|\%5C|\%23|\%26|\%26|\%09/gm, '');
    state['a'] = filterAdUnitsByIds(divIds, nobid.a || []);
    state['t'] = nobid.timestamp();
    state['tz'] = Math.round(new Date().getTimezoneOffset());
    state['r'] = nobid.clientDim();
    state['lang'] = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;
    state['ref'] = document.referrer;
    state['gdpr'] = gdprConsent(bidderRequest);
    return state;
  };
  /* DISCOVER SLOTS */
  var divids = [];
  var siteId = 0;
  for (var i = 0; i < bids.length; i++) {
    var bid = bids[i];
    var divid = bid.adUnitCode;
    divids.push(divid);
    var sizes = bid.sizes;
    siteId = (typeof bid.params['siteId'] != 'undefined' && bid.params['siteId']) ? bid.params['siteId'] : siteId;
    if (siteId && bid.params && bid.params.tags) {
      nobid.adunit({div: divid, sizes: sizes, rtb: bid.params.tags, siteId: siteId});
    } else if (siteId) {
      nobid.adunit({div: divid, sizes: sizes, siteId: siteId});
    }
  }
  if (siteId) {
    return serializeState(divids, siteId);
  } else {
    return false;
  }
}
nobid.ProcessBidResponse = function (response, bidRequest) {
  var findBid = function(divid, bids) {
    for (var i = 0; i < bids.length; i++) {
      if (bids[i].adUnitCode === divid) {
        return bids[i];
      }
    }
    return false;
  }
  var bidResponses = [];
  nobid.status.bidResponseProcessed = true;
  nobid.status.bidResponseTimeout = false;
  nobid.status.bidResponse = response;
  for (var i = 0; response.bids && i < response.bids.length; i++) {
    var bid = response.bids[i];
    if (bid.bdrid < 100 || !bidRequest || !bidRequest.bidderRequest || !bidRequest.bidderRequest.bids) continue;
    var reqBid = findBid(bid.divid, bidRequest.bidderRequest.bids);
    if (!reqBid) continue;
    const bidResponse = {
      requestId: reqBid.bidId,
      cpm: 1 * ((bid.price) ? bid.price : (bid.bucket) ? bid.bucket : 0),
      width: bid.size.w,
      height: bid.size.h,
      creativeId: (bid.creativeid) || '',
      dealId: (bid.dealid) || '',
      currency: 'USD',
      netRevenue: true,
      ttl: 300,
      ad: bid.adm,
      mediaType: BANNER
    };
    bidResponses.push(bidResponse);
  }
  return bidResponses;
};
nobid.renderTag = function(doc, id, win) {
  nobid.log('-NoBid Prebid Adapter- nobid.renderTag()', id);
  if (nobid.bidResponse && nobid.bidResponse.bids) {
    for (var i in nobid.bidResponse.bids) {
      const bid = nobid.bidResponse.bids[i];
      if (id == bid.id && bid.adm2) {
        nobid.log('-NoBid Prebid Adapter- nobid.renderTag() found tag', id);
        var markup = bid.adm2;
        doc.write(markup);
        doc.close();
        break;
      }
    }
  }
}
nobid.cookies = {};
nobid.cookies.get = function(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
};
nobid.cookies.getAll = function() {
  return document.cookie.split('; ').reduce(function(map, keyValue) {
    var equalPos = keyValue.indexOf('=');
    map[keyValue.substr(0, equalPos)] = keyValue.substr(equalPos + 1);
    return map;
  }, {});
};
nobid.cookies.set = function(name, value, lifespanInSec) {
  var d = new Date();
  d.setTime(d.getTime() + (lifespanInSec * 1000));
  var expires = 'expires=' + d.toUTCString();
  document.cookie = name + '=' + value + ';' + expires + ';path=/';
};
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
    nobid.log('-NoBid Prebid Adapter- isBidRequestValid', bid);
    return !!bid.params.siteId;
  },
  /**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequests[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */
  buildRequests: function(validBidRequests, bidderRequest) {
    var buildEndpoint = function() {
      return nobid.resolveEndpoint() + 'adreq?cb=' + Math.floor(Math.random() * 11000);
    }
    nobid.log('-NoBid Prebid Adapter- buildRequests', validBidRequests);
    if (!validBidRequests || validBidRequests.length <= 0) {
      nobid.log('-NoBid Prebid Adapter- Empty validBidRequests');
      return;
    }
    const payload = nobid.setup(validBidRequests, bidderRequest);
    if (!payload) return;
    const payloadString = JSON.stringify(payload).replace(/'|&|#/g, '')
    const endpoint = buildEndpoint();
    return {
      method: 'POST',
      url: endpoint,
      data: payloadString,
      bidderRequest
    };
  },
  /**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
  interpretResponse: function(serverResponse, bidRequest) {
    nobid.log('-NoBid Prebid Adapter- interpretResponse', serverResponse);
    nobid.log('-NoBid Prebid Adapter- interpretResponse', bidRequest);
    nobid.bidResponse = serverResponse.body;
    return nobid.ProcessBidResponse(serverResponse.body, bidRequest);
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://s3.amazonaws.com/nobid-public/sync.html'
      }];
    } else {
      utils.logWarn('-NoBid Prebid Adapter- Please enable iframe based user sync.');
      console.log('-NoBid Prebid Adapter- Please enable iframe based user sync.', syncOptions);
      return [];
    }
  },

  /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
  onTimeout: function(data) {
    nobid.log('-NoBid Prebid Adapter- onTimeout', data);
    nobid.status.bidResponseTimeout = true;
  },
  onBidWon: function(data) {
    nobid.log('-NoBid Prebid Adapter- onBidWon', data);
  }
}
registerBidder(spec);
