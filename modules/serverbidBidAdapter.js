import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'serverbid';

const CONFIG = {
  'serverbid': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  },
  'connectad': {
    'BASE_URI': 'https://i.connectad.io/api/v2'
  },
  'onefiftytwo': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  },
  'insticator': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  },
  'adsparc': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  },
  'automatad': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  },
  'archon': {
    'BASE_URI': 'https://e.serverbid.com/api/v2'
  }
};

let siteId = 0;
let bidder = 'serverbid';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['connectad', 'onefiftytwo', 'insticator', 'adsparc', 'automatad', 'archon'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.networkId && bid.params.siteId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */

  buildRequests: function(validBidRequests) {
    // Do we need to group by bidder? i.e. to make multiple requests for
    // different endpoints.

    let ret = {
      method: 'POST',
      url: '',
      data: '',
      bidRequest: []
    };

    if (validBidRequests.length < 1) {
      return ret;
    }
  };

  const SMARTSYNC_CALLBACK = 'serverbidCallBids';

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

  const bidIds = [];

  baseAdapter.callBids = function(params) {
    if (params && params.bids &&
        utils.isArray(params.bids) &&
        params.bids.length &&
        CONFIG[params.bidderCode]) {
      const config = CONFIG[params.bidderCode];
      config.request = window[params.bidderCode.toUpperCase() + '_CONFIG'];
      if (!window.SMARTSYNC) {
        _callBids(config, params);
      } else {
        window[SMARTSYNC_CALLBACK] = function() {
          window[SMARTSYNC_CALLBACK] = function() {};
          _callBids(config, params);
        };

        const siteId = params.bids[0].params.siteId;
        _appendScript(config.SMARTSYNC_BASE_URI + '/' + siteId + '.js');

        const sstimeout = window.SMARTSYNC_TIMEOUT || ((params.timeout || 500) / 2);
        setTimeout(function() {
          var cb = window[SMARTSYNC_CALLBACK];
          window[SMARTSYNC_CALLBACK] = function() {};
          cb();
        }, sstimeout);
      }
    }
  };

  function _appendScript(src) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    document.getElementsByTagName('head')[0].appendChild(script);
  }

    // These variables are used in creating the user sync URL.
    siteId = validBidRequests[0].params.siteId;
    bidder = validBidRequests[0].params.bidder;

    const data = Object.assign({
      placements: [],
      time: Date.now(),
      user: {},
      url: utils.getTopWindowUrl(),
      referrer: document.referrer,
      enableBotFiltering: true,
      includePricingData: true
    }, config.request);

    const bids = params.bids || [];

    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];

      bidIds.push(bid.bidId);

      const placement = Object.assign({
        divName: bid.bidId,
        adTypes: bid.adTypes || getSize(bid.sizes)
      }, bid.params);

      if (placement.networkId && placement.siteId) {
        data.placements.push(placement);
      }
    }

    if (data.placements.length) {
      ajax(config.BASE_URI, _responseCallback, JSON.stringify(data), { method: 'POST', withCredentials: true, contentType: 'application/json' });
    }
  }

  function _responseCallback(result) {
    let bid;
    let bidId;
    let bidObj;
    let bidCode;
    let placementCode;

    try {
      result = JSON.parse(result);
    } catch (error) {
      utils.logError(error);
    }

    for (let i = 0; i < bidIds.length; i++) {
      bidId = bidIds[i];
      bidObj = utils.getBidRequest(bidId);
      bidCode = bidObj.bidder;
      placementCode = bidObj.placementCode;

      if (result) {
        const decision = result.decisions && result.decisions[bidId];
        const price = decision && decision.pricing && decision.pricing.clearPrice;

        if (decision && price) {
          bid = bidfactory.createBid(1, bidObj);
          bid.bidderCode = bidCode;
          bid.cpm = price;
          bid.width = decision.width;
          bid.height = decision.height;
          bid.ad = retrieveAd(decision);
        } else {
          bid = bidfactory.createBid(2, bidObj);
          bid.bidderCode = bidCode;
        }
      } else {
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = bidCode;
      }
      bidmanager.addBidResponse(placementCode, bid);
    }
  }

  function retrieveAd(decision) {
    return decision.contents && decision.contents[0] && decision.contents[0].body + utils.createTrackPixelHtml(decision.impressionUrl);
  }

  function getSize(sizes) {
    const result = [];
    sizes.forEach(function(size) {
      const index = sizeMap.indexOf(size[0] + 'x' + size[1]);
      if (index >= 0) {
        result.push(index);
      }
    });
    return result;
  }

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
sizeMap[286] = '970x66';
sizeMap[3230] = '970x280';
sizeMap[429] = '486x60';
sizeMap[374] = '700x500';
sizeMap[934] = '300x1050';
sizeMap[1578] = '320x100';
sizeMap[331] = '320x250';
sizeMap[3301] = '320x267';
sizeMap[2730] = '728x250';

function getSize(sizes) {
  const result = [];
  sizes.forEach(function(size) {
    const index = sizeMap.indexOf(size[0] + 'x' + size[1]);
    if (index >= 0) {
      result.push(index);
    }
  });
};

ServerBidAdapter.createNew = function() {
  return new ServerBidAdapter();
};

adaptermanager.registerBidAdapter(new ServerBidAdapter(), 'serverbid');
adaptermanager.aliasBidAdapter('serverbid', 'connectad');
adaptermanager.aliasBidAdapter('serverbid', 'onefiftytwo');

module.exports = ServerBidAdapter;
