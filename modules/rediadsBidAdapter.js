import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue, logWarn, logError } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'rediads';
const ENDPOINT_URL = 'https://bidding.rediads.com/openrtb2/auction';
const STAGING_ENDPOINT_URL = 'https://stagingbidding.rediads.com/openrtb2/auction';
const DEFAULT_CURRENCY = 'USD';
const LOG_PREFIX = 'Rediads: ';

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
    let mediaType = 'banner'; // Default media type

    if (bid.vastXml || bid.vastUrl || (bid.adm && bid.adm.startsWith('<VAST'))) {
      mediaType = 'video';
    } else if (bid.adm && bid.adm.includes('"native"') && bid.adm.includes('"assets"')) {
      mediaType = 'native';
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
    let isValid = false;
    const accountID = bid?.params?.account_id
    if (accountID && typeof accountID === 'string') {
      isValid = true;
    } else {
      logError(`${LOG_PREFIX} account_id is missing from params or is not of type "string"`)
    }
    return isValid;
  },
  buildRequests(bidRequests, bidderRequest) {
    const params = bidRequests[0]?.params || {};
    const siteContent = bidRequests[0]?.site?.content || null;
    let data = {};
    let FINAL_ENDPOINT_URL = params.endpoint || ENDPOINT_URL
    try {
      data = converter.toORTB({ bidRequests, bidderRequest });
      const testBidsRequested = location.hash.includes('rediads-test-bids');
      const stagingEnvRequested = location.hash.includes('rediads-staging');

      if (stagingEnvRequested) {
        FINAL_ENDPOINT_URL = STAGING_ENDPOINT_URL;
      }
      deepSetValue(data, 'ext.rediads.params', params);
      deepSetValue(data, 'site.content', siteContent);

      if (testBidsRequested) {
        deepSetValue(data, 'test', 1);
        logWarn(`${LOG_PREFIX} test bids are enabled as rediads-test-bids is present in page URL hash.`)
      }
    } catch (err) {
      logError(`${LOG_PREFIX} encountered an error while building bid requests :: ${err}`)
    }

    return [
      {
        method: 'POST',
        url: FINAL_ENDPOINT_URL,
        data,
      },
    ];
  },
  interpretResponse(response, request) {
    let bids = [];
    try {
      bids = converter.fromORTB({
        response: response.body,
        request: request.data,
      }).bids
    } catch (err) {
      logError(`${LOG_PREFIX} encountered an error while processing bid responses :: ${err}`)
    }
    return bids;
  },
};

registerBidder(spec);
