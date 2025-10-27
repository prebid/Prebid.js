import { logInfo, deepAccess, logWarn, isArray, getParameterByName, getWinDimensions } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const GVLID = 816;
const BIDDER_CODE = 'nobid';
const storage = getStorageManager({bidderCode: BIDDER_CODE});
window.nobidVersion = '1.3.4';
window.nobid = window.nobid || {};
window.nobid.bidResponses = window.nobid.bidResponses || {};
window.nobid.timeoutTotal = 0;
window.nobid.bidWonTotal = 0;
window.nobid.refreshCount = 0;
function log(msg, obj) {
  logInfo('-NoBid- ' + msg, obj)
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
      if (!divIds.length) {
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
    var gppConsent = function(bidderRequest) {
      let gppConsent = null;
      if (bidderRequest?.gppConsent?.gppString && bidderRequest?.gppConsent?.applicableSections) {
        gppConsent = {};
        gppConsent.gpp = bidderRequest.gppConsent.gppString;
        gppConsent.gpp_sid = Array.isArray(bidderRequest.gppConsent.applicableSections) ? bidderRequest.gppConsent.applicableSections : [];
      } else if (bidderRequest?.ortb2?.regs?.gpp && bidderRequest?.ortb2.regs?.gpp_sid) {
        gppConsent = {};
        gppConsent.gpp = bidderRequest.ortb2.regs.gpp;
        gppConsent.gpp_sid = Array.isArray(bidderRequest.ortb2.regs.gpp_sid) ? bidderRequest.ortb2.regs.gpp_sid : [];
      }
      return gppConsent;
    }
    var schain = function(bids) {
      try {
        return bids[0]?.ortb2?.source?.ext?.schain;
      } catch (e) {
        return null;
      }
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
      if (bidderRequest?.refererInfo?.page) {
        ret = bidderRequest.refererInfo.page;
      } else {
        // TODO: does this fallback make sense here?
        ret = (window.context && window.context.location && window.context.location.href) ? window.context.location.href : document.location.href;
      }
      return encodeURIComponent(ret.replace(/%/g, ''));
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
        const winDimensions = getWinDimensions();
        var width = Math.max(winDimensions.document.documentElement.clientWidth, winDimensions.innerWidth || 0);
        var height = Math.max(winDimensions.document.documentElement.clientHeight, winDimensions.innerHeight || 0);
        return `${width}x${height}`;
      } catch (e) {
        logWarn('Could not parse screen dimensions, error details:', e);
      }
    }
    var getEIDs = function(eids) {
      if (isArray(eids) && eids.length > 0) {
        const src = [];
        eids.forEach((eid) => {
          const ids = [];
          if (eid.uids) {
            eid.uids.forEach(value => {
              ids.push({'id': value.id + ''});
            });
          }
          if (eid.source && ids.length > 0) {
            src.push({source: eid.source, uids: ids});
          }
        });
        return src;
      }
    }
    var state = {};
    state['sid'] = siteId;
    state['l'] = topLocation(bidderRequest);
    state['tt'] = encodeURIComponent(document.title);
    state['tt'] = state['tt'].replace(/'|;|quot;|39;|&amp;|&|#|\r\n|\r|\n|\t|\f|%0A|"|%22|%5C|%23|%26|%26|%09/gm, '');
    state['a'] = filterAdUnitsByIds(divIds, adunits || []);
    state['t'] = timestamp();
    state['tz'] = Math.round(new Date().getTimezoneOffset());
    state['r'] = clientDim();
    state['lang'] = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;
    state['ref'] = document.referrer;
    state['gdpr'] = gdprConsent(bidderRequest);
    state['usp'] = uspConsent(bidderRequest);
    state['pjbdr'] = (bidderRequest && bidderRequest.bidderCode) ? bidderRequest.bidderCode : 'nobid';
    state['pbver'] = '$prebid.version$';
    const sch = schain(bids);
    if (sch) state['schain'] = sch;
    const cop = coppa();
    if (cop) state['coppa'] = cop;
    const eids = getEIDs(deepAccess(bids, '0.userIdAsEids'));
    if (eids && eids.length > 0) state['eids'] = eids;
    const gpp = gppConsent(bidderRequest);
    if (gpp?.gpp) state['gpp'] = gpp.gpp;
    if (gpp?.gpp_sid) state['gpp_sid'] = gpp.gpp_sid;
    if (bidderRequest && bidderRequest.ortb2) state['ortb2'] = bidderRequest.ortb2;
    return state;
  };
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
    if (adunitObject.floor) {
      a.floor = adunitObject.floor;
    }
    if (adunitObject.targeting) {
      a.g = adunitObject.targeting;
    } else {
      a.g = {};
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
    if (adunitObject.ad_type) {
      a.at = adunitObject.ad_type;
    }
    if (adunitObject.params) {
      a.params = adunitObject.params;
    }
    adunits.push(a);
    return adunits;
  }
  function getFloor (bid) {
    if (bid && typeof bid.getFloor === 'function' && bid.getFloor()?.floor) {
      return bid.getFloor().floor;
    }
    return null;
  }
  if (typeof window.nobid.refreshLimit !== 'undefined') {
    if (window.nobid.refreshLimit < window.nobid.refreshCount) return false;
  }
  const ublock = nobidGetCookie('_ublock');
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
    siteId = (typeof bid.params['siteId'] !== 'undefined' && bid.params['siteId']) ? bid.params['siteId'] : siteId;
    var placementId = bid.params['placementId'];

    let adType = 'banner';
    const videoMediaType = deepAccess(bid, 'mediaTypes.video');
    const context = deepAccess(bid, 'mediaTypes.video.context') || '';
    if (bid.mediaType === VIDEO || (videoMediaType && (context === 'instream' || context === 'outstream'))) {
      adType = 'video';
    }
    const floor = getFloor(bid);

    if (siteId) {
      newAdunit({
        div: divid,
        sizes: sizes,
        siteId: siteId,
        placementId: placementId,
        ad_type: adType,
        params: bid.params,
        floor: floor,
        ctx: context
      },
      adunits);
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
      if (bids[i].adUnitCode === divid) {
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
      mediaType: bid.atype || BANNER,
    };
    if (bid.vastUrl) {
      bidResponse.vastUrl = bid.vastUrl;
    }
    if (bid.vastXml) {
      bidResponse.vastXml = bid.vastXml;
    }
    if (bid.videoCacheKey) {
      bidResponse.videoCacheKey = bid.videoCacheKey;
    }
    if (bid.meta) {
      bidResponse.meta = bid.meta;
    }

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
window.addEventListener('message', function (event) {
  const key = event.message ? 'message' : 'data';
  var msg = '' + event[key];
  if (msg.substring(0, 'nbTagRenderer.requestAdMarkup|'.length) === 'nbTagRenderer.requestAdMarkup|') {
    log('Prebid received nbTagRenderer.requestAdMarkup event');
    var adId = msg.substring(msg.indexOf('|') + 1);
    if (window.nobid && window.nobid.bidResponses) {
      var bid = window.nobid.bidResponses['' + adId];
      if (bid && bid.adm2) {
        var markup = bid.adm2;
        if (markup) {
          event.source.postMessage('nbTagRenderer.renderAdInSafeFrame|' + markup, '*');
        }
      }
    }
  }
}, false);
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [
    { code: 'duration'}
  ],
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    log('isBidRequestValid', bid);
    if (bid?.params?.siteId) return true;
    return false;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array} validBidRequests - an array of bids
   * @param {Object} bidderRequest
   * @return {Object} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    function resolveEndpoint() {
      var ret = 'https://ads.servenobid.com/';
      var env = (typeof getParameterByName === 'function') && (getParameterByName('nobid-env'));
      env = window.location.href.indexOf('nobid-env=dev') > 0 ? 'dev' : env;
      if (!env) ret = 'https://ads.servenobid.com/';
      else if (env === 'beta') ret = 'https://beta.servenobid.com/';
      else if (env === 'dev') ret = '//localhost:8282/';
      else if (env === 'qa') ret = 'https://qa-ads.nobid.com/';
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

    let options = {};
    if (!hasPurpose1Consent(bidderRequest?.gdprConsent)) {
      options = { withCredentials: false };
    }

    return {
      method: 'POST',
      url: endpoint,
      data: payloadString,
      bidderRequest,
      options
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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, usPrivacy, gppConsent) {
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
      if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
        if (params.length > 0) params += '&';
        else params += '?';
        params += 'gpp=' + encodeURIComponent(gppConsent.gppString);
        params += 'gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(','));
      }
      return [{
        type: 'iframe',
        url: 'https://public.servenobid.com/sync.html' + params
      }];
    } else if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      const syncs = [];
      if (serverResponses[0].body.syncs && serverResponses[0].body.syncs.length > 0) {
        serverResponses[0].body.syncs.forEach(element => {
          syncs.push({
            type: 'image',
            url: element
          });
        });
      }
      return syncs;
    } else {
      logWarn('-NoBid- Please enable iframe based user sync.', syncOptions);
      return [];
    }
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {Object} data Containing timeout specific data
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
