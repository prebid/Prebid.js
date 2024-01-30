import { logInfo, logWarn } from '../src/utils.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'themoneytizer';
const ENDPOINT_URL = 'https://ads.biddertmz.com/m/';

export const spec = {
  aliases: [BIDDER_CODE],
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (bid) {
    if (!(bid && bid.params.pid)) {
      logWarn('Invalid bid request - missing required bid params');
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map((bidRequest) => {
      const payload = {
        ext: bidRequest.ortb2Imp.ext,
        params: bidRequest.params,
        size: bidRequest.mediaTypes,
        adunit: bidRequest.adUnitCode,
        request_id: bidRequest.bidId,
        timeout: bidderRequest.timeout,
        ortb2: bidderRequest.ortb2,
        eids: bidRequest.userIdAsEids,
        id: bidRequest.auctionId,
        schain: bidRequest.schain,
        version: '$prebid.version$',
        excl_sync: window.tmzrBidderExclSync
      };

      const baseUrl = bidRequest.params.baseUrl || ENDPOINT_URL;

      if (bidderRequest && bidderRequest.refererInfo) {
        payload.referer = bidderRequest.refererInfo.topmostLocation;
        payload.referer_canonical = bidderRequest.refererInfo.canonicalUrl;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.consent_string = bidderRequest.gdprConsent.consentString;
        payload.consent_required = bidderRequest.gdprConsent.gdprApplies;
      }

      if (bidRequest.params.test) {
        payload.test = bidRequest.params.test;
      }

      if (bidRequest.params.placement) {
        payload.placement = bidRequest.params.placement;
      }

      if (bidRequest.params.formats) {
        payload.formats = bidRequest.params.formats;
      }

      if (bidRequest.params.isInternal) {
        payload.is_internal = bidRequest.params.isInternal;
      }

      payload.userEids = bidRequest.userIdAsEids || [];

      return {
        method: 'POST',
        url: baseUrl,
        data: JSON.stringify(payload),
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response && response.bid && !response.timeout && !!response.bid.ad) {
      bidResponses.push(response.bid);
    }

    return bidResponses;
  },
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    // gdprConsent,
  ) {
    if (!syncOptions.iframeEnabled) {
      return [];
    }

    // let gdprParams = '';
    // if (
    //   gdprConsent &&
    //   'gdprApplies' in gdprConsent &&
    //   typeof gdprConsent.gdprApplies === 'boolean'
    // ) {
    //   gdprParams = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    // }

    let s = [];
    serverResponses.map((c) => {
      if (c.body.c_sync) {
        c.body.c_sync.bidder_status.map((p) => {
          if (p.usersync.type === 'redirect') {
            p.usersync.type = 'image';
          }
          s.push(p.usersync);
        })
      }
    });

    return s;
  },

  onTimeout: function onTimeout(timeoutData) {
    logInfo('The Moneytizer - Timeout from adapter', timeoutData);
  },
};

registerBidder(spec);
