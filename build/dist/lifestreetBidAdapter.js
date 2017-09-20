pbjsChunk([51],{

/***/ 147:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(148);


/***/ }),

/***/ 148:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var utils = __webpack_require__(0);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var LifestreetAdapter = function LifestreetAdapter() {
  var BIDDER_CODE = 'lifestreet';
  var ADAPTER_VERSION = 'prebidJS-1.0';
  var SLOTS_LOAD_MAP = {};
  var PREBID_REQUEST_MESSAGE = 'LSMPrebid Request';
  var PREBID_RESPONSE_MESSAGE = 'LSMPrebid Response';

  function _callBids(params) {
    utils._each(params.bids, (function (bid) {
      var jstagUrl = bid.params.jstag_url;
      var slot = bid.params.slot;
      var adkey = bid.params.adkey;
      var adSize = bid.params.ad_size;
      var timeout = 700;
      if (bid.params.timeout) {
        timeout = bid.params.timeout;
      }
      var shouldRequest = false;
      if (jstagUrl && jstagUrl.length > 0 && slot && slot.length > 0 && adkey && adkey.length > 0 && adSize && adSize.length > 0) {
        var adSizeArray = adSize.split('x');
        for (var i = 0; i < adSizeArray.length; ++i) {
          adSizeArray[i] = +adSizeArray[i];
        }
        if (bid.sizes && bid.sizes instanceof Array && bid.sizes.length > 0 && adSizeArray.length > 1) {
          bid.sizes = !(bid.sizes[0] instanceof Array) ? [bid.sizes] : bid.sizes;
          for (var _i = 0; _i < bid.sizes.length; ++_i) {
            var size = bid.sizes[_i];
            if (size.length > 1) {
              if (size[0] === adSizeArray[0] && size[1] === adSizeArray[1]) {
                shouldRequest = true;
                break;
              }
            }
          }
        } else {
          shouldRequest = true;
        }
      }
      if (shouldRequest) {
        _callJSTag(bid, jstagUrl, timeout);
      } else {
        _addSlotBidResponse(bid, 0, null, 0, 0);
      }
    }));
  }

  function _callJSTag(bid, jstagUrl, timeout) {
    adloader.loadScript(jstagUrl, (function () {
      /* global LSM_Slot */
      if (LSM_Slot && typeof LSM_Slot === 'function') {
        var slotTagParams = {
          _preload: 'wait',
          _hb_request: ADAPTER_VERSION,
          _timeout: timeout,
          _onload: function _onload(slot, action, cpm, width, height) {
            if (slot.state() !== 'error') {
              var slotName = slot.getSlotObjectName();
              pbjs[slotName] = slot;
              if (slotName && !SLOTS_LOAD_MAP[slotName]) {
                SLOTS_LOAD_MAP[slotName] = true;
                var ad = _constructLSMAd(jstagUrl, slotName);
                _addSlotBidResponse(bid, cpm, ad, width, height);
              } else {
                slot.show();
              }
            } else {
              _addSlotBidResponse(bid, 0, null, 0, 0);
            }
          }
        };
        for (var property in bid.params) {
          if (property === 'jstag_url' || property === 'timeout') {
            continue;
          }
          if (bid.params.hasOwnProperty(property)) {
            slotTagParams[property] = bid.params[property];
          }
        }
        LSM_Slot(slotTagParams);
        window.addEventListener('message', (function (ev) {
          var key = ev.message ? 'message' : 'data';
          var object = {};
          try {
            object = JSON.parse(ev[key]);
          } catch (e) {
            return;
          }
          if (object.message && object.message === PREBID_REQUEST_MESSAGE && object.slotName && window.pbjs[object.slotName]) {
            ev.source.postMessage(JSON.stringify({
              message: PREBID_RESPONSE_MESSAGE,
              slotObject: window.pbjs[object.slotName]
            }), '*');
            window.pbjs[object.slotName].destroy();
            window.pbjs[object.slotName] = null;
          }
        }), false);
      } else {
        _addSlotBidResponse(bid, 0, null, 0, 0);
      }
    }));
  }

  function _addSlotBidResponse(bid, cpm, ad, width, height) {
    var hasResponse = cpm && ad && ad.length > 0;
    var bidObject = bidfactory.createBid(hasResponse ? 1 : 2, bid);
    bidObject.bidderCode = BIDDER_CODE;
    if (hasResponse) {
      bidObject.cpm = cpm;
      bidObject.ad = ad;
      bidObject.width = width;
      bidObject.height = height;
    }
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  function _constructLSMAd(jsTagUrl, slotName) {
    if (jsTagUrl && slotName) {
      return '<div id="LSM_AD"></div>\n             <script type="text/javascript" src=\'' + jsTagUrl + '\'></script>\n             <script>\n              function receivedLSMMessage(ev) {\n                var key = ev.message ? \'message\' : \'data\';\n                var object = {};\n                try {\n                  object = JSON.parse(ev[key]);\n                } catch (e) {\n                  return;\n                }\n                if (object.message === \'' + PREBID_RESPONSE_MESSAGE + '\' && object.slotObject) {\n                  var slot  = object.slotObject;\n                  slot.__proto__ = slotapi.Slot.prototype;\n                  slot.getProperties()[\'_onload\'] = function(slot) {\n                    if (slot.state() !== \'error\') {\n                      slot.show();\n                    }\n                  };\n                  window[slot.getSlotObjectName()] = slot;\n                  slot.showInContainer(document.getElementById("LSM_AD"));\n                }\n              }\n              window.addEventListener(\'message\', receivedLSMMessage, false);\n              window.parent.postMessage(JSON.stringify({\n                message: \'' + PREBID_REQUEST_MESSAGE + '\',\n                slotName: \'' + slotName + '\'\n              }), \'*\');\n            </script>';
    }
    return null;
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new LifestreetAdapter(), 'lifestreet');

module.exports = LifestreetAdapter;

/***/ })

},[147]);