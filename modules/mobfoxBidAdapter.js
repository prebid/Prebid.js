import {registerBidder} from '../src/adapters/bidderFactory.js';

const utils = require('../src/utils.js');
const BIDDER_CODE = 'mobfox';
const BID_REQUEST_BASE_URL = 'https://my.mobfox.com/request.php';
const CPM_HEADER = 'X-Pricing-CPM';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['mf'], // short code
  isBidRequestValid: function (bid) {
    return bid.params.s !== null && bid.params.s !== undefined;
  },
  buildRequests: function (validBidRequests) {
    if (validBidRequests.length > 1) {
      throw ('invalid number of valid bid requests, expected 1 element')
    }

    let bidParams = validBidRequests[0].params;
    let bid = validBidRequests[0];

    let params = {
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

    let payloadString = buildPayloadString(params);

    return {
      method: 'GET',
      url: BID_REQUEST_BASE_URL,
      data: payloadString,
      requestId: bid.bidId
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    let serverResponseBody = serverResponse.body;

    if (!serverResponseBody || serverResponseBody.error) {
      let errorMessage = `in response for ${BIDDER_CODE} adapter`;
      if (serverResponseBody && serverResponseBody.error) {
        errorMessage += `: ${serverResponseBody.error}`;
      }
      utils.logError(errorMessage);
      return bidResponses;
    }
    try {
      let serverResponseHeaders = serverResponse.headers;
      let bidRequestData = bidRequest.data.split('&');
      const bidResponse = {
        requestId: bidRequest.requestId,
        cpm: serverResponseHeaders.get(CPM_HEADER),
        width: bidRequestData[5].split('=')[1],
        height: bidRequestData[6].split('=')[1],
        creativeId: bidRequestData[3].split('=')[1],
        currency: 'USD',
        netRevenue: true,
        ttl: 360,
        referrer: serverResponseBody.request.clickurl,
        ad: serverResponseBody.request.htmlString
      };
      bidResponses.push(bidResponse);
    } catch (e) {
      throw 'could not build bid response: ' + e;
    }
    return bidResponses;
  }
};

function buildPayloadString(params) {
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
    .join('&')
}

registerBidder(spec);
