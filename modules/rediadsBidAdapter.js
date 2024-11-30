import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'rediads';
const ENDPOINT_URL = 'https://stagingbidding.rediads.com/openrtb2/auction';
const DEFAULT_CURRENCY = 'USD';

const MEDIA_TYPES = {
  [BANNER]: 1,
  [VIDEO]: 2,
  [NATIVE]: 4,
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: DEFAULT_CURRENCY,
  },
  bidResponse(buildBidResponse, bid, context) {
    let mediaType;
    if (bid.video) {
      mediaType = 'video'; // Video-specific response handling
    } else if (bid.native) {
      mediaType = 'native'; // Native-specific response handling
    } else {
      mediaType = 'banner'; // Default to banner
    }
    bid.mediaType = mediaType;
    bid.mtype = MEDIA_TYPES[mediaType];

    if (bid.mediaType === BANNER) {
      bid.ad = bid.adm;
    }
    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [NATIVE, BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.accountID);
  },
  buildRequests(bidRequests, bidderRequest) {
    const accountID = bidRequests[0]?.params?.accountID;
    const data = converter.toORTB({ bidRequests, bidderRequest });
    // deepSetValue(data.imp[0], 'ext.prebid.bidder', {
    //   amx: { tagId: 'dnV1a2xlLmNvbQ' },
    // });

    deepSetValue(data, 'test', 1);
    deepSetValue(data, 'ext.rediads.account_id', accountID?.toString());
    deepSetValue(data, 'site.content', config.getConfig('content'));
    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data,
      },
    ];
  },
  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
