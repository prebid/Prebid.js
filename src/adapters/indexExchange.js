//Factory for creating the bidderAdaptor
// jshint ignore:start
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var ADAPTER_NAME = 'INDEXEXCHANGE';
var ADAPTER_CODE = 'indexExchange';

var cygnus_index_parse_res = function () {
};

window.cygnus_index_args = {};

var cygnus_index_adunits =  [[728, 90], [120, 600], [300, 250], [160, 600], [336, 280], [234, 60], [300, 600], [300, 50], [320, 50], [970, 250], [300, 1050], [970, 90], [180, 150]]; // jshint ignore:line

var cygnus_index_start = function () {
  window.index_slots = [];

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
    var scriptSrc = window.location.protocol === 'https:' ? 'https://as-sec.casalemedia.com' : 'http://as.casalemedia.com';
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
    utils.logError('Error calling index adapter', ADAPTER_NAME, e);
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
    var bidArr = request.bids;

    if (!utils.hasValidBidRequest(bidArr[0].params, requiredParams, ADAPTER_NAME)) {
      return;
    }

    //Our standard is to always bid for all known slots.
    cygnus_index_args.slots = [];

    var expectedBids = 0;

    //Grab the slot level data for cygnus_index_args
    for (var i = 0; i < bidArr.length; i++) {
      var bid = bidArr[i];
      var sizeID = 0;

      expectedBids++;

      // Expecting nested arrays for sizes
      if (!(bid.sizes[0] instanceof Array)) {
        bid.sizes = [bid.sizes];
      }

      // Create index slots for all bids and sizes
      for (var j = 0; j < bid.sizes.length; j++) {
        var validSize = false;
        for (var k = 0; k < cygnus_index_adunits.length; k++) {
          if (bid.sizes[j][0] === cygnus_index_adunits[k][0] &&
              bid.sizes[j][1] === cygnus_index_adunits[k][1]) {
            validSize = true;
            break;
          }
        }

        if (!validSize) {
          continue;
        }

        var usingSizeSpecificSiteID = false;
        // Check for size defined in bidder params 
        if (bid.params.size && bid.params.size instanceof Array) {
          if (!(bid.sizes[j][0] == bid.params.size[0] && bid.sizes[j][1] == bid.params.size[1]))
            continue;
          usingSizeSpecificSiteID = true;
        }

        if (bid.params.timeout && typeof cygnus_index_args.timeout === 'undefined') {
          cygnus_index_args.timeout = bid.params.timeout;
        }


        var siteID = Number(bid.params.siteID);
        if (!siteID) {
          continue;
        }
        if (siteID && typeof cygnus_index_args.siteID === 'undefined') {
          cygnus_index_args.siteID = siteID;
        }

        if (utils.hasValidBidRequest(bid.params, requiredParams, ADAPTER_NAME)) {
          firstAdUnitCode = bid.placementCode;
          var slotID = bid.params[requiredParams[0]];

          sizeID++;
          var size = {
            width: bid.sizes[j][0],
            height: bid.sizes[j][1]
          };

          var slotName = usingSizeSpecificSiteID ? String(slotID) : slotID + '_' + sizeID;
          slotIdMap[slotName] = bid;

          //Doesn't need the if(primary_request) conditional since we are using the mergeSlotInto function which is safe
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

    if (cygnus_index_args.slots.length > 20) {
      utils.logError('Too many unique sizes on slots, will use the first 20.', ADAPTER_NAME);
    }

    //bidmanager.setExpectedBidsCount(ADAPTER_CODE, expectedBids);
    adloader.loadScript(cygnus_index_start());

    var responded = false;

    // Handle response
    window.cygnus_index_ready_state = function () {
      if (responded) {
        return;
      }
      responded = true;

      try {
        var indexObj = _IndexRequestData.targetIDToBid;
        var lookupObj = cygnus_index_args;

        // Grab all the bids for each slot
        for (var adSlotId in slotIdMap) {
          var bidObj = slotIdMap[adSlotId];
          var adUnitCode = bidObj.placementCode;

          var bids = [];

          // Grab the bid for current slot
          for (var cpmAndSlotId in indexObj) {
            var match = /^(T\d_)?(.+)_(\d+)$/.exec(cpmAndSlotId);
            // if parse fail, move to next bid
            if (!(match)){
              utils.logError("Unable to parse " + cpmAndSlotId + ", skipping slot", ADAPTER_NAME);
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
              bid.ad_id = adSlotId;
              bid.bidderCode = ADAPTER_CODE;
              bid.width = slotObj.width;
              bid.height = slotObj.height;
              bid.siteID = slotObj.siteID;
              if ( typeof _IndexRequestData.targetIDToResp === 'object' && typeof _IndexRequestData.targetIDToResp[cpmAndSlotId] === 'object' && typeof _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID !== 'undefined' ) {
                bid.dealId = _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID;
              }
              bids.push(bid);
            }
          }

          var currentBid = undefined;

          if (bids.length > 0) {
            // Add all bid responses
            for (var i = 0; i < bids.length; i++) {
              bidmanager.addBidResponse(adUnitCode, bids[i]);
            }
          // No bids for expected bid, pass bid
          } else {
            var bid = bidfactory.createBid(2);
            bid.bidderCode = ADAPTER_CODE;
            currentBid = bid;
            bidmanager.addBidResponse(adUnitCode, currentBid);
          }

        }
      } catch (e) {
        utils.logError('Error calling index adapter', ADAPTER_NAME, e);
        logErrorBidResponse();
      }
      finally {
        // ensure that previous targeting mapping is cleared
        _IndexRequestData.targetIDToBid = {};
      }

      //slotIdMap is used to determine which slots will be bid on in a given request.
      //Therefore it needs to be blanked after the request is handled, else we will submit 'bids' for the wrong ads.
      slotIdMap={};
    };
  }

  /*
  Function in order to add a slot into the list if it hasn't been created yet, else it returns the same list.
  */
  function mergeSlotInto(slot,slotList){
    for(var i = 0; i < slotList.length; i++){
      if(slot.id === slotList[i].id){
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
