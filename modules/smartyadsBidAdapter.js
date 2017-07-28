import * as Adapter from 'src/adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const SMARTYADS_BIDDER_CODE = 'smartyads';

var sizeMap = {
  1: '468x60',
  2: '728x90',
  8: '120x600',
  9: '160x600',
  10: '300x600',
  15: '300x250',
  16: '336x280',
  19: '300x100',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  61: '1000x1000',
  65: '640x480',
  67: '320x480',
  68: '1800x1000',
  72: '320x320',
  73: '320x160',
  83: '480x300',
  94: '970x310',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600'
};

utils._each(sizeMap, (item, key) => sizeMap[item] = key);

function SmartyadsAdapter() {
  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach((bid) => {
      try {
        ajax(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
      } catch (err) {
        utils.logError('Error sending smartyads request for placement code ' + bid.placementCode, null, err);
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(`${err} when processing smartyads response for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing smartyads response for placement code ' + bid.placementCode, null, err);
          }

          // indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.placementCode, badBid);
        }
      }
    });
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    // use smartyads sizes if provided, otherwise adUnit.sizes
    var parsedSizes = SmartyadsAdapter.masSizeOrdering(
      Array.isArray(bid.params.sizes) ? bid.params.sizes.map(size => (sizeMap[size] || '').split('x')) : bid.sizes
    );

    if (parsedSizes.length < 1) {
      throw 'no valid sizes';
    }

    var secure;
    if (window.location.protocol !== 'http:') {
      secure = 1;
    } else {
      secure = 0;
    }

    var host = window.location.host,
      page = window.location.pathname,
      language = navigator.language,
      deviceWidth = window.screen.width,
      deviceHeight = window.screen.height;

    var queryString = [
      'banner_id', bid.params.banner_id,
      'size_ad', parsedSizes[0],
      'alt_size_ad', parsedSizes.slice(1).join(',') || undefined,
      'host', host,
      'page', page,
      'language', language,
      'deviceWidth', deviceWidth,
      'deviceHeight', deviceHeight,
      'secure', secure,
      'bidId', bid.bidId,
      'checkOn', 'rf'
    ];

    return queryString.reduce(
      (memo, curr, index) =>
        index % 2 === 0 && queryString[index + 1] !== undefined
          ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&'
          : memo,
      '//ssp-nj.webtradehub.com/?'
    ).slice(0, -1);
  }

  function handleRpCB(responseText, bidRequest) {
    let ad = JSON.parse(responseText); // can throw

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

  return Object.assign(Adapter.createNew(SMARTYADS_BIDDER_CODE), { // SMARTYADS_BIDDER_CODE smartyads
    callBids: _callBids,
    createNew: SmartyadsAdapter.createNew
  });
}

SmartyadsAdapter.masSizeOrdering = function (sizes) {
  const MAS_SIZE_PRIORITY = [15, 2, 9];

  return utils.parseSizesInput(sizes)
  // map sizes while excluding non-matches
    .reduce((result, size) => {
      let mappedSize = parseInt(sizeMap[size], 10);
      if (mappedSize) {
        result.push(mappedSize);
      }
      return result;
    }, [])
    .sort((first, second) => {
      // sort by MAS_SIZE_PRIORITY priority order
      let firstPriority = MAS_SIZE_PRIORITY.indexOf(first),
        secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

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

SmartyadsAdapter.createNew = function () {
  return new SmartyadsAdapter();
};

adaptermanager.registerBidAdapter(new SmartyadsAdapter(), 'smartyads');

module.exports = SmartyadsAdapter;
