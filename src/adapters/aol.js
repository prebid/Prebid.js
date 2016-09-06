var utils = require('../utils.js');
var ajax = require('../ajax.js').ajax;
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var AolAdapter = function AolAdapter() {

  const pubapiTemplate = template`${'protocol'}://${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${ ('bidfloor') ? `;bidfloor=${'bidfloor'}` : '' };misc=${'misc'}`;
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
    var regionParam = params.region || 'us';
    var server;

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
      bidfloor: (typeof params.bidFloor !== 'undefined') ? params.bidFloor.toString() : null,
      misc: new Date().getTime() // cache busting
    });
  }

  function _addErrorBidResponse(bid, response) {
    var bidResponse = bidfactory.createBid(2);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.reason = response.nbr;
    bidResponse.raw = response;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addBidResponse(bid, response) {
    var bidData;

    try {
      bidData = response.seatbid[0].bid[0];
    } catch (e) {
      _addErrorBidResponse(bid, response);
      return;
    }

    var cpm;

    if (bidData.ext && bidData.ext.encp) {
      cpm = bidData.ext.encp;
    } else {
      cpm = bidData.price;

      if (cpm === null || isNaN(cpm)) {
        _addErrorBidResponse(bid, response);
        return;
      }
    }

    var ad = bidData.adm;
    if (bidData.ext && bidData.ext.pixels) {
      ad += bidData.ext.pixels;
    }

    var bidResponse = bidfactory.createBid(1);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = bidData.w;
    bidResponse.height = bidData.h;
    bidResponse.creativeId = bidData.crid;
    bidResponse.pubapiId = response.id;
    if (bidData.dealid) {
      bidResponse.dealId = bidData.dealid;
    }

    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _callBids(params) {
    utils._each(params.bids, function (bid) {
      const pubapiUrl = _buildPubapiUrl(bid);

      ajax(pubapiUrl, (response) => {
        if (!response && response.length <= 0) {
          utils.logError('Empty bid response', BIDDER_CODE, bid);
          return;
        }

        try {
          response = JSON.parse(response);
        } catch (e) {
          _addErrorBidResponse(bid, response);
          return;
        }

        _addBidResponse(bid, response);

      }, null, null, { isTrackingRequest: true });
    });
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
