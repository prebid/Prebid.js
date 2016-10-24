var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var ajax = require('../ajax.js');
var utils = require('../utils.js');

/**
 * Adapter for requesting bids from AdKernel white-label platform
 * @class
 */
var AdkernelAdapter = function AdkernelAdapter() {
  const ADKERNEL = 'adkernel';

  /**
   * Helper object to build multiple bid requests in case of multiple zones/ad-networks
   * @constructor
   */
  function RtbRequestDispatcher() {
    const imp2adUnit = {},
      _dispatch = {},
      site = createSite();

    //translate adunit info into rtb impression dispatched by host/zone
    this.addImp = function (host, zone, width, height, bidId, adUnitId) {
      if (!(host in _dispatch)) {
        _dispatch[host] = {};
      }
      if (!(zone in _dispatch[host])) {
        _dispatch[host][zone] = [];
      }
      let imp = {'id': bidId, 'banner': {'w': width, 'h': height}};
      if (utils.getTopWindowLocation().protocol === 'https:') {
        imp.secure = 1;
      }
      //save rtb impression for specified ad-network host and zone
      _dispatch[host][zone].push(imp);
      //save impid to adunit mapping
      imp2adUnit[bidId] = adUnitId;
    };

    /**
     *  Main function to get bid requests
     */
    this.dispatch = function (callback) {
      utils._each(_dispatch, function (zones, host) {
        utils.logMessage("processing network " + host);
        utils._each(zones, function (imp, zone) {
          utils.logMessage("processing zone " + zone);
          callback(host, zone, buildRtbRequest(imp), imp2adUnit);
        });
      });
    };

    /**
     * Builds complete rtb bid request
     * @param imps collection of impressions
     */
    function buildRtbRequest(imps) {
      return {
        'id': utils.getUniqueIdentifierStr(),
        'imp': imps,
        'site': site,
        'at': 1,
        'device': {
          'ip': 'caller',
          'ua': 'caller'
        }
      };
    }

    /**
     * Creates site description object
     */
    function createSite() {
      var location = utils.getTopWindowLocation();
      return {
        'domain': location.hostname,
        'page': location.pathname
      };
    }
  }

  /**
   *  Main module export function implementation
   */
  function _callBids(params) {
    var bids = params.bids || [];
    processBids(bids);
  }

  /**
   *  Process all bids grouped by network/zone
   */
  function processBids(bids) {
    const dispatcher = new RtbRequestDispatcher();
    //process individual bids
    utils._each(bids, function (bid) {
      let size = bid.sizes[0];
      dispatcher.addImp(bid.params.host, bid.params.zoneId, size[0], size[1], bid.bidId, bid.placementCode);
    });
    //process bids grouped into bidrequests
    dispatcher.dispatch(function (host, zone, rtbRequest, imp2plcmnt) {
      let url = buildEndpointUrl(host);
      let params = buildRequestParams(zone, rtbRequest);
      let bidHandlerCallback = createBidResponseHandler(rtbRequest, imp2plcmnt);
      ajax.ajax(url, bidHandlerCallback, params, {
        contentType: 'text/plain',
        withCredentials: true,
        method: 'GET'
      });
    });
  }

  /**
   *  Creates callback function to process bid response
   */
  function createBidResponseHandler(rtbRequest, imp2adUnit) {
    return function (bidResp) {
      bidResp = bidResp === '' ? emptyBidResponse() : JSON.parse(bidResp);
      utils._each(rtbRequest.imp, function (entry) {
        let adUnitId = imp2adUnit[entry.id],
          bidFound = false;
        utils._each(bidResp.seatbid[0].bid, function (bid) {
          if (!bidFound && bid.impid === entry.id) {
            bidFound = true;
            utils.logMessage('got response for ' + adUnitId);
            bidmanager.addBidResponse(adUnitId, createBidObject(bid, entry.banner.w, entry.banner.h));
          }
        });
        if (!bidFound) {
          utils.logMessage('got empty response for ' + adUnitId);
          bidmanager.addBidResponse(adUnitId, createEmptyBidObject());
        }
      });
    };
  }

  /**
   * Build ad-network specific endpoint url
   */
  function buildEndpointUrl(host) {
    return window.location.protocol + '//' + host + '/rtbg';
  }

  function buildRequestParams(zone, rtbReq) {
    return {
      'zone': zone,
      'ad_type': 'rtb',
      'r': encodeURIComponent(JSON.stringify(rtbReq))
    };
  }

  /**
   *  Create bid object for the bid manager
   */
  function createBidObject(bidObj, width, height) {
    return utils.extend(bidfactory.createBid(1), {
      bidderCode: ADKERNEL,
      ad: formatAdmarkup(bidObj),
      width: width,
      height: height,
      cpm: parseFloat(bidObj.price)
    });
  }

  /**
   * Create empty bid object for the bid manager
   */
  function createEmptyBidObject() {
    return utils.extend(bidfactory.createBid(2), {
      bidderCode: ADKERNEL
    });
  }

  /**
   *  Format creative with optional nurl call
   */
  function formatAdmarkup(bid) {
    var adm = bid.adm;
    if ('nurl' in bid) {
      adm += utils.createTrackPixelHtml(bid.nurl);
    }
    return adm;
  }
  
  function emptyBidResponse() {
    return {'seatbid': [{'bid': []}]};
  }

  return {
    callBids: _callBids
  };
};

module.exports = AdkernelAdapter;