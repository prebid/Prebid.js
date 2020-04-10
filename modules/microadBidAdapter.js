import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'microad';

const ENDPOINT_URLS = {
  'production': 'https://s-rtb-pb.send.microad.jp/prebid',
  'test': 'https://rtbtest.send.microad.jp/prebid'
};
export let ENVIRONMENT = 'production';

/* eslint-disable no-template-curly-in-string */
const EXT_URL_STRING = '${COMPASS_EXT_URL}';
const EXT_REF_STRING = '${COMPASS_EXT_REF}';
const EXT_IFA_STRING = '${COMPASS_EXT_IFA}';
const EXT_APPID_STRING = '${COMPASS_EXT_APPID}';
const EXT_GEO_STRING = '${COMPASS_EXT_GEO}';
/* eslint-enable no-template-curly-in-string */

const BANNER_CODE = 1;
const NATIVE_CODE = 2;
const VIDEO_CODE = 4;

function createCBT() {
  const randomValue = Math.floor(Math.random() * Math.pow(10, 18)).toString(16);
  const date = new Date().getTime().toString(16);
  return randomValue + date;
}

function createBitSequenceFromMediaType(hi, code) {
  return (hi ? -1 : 0) & code;
}

function convertMediaTypes(bid) {
  return createBitSequenceFromMediaType(bid.mediaTypes.banner, BANNER_CODE) |
    createBitSequenceFromMediaType(bid.mediaTypes.native, NATIVE_CODE) |
    createBitSequenceFromMediaType(bid.mediaTypes.video, VIDEO_CODE);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.spot && bid.mediaTypes && (bid.mediaTypes.banner || bid.mediaTypes.native || bid.mediaTypes.video));
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];

    validBidRequests.forEach(bid => {
      const bidParams = bid.params;
      const params = {
        spot: bidParams.spot,
        url: bidderRequest.refererInfo.canonicalUrl || window.location.href,
        referrer: bidderRequest.refererInfo.referer,
        bid_id: bid.bidId,
        transaction_id: bid.transactionId,
        media_types: convertMediaTypes(bid),
        cbt: createCBT()
      };

      if (bidParams.url) {
        params['url_macro'] = bidParams.url.replace(EXT_URL_STRING, '');
      }

      if (bidParams.referrer) {
        params['referrer_macro'] = bidParams.referrer.replace(EXT_REF_STRING, '');
      }

      if (bidParams.ifa) {
        params['ifa'] = bidParams.ifa.replace(EXT_IFA_STRING, '');
      }

      if (bidParams.appid) {
        params['appid'] = bidParams.appid.replace(EXT_APPID_STRING, '');
      }

      if (bidParams.geo) {
        const geo = bidParams.geo.replace(EXT_GEO_STRING, '');
        if (/^[0-9.\-]+,[0-9.\-]+$/.test(geo)) {
          params['geo'] = geo;
        }
      }

      requests.push({
        method: 'GET',
        url: ENDPOINT_URLS[ENVIRONMENT],
        data: params,
        options: { Accept: 'application/json' }
      });
    });
    return requests;
  },
  interpretResponse: function(serverResponse) {
    const body = serverResponse.body;
    const bidResponses = [];

    if (body.cpm && body.cpm > 0) {
      const bidResponse = {
        requestId: body.requestId,
        cpm: body.cpm,
        width: body.width,
        height: body.height,
        ad: body.ad,
        ttl: body.ttl,
        creativeId: body.creativeId,
        netRevenue: body.netRevenue,
        currency: body.currency,
      };

      if (body.dealId) {
        bidResponse['dealId'] = body.dealId;
      }

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    serverResponses.forEach(resp => {
      const syncIframeUrls = resp.body.syncUrls.iframe;
      const syncImageUrls = resp.body.syncUrls.image;
      if (syncOptions.iframeEnabled && syncIframeUrls) {
        syncIframeUrls.forEach(syncIframeUrl => {
          syncs.push({
            type: 'iframe',
            url: syncIframeUrl
          });
        });
      }
      if (syncOptions.pixelEnabled && syncImageUrls) {
        syncImageUrls.forEach(syncImageUrl => {
          syncs.push({
            type: 'image',
            url: syncImageUrl
          });
        });
      }
    });

    return syncs;
  }
};

registerBidder(spec);
