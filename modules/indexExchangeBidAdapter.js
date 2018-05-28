// Factory for creating the bidderAdaptor
// jshint ignore:start
import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import * as url from 'src/url';
import adloader from 'src/adloader';
import adaptermanager from 'src/adaptermanager';

var ADAPTER_NAME = 'INDEXEXCHANGE';
var ADAPTER_CODE = 'indexExchange';

var CONSTANTS = {
  'INDEX_DEBUG_MODE': {
    'queryParam': 'pbjs_ix_debug',
    'mode': {
      'sandbox': {
        'topFrameLimit': 10,
        'queryValue': 'sandbox',
        'siteID': '999990'
      }
    }
  }
};

var OPEN_MARKET = 'IOM';
var PRIVATE_MARKET = 'IPM';

const VIDEO_REQUIRED_PARAMS_MAP = {
  siteID: true,
  playerType: true,
  protocols: true,
  maxduration: true
};
const VIDEO_OPTIONAL_PARAMS_MAP = {
  minduration: 0,
  startdelay: 'preroll',
  linearity: 'linear',
  mimes: [],
  allowVPAID: true,
  apiList: []
};
const SUPPORTED_PLAYER_TYPES_MAP = {
  HTML5: true,
  FLASH: true
};
const SUPPORTED_PROTOCOLS_MAP = {
  'VAST2': [2, 5],
  'VAST3': [3, 6]
};
const SUPPORTED_API_MAP = {
  FLASH: [1, 2],
  HTML5: [2]
};
const LINEARITY_MAP = {
  linear: 1,
  nonlinear: 2
};
const START_DELAY_MAP = {
  preroll: 0,
  midroll: -1,
  postroll: -2
};
const SLOT_ID_PREFIX_MAP = {
  preroll: 'pr',
  midroll: 'm',
  postroll: 'po'
};
const DEFAULT_MIMES_MAP = {
  FLASH: ['video/mp4', 'video/x-flv'],
  HTML5: ['video/mp4', 'video/webm']
};
const DEFAULT_VPAID_MIMES_MAP = {
  FLASH: ['application/x-shockwave-flash'],
  HTML5: ['application/javascript']
};

const BASE_CYGNUS_VIDEO_URL_INSECURE = `http://as.casalemedia.com/cygnus?v=8&fn=$$PREBID_GLOBAL$$.handleCygnusResponse`;
const BASE_CYGNUS_VIDEO_URL_SECURE = `https://as-sec.casalemedia.com/cygnus?v=8&fn=$$PREBID_GLOBAL$$.handleCygnusResponse`;

window.cygnus_index_parse_res = function(response) {
  try {
    if (response) {
      if (typeof _IndexRequestData !== 'object' || typeof _IndexRequestData.impIDToSlotID !== 'object' || typeof _IndexRequestData.impIDToSlotID[response.id] === 'undefined') {
        return;
      }
      var targetMode = 1;
      var callbackFn;
      if (typeof _IndexRequestData.reqOptions === 'object' && typeof _IndexRequestData.reqOptions[response.id] === 'object') {
        if (typeof _IndexRequestData.reqOptions[response.id].callback === 'function') {
          callbackFn = _IndexRequestData.reqOptions[response.id].callback;
        }
        if (typeof _IndexRequestData.reqOptions[response.id].targetMode === 'number') {
          targetMode = _IndexRequestData.reqOptions[response.id].targetMode;
        }
      }

      _IndexRequestData.lastRequestID = response.id;
      _IndexRequestData.targetIDToBid = {};
      _IndexRequestData.targetIDToResp = {};
      _IndexRequestData.targetIDToCreative = {};

      var allBids = [];
      var seatbidLength = typeof response.seatbid === 'undefined' ? 0 : response.seatbid.length;
      for (var i = 0; i < seatbidLength; i++) {
        for (var j = 0; j < response.seatbid[i].bid.length; j++) {
          var bid = response.seatbid[i].bid[j];
          if (typeof bid.ext !== 'object' || typeof bid.ext.pricelevel !== 'string') {
            continue;
          }
          if (typeof _IndexRequestData.impIDToSlotID[response.id][bid.impid] === 'undefined') {
            continue;
          }
          var slotID = _IndexRequestData.impIDToSlotID[response.id][bid.impid];
          var targetID;
          var noTargetModeTargetID;
          var targetPrefix;
          if (typeof bid.ext.dealid === 'string') {
            if (targetMode === 1) {
              targetID = slotID + bid.ext.pricelevel;
            } else {
              targetID = slotID + '_' + bid.ext.dealid;
            }
            noTargetModeTargetID = slotID + '_' + bid.ext.dealid;
            targetPrefix = PRIVATE_MARKET + '_';
          } else {
            targetID = slotID + bid.ext.pricelevel;
            noTargetModeTargetID = slotID + bid.ext.pricelevel;
            targetPrefix = OPEN_MARKET + '_';
          }
          if (_IndexRequestData.targetIDToBid[targetID] === undefined) {
            _IndexRequestData.targetIDToBid[targetID] = [bid.adm];
          } else {
            _IndexRequestData.targetIDToBid[targetID].push(bid.adm);
          }
          if (_IndexRequestData.targetIDToCreative[noTargetModeTargetID] === undefined) {
            _IndexRequestData.targetIDToCreative[noTargetModeTargetID] = [bid.adm];
          } else {
            _IndexRequestData.targetIDToCreative[noTargetModeTargetID].push(bid.adm);
          }
          var impBid = {};
          impBid.impressionID = bid.impid;
          if (typeof bid.ext.dealid !== 'undefined') {
            impBid.dealID = bid.ext.dealid;
          }
          impBid.bid = bid.price;
          impBid.slotID = slotID;
          impBid.priceLevel = bid.ext.pricelevel;
          impBid.target = targetPrefix + targetID;
          _IndexRequestData.targetIDToResp[targetID] = impBid;
          allBids.push(impBid);
        }
      }
      if (typeof callbackFn === 'function') {
        if (allBids.length === 0) {
          callbackFn(response.id);
        } else {
          callbackFn(response.id, allBids);
        }
      }
    }
  } catch (e) {}

  if (typeof window.cygnus_index_ready_state === 'function') {
    window.cygnus_index_ready_state();
  }
}

