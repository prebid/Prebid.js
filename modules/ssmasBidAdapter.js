import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { userSync } from '../src/userSync.js';
import { triggerPixel, deepSetValue } from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

export const SSMAS_CODE = 'ssmas';
export const SSMAS_ENDPOINT = 'https://ads.ssmas.com/ortb';
export const SSMAS_REQUEST_METHOD = 'POST';

const GDPR_VENDOR_ID = 1183;

function allowedSyncs() {
  if (config.getConfig('userSync.syncEnabled') === false) {
    return;
  }

  const iframe = userSync.canBidderRegisterSync('iframe', SSMAS_CODE);
  const image = userSync.canBidderRegisterSync('image', SSMAS_CODE);

  if (iframe || image) {
    return { iframe: iframe ? 1 : 0, image: image ? 1 : 0 };
  }
}

export const ssmasOrtbConverter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    mediaType: BANNER,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    deepSetValue(imp, 'ext.placementId', bidRequest.params.placementId);
    imp.tagid = String(bidRequest.params.placementId);

    return imp;
  },
});

export const spec = {
  code: SSMAS_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GDPR_VENDOR_ID,

  isBidRequestValid: (bid) => {
    return !!bid.params?.placementId && !!bid.bidId && bid.bidder === SSMAS_CODE;
  },

  buildRequests: (bidRequests, bidderRequest) => {
    const data = ssmasOrtbConverter.toORTB({ bidRequests, bidderRequest });
    const deviceAccess = hasPurpose1Consent(bidderRequest.gdprConsent);

    const options = {
      contentType: 'application/json',
      withCredentials: deviceAccess,
    };

    const syncs = deviceAccess && allowedSyncs();

    if (syncs) {
      deepSetValue(data, 'ext.ssmas.usersync', syncs);
    }

    return [
      {
        method: SSMAS_REQUEST_METHOD,
        url: SSMAS_ENDPOINT,
        data,
        options,
      },
    ];
  },

  interpretResponse: (serverResponse, bidRequest) => {
    const bids = ssmasOrtbConverter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data,
    }).bids;

    return bids.filter((bid) => {
      return bid.cpm > 0;
    });
  },

  onBidWon: (bid) => {
    if (bid.burl) {
      triggerPixel(bid.burl);
    }
  },

  getUserSyncs: (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent,
    gppConsent,
    coppa
  ) => {
    if (coppa) {
      return [];
    }

    const allowed = { iframe: syncOptions.iframeEnabled, image: syncOptions.pixelEnabled };
    const syncs = [];
    const synced = new Set();

    (serverResponses || []).forEach((response) => {
      (response?.body?.ext?.usersync || []).forEach((sync) => {
        if (!sync?.url || !allowed[sync.type] || synced.has(sync.bidder)) {
          return;
        }

        syncs.push({ type: sync.type, url: sync.url });
        synced.add(sync.bidder);
      });
    });

    return syncs;
  },
};

registerBidder(spec);
