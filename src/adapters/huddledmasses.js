import * as Adapter from './adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

var BIDDER_CODE = 'huddledmasses';

var sizeObj = {
  1: '468x60',
  2: '728x90',
  10: '300x600',
  15: '300x250',
  19: '300x100',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  65: '640x480',
  67: '320x480',
  72: '320x320',
  73: '320x160',
  83: '480x300',
  94: '970x310',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  113: '1000x300',
  117: '320x100',
  118: '800x250',
  119: '200x600'
};

utils._each(sizeObj, (item, key) => sizeObj[item] = key);

function HuddledMassesAdapter() {
  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach((bid) => {
      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === "string") {
            utils.logWarn(`${err} when processing huddledmasses response for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing huddledmasses response for placement code ' + bid.placementCode, null, err);
          }
          var badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.placementCode, badBid);
        }
      }

      try {
        ajax(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
      } catch (err) {
        utils.logError('Error sending huddledmasses request for placement code ' + bid.placementCode, null, err);
      }
    });
  }

  function buildOptimizedCall(bid) {
    bid.startTime = (new Date()).getTime();

    var parsedSizes = HuddledMassesAdapter.masSizeOrdering(
      Array.isArray(bid.params.sizes) ? bid.params.sizes.map(size => (sizeObj[size] || '').split('x')) : bid.sizes
    );

    if (parsedSizes.length < 1) {
      throw "no valid sizes";
    }

    var secure = 0;
    if (window.location.protocol !== 'http:') {
      secure = 1;
    }

    var host = window.location.host;
    var page = window.location.pathname;
    var language = navigator.language;
    var deviceWidth = window.screen.width;
    var deviceHeight = window.screen.height;

    var queryString = [
            'banner_id', bid.params.placement_id,
            'size_ad', parsedSizes[0],
            'alt_size_ad', parsedSizes.slice(1).join(',') || [],
            'host', host,
            "page", page,
            "language", language,
            "deviceWidth", deviceWidth,
            "deviceHeight", deviceHeight,
            "secure", secure,
            "bidId", bid.bidId,
            "checkOn", 'rf'
    ];

    return queryString.reduce(
            (memo, curr, index) =>
                index % 2 === 0 && queryString[index + 1] !== undefined ?
                memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&'
                    : memo,
            '//huddledmassessupply.com/?'
    ).slice(0, -1);
  }

  function handleRpCB(responseText, bidRequest) {
    var ad = JSON.parse(responseText);

    var bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
    bid.creative_id = ad.ad_id;
    bid.bidderCode = bidRequest.bidder;
    bid.cpm = ad.cpm || 0;
    bid.ad = ad.adm;
    bid.width = ad.width;
    bid.height = ad.height;
    bid.dealId = ad.deal;

    bidmanager.addBidResponse(bidRequest.placementCode, bid);
  }

  return Object.assign(Adapter.createNew(BIDDER_CODE), {      // BIDDER_CODE huddledmasses
    callBids: _callBids,
    createNew: HuddledMassesAdapter.createNew
  });
}

HuddledMassesAdapter.masSizeOrdering = function (sizes) {
  var MAS_SIZE_PRIORITY = [15, 2, 9];
  return utils.parseSizesInput(sizes)
        .reduce((result, size) => {
          var mappedSize = parseInt(sizeObj[size], 10);
          if (mappedSize) {
            result.push(mappedSize);
          }
          return result;
        }, [])
        .sort((first, second) => {
          var firstPriority = MAS_SIZE_PRIORITY.indexOf(first);
          var secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

          if (firstPriority > -1 || secondPriority > -1) {
            if (firstPriority === -1) {
              return 1;
            }
            if (secondPriority === -1) {
              return -1;
            }
            return firstPriority - secondPriority;
          }

          return first - second;
        });
};

HuddledMassesAdapter.createNew = function () {
  return new HuddledMassesAdapter();
};

module.exports = HuddledMassesAdapter;