window.index_render = function(doc, targetID) {
  try {
    var ad = _IndexRequestData.targetIDToCreative[targetID].pop();
    if (ad != null) {
      doc.write(ad);
    } else {
      var url = utils.getTopWindowLocation().protocol === 'http:' ? 'http://as.casalemedia.com' : 'https://as-sec.casalemedia.com';
      url += '/headerstats?type=RT&s=' + cygnus_index_args.siteID + '&u=' + encodeURIComponent(location.href) + '&r=' + _IndexRequestData.lastRequestID;
      var px_call = new Image();
      px_call.src = url + '&blank=' + targetID;
    }
  } catch (e) {}
}

window.headertag_render = function(doc, targetID, slotID) {
  var index_slot = slotID;
  var index_ary = targetID.split(',');
  for (var i = 0; i < index_ary.length; i++) {
    var unpack = index_ary[i].split('_');
    if (unpack[0] == index_slot) {
      index_render(doc, index_ary[i]);
      return;
    }
  }
}

window.cygnus_index_args = {};

var cygnus_index_adunits = [[728, 90], [120, 600], [300, 250], [160, 600], [336, 280], [234, 60], [300, 600], [300, 50], [320, 50], [970, 250], [300, 1050], [970, 90], [180, 150]];

var getIndexDebugMode = function() {
  return getParameterByName(CONSTANTS.INDEX_DEBUG_MODE.queryParam).toUpperCase();
}

var getParameterByName = function (name) {
  var wdw = window;
  var childsReferrer = '';
  for (var x = 0; x < CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.topFrameLimit; x++) {
    if (wdw.parent == wdw) {
      break;
    }
    try {
      childsReferrer = wdw.document.referrer;
    } catch (err) {}
    wdw = wdw.parent;
  }
  var topURL = top === self ? location.href : childsReferrer;
  var regexS = '[\\?&]' + name + '=([^&#]*)';
  var regex = new RegExp(regexS);
  var results = regex.exec(topURL);
  if (results === null) {
    return '';
  }
  return decodeURIComponent(results[1].replace(/\+/g, ' '));
};

