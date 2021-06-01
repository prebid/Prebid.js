
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const ADMIXER_ENDPOINT = 'https://adn.admixer.co.kr:10443/prebid/ad_req';
const BIDDER_CODE = 'nasmediaAdmixer';

const DEFAULT_BID_TTL = 360;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_REVENUE = false;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.media_key && bid.params.adunit_id);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      const payload = {
        media_key: bid.params.media_key,
        adunit_id: bid.params.adunit_id,
        req_id: bid.bidId,
        referrer: bidderRequest.refererInfo.referer,
        os: getOs(),
        platform: getPlatform(),
      };

      return {
        method: 'GET',
        url: ADMIXER_ENDPOINT,
        data: payload,
      }
    })
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];

    if (serverBody && serverBody.error_code === 0 && serverBody.body && serverBody.body.length > 0) {
      let bidData = serverBody.body[0];

      const bidResponse = {
        ad: bidData.ad,
        requestId: serverBody.req_id,
        creativeId: bidData.ad_id,
        cpm: bidData.cpm,
        width: bidData.width,
        height: bidData.height,
        currency: bidData.currency ? bidData.currency : DEFAULT_CURRENCY,
        netRevenue: DEFAULT_REVENUE,
        ttl: DEFAULT_BID_TTL
      };

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}

function getOs() {
  let ua = navigator.userAgent;
  if (ua.match(/(iPhone|iPod|iPad)/)) {
    return 'ios';
  } else if (ua.match(/Android/)) {
    return 'android';
  } else if (ua.match(/Window/)) {
    return 'windows';
  } else {
    return 'etc';
  }
}

function getPlatform() {
  return (isMobile()) ? 'm_web' : 'pc_web';
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent.toLowerCase());
}

registerBidder(spec);
