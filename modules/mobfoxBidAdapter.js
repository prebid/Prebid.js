const bidfactory = require('src/bidfactory.js');
const bidmanager = require('src/bidmanager.js');
const adloader = require('src/adloader');
const ajax = require('src/ajax.js');
const CONSTANTS = require('src/constants.json');
const utils = require('src/utils.js');
const adaptermanager = require('src/adaptermanager');

const mobfoxAdapter = function () {
  const BIDDER_CODE = 'mobfox';
  const BID_REQUEST_BASE_URL = 'https://my.mobfox.com/request.php';

  // request
  function buildQueryStringFromParams(params) {
    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        if (params[key] === undefined) {
          delete params[key];
        } else {
          params[key] = encodeURIComponent(params[key]);
        }
      }
    }

    return utils._map(Object.keys(params), key => `${key}=${params[key]}`)
      .join('&');
  }

  function buildBidRequest(bid) {
    let bidParams = bid.params;

    let requestParams = {
      // -------------------- Mandatory Parameters ------------------
      rt: bidParams.rt || 'api-fetchip',
      r_type: bidParams.r_type || 'banner',
      r_resp: bidParams.r_resp || 'json', // string | vast20
      //  i: bidParams.i || undefined , // string | 69.197.148.18
      s: bidParams.s, // string | 80187188f458cfde788d961b6882fd53
      u: bidParams.u || window.navigator.userAgent, // string

      // ------------------- Global Parameters ----------------------
      adspace_width: bidParams.adspace_width || bid.sizes[0][0], // integer | 320
      adspace_height: bidParams.adspace_height || bid.sizes[0][1], // integer | 48
      r_floor: bidParams.r_floor || undefined, // 0.8

      o_andadvid: bidParams.o_andadvid || undefined, // 'c6292267-56ad-4326-965d-deef6fcd5er9'
      longitude: bidParams.longitude || undefined, // 12.12
      latitude: bidParams.latitude || undefined, // 280.12
      demo_age: bidParams.demo_age || undefined, // 1978

      // ------------------- banner / interstitial ----------------------
      adspace_strict: bidParams.adspace_strict || undefined,

      // ------------------- interstitial / video ----------------------
      imp_instl: bidParams.imp_instl || undefined, // integer | 1

      // ------------------- mraid ----------------------
      c_mraid: bidParams.c_mraid || undefined, // integer | 1

      // ------------------- video ----------------------
      v_dur_min: bidParams.v_dur_min || undefined, // integer | 0
      v_dur_max: bidParams.v_dur_max || undefined, // integer | 999
      v_autoplay: bidParams.v_autoplay || undefined, // integer | 1
      v_startmute: bidParams.v_startmute || undefined, // integer | 0
      v_rewarded: bidParams.v_rewarded || undefined, // integer | 0
      v_api: bidParams.v_api || undefined, // string | vpaid20
      n_ver: bidParams.n_ver || undefined, //
      n_adunit: bidParams.n_adunit || undefined, //
      n_layout: bidParams.n_layout || undefined, //
      n_context: bidParams.n_context || undefined, //
      n_plcmttype: bidParams.n_plcmttype || undefined, //
      n_img_icon_req: bidParams.n_img_icon_req || undefined, // boolean0
      n_img_icon_size: bidParams.n_img_icon_size || undefined, // string80
      n_img_large_req: bidParams.n_img_large_req || undefined, // boolean0
      n_img_large_w: bidParams.n_img_large_w || undefined, // integer1200
      n_img_large_h: bidParams.n_img_large_h || undefined, // integer627
      n_title_req: bidParams.n_title_req || undefined, // boolean0
      n_title_len: bidParams.n_title_len || undefined, // string25
      n_desc_req: bidParams.n_desc_req || undefined, // boolean0
      n_desc_len: bidParams.n_desc_len || undefined, // string140
      n_rating_req: bidParams.n_rating_req || undefined
    };

    return requestParams;
  }

  function sendBidRequest(bid) {
    let requestParams = buildBidRequest(bid);
    let queryString = buildQueryStringFromParams(requestParams);

    ajax.ajax(`${BID_REQUEST_BASE_URL}?${queryString}`, {
      success(resp, xhr) {
        if (xhr.getResponseHeader('Content-Type') == 'application/json') {
          try {
            resp = JSON.parse(resp)
          }
          catch (e) {
            resp = {error: resp}
          }
        }
        onBidResponse({
          data: resp,
          xhr: xhr
        }, bid);
      },
      error(err) {
        if (xhr.getResponseHeader('Content-Type') == 'application/json') {
          try {
            err = JSON.parse(err);
          }
          catch (e) {
          }
          ;
        }
        onBidResponseError(bid, [err]);
      }
    });
  }

  // response
  function onBidResponseError(bid, err) {
    utils.logError('Bid Response Error', bid, ...err);
    let bidResponse = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function onBidResponse(bidderResponse, bid) {
    // transform the response to a valid prebid response
    try {
      let bidResponse = transformResponse(bidderResponse, bid);
      bidmanager.addBidResponse(bid.placementCode, bidResponse);
    } catch (e) {
      onBidResponseError(bid, [e]);
    }
  }

  function transformResponse(bidderResponse, bid) {
    let responseBody = bidderResponse.data;

    // Validate Request
    let err = responseBody.error;
    if (err) {
      throw err;
    }

    let htmlString = responseBody.request && responseBody.request.htmlString;
    if (!htmlString) {
      throw [`htmlString is missing`, responseBody];
    }

    let cpm, cpmHeader = bidderResponse.xhr.getResponseHeader('X-Pricing-CPM');
    try {
      cpm = Number(cpmHeader);
    } catch (e) {
      throw ['Invalid CPM value:', cpmHeader];
    }

    // Validations passed - Got bid
    let bidResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid);
    bidResponse.bidderCode = BIDDER_CODE;

    bidResponse.ad = htmlString;
    bidResponse.cpm = cpm;

    bidResponse.width = bid.sizes[0][0];
    bidResponse.height = bid.sizes[0][1];

    return bidResponse;
  }

  // prebid api
  function callBids(params) {
    let bids = params.bids || [];
    bids.forEach(sendBidRequest);
  }

  return {
    callBids: callBids
  };
};


adaptermanager.registerBidAdapter(new mobfoxAdapter(), 'mobfox');
module.exports = mobfoxAdapter;
