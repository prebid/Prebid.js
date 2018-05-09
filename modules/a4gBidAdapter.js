import {registerBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

const A4G_BIDDER_CODE = 'a4g';
const A4G_CURRENCY = 'USD';
const A4G_DEFAULT_BID_URL = '//ads.ad4game.com/v1/bid';
const A4G_TTL = 120;

const LOCATION_PARAM_NAME = 'siteurl';
const ID_PARAM_NAME = 'id';
const IFRAME_PARAM_NAME = 'if';
const ZONE_ID_PARAM_NAME = 'zoneId';
const SIZE_PARAM_NAME = 'size';

const ARRAY_PARAM_SEPARATOR = ';';
const ARRAY_SIZE_SEPARATOR = ',';
const SIZE_SEPARATOR = 'x';

export const spec = {
  code: A4G_BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return bid.params && !!bid.params.zoneId;
  },

  buildRequests: function(validBidRequests) {
    let deliveryUrl = '';
    const idParams = [];
    const sizeParams = [];
    const zoneIds = [];

    utils._each(validBidRequests, function(bid) {
      if (!deliveryUrl && typeof bid.params.deliveryUrl === 'string') {
        deliveryUrl = bid.params.deliveryUrl;
      }
      idParams.push(bid.bidId);
      sizeParams.push(bid.sizes.map(size => size.join(SIZE_SEPARATOR)).join(ARRAY_SIZE_SEPARATOR));
      zoneIds.push(bid.params.zoneId);
    });

    if (!deliveryUrl) {
      deliveryUrl = A4G_DEFAULT_BID_URL;
    }

    return {
      method: 'GET',
      url: deliveryUrl,
      data: {
        [IFRAME_PARAM_NAME]: 0,
        [LOCATION_PARAM_NAME]: utils.getTopWindowUrl(),
        [SIZE_PARAM_NAME]: sizeParams.join(ARRAY_PARAM_SEPARATOR),
        [ID_PARAM_NAME]: idParams.join(ARRAY_PARAM_SEPARATOR),
        [ZONE_ID_PARAM_NAME]: zoneIds.join(ARRAY_PARAM_SEPARATOR)
      }
    };
  },

  interpretResponse: function(serverResponses, request) {
    const bidResponses = [];
    utils._each(serverResponses.body, function(response) {
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          creativeId: response.id,
          adId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          currency: A4G_CURRENCY,
          netRevenue: true,
          ttl: A4G_TTL,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }
};

registerBidder(spec);
