import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { triggerPixel, deepSetValue } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';

export const SSMAS_CODE = 'ssmas';
const SSMAS_SERVER = 'ads.ssmas.com';
export const SSMAS_ENDPOINT = `https://${SSMAS_SERVER}/ortb`;
const SYNC_URL = `https://sync.ssmas.com/user_sync`;
export const SSMAS_REQUEST_METHOD = 'POST';
const GDPR_VENDOR_ID = 1183;

export const ssmasOrtbConverter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.placementId', bidRequest.params.placementId);
    return imp;
  },
});

export const spec = {
  code: SSMAS_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GDPR_VENDOR_ID,

  isBidRequestValid: (bid) => {
    return !!bid.params.placementId && !!bid.bidId && bid.bidder === SSMAS_CODE;
  },

  buildRequests: (bidRequests, bidderRequest) => {
    const data = ssmasOrtbConverter.toORTB({ bidRequests, bidderRequest });

    const options = {
      contentType: 'application/json',
      withCredentials: false,
    };

    data.imp && data.imp.forEach(imp => {
      if (imp.ext && imp.ext.placementId) {
        imp.tagId = imp.ext.placementId;
      }
    });

    data.regs = data.regs || {};
    data.regs.ext = data.regs.ext || {};

    if (bidderRequest.gdprConsent) {
      data.regs.ext.consent = bidderRequest.gdprConsent.consentString;
      data.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
    if (bidderRequest.uspConsent) {
      data.regs.ext.consent = bidderRequest.uspConsent.consentString;
      data.regs.ext.ccpa = 1;
    }
    if (config.getConfig('coppa') === true) {
      data.regs.coppa = 1;
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
    uspConsent
  ) => {
    const syncs = [];

    let params = ['pbjs=1'];

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params.push(`gdpr=${Boolean(gdprConsent.gdprApplies)}&gdpr_consent=${
          gdprConsent.consentString
        }`);
      } else {
        params.push(`gdpr_consent=${gdprConsent.consentString}`);
      }
    }

    if (uspConsent && uspConsent.consentString) {
      params.push(`ccpa_consent=${uspConsent.consentString}`);
    }

    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'iframe',
        url: `${SYNC_URL}/iframe?${params.join('&')}`
      });
    }

    // if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    //   syncs.push({
    //     type: 'image',
    //     url: `${SYNC_URL}/image?${params.join('&')}`
    //   });
    // }
    return syncs;
  },
};

registerBidder(spec);
