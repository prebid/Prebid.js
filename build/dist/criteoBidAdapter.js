pbjsChunk([74],{

/***/ 98:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(99);


/***/ }),

/***/ 99:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);
var utils = __webpack_require__(0);

var CriteoAdapter = function CriteoAdapter() {
  var sProt = window.location.protocol === 'http:' ? 'http:' : 'https:';
  var _publisherTagUrl = sProt + '//static.criteo.net/js/ld/publishertag.js';
  var _bidderCode = 'criteo';
  var _profileId = 125;

  function _callBids(params) {
    if (!window.criteo_pubtag || window.criteo_pubtag instanceof Array) {
      // publisherTag not loaded yet

      _pushBidRequestEvent(params);
      adloader.loadScript(_publisherTagUrl, (function () {}), true);
    } else {
      // publisherTag already loaded
      _pushBidRequestEvent(params);
    }
  }

  // send bid request to criteo direct bidder handler
  function _pushBidRequestEvent(params) {
    // if we want to be fully asynchronous, we must first check window.criteo_pubtag in case publishertag.js is not loaded yet.
    window.Criteo = window.Criteo || {};
    window.Criteo.events = window.Criteo.events || [];

    // generate the bidding event
    var biddingEventFunc = function biddingEventFunc() {
      var bids = params.bids || [];
      var slots = [];
      var isAudit = false;
      var networkid;
      var integrationMode;

      // build slots before sending one multi-slots bid request
      for (var i = 0; i < bids.length; i++) {
        var bid = bids[i];
        var sizes = utils.parseSizesInput(bid.sizes);
        slots.push(new Criteo.PubTag.DirectBidding.DirectBiddingSlot(bid.placementCode, bid.params.zoneId, bid.params.nativeCallback ? bid.params.nativeCallback : undefined, bid.transactionId, sizes.map((function (sizeString) {
          var xIndex = sizeString.indexOf('x');
          var w = parseInt(sizeString.substring(0, xIndex));
          var h = parseInt(sizeString.substring(xIndex + 1, sizeString.length));
          return new Criteo.PubTag.DirectBidding.Size(w, h);
        }))));

        networkid = bid.params.networkId || networkid;
        if (bid.params.integrationMode !== undefined) {
          integrationMode = bid.params.integrationMode.toLowerCase() == 'amp' ? 1 : 0;
        }

        isAudit |= bid.params.audit !== undefined;
      }

      var biddingEvent = new Criteo.PubTag.DirectBidding.DirectBiddingEvent(_profileId, new Criteo.PubTag.DirectBidding.DirectBiddingUrlBuilder(isAudit), slots, _callbackSuccess(slots), _callbackError(slots), _callbackError(slots), // timeout handled as error
      undefined, networkid, integrationMode);

      // process the event as soon as possible
      window.criteo_pubtag.push(biddingEvent);
    };

    window.Criteo.events.push(biddingEventFunc);
  }

  function parseBidResponse(bidsResponse) {
    try {
      return JSON.parse(bidsResponse);
    } catch (error) {
      return {};
    }
  }

  function isNoBidResponse(jsonbidsResponse) {
    return jsonbidsResponse.slots === undefined;
  }

  function _callbackSuccess(slots) {
    return function (bidsResponse) {
      var jsonbidsResponse = parseBidResponse(bidsResponse);

      if (isNoBidResponse(jsonbidsResponse)) {
        return _callbackError(slots)();
      }

      for (var i = 0; i < slots.length; i++) {
        var bidResponse = null;

        // look for the matching bid response
        for (var j = 0; j < jsonbidsResponse.slots.length; j++) {
          if (jsonbidsResponse.slots[j] && jsonbidsResponse.slots[j].impid === slots[i].impId) {
            bidResponse = jsonbidsResponse.slots.splice(j, 1)[0];
            break;
          }
        }

        // register the bid response
        var bidObject = _buildBidObject(bidResponse, slots[i]);
        bidmanager.addBidResponse(slots[i].impId, bidObject);
      }
    };
  }

  function _callbackError(slots) {
    return function () {
      for (var i = 0; i < slots.length; i++) {
        bidmanager.addBidResponse(slots[i].impId, _invalidBidResponse());
      }
    };
  }

  function _invalidBidResponse() {
    var bidObject = bidfactory.createBid(2);
    bidObject.bidderCode = _bidderCode;
    return bidObject;
  }

  function _buildBidObject(bidResponse, slot) {
    var bidObject = void 0;
    if (bidResponse) {
      // map the common fields
      bidObject = bidfactory.createBid(1);
      bidObject.bidderCode = _bidderCode;
      bidObject.cpm = bidResponse.cpm;

      // in case of native
      if (slot.nativeCallback && bidResponse.native) {
        if (typeof slot.nativeCallback !== 'function') {
          utils.logError('Criteo bid: nativeCallback parameter is not a function');
        } else {
          // store the callbacks in a global object
          window.criteo_pubtag.native_slots = window.criteo_pubtag.native_slots || {};
          window.criteo_pubtag.native_slots['' + bidObject.adId] = { callback: slot.nativeCallback, nativeResponse: bidResponse.native };

          // this code is executed in an iframe, we need to get a reference to the
          // publishertag in the main window to retrieve native responses and callbacks.
          // it doesn't work with safeframes
          bidObject.ad = '<script type="text/javascript">\n  let win = window;\n  for (const i=0; i<10; ++i) {\n    win = win.parent;\n    if (win.criteo_pubtag && win.criteo_pubtag.native_slots) {\n      let responseSlot = win.criteo_pubtag.native_slots["' + bidObject.adId + '"];\n      responseSlot.callback(responseSlot.nativeResponse);\n      break;\n    }\n  }\n</script>';
        }
      } else {
        // width and height are only relevant with non-native requests.
        // native requests will always return a 2x2 zone size.
        bidObject.width = bidResponse.width;
        bidObject.height = bidResponse.height;
        bidObject.ad = bidResponse.creative;
      }
    } else {
      bidObject = _invalidBidResponse();
    }
    return bidObject;
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new CriteoAdapter(), 'criteo');

module.exports = CriteoAdapter;

/***/ })

},[98]);