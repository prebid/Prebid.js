var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from OpenX.
 *
 * @param {Object} options - Configuration options for OpenX
 * @param {string} options.pageURL - Current page URL to send with bid request
 * @param {string} options.refererURL - Referer URL to send with bid request
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var OpenxAdapter = function OpenxAdapter(options) {

	var opts = options || {};
	var scriptUrl;
	var bids;
  var bidsByAdUnitId = {};
  var oxResponse;
  var OX_RENDER_FN_NAME = 'ox_renderAd',
      OX_CREATIVE_TAG_START = "<script type='text/javascript'>window.top.pbjs." + OX_RENDER_FN_NAME + "(window.frameElement, '",
      OX_CREATIVE_TAG_END = "');</script>";

	function _callBids(params) {
		bids = params.bids || [];
		for (var i = 0; i < bids.length; i++) {
			var bid = bids[i];
			//load page options from bid request
			if (bid.params.pageURL) {
				opts.pageURL = bid.params.pageURL;
			}
			if (bid.params.refererURL) {
				opts.refererURL = bid.params.refererURL;
			}
			if (bid.params.jstag_url) {
				scriptUrl = bid.params.jstag_url;
			}
			if (bid.params.pgid) {
				opts.pgid = bid.params.pgid;
			}
		}
		_requestBids();
	}

  function _creative(adUnitId, adId) {
    return OX_CREATIVE_TAG_START + adUnitId + "','" + adId + OX_CREATIVE_TAG_END;
  }

  function _createBidResponse(adUnit) {
    var adResponse = adResponse = bidfactory.createBid(1);
    adResponse.bidderCode = 'openx';
    adResponse.ad_id = adUnit.get('ad_id');
    adResponse.cpm = Number(adUnit.get('pub_rev')) / 1000;
    adResponse.ad = _creative(adUnit.get('adunit_id'), adUnit.get('ad_id'));
    adResponse.adUrl = adUnit.get('ad_url');
    adResponse.width = adUnit.get('width');
    adResponse.height = adUnit.get('height');
    return adResponse;
  }

  function _createErrorResponse(adUnit) {
    var adResponse = bidfactory.createBid(2);
    adResponse.bidderCode = 'openx';
    return adResponse;
  }

  // add the rendering function to the window;
  // we need to do this because we have to render using the openx
  // response that we received; by doing this we'll get the correct
  // tracking pixels/creative payload from openx
  function _bootstrapOpenX() {
    window.pbjs = window.pbjs || {que: []};
    window.pbjs[OX_RENDER_FN_NAME] = function (frameElement, adUnitId, adId) {
      var bidResponses = bidsByAdUnitId[adUnitId];

      if (!bidResponses) {
        utils.logError('OPENX', 'ERROR', 'invalid adunitId returned in creative: ' + adUnitId);
        return;
      }

      if (!oxResponse) {
        utils.logError('OPENX creative rendered without response', 'ERROR');
        return;
      }

      var adUnit = bidResponses[adId];
      if (!adUnit) {
        utils.logError('OPENX no adunit found for ad id: ' + adId, 'ERROR');
        return;
      }

      // tell the adunit where to render;
      // otherwise it will try to render in the parent (current)
      // window
      adUnit.set('anchor', frameElement);
      oxResponse.showAdUnit(parseInt(adUnitId));
    };
  }

	function _requestBids() {

    if (!scriptUrl) {
      utils.logError('OPENX - no script url given!', 'ERROR');
      return;
    }

    adloader.loadScript(scriptUrl, function() {
      var POX = OX();

      POX.frameCreatives(false);
      POX.setPageURL(opts.pageURL);
      POX.setRefererURL(opts.refererURL);
      POX.addPage(opts.pgid);

      utils._each(bids, function (bid) {
        POX.addAdUnit(bid.params.unit);
      });

      _bootstrapOpenX();

      POX.addHook(function(response) {
        oxResponse = response;

        utils._each(bids, function (bid) {
          var adUnit = response.getOrCreateAdUnit(bid.params.unit),
              adUnitId = adUnit.get('adunit_id') + '';


          // we support multiple bids for the same ad unit id
          // this is how we're going to actually render the ad
          bidsByAdUnitId[adUnitId] = bidsByAdUnitId[adUnitId] || {};
          bidsByAdUnitId[adUnitId][adUnit.get('ad_id') + ''] = adUnit;

          var adResponse;
          if (adUnit.get('pub_rev')) {
            adResponse = _createBidResponse(bid, adUnit);
          } else {
            adResponse = _createErrorResponse(bid, adUnit);
          }

          bidmanager.addBidResponse(bid.placementCode, adResponse);
        });

      }, OX.Hooks.ON_AD_RESPONSE);

      // Make request
      POX.load();
    });

	}

	return {
		callBids: _callBids
	};
};

module.exports = OpenxAdapter;
