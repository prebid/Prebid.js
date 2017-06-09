var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

var CriteoAdapter = function CriteoAdapter() {
  var sProt = (window.location.protocol === 'http:') ? 'http:' : 'https:';
  var _publisherTagUrl = sProt + '//static.criteo.net/js/ld/publishertag.js';
  var _bidderCode = 'criteo';
  var _profileId = 125;

  function _callBids(params) {
    if (!window.criteo_pubtag || window.criteo_pubtag instanceof Array) {
      // publisherTag not loaded yet

      _pushBidRequestEvent(params);
      adloader.loadScript(
        _publisherTagUrl,
        function () {},
        true
      );
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
    var biddingEventFunc = function () {
      var bids = params.bids || [];

      var slots = [];

      var isAudit = false;

      // build slots before sending one multi-slots bid request
      for (var i = 0; i < bids.length; i++) {
        var bid = bids[i];
        slots.push(
          new Criteo.PubTag.DirectBidding.DirectBiddingSlot(
            bid.placementCode,
            bid.params.zoneId,
            undefined,
            bid.transactionId
          )
        );

        isAudit |= bid.params.audit !== undefined;
      }

      var biddingEvent = new Criteo.PubTag.DirectBidding.DirectBiddingEvent(
        _profileId,
        new Criteo.PubTag.DirectBidding.DirectBiddingUrlBuilder(isAudit),
        slots,
        _callbackSuccess(slots),
        _callbackError(slots),
        _callbackError(slots) // timeout handled as error
      );

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

      if (isNoBidResponse(jsonbidsResponse)) { return _callbackError(slots)(); }

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
        var bidObject;
        if (bidResponse) {
          bidObject = bidfactory.createBid(1);
          bidObject.bidderCode = _bidderCode;
          bidObject.cpm = bidResponse.cpm;
          bidObject.ad = bidResponse.creative;
          bidObject.width = bidResponse.width;
          bidObject.height = bidResponse.height;
        } else {
          bidObject = _invalidBidResponse();
        }
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

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new CriteoAdapter, 'criteo');

module.exports = CriteoAdapter;
