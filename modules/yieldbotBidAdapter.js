/**
 * @overview Yieldbot sponsored Prebid.js adapter.
 * @author elljoh
 */
var adloader = require('src/adloader');
var bidfactory = require('src/bidfactory');
var bidmanager = require('src/bidmanager');
var utils = require('src/utils');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Yieldbot.
 *
 * @returns {Object} Object containing implementation for invocation in {@link module:adaptermanger.callBids}
 * @class
 */
function YieldbotAdapter() {
  window.ybotq = window.ybotq || [];

  var ybotlib = {
    BID_STATUS: {
      PENDING: 0,
      AVAILABLE: 1,
      EMPTY: 2
    },
    definedSlots: [],
    pageLevelOption: false,
    /**
     * Builds the Yieldbot creative tag.
     *
     * @param {String} slot - The slot name to bid for
     * @param {String} size - The dimenstions of the slot
     * @private
     */
    buildCreative: function (slot, size) {
      return '<script type="text/javascript" src="//cdn.yldbt.com/js/yieldbot.intent.js"></script>' +
        '<script type="text/javascript">var ybotq = ybotq || [];' +
        'ybotq.push(function () {yieldbot.renderAd(\'' + slot + ':' + size + '\');});</script>';
    },
    /**
     * Bid response builder.
     *
     * @param {Object} slotCriteria  - Yieldbot bid criteria
     * @private
     */
    buildBid: function (slotCriteria) {
      var bid = {};

      if (slotCriteria && slotCriteria.ybot_ad && slotCriteria.ybot_ad !== 'n') {
        bid = bidfactory.createBid(ybotlib.BID_STATUS.AVAILABLE);

        bid.cpm = parseInt(slotCriteria.ybot_cpm) / 100.0 || 0; // Yieldbot CPM bids are in cents

        var szArr = slotCriteria.ybot_size ? slotCriteria.ybot_size.split('x') : [0, 0];
        var slot = slotCriteria.ybot_slot || '';
        var sizeStr = slotCriteria.ybot_size || ''; // Creative template needs the dimensions string

        bid.width = szArr[0] || 0;
        bid.height = szArr[1] || 0;

        bid.ad = ybotlib.buildCreative(slot, sizeStr);

        // Add Yieldbot parameters to allow publisher bidderSettings.yieldbot specific targeting
        for (var k in slotCriteria) {
          bid[k] = slotCriteria[k];
        }
      } else {
        bid = bidfactory.createBid(ybotlib.BID_STATUS.EMPTY);
      }

      bid.bidderCode = 'yieldbot';
      return bid;
    },
    /**
     * Yieldbot implementation of {@link module:adaptermanger.callBids}
     * @param {Object} params - Adapter bid configuration object
     * @private
     */
    callBids: function (params) {
      var bids = params.bids || [];
      var ybotq = window.ybotq || [];

      ybotlib.pageLevelOption = false;

      ybotq.push(function () {
        var yieldbot = window.yieldbot;
        // Empty defined slots bidId array
        ybotlib.definedSlots = [];
        // Iterate through bids to obtain Yieldbot slot config
        // - Slot config can be different between initial and refresh requests
        var psn = 'ERROR_PREBID_DEFINE_YB_PSN';
        var slots = {};
        utils._each(bids, function (v) {
          var bid = v;
          // bidder params config: http://prebid.org/dev-docs/bidders/yieldbot.html
          // - last psn wins
          psn = (bid.params && bid.params.psn) || psn;
          var slotName = (bid.params && bid.params.slot) || 'ERROR_PREBID_DEFINE_YB_SLOT';

          slots[slotName] = bid.sizes || [];
          ybotlib.definedSlots.push(bid.bidId);
        });

        if (yieldbot._initialized !== true) {
          yieldbot.pub(psn);
          for (var slotName in slots) {
            if (slots.hasOwnProperty(slotName)) {
              yieldbot.defineSlot(slotName, { sizes: slots[slotName] || [] });
            }
          }
          yieldbot.enableAsync();
          yieldbot.go();
        } else {
          yieldbot.nextPageview(slots);
        }
      });

      ybotq.push(function () {
        ybotlib.handleUpdateState();
      });
      adloader.loadScript('//cdn.yldbt.com/js/yieldbot.intent.js', null, true);
    },
    /**
     * Yieldbot bid request callback handler.
     *
     * @see {@link YieldbotAdapter~_callBids}
     * @private
     */
    handleUpdateState: function () {
      var yieldbot = window.yieldbot;
      utils._each(ybotlib.definedSlots, function (v) {
        var ybRequest;
        var adapterConfig;

        ybRequest = $$PREBID_GLOBAL$$._bidsRequested
          .find(bidderRequest => bidderRequest.bidderCode === 'yieldbot');

        adapterConfig = ybRequest && ybRequest.bids ? ybRequest.bids.find(bid => bid.bidId === v) : null;

        if (adapterConfig && adapterConfig.params && adapterConfig.params.slot) {
          var placementCode = adapterConfig.placementCode || 'ERROR_YB_NO_PLACEMENT';
          var criteria = yieldbot.getSlotCriteria(adapterConfig.params.slot);
          var bid = ybotlib.buildBid(criteria);

          bidmanager.addBidResponse(placementCode, bid);
        }
      });
    }
  };
  return {
    callBids: ybotlib.callBids
  };
}

adaptermanager.registerBidAdapter(new YieldbotAdapter(), 'yieldbot');

module.exports = YieldbotAdapter;
