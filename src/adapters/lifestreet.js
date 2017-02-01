const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager');
const utils = require('../utils.js');
const adloader = require('../adloader');

const LifestreetAdapter = function LifestreetAdapter() {
  const BIDDER_CODE = 'lifestreet';
  const ADAPTER_VERSION = 'prebidJS-1.0';
  const SLOTS_LOAD_MAP = {};

  function _callBids(params) {
    utils._each(params.bids, bid => {
      const jstagUrl = bid.params.jstag_url;
      const slot = bid.params.slot;
      const adkey = bid.params.adkey;
      const adSize = bid.params.ad_size;
      let timeout = 700;
      if (bid.params.timeout) {
        timeout = bid.params.timeout;
      }
      let shouldRequest = false;
      if (jstagUrl && jstagUrl.length > 0 && slot && slot.length > 0 &&
          adkey && adkey.length > 0 && adSize && adSize.length > 0) {
        let adSizeArray = adSize.split('x');
        for (let i = 0; i < adSizeArray.length; ++i) {
          adSizeArray[i] = +adSizeArray[i];
        }
        if (bid.sizes && (bid.sizes instanceof Array) && bid.sizes.length > 0 && adSizeArray.length > 1) {
          bid.sizes = !(bid.sizes[0] instanceof Array) ? [ bid.sizes ] : bid.sizes;
          for (let i = 0; i < bid.sizes.length; ++i) {
            let size = bid.sizes[i];
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
        _callJSTag(bid.placementCode, jstagUrl, timeout, bid.params);
      } else {
        _addSlotBidResponse(bid.placementCode, 0, null, 0, 0);
      }
    });
  }

  function _callJSTag(placementCode, jstagUrl, timeout, params) {
    adloader.loadScript(jstagUrl, () => {
      /*global LSM_Slot */
      if (LSM_Slot && typeof LSM_Slot === 'function') {
        let slotTagParams = {
          _preload: 'wait',
          _hb_request: ADAPTER_VERSION,
          _timeout: timeout,
          _onload: (slot, action, cpm, width, height) => {
            if (slot.state() !== 'error') {
              let slotName = slot.getSlotObjectName();
              $$PREBID_GLOBAL$$[slotName] = slot;
              if (slotName && !SLOTS_LOAD_MAP[slotName]) {
                SLOTS_LOAD_MAP[slotName] = true;
                let ad = `<div id="LSM_AD"></div>
                    <script>window.parent.$$PREBID_GLOBAL$$["` + slotName + `"]
                    .showInContainer(document.getElementById("LSM_AD"));</script>`;
                _addSlotBidResponse(placementCode, cpm, ad, width, height);
              } else {
                slot.show();
              }
            } else {
              _addSlotBidResponse(placementCode, 0, null, 0, 0);
            }
          }
        };
        for (let property in params) {
          if (property === 'jstag_url' || property === 'timeout') {
            continue;
          }
          if (params.hasOwnProperty(property)) {
            slotTagParams[property] = params[property];
          }
        }
        /*jshint newcap: false */
        LSM_Slot(slotTagParams);
      } else {
        _addSlotBidResponse(placementCode, 0, null, 0, 0);
      }
    });
  }

  function _addSlotBidResponse(placementCode, cpm, ad, width, height) {
    let hasResponse = cpm && ad && ad.length > 0;
    let bidObject = bidfactory.createBid(hasResponse ? 1 : 2);
    bidObject.bidderCode = BIDDER_CODE;
    if (hasResponse) {
      bidObject.cpm = cpm;
      bidObject.ad = ad;
      bidObject.width = width;
      bidObject.height = height;
    }
    bidmanager.addBidResponse(placementCode, bidObject);
  }

  return {
    callBids: _callBids
  };
};

module.exports = LifestreetAdapter;