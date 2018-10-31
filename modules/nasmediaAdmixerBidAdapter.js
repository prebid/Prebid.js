import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const ADMIXER_ENDPOINT = 'https://adn.admixer.co.kr:10443/prebid';
const DEFAULT_BID_TTL = 360;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_REVENUE = false;

export const spec = {
  code: 'nasmediaAdmixer',

  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.ax_key);
  },

  buildRequests: function (validBidRequests) {
    return validBidRequests.map(bid => {
      let adSize = getSize(bid.sizes);

      return {
        method: 'GET',
        url: ADMIXER_ENDPOINT,
        data: {
          ax_key: utils.getBidIdParameter('ax_key', bid.params),
          req_id: bid.bidId,
          width: adSize.width,
          height: adSize.height,
          referrer: utils.getTopWindowUrl(),
          os: getOsType()
        }
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

function getOsType() {
  let ua = navigator.userAgent.toLowerCase();
  let os = ['android', 'ios', 'mac', 'linux', 'window'];
  let regexpOs = [/android/i, /iphone|ipad/i, /mac/i, /linux/i, /window/i];

  return find(os, (tos, idx) => {
    if (ua.match(regexpOs[idx])) {
      return os[idx];
    }
  }) || 'etc';
}

function getSize(sizes) {
  let parsedSizes = utils.parseSizesInput(sizes);
  let [width, height] = parsedSizes.length ? parsedSizes[0].split('x') : [];

  return {
    width: parseInt(width, 10),
    height: parseInt(height, 10)
  };
}
registerBidder(spec);