var cygnus_index_start = function () {
  window.cygnus_index_args.parseFn = cygnus_index_parse_res;
  var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
  var meta = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\'
  };

  function escapeCharacter(character) {
    var escaped = meta[character];
    if (typeof escaped === 'string') {
      return escaped;
    } else {
      return '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4);
    }
  }

  function quote(string) {
    escapable.lastIndex = 0;
    if (escapable.test(string)) {
      return string.replace(escapable, escapeCharacter);
    } else {
      return string;
    }
  }

  function OpenRTBRequest(siteID, parseFn, timeoutDelay) {
    this.initialized = false;
    if (typeof siteID !== 'number' || siteID % 1 !== 0 || siteID < 0) {
      throw 'Invalid Site ID';
    }

    timeoutDelay = Number(timeoutDelay);
    if (typeof timeoutDelay === 'number' && timeoutDelay % 1 === 0 && timeoutDelay >= 0) {
      this.timeoutDelay = timeoutDelay;
    }

    this.siteID = siteID;
    this.impressions = [];
    this._parseFnName = undefined;

    // Get page URL
    this.sitePage = undefined;
    try {
      this.sitePage = utils.getTopWindowUrl();
    } catch (e) {}
    // Fallback to old logic if utils.getTopWindowUrl() fails to return site.page
    if (typeof this.sitePage === 'undefined' || this.sitePage === '') {
      if (top === self) {
        this.sitePage = location.href;
      } else {
        this.sitePage = document.referrer;
      }
    }

    if (top === self) {
      this.topframe = 1;
    } else {
      this.topframe = 0;
    }

    if (typeof parseFn !== 'undefined') {
      if (typeof parseFn === 'function') {
        this._parseFnName = 'cygnus_index_args.parseFn';
      } else {
        throw 'Invalid jsonp target function';
      }
    }

    if (typeof _IndexRequestData.requestCounter === 'undefined') {
      _IndexRequestData.requestCounter = Math.floor(Math.random() * 256);
    } else {
      _IndexRequestData.requestCounter = (_IndexRequestData.requestCounter + 1) % 256;
    }

    this.requestID = String((new Date().getTime() % 2592000) * 256 + _IndexRequestData.requestCounter + 256);
    this.initialized = true;
  }

  OpenRTBRequest.prototype.serialize = function () {
    var json = '{"id":"' + this.requestID + '","site":{"page":"' + quote(this.sitePage) + '"';
    if (typeof document.referrer === 'string' && document.referrer !== '') {
      json += ',"ref":"' + quote(document.referrer) + '"';
    }

    json += '},"imp":[';
    for (var i = 0; i < this.impressions.length; i++) {
      var impObj = this.impressions[i];
      var ext = [];
      json += '{"id":"' + impObj.id + '", "banner":{"w":' + impObj.w + ',"h":' + impObj.h + ',"topframe":' + String(this.topframe) + '}';
      if (typeof impObj.bidfloor === 'number') {
        json += ',"bidfloor":' + impObj.bidfloor;
        if (typeof impObj.bidfloorcur === 'string') {
          json += ',"bidfloorcur":"' + quote(impObj.bidfloorcur) + '"';
        }
      }

      if (typeof impObj.slotID === 'string' && (!impObj.slotID.match(/^\s*$/))) {
        ext.push('"sid":"' + quote(impObj.slotID) + '"');
      }

      if (typeof impObj.siteID === 'number') {
        ext.push('"siteID":' + impObj.siteID);
      }

      if (ext.length > 0) {
        json += ',"ext": {' + ext.join() + '}';
      }

      if (i + 1 === this.impressions.length) {
        json += '}';
      } else {
        json += '},';
      }
    }

    json += ']}';
    return json;
  };

  OpenRTBRequest.prototype.setPageOverride = function (sitePageOverride) {
    if (typeof sitePageOverride === 'string' && (!sitePageOverride.match(/^\s*$/))) {
      this.sitePage = sitePageOverride;
      return true;
    } else {
      return false;
    }
  };

  OpenRTBRequest.prototype.addImpression = function (width, height, bidFloor, bidFloorCurrency, slotID, siteID) {
    var impObj = {
      id: String(this.impressions.length + 1)
    };
    if (typeof width !== 'number' || width <= 1) {
      return null;
    }

    if (typeof height !== 'number' || height <= 1) {
      return null;
    }

    if ((typeof slotID === 'string' || typeof slotID === 'number') && String(slotID).length <= 50) {
      impObj.slotID = String(slotID);
    }

    impObj.w = width;
    impObj.h = height;
    if (bidFloor !== undefined && typeof bidFloor !== 'number') {
      return null;
    }

    if (typeof bidFloor === 'number') {
      if (bidFloor < 0) {
        return null;
      }

      impObj.bidfloor = bidFloor;
      if (bidFloorCurrency !== undefined && typeof bidFloorCurrency !== 'string') {
        return null;
      }

      impObj.bidfloorcur = bidFloorCurrency;
    }

    if (typeof siteID !== 'undefined') {
      if (typeof siteID === 'number' && siteID % 1 === 0 && siteID >= 0) {
        impObj.siteID = siteID;
      } else {
        return null;
      }
    }

    this.impressions.push(impObj);
    return impObj.id;
  };

  OpenRTBRequest.prototype.buildRequest = function () {
    if (this.impressions.length === 0 || this.initialized !== true) {
      return;
    }

    var jsonURI = encodeURIComponent(this.serialize());

    var scriptSrc;
    if (getIndexDebugMode() == CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.queryValue.toUpperCase()) {
      this.siteID = CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.siteID;
      scriptSrc = utils.getTopWindowLocation().protocol === 'http:' ? 'http://sandbox.ht.indexexchange.com' : 'https://sandbox.ht.indexexchange.com';
      utils.logMessage('IX DEBUG: Sandbox mode activated');
    } else {
      scriptSrc = utils.getTopWindowLocation().protocol === 'http:' ? 'http://as.casalemedia.com' : 'https://as-sec.casalemedia.com';
    }
    var prebidVersion = encodeURIComponent('$prebid.version$');
    scriptSrc += '/cygnus?v=7&fn=cygnus_index_parse_res&s=' + this.siteID + '&r=' + jsonURI + '&pid=pb' + prebidVersion;
    if (typeof this.timeoutDelay === 'number' && this.timeoutDelay % 1 === 0 && this.timeoutDelay >= 0) {
      scriptSrc += '&t=' + this.timeoutDelay;
    }

    return scriptSrc;
  };

  try {
    if (typeof cygnus_index_args === 'undefined' || typeof cygnus_index_args.siteID === 'undefined' || typeof cygnus_index_args.slots === 'undefined') {
      return;
    }

    var req = new OpenRTBRequest(cygnus_index_args.siteID, cygnus_index_args.parseFn, cygnus_index_args.timeout);
    if (cygnus_index_args.url && typeof cygnus_index_args.url === 'string') {
      req.setPageOverride(cygnus_index_args.url);
    }

    _IndexRequestData.impIDToSlotID[req.requestID] = {};
    _IndexRequestData.reqOptions[req.requestID] = {};
    var slotDef, impID;

    for (var i = 0; i < cygnus_index_args.slots.length; i++) {
      slotDef = cygnus_index_args.slots[i];

      impID = req.addImpression(slotDef.width, slotDef.height, slotDef.bidfloor, slotDef.bidfloorcur, slotDef.id, slotDef.siteID);
      if (impID) {
        _IndexRequestData.impIDToSlotID[req.requestID][impID] = String(slotDef.id);
      }
    }

    if (typeof cygnus_index_args.targetMode === 'number') {
      _IndexRequestData.reqOptions[req.requestID].targetMode = cygnus_index_args.targetMode;
    }

    if (typeof cygnus_index_args.callback === 'function') {
      _IndexRequestData.reqOptions[req.requestID].callback = cygnus_index_args.callback;
    }

    return req.buildRequest();
  } catch (e) {
    utils.logError('Error calling index adapter', ADAPTER_NAME, e);
  }
};

