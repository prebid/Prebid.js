import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { triggerPixel, deepSetValue } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';

export const SSMAS_CODE = 'ssmas';
const SSMAS_SERVER = 'localhost:8080';
export const SSMAS_ENDPOINT = `http://${SSMAS_SERVER}/ortb`;
// const SYNC_URL = `http://${SSMAS_SERVER}/prebid/user_sync`;
export const SSMAS_REQUEST_METHOD = 'POST';
// const SSMAS_CURRENCY = 'EUR';

// https://iabeurope.eu/vendor-list-tcf/
const GDPR_VENDOR_ID = 1183;

export const ssmasOrtbConverter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 300, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    // console.log(bidRequest, context);
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

    data.user = data.user || {};
    data.user.ext = data.user.ext || {};
    data.regs = data.regs || {};
    data.regs.ext = data.regs.ext || {};

    // GDPR
    if (bidderRequest.gdprConsent) {
      data.user.ext.consent = bidderRequest.gdprConsent.consentString;
      data.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      data.regs.ext.us_privacy = 1;
    }
    // coppa compliance
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

  // getUserSyncs: (
  //   syncOptions,
  //   serverResponses,
  //   gdprConsent,
  //   uspConsent
  // ) => {
  //   const syncs = [];

  //   let gdprParams;
  //   if (typeof gdprConsent.gdprApplies === 'boolean') {
  //     gdprParams = `gdpr=${Boolean(gdprConsent.gdprApplies)}&gdpr_consent=${
  //       gdprConsent.consentString
  //     }`;
  //   } else {
  //     gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
  //   }

  //   if (syncOptions.pixelEnabled && serverResponses.length > 0) {
  //     syncs.push({
  //       type: 'image',
  //       url: `${SYNC_URL}?${gdprParams}`
  //     });
  //   }
  //   return syncs;
  // },
};

registerBidder(spec);
