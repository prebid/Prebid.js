/**
 * @file yieldbot adapter
 */
var utils = require('../utils'),
    adloader = require('../adloader'),
    bidmanager = require('../bidmanager'),
    bidfactory = require('../bidfactory');

function YieldbotAdapter() {

  var toString = Object.prototype.toString,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      ybq = window.ybotq || (window.ybotq = []),
      bidmap = {};

  // constants
  var YB = 'YIELDBOT',
      YB_URL = '//cdn.yldbt.com/js/yieldbot.intent.js',
      CREATIVE_TEMPLATE = "<script type='text/javascript' src='" +
        YB_URL + "'></script><script type='text/javascript'>var ybotq=ybotq||[];" +
        "ybotq.push(function(){yieldbot.renderAd('%%SLOT%%:%%SIZE%%');})" +
        "</script>";

  var yb = {

    /**
     * Normalize a size; if the user gives us
     * a dim array, produce a wxh string
     * @param {String|Array} size
     * @return {String} WxH string
     */
    formatSize: function (size) {
      return utils.isArray(size) ? size.join('x') : size;
    },

    /**
     * Return a creative from its template
     * @param {String} slot -- this is the yieldbot slot code
     * @param {String|Array} size that the bid was for
     * @return {String} the creative's HTML
     */
    creative: function (slot, size) {

      var args = {
        slot: slot,
        size: yb.formatSize(size),
      };

      return utils.replaceTokenInString(CREATIVE_TEMPLATE, args, '%%');
    },

    /**
     * Produce a bid for our bidmanager,
     * set the relevant attributes from
     * our returned yieldbot string
     * @param {String} yieldBotStr the string from yieldbot page targeting
     * @return {Bid} a bid for the bidmanager
     */
    makeBid: function (placement, slot, params) {
      var dim = params.ybot_size.split('x'),
          bid = bidfactory.createBid(1);

      bid.bidderCode = 'yieldbot';
      bid.width = parseInt(dim[0]);
      bid.height = parseInt(dim[1]);
      bid.code = slot;
      bid.size = params.ybot_size;
      bid.cpm = parseInt(params.ybot_cpm) / 100.0;
      bid.ad = yb.creative(slot, params.ybot_size);
      bid.placementCode = placement;

      return bid;
    },

    /**
     * Add a slot to yieldbot (to request a bid)
     * @param {Bid} bid this should be a bid from prebid
     */
    registerSlot: function (bid) {
      ybq.push(function () {
        bidmap[bid.params.name] = bid.placementCode;
        yieldbot.defineSlot(bid.params.name, {
          sizes: bid.params.sizes
        });
      });
    }
  };

  function addErrorBid(placementCode, yslot, params) {
    var bid = bidfactory.createBid(2);
    bid.bidderCode = 'yieldbot';
    bid.placementCode = placementCode;
    bid.code = yslot;
    bid.__raw = params;

    utils.logError('invalid response; adding error bid: ' + placementCode, YB);
    bidmanager.addBidResponse(placementCode, bid);
  }

  /**
   * Handle the response from yieldbot;
   * this is pushed into the yieldbot queue
   * after we set up all of the slots.
   */
  function responseHandler() {
    utils._each(bidmap, function (placementCode, yslot) {
      // get the params for the slot
      var params = yieldbot.getSlotCriteria(yslot);

      if (!params || ((params || {}).ybot_ad === 'n')) {
        return addErrorBid(placementCode, yslot, params);
      }

      var bid = yb.makeBid(placementCode, yslot, params);
      bidmanager.addBidResponse(placementCode, bid);
    });
  }

  /**
   * @public call bids; set the slots
   * for yieldbot + add the publisher id.
   * @param {Object} params
   * @param {Array<Bid>} params.bids the bids we want to make
   */
  function _callBids(params) {
    // download the yieldbot intent tag
    adloader.loadScript(YB_URL);

    utils._each(params.bids, function (bid, i) {

      if (!bid.params) {
        utils.logError("invalid bid!", YB);
        return;
      }

      // normalize the bid & fallback onto the slot
      // for the sizes; in case they said `code`, make it `name`
      bid.params.sizes = utils.isEmpty(bid.params.sizes) ? bid.sizes : bid.params.sizes;
      bid.params.name = bid.params.name || bid.params.code;

      // on the first bid,
      // set the yieldbot publisher id
      if (i === 0) {
        if (!bid.params.pub) {
          utils.logError("no publisher id provided!", YB);
          return;
        }

        ybq.push(function(){ yieldbot.pub(bid.params.pub);});
      }

      yb.registerSlot(bid);
    });

    ybq.push(function () {
      yieldbot.enableAsync();
      yieldbot.go();
    });

    ybq.push(responseHandler);
  }

  return {
    callBids: _callBids
  };
}

module.exports = YieldbotAdapter;
