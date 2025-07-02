'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { parseUserAgentDetailed } from '../libraries/userAgentUtils/detailed.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

const BIDDER_CODE = 'adWMG';
const ENDPOINT = 'https://hb.adwmg.com/hb';
let SYNC_ENDPOINT = 'https://hb.adwmg.com/cphb.html?';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['wmg'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid: (bid) => {
    if (!(bid.params.publisherId)) {
      return false;
    }

    return true;
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const timeout = bidderRequest.timeout || 0;
    const debug = config.getConfig('debug') || false;
    // TODO: is 'page' the right value here?
    const referrer = bidderRequest.refererInfo.page;
    const locale = window.navigator.language && window.navigator.language.length > 0 ? window.navigator.language.substr(0, 2) : '';
    const domain = bidderRequest.refererInfo.domain || '';
    const ua = window.navigator.userAgent.toLowerCase();
    const additional = spec.parseUserAgent(ua);

    return validBidRequests.map(bidRequest => {
      const checkFloorValue = (value) => {
        if (isNaN(parseFloat(value))) {
          return 0;
        } else return parseFloat(value);
      }

      const adUnit = {
        code: bidRequest.adUnitCode,
        bids: {
          bidder: bidRequest.bidder,
          params: {
            publisherId: bidRequest.params.publisherId,
            IABCategories: bidRequest.params.IABCategories || [],
            floorCPM: bidRequest.params.floorCPM ? checkFloorValue(bidRequest.params.floorCPM) : 0
          }
        },
        mediaTypes: bidRequest.mediaTypes
      };

      if (bidRequest.hasOwnProperty('sizes') && bidRequest.sizes.length > 0) {
        adUnit.sizes = bidRequest.sizes;
      }

      const request = {
        // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
        auctionId: bidRequest.auctionId,
        requestId: bidRequest.bidId,
        bidRequestsCount: bidRequest.bidRequestsCount,
        bidderRequestId: bidRequest.bidderRequestId,
        transactionId: bidRequest.ortb2Imp?.ext?.tid,
        referrer: referrer,
        timeout: timeout,
        adUnit: adUnit,
        locale: locale,
        domain: domain,
        os: additional.os,
        osv: additional.osv,
        devicetype: additional.devicetype
      };

      if (bidderRequest.gdprConsent) {
        request.gdpr = {
          applies: bidderRequest.gdprConsent.gdprApplies,
          consentString: bidderRequest.gdprConsent.consentString
        };
      }

      /*       if (bidderRequest.uspConsent) {
        request.uspConsent = bidderRequest.uspConsent;
      }
 */
      if (bidRequest.userId && bidRequest.userId.pubcid) {
        request.userId = {
          pubcid: bidRequest.userId.pubcid
        };
      }

      if (debug) {
        request.debug = debug;
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(request)
      }
    });
  },
  interpretResponse: (serverResponse) => {
    const bidResponses = [];

    if (serverResponse.body) {
      const response = serverResponse.body;
      const bidResponse = {
        requestId: response.requestId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        currency: response.currency,
        netRevenue: response.netRevenue,
        ttl: response.ttl,
        ad: response.ad,
        meta: {
          advertiserDomains: response.adomain && response.adomain.length ? response.adomain : [],
          mediaType: 'banner'
        }
      };
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    if (gdprConsent && SYNC_ENDPOINT.indexOf('gdpr') === -1) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
    }

    if (gdprConsent && typeof gdprConsent.consentString === 'string' && SYNC_ENDPOINT.indexOf('gdpr_consent') === -1) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'gdpr_consent', gdprConsent.consentString);
    }

    if (SYNC_ENDPOINT.slice(-1) === '&') {
      SYNC_ENDPOINT = SYNC_ENDPOINT.slice(0, -1);
    }

    /*     if (uspConsent) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'us_privacy', uspConsent);
    } */
    let syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: SYNC_ENDPOINT
      });
    }
    return syncs;
  },
    parseUserAgent: (ua) => {
      const info = parseUserAgentDetailed(ua);
      return {
        devicetype: info.devicetype,
        os: info.os,
        osv: info.osv
      };
    }
};
registerBidder(spec);
