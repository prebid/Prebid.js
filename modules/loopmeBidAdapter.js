import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';
import { Renderer } from '../src/Renderer';

const LOOPME_ENDPOINT = 'https://loopme.me/api/hb';

const entries = (obj) => {
  let output = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      output.push([key, obj[key]])
    }
  }
  return output;
}

export const spec = {
  code: 'loopme',
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function(bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }

    return !!bid.params.ak;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function(bidRequests, bidderRequest) {
    return bidRequests.map(bidRequest => {
      bidRequest.startTime = new Date().getTime();
      let payload = bidRequest.params;

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.user_consent = bidderRequest.gdprConsent.consentString;
      }

      let queryString = entries(payload)
        .map(item => `${item[0]}=${encodeURI(item[1])}`)
        .join('&');

      const adUnitSizes = bidRequest.mediaTypes[BANNER]
        ? utils.getAdUnitSizes(bidRequest)
        : utils.deepAccess(bidRequest.mediaTypes, 'video.playerSize');

      const sizes =
        '&sizes=' +
        adUnitSizes
          .map(size => `${size[0]}x${size[1]}`)
          .join('&sizes=');

      queryString = `${queryString}${sizes}${bidRequest.mediaTypes[VIDEO] ? '&media_type=video' : ''}`;

      return {
        method: 'GET',
        url: `${LOOPME_ENDPOINT}`,
        options: { withCredentials: false },
        bidId: bidRequest.bidId,
        data: queryString
      };
    });
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function(response = {}, bidRequest) {
    const responseObj = response.body;
    if (
      responseObj === null ||
      typeof responseObj !== 'object'
    ) {
      return [];
    }

    if (
      !responseObj.hasOwnProperty('ad') &&
      !responseObj.hasOwnProperty('vastUrl')
    ) {
      return [];
    }
    // responseObj.vastUrl = 'https://rawgit.com/InteractiveAdvertisingBureau/VAST_Samples/master/VAST%201-2.0%20Samples/Inline_NonLinear_Verification_VAST2.0.xml';
    if (responseObj.vastUrl) {
      const renderer = Renderer.install({
        id: bidRequest.bidId,
        url: 'https://i.loopme.me/html/vast/loopme_flex.js',
        loaded: false
      });
      renderer.setRender((bid) => {
        renderer.push(function () {
          var adverts = [{
            'type': 'VAST',
            'url': bid.vastUrl,
            'autoClose': -1
          }];
          var config = {
            containerId: bid.adUnitCode,
            vastTimeout: 250,
            ads: adverts,
            user_consent: '%%USER_CONSENT%%',
          };
          window.L.flex.loader.load(config);
        })
      });
      return [
        {
          requestId: bidRequest.bidId,
          cpm: responseObj.cpm,
          width: responseObj.width,
          height: responseObj.height,
          ttl: responseObj.ttl,
          currency: responseObj.currency,
          creativeId: responseObj.creativeId,
          dealId: responseObj.dealId,
          netRevenue: responseObj.netRevenue,
          vastUrl: responseObj.vastUrl,
          renderer
        }
      ];
    }

    return [
      {
        requestId: bidRequest.bidId,
        cpm: responseObj.cpm,
        width: responseObj.width,
        height: responseObj.height,
        ad: responseObj.ad,
        ttl: responseObj.ttl,
        currency: responseObj.currency,
        creativeId: responseObj.creativeId,
        dealId: responseObj.dealId,
        netRevenue: responseObj.netRevenue
      }
    ];
  }
};
registerBidder(spec);