var IndexExchangeAdapter = function IndexExchangeAdapter() {
  let baseAdapter = new Adapter('indexExchange');

  var slotIdMap = {};
  var requiredParams = [
    /* 0 */
    'id',
    /* 1 */
    'siteID'
  ];
  var firstAdUnitCode = '';
  let bidRequests = {};

  function passOnBid(adUnitCode) {
    var bid = bidfactory.createBid(2);
    bid.bidderCode = ADAPTER_CODE;
    bidmanager.addBidResponse(adUnitCode, bid);
    return bid;
  }

  function _callBids(request) {
    if (typeof request === 'undefined' || utils.isEmpty(request)) {
      return;
    }

    var bidArr = request.bids;

    if (typeof window._IndexRequestData === 'undefined') {
      window._IndexRequestData = {};
      window._IndexRequestData.impIDToSlotID = {};
      window._IndexRequestData.reqOptions = {};
    }
    // clear custom targets at the beginning of every request
    _IndexRequestData.targetAggregate = {'open': {}, 'private': {}};

    // Our standard is to always bid for all known slots.
    cygnus_index_args.slots = [];

    var videoImpressions = [];

    // Grab the slot level data for cygnus_index_args
    bidArr.forEach(bid => {
      if (bid.mediaType === 'video') {
        var impression = buildVideoImpressions(bid, bidRequests);
        if (typeof impression !== 'undefined') {
          videoImpressions.push(impression);
        }
      } else {
        cygnus_index_init(bid);
      }
    });

    if (videoImpressions.length > 0) {
      sendVideoRequest(request.bidderRequestId, videoImpressions);
    }

    if (cygnus_index_args.slots.length > 20) {
      utils.logError('Too many unique sizes on slots, will use the first 20.', ADAPTER_NAME);
    }

    if (cygnus_index_args.slots.length > 0) {
      // bidmanager.setExpectedBidsCount(ADAPTER_CODE, expectedBids);
      adloader.loadScript(cygnus_index_start());
    }

    var responded = false;

    // Handle response
    window.cygnus_index_ready_state = function () {
      if (responded) {
        return;
      }
      responded = true;

      try {
        var indexObj = _IndexRequestData.targetIDToBid;

        // Grab all the bids for each slot
        for (var adSlotId in slotIdMap) {
          var bidObj = slotIdMap[adSlotId];
          var adUnitCode = bidObj.placementCode;

          var bids = [];

          // Grab the bid for current slot
          for (var cpmAndSlotId in indexObj) {
            var match = /^(T\d_)?(.+)_(\d+)$/.exec(cpmAndSlotId);
            // if parse fail, move to next bid
            if (!(match)) {
              utils.logError('Unable to parse ' + cpmAndSlotId + ', skipping slot', ADAPTER_NAME);
              continue;
            }
            var tier = match[1] || '';
            var slotID = match[2];
            var currentCPM = match[3];

            var slotObj = getSlotObj(cygnus_index_args, tier + slotID);
            // Bid is for the current slot
            if (slotID === adSlotId) {
              var bid = bidfactory.createBid(1);
              bid.cpm = currentCPM / 100;
              bid.ad = indexObj[cpmAndSlotId][0];
              bid.bidderCode = ADAPTER_CODE;
              bid.width = slotObj.width;
              bid.height = slotObj.height;
              bid.siteID = slotObj.siteID;
              if (typeof _IndexRequestData.targetIDToResp === 'object' && typeof _IndexRequestData.targetIDToResp[cpmAndSlotId] === 'object' && typeof _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID !== 'undefined') {
                if (typeof _IndexRequestData.targetAggregate['private'][adUnitCode] === 'undefined') { _IndexRequestData.targetAggregate['private'][adUnitCode] = []; }
                bid.dealId = _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID;
                _IndexRequestData.targetAggregate['private'][adUnitCode].push(slotID + '_' + _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID);
              } else {
                if (typeof _IndexRequestData.targetAggregate['open'][adUnitCode] === 'undefined') { _IndexRequestData.targetAggregate['open'][adUnitCode] = []; }
                _IndexRequestData.targetAggregate['open'][adUnitCode].push(slotID + '_' + currentCPM);
              }
              bids.push(bid);
            }
          }

          if (bids.length > 0) {
            // Add all bid responses
            for (var i = 0; i < bids.length; i++) {
              bidmanager.addBidResponse(adUnitCode, bids[i]);
            }
          // No bids for expected bid, pass bid
          } else {
            passOnBid(adUnitCode);
          }
        }
      } catch (e) {
        utils.logError('Error calling index adapter', ADAPTER_NAME, e);
        logErrorBidResponse();
      } finally {
        // ensure that previous targeting mapping is cleared
        _IndexRequestData.targetIDToBid = {};
      }

      // slotIdMap is used to determine which slots will be bid on in a given request.
      // Therefore it needs to be blanked after the request is handled, else we will submit 'bids' for the wrong ads.
      slotIdMap = {};
    };
  }

  function cygnus_index_init(bid) {
    if (!utils.hasValidBidRequest(bid.params, requiredParams, ADAPTER_NAME)) {
      passOnBid(bid.placementCode);
      return;
    }

    var sizeID = 0;

    // Expecting nested arrays for sizes
    if (!utils.isArray(bid.sizes[0])) {
      bid.sizes = [bid.sizes];
    }

    // Create index slots for all bids and sizes
    for (var j = 0; j < bid.sizes.length; j++) {
      var validSize = false;
      for (var k = 0; k < cygnus_index_adunits.length; k++) {
        if (bid.sizes[j][0] == cygnus_index_adunits[k][0] &&
            bid.sizes[j][1] == cygnus_index_adunits[k][1]) {
          bid.sizes[j][0] = Number(bid.sizes[j][0]);
          bid.sizes[j][1] = Number(bid.sizes[j][1]);
          validSize = true;
          break;
        }
      }

      if (!validSize) {
        utils.logMessage(ADAPTER_NAME + ' slot excluded from request due to no valid sizes');
        passOnBid(bid.placementCode);
        continue;
      }

      var usingSizeSpecificSiteID = false;
      // Check for size defined in bidder params
      if (bid.params.size && utils.isArray(bid.params.size)) {
        if (!(bid.sizes[j][0] == bid.params.size[0] && bid.sizes[j][1] == bid.params.size[1])) {
          passOnBid(bid.placementCode);
          continue;
        }
        usingSizeSpecificSiteID = true;
      }

      if (bid.params.timeout && typeof cygnus_index_args.timeout === 'undefined') {
        cygnus_index_args.timeout = bid.params.timeout;
      }

      var siteID = Number(bid.params.siteID);
      if (typeof siteID !== 'number' || siteID % 1 != 0 || siteID <= 0) {
        utils.logMessage(ADAPTER_NAME + ' slot excluded from request due to invalid siteID');
        passOnBid(bid.placementCode);
        continue;
      }
      if (siteID && typeof cygnus_index_args.siteID === 'undefined') {
        cygnus_index_args.siteID = siteID;
      }

      if (utils.hasValidBidRequest(bid.params, requiredParams, ADAPTER_NAME)) {
        firstAdUnitCode = bid.placementCode;
        var slotID = bid.params[requiredParams[0]];
        if (typeof slotID !== 'string' && typeof slotID !== 'number') {
          utils.logError(ADAPTER_NAME + ' bid contains invalid slot ID from ' + bid.placementCode + '. Discarding slot');
          passOnBid(bid.placementCode);
          continue
        }

        sizeID++;
        var size = {
          width: bid.sizes[j][0],
          height: bid.sizes[j][1]
        };

        var slotName = usingSizeSpecificSiteID ? String(slotID) : slotID + '_' + sizeID;
        slotIdMap[slotName] = bid;

        // Doesn't need the if(primary_request) conditional since we are using the mergeSlotInto function which is safe
        cygnus_index_args.slots = mergeSlotInto({
          id: slotName,
          width: size.width,
          height: size.height,
          siteID: siteID || cygnus_index_args.siteID
        }, cygnus_index_args.slots);

        if (bid.params.tier2SiteID) {
          var tier2SiteID = Number(bid.params.tier2SiteID);
          if (typeof tier2SiteID !== 'undefined' && !tier2SiteID) {
            continue;
          }

          cygnus_index_args.slots = mergeSlotInto({
            id: 'T1_' + slotName,
            width: size.width,
            height: size.height,
            siteID: tier2SiteID
          }, cygnus_index_args.slots);
        }

        if (bid.params.tier3SiteID) {
          var tier3SiteID = Number(bid.params.tier3SiteID);
          if (typeof tier3SiteID !== 'undefined' && !tier3SiteID) {
            continue;
          }

          cygnus_index_args.slots = mergeSlotInto({
            id: 'T2_' + slotName,
            width: size.width,
            height: size.height,
            siteID: tier3SiteID
          }, cygnus_index_args.slots);
        }
      }
    }
  }

  function sendVideoRequest(requestID, videoImpressions) {
    let cygnusRequest = {
      'id': requestID,
      'imp': videoImpressions,
      'site': {
        'page': utils.getTopWindowUrl()
      }
    };

    if (!utils.isEmpty(cygnusRequest.imp)) {
      let cygnusRequestUrl = createCygnusRequest(cygnusRequest.imp[0].ext.siteID, cygnusRequest);

      adloader.loadScript(cygnusRequestUrl);
    }
  }

  function buildVideoImpressions(bid) {
    if (!validateBid(bid)) {
      return;
    }

    bid = transformBid(bid);

    // map request id to bid object to retrieve adUnit code in callback
    bidRequests[bid.bidId] = {};
    bidRequests[bid.bidId].prebid = bid;

    let cygnusImpression = {};
    cygnusImpression.id = bid.bidId;

    cygnusImpression.ext = {};
    cygnusImpression.ext.siteID = bid.params.video.siteID;
    delete bid.params.video.siteID;

    let podType = bid.params.video.startdelay;
    if (bid.params.video.startdelay === 0) {
      podType = 'preroll';
    } else if (typeof START_DELAY_MAP[bid.params.video.startdelay] === 'undefined') {
      podType = 'midroll';
    }
    cygnusImpression.ext.sid = [SLOT_ID_PREFIX_MAP[podType], 1, 1, 's'].join('_');

    cygnusImpression.video = {};

    if (bid.params.video) {
      Object.keys(bid.params.video)
        .filter(param => typeof VIDEO_REQUIRED_PARAMS_MAP[param] !== 'undefined' || typeof VIDEO_OPTIONAL_PARAMS_MAP[param] !== 'undefined')
        .forEach(param => {
          if (param === 'startdelay' && typeof START_DELAY_MAP[bid.params.video[param]] !== 'undefined') {
            bid.params.video[param] = START_DELAY_MAP[bid.params.video[param]];
          }
          if (param === 'linearity' && typeof LINEARITY_MAP[bid.params.video[param]] !== 'undefined') {
            bid.params.video[param] = LINEARITY_MAP[bid.params.video[param]];
          }
          cygnusImpression.video[param] = bid.params.video[param];
        });
    } else {
      return;
    }

    let bidSize = getSizes(bid.sizes).shift();
    if (!bidSize || !bidSize.width || !bidSize.height) {
      return;
    }
    cygnusImpression.video.w = bidSize.width;
    cygnusImpression.video.h = bidSize.height;

    bidRequests[bid.bidId].cygnus = cygnusImpression;

    return cygnusImpression;
  }

  /*
  Function in order to add a slot into the list if it hasn't been created yet, else it returns the same list.
  */
  function mergeSlotInto(slot, slotList) {
    for (var i = 0; i < slotList.length; i++) {
      if (slot.id === slotList[i].id) {
        return slotList;
      }
    }
    slotList.push(slot);
    return slotList;
  }

  function getSlotObj(obj, id) {
    var arr = obj.slots;
    var returnObj = {};
    utils._each(arr, function (value) {
      if (value.id === id) {
        returnObj = value;
      }
    });

    return returnObj;
  }

  function logErrorBidResponse() {
    // no bid response
    var bid = bidfactory.createBid(2);
    bid.bidderCode = ADAPTER_CODE;

    // log error to first add unit
    bidmanager.addBidResponse(firstAdUnitCode, bid);
  }

  function createCygnusRequest(siteID, cygnusRequest) {
    let cygnusUrl = (window.location.protocol === 'https:') ? url.parse(BASE_CYGNUS_VIDEO_URL_SECURE) : url.parse(BASE_CYGNUS_VIDEO_URL_INSECURE);
    cygnusUrl.search.s = siteID;
    cygnusUrl.search.r = encodeURIComponent(JSON.stringify(cygnusRequest));
    let formattedCygnusUrl = url.format(cygnusUrl);
    return formattedCygnusUrl;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  $$PREBID_GLOBAL$$.handleCygnusResponse = function (response) {
    if (!response || !response.seatbid || utils.isEmpty(response.seatbid)) {
      utils.logInfo('Cygnus returned no bids');

      // signal this response is complete
      Object.keys(bidRequests)
        .forEach(bidId => {
          let prebidRequest = bidRequests[bidId].prebid;
          let bid = createBidObj(STATUS.NO_BID, prebidRequest);
          utils.logInfo(JSON.stringify(bid));
          bidmanager.addBidResponse(prebidRequest.placementCode, bid);
        });

      return;
    }

    response.seatbid
      .forEach(seat => {
        seat.bid.forEach(cygnusBid => {
          let validBid = true;

          if (typeof bidRequests[cygnusBid.impid] === 'undefined') {
            utils.logInfo('Cygnus returned mismatched id');

            // signal this response is complete
            Object.keys(bidRequests)
              .forEach(bidId => {
                let prebidRequest = bidRequests[bidId].prebid;
                let bid = createBidObj(STATUS.NO_BID, prebidRequest);
                bidmanager.addBidResponse(prebidRequest.placementCode, bid);
              });
            return;
          }

          if (!cygnusBid.ext.vasturl) {
            utils.logInfo('Cygnus returned no vast url');
            validBid = false;
          }

          if (url.parse(cygnusBid.ext.vasturl).host === window.location.host) {
            utils.logInfo('Cygnus returned no vast url');
            validBid = false;
          }

          let cpm;
          if (typeof cygnusBid.ext.pricelevel === 'string') {
            let priceLevel = cygnusBid.ext.pricelevel;
            if (priceLevel.charAt(0) === '_') priceLevel = priceLevel.slice(1);
            cpm = priceLevel / 100;
            if (!utils.isNumber(cpm) || isNaN(cpm)) {
              utils.logInfo('Cygnus returned invalid price');
              validBid = false;
            }
          } else {
            validBid = false;
          }

          let prebidRequest = bidRequests[cygnusBid.impid].prebid;
          let cygnusRequest = bidRequests[cygnusBid.impid].cygnus;

          if (!validBid) {
            let bid = createBidObj(STATUS.NO_BID, prebidRequest);
            bidmanager.addBidResponse(prebidRequest.placementCode, bid);
            return;
          }

          let bid = createBidObj(STATUS.GOOD, prebidRequest);
          bid.cpm = cpm;
          bid.width = cygnusRequest.video.w;
          bid.height = cygnusRequest.video.h;
          bid.vastUrl = cygnusBid.ext.vasturl;
          bid.mediaType = 'video';

          bidmanager.addBidResponse(prebidRequest.placementCode, bid);
        });
      });

    bidRequests = {};
  };

  function createBidObj(status, request) {
    let bid = bidfactory.createBid(status, request);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    return bid;
  }

  /* Check that a bid has required paramters */
  function validateBid(bid) {
    if (
      bid.mediaType === 'video' &&
      utils.hasValidBidRequest(bid.params.video, Object.keys(VIDEO_REQUIRED_PARAMS_MAP), ADAPTER_NAME) &&
      isValidSite(bid.params.video.siteID) &&
      isValidPlayerType(bid.params.video.playerType) &&
      isValidProtocolArray(bid.params.video.protocols) &&
      isValidDuration(bid.params.video.maxduration) && bid.params.video.maxduration > 0
    ) {
      return bid;
    }
  }

  function isValidSite(siteID) {
    let intSiteID = +siteID;
    if (isNaN(intSiteID) || !utils.isNumber(intSiteID) || intSiteID < 0 || utils.isArray(siteID)) {
      utils.logError(`Site ID is invalid, must be a number > 0. Got: ${siteID}`);
      return false;
    }
    return true;
  }

  function isValidPlayerType(playerType) {
    if (typeof playerType === 'undefined' || !utils.isStr(playerType)) {
      utils.logError(`Player type is invalid, must be one of: ${Object.keys(SUPPORTED_PLAYER_TYPES_MAP)}`);
      return false;
    }
    playerType = playerType.toUpperCase();
    if (!SUPPORTED_PLAYER_TYPES_MAP[playerType]) {
      utils.logError(`Player type is invalid, must be one of: ${Object.keys(SUPPORTED_PLAYER_TYPES_MAP)}`);
      return false;
    }
    return true;
  }

  function isValidProtocolArray(protocolArray) {
    if (!utils.isArray(protocolArray) || utils.isEmpty(protocolArray)) {
      utils.logError(`Protocol array is not an array. Got: ${protocolArray}`);
      return false;
    } else {
      for (var i = 0; i < protocolArray.length; i++) {
        let protocol = protocolArray[i];
        if (!SUPPORTED_PROTOCOLS_MAP[protocol]) {
          utils.logError(`Protocol array contains an invalid protocol, must be one of: ${SUPPORTED_PROTOCOLS_MAP}. Got: ${protocol}`);
          return false;
        }
      }
    }
    return true;
  }

  function isValidDuration(duration) {
    let intDuration = +duration;
    if (isNaN(intDuration) || !utils.isNumber(intDuration) || utils.isArray(duration)) {
      utils.logError(`Duration is invalid, must be a number. Got: ${duration}`);
      return false;
    }
    return true;
  }

  function isValidMimeArray(mimeArray) {
    if (!utils.isArray(mimeArray) || utils.isEmpty(mimeArray)) {
      utils.logError(`MIMEs array is not an array. Got: ${mimeArray}`);
      return false;
    } else {
      for (var i = 0; i < mimeArray.length; i++) {
        let mimeType = mimeArray[i];
        if (!utils.isStr(mimeType) || utils.isEmptyStr(mimeType) || !/^\w+\/[\w-]+$/.test(mimeType)) {
          utils.logError(`MIMEs array contains an invalid MIME type. Got: ${mimeType}`);
          return false;
        }
      }
    }
    return true;
  }

  function isValidLinearity(linearity) {
    if (!LINEARITY_MAP[linearity]) {
      utils.logInfo(`Linearity is invalid, must be one of: ${Object.keys(LINEARITY_MAP)}. Got: ${linearity}`);
      return false;
    }
    return true;
  }

  function isValidStartDelay(startdelay) {
    if (typeof START_DELAY_MAP[startdelay] === 'undefined') {
      let intStartdelay = +startdelay;
      if (isNaN(intStartdelay) || !utils.isNumber(intStartdelay) || intStartdelay < -2 || utils.isArray(startdelay)) {
        utils.logInfo(`Start delay is invalid, must be a number >= -2. Got: ${startdelay}`);
        return false;
      }
    }
    return true;
  }

  function isValidApiArray(apiArray, playerType) {
    if (!utils.isArray(apiArray) || utils.isEmpty(apiArray)) {
      utils.logInfo(`API array is not an array. Got: ${apiArray}`);
      return false;
    } else {
      for (var i = 0; i < apiArray.length; i++) {
        let api = +apiArray[i];
        if (isNaN(api) || !SUPPORTED_API_MAP[playerType].includes(api)) {
          utils.logInfo(`API array contains an invalid API version. Got: ${api}`);
          return false;
        }
      }
    }
    return true;
  }

  function transformBid(bid) {
    bid.params.video.siteID = +bid.params.video.siteID;
    bid.params.video.maxduration = +bid.params.video.maxduration;

    bid.params.video.protocols = bid.params.video.protocols.reduce((arr, protocol) => {
      return arr.concat(SUPPORTED_PROTOCOLS_MAP[protocol]);
    }, []);

    let minduration = bid.params.video.minduration;
    if (typeof minduration === 'undefined' || !isValidDuration(minduration)) {
      utils.logInfo(`Using default value for 'minduration', default: ${VIDEO_OPTIONAL_PARAMS_MAP.minduration}`);
      bid.params.video.minduration = VIDEO_OPTIONAL_PARAMS_MAP.minduration;
    }

    let startdelay = bid.params.video.startdelay;
    if (typeof startdelay === 'undefined' || !isValidStartDelay(startdelay)) {
      utils.logInfo(`Using default value for 'startdelay', default: ${VIDEO_OPTIONAL_PARAMS_MAP.startdelay}`);
      bid.params.video.startdelay = VIDEO_OPTIONAL_PARAMS_MAP.startdelay;
    }

    let linearity = bid.params.video.linearity;
    if (typeof linearity === 'undefined' || !isValidLinearity(linearity)) {
      utils.logInfo(`Using default value for 'linearity', default: ${VIDEO_OPTIONAL_PARAMS_MAP.linearity}`);
      bid.params.video.linearity = VIDEO_OPTIONAL_PARAMS_MAP.linearity;
    }

    let mimes = bid.params.video.mimes;
    let playerType = bid.params.video.playerType.toUpperCase();
    if (typeof mimes === 'undefined' || !isValidMimeArray(mimes)) {
      utils.logInfo(`Using default value for 'mimes', player type: '${playerType}', default: ${DEFAULT_MIMES_MAP[playerType]}`);
      bid.params.video.mimes = DEFAULT_MIMES_MAP[playerType];
    }

    let apiList = bid.params.video.apiList;
    if (typeof apiList !== 'undefined' && !isValidApiArray(apiList, playerType)) {
      utils.logInfo(`Removing invalid api versions from api list.`);
      if (utils.isArray(apiList)) {
        bid.params.video.apiList = apiList.filter(api => SUPPORTED_API_MAP[playerType].includes(api));
      } else {
        bid.params.video.apiList = [];
      }
    }

    if (typeof apiList === 'undefined' && bid.params.video.allowVPAID && utils.isA(bid.params.video.allowVPAID, 'Boolean')) {
      bid.params.video.mimes = bid.params.video.mimes.concat(DEFAULT_VPAID_MIMES_MAP[playerType]);
      bid.params.video.apiList = SUPPORTED_API_MAP[playerType];
    }

    if (utils.isEmpty(bid.params.video.apiList)) {
      utils.logInfo(`API list is empty, VPAID ads will not be requested.`);
      delete bid.params.video.apiList;
    }

    delete bid.params.video.playerType;
    delete bid.params.video.allowVPAID;

    return bid;
  }

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
    let sizes = [];
    let sizeObj = {};

    if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
      if (!utils.isNumber(requestSizes[0]) || !utils.isNumber(requestSizes[1])) {
        return sizes;
      }
      sizeObj.width = requestSizes[0];
      sizeObj.height = requestSizes[1];
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        let size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }

    return sizes;
  }

  return Object.assign(this, {
    callBids: _callBids
  });
};

adaptermanager.registerBidAdapter(new IndexExchangeAdapter(), 'indexExchange', {
  supportedMediaTypes: ['video']
});

module.exports = IndexExchangeAdapter;
