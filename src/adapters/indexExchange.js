//Factory for creating the bidderAdaptor
// jshint ignore:start
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var ADAPTER_NAME = 'INDEXEXCHANGE';
var ADAPTER_CODE = 'indexExchange';

var cygnus_index_primary_request = true;
var cygnus_index_parse_res = function () {
};

window.cygnus_index_args = {};

var cygnus_index_adunits =  [[728, 90], [120, 600], [300, 250], [160, 600], [336, 280], [234, 60], [300, 600], [300, 50], [320, 50], [970, 250], [300, 1050], [970, 90], [180, 150]]; // jshint ignore:line

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

    if (typeof timeoutDelay === 'number' && timeoutDelay % 1 === 0 && timeoutDelay >= 0) {
      this.timeoutDelay = timeoutDelay;
    }

    this.siteID = siteID;
    this.impressions = [];
    this._parseFnName = undefined;
    if (top === self) {
      this.sitePage = location.href;
      this.topframe = 1;
    } else {
      this.sitePage = document.referrer;
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
    var json = '{"id":' + this.requestID + ',"site":{"page":"' + quote(this.sitePage) + '"';
    if (typeof document.referrer === 'string') {
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

    var scriptSrc = '';
    if (window.location.protocol === 'https:') {
      if (cygnus_index_args.host && cygnus_index_args.host.https) {
        scriptSrc = cygnus_index_args.host.https;
      } else {
        scriptSrc = 'https://as-sec.casalemedia.com';
      }
    } else {
      if (cygnus_index_args.host && cygnus_index_args.host.http) {
        scriptSrc = cygnus_index_args.host.http;
      } else {
        scriptSrc = 'http://as.casalemedia.com';
      }
    }
    scriptSrc += '/headertag?v=9&x3=1&fn=cygnus_index_parse_res&s=' + this.siteID + '&r=' + jsonURI;
    if (typeof this.timeoutDelay === 'number' && this.timeoutDelay % 1 === 0 && this.timeoutDelay >= 0) {
      scriptSrc += '&t=' + this.timeoutDelay;
    }

    return scriptSrc;
  };

  try {
    if (typeof cygnus_index_args === 'undefined' || typeof cygnus_index_args.siteID === 'undefined' || typeof cygnus_index_args.slots === 'undefined') {
      return;
    }

    if (typeof window._IndexRequestData === 'undefined') {
      window._IndexRequestData = {};
      window._IndexRequestData.impIDToSlotID = {};
      window._IndexRequestData.reqOptions = {};
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
  }
};

var IndexExchangeAdapter = function IndexExchangeAdapter() {
  var slotIdMap = {};
  var requiredParams = [
    /* 0 */
    'id',
    /* 1 */
    'siteID'
  ];
  var firstAdUnitCode = '';

  function _callBids(request) {
    /*
    Function in order to add a slot into the list if it hasn't been created yet, else it returns the same list.
    */
    function mergeSlotInto(slot,slotList){
      for(var i = 0;i<slotList.length;i++){
        if(slot.id === slotList[i].id){
          return slotList;
        }
      }
      slotList.push(slot);
      return slotList;
    }
    var bidArr = request.bids;

    if (!utils.hasValidBidRequest(bidArr[0].params, requiredParams, ADAPTER_NAME)) {
      return;
    }

    //Our standard is to always bid for all known slots.
    cygnus_index_args.slots = [];
    var bidCount = 0;

    //Grab the slot level data for cygnus_index_args
    for (var i = 0; i < bidArr.length; i++) {
      var bid = bidArr[i];

      var width;
      var height;

      outer: for (var j = 0; j < bid.sizes.length; j++) {
        inner: for (var k = 0; k < cygnus_index_adunits.length; k++) {
          if (bid.sizes[j][0] === cygnus_index_adunits[k][0] &&
            bid.sizes[j][1] === cygnus_index_adunits[k][1]) {
            width = bid.sizes[j][0];
            height = bid.sizes[j][1];
            break outer;
          }
        }
      }

      if (bid.params.timeout && typeof cygnus_index_args.timeout === 'undefined') {
        cygnus_index_args.timeout = bid.params.timeout;
      }

      if (bid.params.siteID && typeof cygnus_index_args.siteID === 'undefined') {
        cygnus_index_args.siteID = bid.params.siteID;
      }

      if (bid.params.host && typeof cygnus_index_args.host === 'undefined') {
        cygnus_index_args.host = bid.params.host;
      }

      if (bid.params.sqps && typeof cygnus_index_args.SQPS === 'undefined') {
        cygnus_index_args.slots.push({
          id: 'SPQS',
          width: bid.params.sqps.width,
          height: bid.params.sqps.height,
          siteID: bid.params.sqps.siteID || cygnus_index_args.siteID
        });
      }

      if (utils.hasValidBidRequest(bid.params, requiredParams, ADAPTER_NAME)) {
        firstAdUnitCode = bid.placementCode;
        var slotId = bid.params[requiredParams[0]];
        slotIdMap[slotId] = bid;

        //Doesn't need the if(primary_request) conditional since we are using the mergeSlotInto function which is safe
        cygnus_index_args.slots = mergeSlotInto({
          id: bid.params.id,
          width: width,
          height: height,
          siteID: bid.params.siteID || cygnus_index_args.siteID
        }, cygnus_index_args.slots);

        bidCount++;

        if (bid.params.tier2SiteID) {
          cygnus_index_args.slots = mergeSlotInto({
            id: 'T1_' + bid.params.id,
            width: width,
            height: height,
            siteID: bid.params.tier2SiteID
          }, cygnus_index_args.slots);
        }

        if (bid.params.tier3SiteID) {
          cygnus_index_args.slots = mergeSlotInto({
            id: 'T2_' + bid.params.id,
            width: width,
            height: height,
            siteID: bid.params.tier3SiteID
          }, cygnus_index_args.slots);
        }
      }
    }

    bidmanager.setExpectedBidsCount(ADAPTER_CODE, bidCount);

    cygnus_index_primary_request = false;

    adloader.loadScript(cygnus_index_start());

    window.cygnus_index_ready_state = function () {
      try {
        var indexObj = _IndexRequestData.targetIDToBid;
        var lookupObj = cygnus_index_args;

        if (utils.isEmpty(indexObj)) {
          var bid = bidfactory.createBid(2);
          bid.bidderCode = ADAPTER_CODE;
          logErrorBidResponse();
          return;
        }

        utils._each(indexObj, function (adContents, cpmAndSlotId) {
          utils._each(slotIdMap, function (bid, adSlotId) {
            var obj = cpmAndSlotId.split('_');
            var currentId = obj[0];
            var currentCPM = obj[1];
            if (currentId === adSlotId) {
              var bidObj = slotIdMap[adSlotId];
              var adUnitCode = bidObj.placementCode;
              var slotObj = getSlotObj(cygnus_index_args, adSlotId);

              bid = bidfactory.createBid(1);
              bid.cpm = currentCPM / 100;
              bid.ad = adContents[0];
              bid.ad_id = adSlotId;
              bid.bidderCode = ADAPTER_CODE;
              bid.width = slotObj.width;
              bid.height = slotObj.height;
              bid.siteID = slotObj.siteID;

              bidmanager.addBidResponse(adUnitCode, bid);
            }
          });
        });
      } catch (e) {
        utils.logError('Error calling index adapter', ADAPTER_NAME, e);
        logErrorBidResponse();
      }

      //slotIdMap is used to determine which slots will be bid on in a given request.
      //Therefore it needs to be blanked after the request is handled, else we will submit 'bids' for the wrong ads.
      slotIdMap={};
    };
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
    //no bid response
    var bid = bidfactory.createBid(2);
    bid.bidderCode = ADAPTER_CODE;

    //log error to first add unit
    bidmanager.addBidResponse(firstAdUnitCode, bid);
  }

  return {
    callBids: _callBids
  };
};

module.exports = IndexExchangeAdapter;
