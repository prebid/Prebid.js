import Adapter from '../src/adapter';
import { createBid } from '../src/bidfactory';
import * as utils from '../src/utils';
import adapterManager from '../src/adapterManager';
import { STATUS, S2S } from '../src/constants';
import { config } from '../src/config';

const TYPE = S2S.SRC;
const getConfig = config.getConfig;
const REQUIRED_S2S_CONFIG_KEYS = ['siteId', 'networkId', 'bidders'];

let _s2sConfig;

const bidder = 'serverbidServer';

var ServerBidServerAdapter;
ServerBidServerAdapter = function ServerBidServerAdapter() {
  const baseAdapter = new Adapter('serverbidServer');

  const BASE_URI = 'https://e.serverbid.com/api/v2';

  const sizeMap = [
    null,
    '120x90',
    '120x90',
    '468x60',
    '728x90',
    '300x250',
    '160x600',
    '120x600',
    '300x100',
    '180x150',
    '336x280',
    '240x400',
    '234x60',
    '88x31',
    '120x60',
    '120x240',
    '125x125',
    '220x250',
    '250x250',
    '250x90',
    '0x0',
    '200x90',
    '300x50',
    '320x50',
    '320x480',
    '185x185',
    '620x45',
    '300x125',
    '800x250'
  ];

  sizeMap[77] = '970x90';
  sizeMap[123] = '970x250';
  sizeMap[43] = '300x600';

  function setS2sConfig(options) {
    if (options.adapter != bidder) return;

    let contains = (xs, x) => xs.indexOf(x) > -1;
    let userConfig = Object.keys(options);

    REQUIRED_S2S_CONFIG_KEYS.forEach(key => {
      if (!contains(userConfig, key)) {
        utils.logError(key + ' missing in server to server config');
        return void 0; // void 0 to beat the linter
      }
    })

    _s2sConfig = options;
  }
  getConfig('s2sConfig', ({s2sConfig}) => setS2sConfig(s2sConfig));

  function getLocalConfig() {
    return (_s2sConfig || {});
  }

  function _convertFields(bid) {
    let safeBid = bid || {};
    let converted = {};
    let name = safeBid.bidder;
    converted[name] = safeBid.params;
    return converted;
  }

  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    let params = s2sBidRequest;
    let shouldDoWorkFn = function(bidRequest) {
      return bidRequest &&
        bidRequest.ad_units &&
        utils.isArray(bidRequest.ad_units) &&
        bidRequest.ad_units.length;
    }
    if (shouldDoWorkFn(params)) {
      _callBids(s2sBidRequest, bidRequests, addBidResponse, done, ajax);
    }
  };

  function _callBids(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    let bidRequest = s2sBidRequest;

    const data = {
      placements: [],
      time: Date.now(),
      user: {},
      url: utils.getTopWindowUrl(),
      referrer: document.referrer,
      enableBotFiltering: true,
      includePricingData: true,
      parallel: true
    };
    const allBids = [];

    for (let i = 0; i < bidRequest.ad_units.length; i++) {
      let adunit = bidRequest.ad_units[i];
      let siteId = _s2sConfig.siteId;
      let networkId = getLocalConfig().networkId;
      let sizes = adunit.sizes;

      var bids = adunit.bids || [];
      // one placement for each of the bids
      for (let i = 0; i < bids.length; i++) {
        const bid = bids[i];
        bid.code = adunit.code;
        allBids.push(bid);

        const placement = Object.assign({}, {
          divName: bid.bid_id,
          networkId: networkId,
          siteId: siteId,
          adTypes: bid.adTypes || getSize(sizes),
          bidders: _convertFields(bid),
          skipSelection: true
        });

        if (placement.networkId && placement.siteId) {
          data.placements.push(placement);
        }
      }
    }
    if (data.placements.length) {
      ajax(BASE_URI, _responseCallback(addBidResponse, allBids, done), JSON.stringify(data), { method: 'POST', withCredentials: true, contentType: 'application/json' });
    }
  }

  function _responseCallback(addBidResponse, bids, done) {
    return function (resp) {
      let bid;
      let bidId;
      let result;
      let bidObj;
      let bidCode;
      let placementCode;
      let skipSelectionRequestsReturnArray = function (decision) {
        return (decision || []).length ? decision[0] : {};
      };

      try {
        result = JSON.parse(resp);
      } catch (error) {
        utils.logError(error);
      }

      for (let i = 0; i < bids.length; i++) {
        bidObj = bids[i];
        bidId = bidObj.bid_id;
        bidObj.bidId = bidObj.bid_id;
        bidCode = bidObj.bidder;
        placementCode = bidObj.code;
        let noBid = function(bidObj) {
          bid = createBid(STATUS.NO_BID, bidObj);
          bid.bidderCode = bidCode;
          return bid;
        };

        if (result) {
          const decision = result.decisions && skipSelectionRequestsReturnArray(result.decisions[bidId]);
          const price = decision && decision.pricing && decision.pricing.clearPrice;

          if (decision && price) {
            bid = createBid(STATUS.GOOD, bidObj);
            bid = Object.assign(bid, {bidderCode: bidCode,
              cpm: price,
              width: decision.width,
              height: decision.height,
              ad: retrieveAd(decision)})
          } else {
            bid = noBid(bidObj);
          }
        } else {
          bid = noBid(bidObj);
        }
        addBidResponse(placementCode, bid);
      }
      done()
    }
  };

  function retrieveAd(decision) {
    return decision.contents && decision.contents[0] && decision.contents[0].body + utils.createTrackPixelHtml(decision.impressionUrl);
  }

  function getSize(sizes) {
    let width = 'w';
    let height = 'h';
    const result = [];
    sizes.forEach(function(size) {
      const index = sizeMap.indexOf(size[width] + 'x' + size[height]);
      if (index >= 0) {
        result.push(index);
      }
    });
    return result;
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return Object.assign(this, {
    queueSync: baseAdapter.queueSync,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
};

ServerBidServerAdapter.createNew = function() {
  return new ServerBidServerAdapter();
};

adapterManager.registerBidAdapter(new ServerBidServerAdapter(), bidder);

export default ServerBidServerAdapter;
