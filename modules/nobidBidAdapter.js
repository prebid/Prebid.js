import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const BIDDER_CODE = 'nobid';
window.nobidVersion = '1.2.4';
window.nobid = window.nobid || {};
window.nobid.bidResponses = window.nobid.bidResponses || {};
window.nobid.timeoutTotal = 0;
window.nobid.bidWonTotal = 0;
window.nobid.refreshCount = 0;
function log(msg, obj) {
  utils.logInfo('-NoBid- ' + msg, obj)
}
function nobidSetCookie(cname, cvalue, hours) {
  var d = new Date();
  d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
  var expires = 'expires=' + d.toUTCString();
  storage.setCookie(cname, cvalue, expires);
}
function nobidGetCookie(cname) {
  return storage.getCookie(cname);
}
function nobidBuildRequests(bids, bidderRequest) {
  var serializeState = function(divIds, siteId, adunits) {
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
    var uspConsent = function(bidderRequest) {
      var uspConsent = '';
      if (bidderRequest && bidderRequest.uspConsent) {
        uspConsent = bidderRequest.uspConsent;
      }
      return uspConsent;
    }
    var schain = function(bids) {
      if (bids && bids.length > 0) {
        return bids[0].schain
      }
      return null;
    }
    var coppa = function() {
      if (config.getConfig('coppa') === true) {
        return {'coppa': true};
      }
      if (bids && bids.length > 0) {
        return bids[0].coppa
      }
      return null;
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
    var timestamp = function() {
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
    var clientDim = function() {
      try {
        var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        return `${width}x${height}`;
      } catch (e) {
        utils.logWarn('Could not parse screen dimensions, error details:', e);
      }
    }
    var state = {};
    state['sid'] = siteId;
    state['l'] = topLocation(bidderRequest);
    state['tt'] = encodeURIComponent(document.title);
    state['tt'] = state['tt'].replace(/'|;|quot;|39;|&amp;|&|#|\r\n|\r|\n|\t|\f|\%0A|\"|\%22|\%5C|\%23|\%26|\%26|\%09/gm, '');
    state['a'] = filterAdUnitsByIds(divIds, adunits || []);
    state['t'] = timestamp();
    state['tz'] = Math.round(new Date().getTimezoneOffset());
    state['r'] = clientDim();
    state['lang'] = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;
    state['ref'] = document.referrer;
    state['gdpr'] = gdprConsent(bidderRequest);
    state['usp'] = uspConsent(bidderRequest);
    const sch = schain(bids);
    if (sch) state['schain'] = sch;
    const cop = coppa();
    if (cop) state['coppa'] = cop;
    return state;
  }
  function newAdunit(adunitObject, adunits) {
    var getAdUnit = function(divid, adunits) {
      for (var i = 0; i < adunits.length; i++) {
        if (adunits[i].d === divid) {
          return adunits[i];
        }
      }
      return false;
    }
    var removeByAttrValue = function(array, attribute, value) {
      for (var i = array.length - 1; i >= 0; i--) {
        var entry = array[i];
        if (entry[attribute] && entry[attribute] === value) {
          array.splice(i, 1);
        }
      }
    }
    var a = getAdUnit(adunitObject.div, adunits) || {};
    if (adunitObject.account) {
      a.s = adunitObject.account;
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
      removeByAttrValue(adunits, 'd', adunitObject.div);
    }
    if (adunitObject.sizeMapping) {
      a.sm = adunitObject.sizeMapping;
    }
    if (adunitObject.siteId) {
      a.sid = adunitObject.siteId;
    }
    if (adunitObject.placementId) {
      a.pid = adunitObject.placementId;
    }
    /* {"BIDDER_ID":{"WxH":"TAG_ID", "WxH":"TAG_ID"}} */
    if (adunitObject.rtb) {
      a.rtb = adunitObject.rtb;
    }
    adunits.push(a);
    return adunits;
  }
  if (typeof window.nobid.refreshLimit !== 'undefined') {
    if (window.nobid.refreshLimit < window.nobid.refreshCount) return false;
  }
  let ublock = nobidGetCookie('_ublock');
  if (ublock) {
    log('Request blocked for user. hours: ', ublock);
    return false;
  }
  /* DISCOVER SLOTS */
  var divids = [];
  var siteId = 0;
  var adunits = [];
  for (var i = 0; i < bids.length; i++) {
    var bid = bids[i];
    var divid = bid.adUnitCode;
    divids.push(divid);
    var sizes = bid.sizes;
    siteId = (typeof bid.params['siteId'] != 'undefined' && bid.params['siteId']) ? bid.params['siteId'] : siteId;
    var placementId = bid.params['placementId'];
    if (siteId && bid.params && bid.params.tags) {
      newAdunit({div: divid, sizes: sizes, rtb: bid.params.tags, siteId: siteId, placementId: placementId}, adunits);
    } else if (siteId) {
      newAdunit({div: divid, sizes: sizes, siteId: siteId, placementId: placementId}, adunits);
    }
  }
  if (siteId) {
    return serializeState(divids, siteId, adunits);
  } else {
    return false;
  }
}
function nobidInterpretResponse(response, bidRequest) {
  var findBid = function(divid, bids) {
    for (var i = 0; i < bids.length; i++) {
      if (bids[i].adUnitCode == divid) {
        return bids[i];
      }
    }
    return false;
  }
  var setRefreshLimit = function(response) {
    if (response && typeof response.rlimit !== 'undefined') window.nobid.refreshLimit = response.rlimit;
  }
  var setUserBlock = function(response) {
    if (response && typeof response.ublock !== 'undefined') {
      nobidSetCookie('_ublock', '1', response.ublock);
    }
  }
  setRefreshLimit(response);
  setUserBlock(response);
  var bidResponses = [];
  for (var i = 0; response.bids && i < response.bids.length; i++) {
    var bid = response.bids[i];
    if (bid.bdrid < 100 || !bidRequest || !bidRequest.bidderRequest || !bidRequest.bidderRequest.bids) continue;
    window.nobid.bidResponses['' + bid.id] = bid;
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
window.nobid.renderTag = function(doc, id, win) {
  log('nobid.renderTag()', id);
  var bid = window.nobid.bidResponses['' + id];
  if (bid && bid.adm2) {
    log('nobid.renderTag() found tag', id);
    var markup = bid.adm2;
    doc.write(markup);
    doc.close();
    return;
  }
  log('nobid.renderTag() tag NOT FOUND *ERROR*', id);
}
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
    log('isBidRequestValid', bid);
    return !!bid.params.siteId;
  },
  /**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequests[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */
  buildRequests: function(validBidRequests, bidderRequest) {
    function resolveEndpoint() {
      var ret = 'https://ads.servenobid.com/';
      var env = (typeof utils.getParameterByName === 'function') && (utils.getParameterByName('nobid-env'));
      if (!env) ret = 'https://ads.servenobid.com/';
      else if (env == 'beta') ret = 'https://beta.servenobid.com/';
      else if (env == 'dev') ret = '//localhost:8282/';
      else if (env == 'qa') ret = 'https://qa-ads.nobid.com/';
      return ret;
    }
    var buildEndpoint = function() {
      return resolveEndpoint() + 'adreq?cb=' + Math.floor(Math.random() * 11000);
    }
    log('validBidRequests', validBidRequests);
    if (!validBidRequests || validBidRequests.length <= 0) {
      log('Empty validBidRequests');
      return;
    }
    const payload = nobidBuildRequests(validBidRequests, bidderRequest);
    if (!payload) return;
    window.nobid.refreshCount++;
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
    log('interpretResponse -> serverResponse', serverResponse);
    log('interpretResponse -> bidRequest', bidRequest);
    return nobidInterpretResponse(serverResponse.body, bidRequest);
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, usPrivacy) {
    if (syncOptions.iframeEnabled) {
      let params = '';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (usPrivacy) {
        if (params.length > 0) params += '&';
        else params += '?';
        params += 'usp_consent=' + usPrivacy;
      }
      return [{
        type: 'iframe',
        url: 'https://public.servenobid.com/sync.html' + params
      }];
    } else if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      let syncs = [];
      if (serverResponses[0].body.syncs && serverResponses[0].body.syncs.length > 0) {
        serverResponses[0].body.syncs.forEach(element => {
          syncs.push({
            type: 'image',
            url: element
          });
        })
      }
      return syncs;
    } else {
      utils.logWarn('-NoBid- Please enable iframe based user sync.', syncOptions);
      return [];
    }
  },

  /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
  onTimeout: function(data) {
    window.nobid.timeoutTotal++;
    log('Timeout total: ' + window.nobid.timeoutTotal, data);
    return window.nobid.timeoutTotal;
  },
  onBidWon: function(data) {
    window.nobid.bidWonTotal++;
    log('BidWon total: ' + window.nobid.bidWonTotal, data);
    return window.nobid.bidWonTotal;
  }
}
registerBidder(spec);
