const utils = require('../utils.js');
const ajax = require('../ajax.js').ajax;
const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');

const AolAdapter = function AolAdapter() {

  const pubapiTemplate = template`${'protocol'}://${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${'bidfloor'};misc=${'misc'}`;
  const BIDDER_CODE = 'aol';
  const SERVER_MAP = {
    us: 'adserver-us.adtech.advertising.com',
    eu: 'adserver-eu.adtech.advertising.com',
    as: 'adserver-as.adtech.advertising.com'
  };

  function template(strings, ...keys) {
    return function(...values) {
      let dict = values[values.length - 1] || {};
      let result = [strings[0]];
      keys.forEach(function(key, i) {
        let value = Number.isInteger(key) ? values[key] : dict[key];
        result.push(value, strings[i + 1]);
      });
      return result.join('');
    };
  }

  function _buildPubapiUrl(bid) {
    const params = bid.params;
    const serverParam = params.server;
    let regionParam = params.region || 'us';
    let server;

    if (!SERVER_MAP.hasOwnProperty(regionParam)) {
      console.warn(`Unknown region '${regionParam}' for AOL bidder.`);
      regionParam = 'us'; // Default region.
    }

    if (serverParam) {
      server = serverParam;
    } else {
      server = SERVER_MAP[regionParam];
    }

    // Set region param, used by AOL analytics.
    params.region = regionParam;

    return pubapiTemplate({
      protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
      host: server,
      network: params.network,
      placement: parseInt(params.placement),
      pageid: params.pageId || 0,
      sizeid: params.sizeId || 0,
      alias: params.alias || utils.getUniqueIdentifierStr(),
      bidfloor: (typeof params.bidFloor !== 'undefined') ?
        `;bidfloor=${params.bidFloor.toString()}` : '',
      misc: new Date().getTime() // cache busting
    });
  }

  function _addErrorBidResponse(bid, response = {}) {
    const bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.reason = response.nbr;
    bidResponse.raw = response;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addBidResponse(bid, response) {
    let bidData;

    try {
      bidData = response.seatbid[0].bid[0];
    } catch (e) {
      _addErrorBidResponse(bid, response);
      return;
    }

    let cpm;

    if (bidData.ext && bidData.ext.encp) {
      cpm = bidData.ext.encp;
    } else {
      cpm = bidData.price;

      if (cpm === null || isNaN(cpm)) {
        utils.logError('Invalid price in bid response', BIDDER_CODE, bid);
        _addErrorBidResponse(bid, response);
        return;
      }
    }

    let ad = bidData.adm;
    if (bidData.ext && bidData.ext.pixels) {
      ad += bidData.ext.pixels;
    }

    const bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = bidData.w;
    bidResponse.height = bidData.h;
    bidResponse.creativeId = bidData.crid;
    bidResponse.pubapiId = response.id;
    bidResponse.currencyCode = response.cur;
    if (bidData.dealid) {
      bidResponse.dealId = bidData.dealid;
    }

    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _callBids(params) {
    utils._each(params.bids, bid => {
      const pubapiUrl = _buildPubapiUrl(bid);

      ajax(pubapiUrl, response => {
        if (!response && response.length <= 0) {
          utils.logError('Empty bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response);
          return;
        }

        try {
          response = JSON.parse(response);
        } catch (e) {
          utils.logError('Invalid JSON in bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response);
          return;
        }

        _addBidResponse(bid, response);

      }, null, { withCredentials: true });
    });
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
