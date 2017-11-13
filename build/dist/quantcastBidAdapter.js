pbjsChunk([3],{

/***/ 215:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(216);
module.exports = __webpack_require__(217);


/***/ }),

/***/ 216:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = exports.QUANTCAST_TTL = exports.QUANTCAST_TEST_PUBLISHER = exports.QUANTCAST_NET_REVENUE = exports.QUANTCAST_CALLBACK_URL_TEST = exports.QUANTCAST_CALLBACK_URL = undefined;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(9);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var BIDDER_CODE = 'quantcast';
var DEFAULT_BID_FLOOR = 0.0000000001;

var QUANTCAST_CALLBACK_URL = exports.QUANTCAST_CALLBACK_URL = 'global.qc.rtb.quantserve.com';
var QUANTCAST_CALLBACK_URL_TEST = exports.QUANTCAST_CALLBACK_URL_TEST = 's2s-canary.quantserve.com';
var QUANTCAST_NET_REVENUE = exports.QUANTCAST_NET_REVENUE = true;
var QUANTCAST_TEST_PUBLISHER = exports.QUANTCAST_TEST_PUBLISHER = 'test-publisher';
var QUANTCAST_TTL = exports.QUANTCAST_TTL = 4;

/**
 * The documentation for Prebid.js Adapter 1.0 can be found at link below,
 * http://prebid.org/dev-docs/bidder-adapter-1.html
 */
var spec = exports.spec = {
  code: BIDDER_CODE,

  /**
   * Verify the `AdUnits.bids` response with `true` for valid request and `false`
   * for invalid request.
   *
   * @param {object} bid
   * @return boolean `true` is this is a valid bid, and `false` otherwise
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    if (!bid) {
      return false;
    }

    if (bid.mediaType === 'video') {
      return false;
    }

    return true;
  },


  /**
   * Make a server request when the page asks Prebid.js for bids from a list of
   * `BidRequests`.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be send to Quantcast server
   * @return ServerRequest information describing the request to the server.
   */
  buildRequests: function buildRequests(bidRequests) {
    var bids = bidRequests || [];

    var referrer = utils.getTopWindowUrl();
    var loc = utils.getTopWindowLocation();
    var domain = loc.hostname;

    var publisherTagURL = void 0;
    var publisherTagURLTest = void 0;

    // Switch the callback URL to Quantcast Canary Endpoint for testing purpose
    // `//` is not used because we have different port setting at our end
    switch (window.location.protocol) {
      case 'https:':
        publisherTagURL = 'https://' + QUANTCAST_CALLBACK_URL + ':8443/qchb';
        publisherTagURLTest = 'https://' + QUANTCAST_CALLBACK_URL_TEST + ':8443/qchb';
        break;
      default:
        publisherTagURL = 'http://' + QUANTCAST_CALLBACK_URL + ':8080/qchb';
        publisherTagURLTest = 'http://' + QUANTCAST_CALLBACK_URL_TEST + ':8080/qchb';
    }

    var bidRequestsList = bids.map((function (bid) {
      var bidSizes = [];

      bid.sizes.forEach((function (size) {
        bidSizes.push({
          width: size[0],
          height: size[1]
        });
      }));

      // Request Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
      var requestData = {
        publisherId: bid.params.publisherId,
        requestId: bid.bidId,
        imp: [{
          banner: {
            battr: bid.params.battr,
            sizes: bidSizes
          },
          placementCode: bid.placementCode,
          bidFloor: bid.params.bidFloor || DEFAULT_BID_FLOOR
        }],
        site: {
          page: loc.href,
          referrer: referrer,
          domain: domain
        },
        bidId: bid.bidId
      };

      var data = JSON.stringify(requestData);

      var url = bid.params.publisherId === QUANTCAST_TEST_PUBLISHER ? publisherTagURLTest : publisherTagURL;

      return {
        data: data,
        method: 'POST',
        url: url
      };
    }));

    return bidRequestsList;
  },


  /**
   * Function get called when the browser has received the response from Quantcast server.
   * The function parse the response and create a `bidResponse` object containing one/more bids.
   * Returns an empty array if no valid bids
   *
   * Response Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
   *
   * @param {*} serverResponse A successful response from Quantcast server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   *
   */
  interpretResponse: function interpretResponse(serverResponse) {
    if (serverResponse === undefined) {
      utils.logError('Server Response is undefined');
      return [];
    }

    var response = serverResponse['body'];

    if (response === undefined || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
      utils.logError('Sub-optimal JSON received from Quantcast server');
      return [];
    }

    var bidResponsesList = response.bids.map((function (bid) {
      var ad = bid.ad,
          cpm = bid.cpm,
          width = bid.width,
          height = bid.height,
          creativeId = bid.creativeId,
          currency = bid.currency;


      return {
        requestId: response.requestId,
        cpm: cpm,
        width: width,
        height: height,
        ad: ad,
        ttl: QUANTCAST_TTL,
        creativeId: creativeId,
        netRevenue: QUANTCAST_NET_REVENUE,
        currency: currency
      };
    }));

    return bidResponsesList;
  }
};

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 217:
/***/ (function(module, exports) {



/***/ })

},[215]);