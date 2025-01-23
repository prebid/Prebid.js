/**
 * @name epomDspBidAdapter
 * @version 1.0.0
 * @description Adapter for Epom DSP and AdExchange
 * @module modules/epomDspBidAdapter
 * @license Open Source - Apache 2.0
 */

import { logError, logWarn, registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
const BIDDER_CODE = 'epomDsp';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid(bid) {
    const globalSettings = config.getBidderConfig()[BIDDER_CODE]?.epomSettings || {};
    const hasEndpoint = bid.params?.endpoint || globalSettings.endpoint;
    return !!(hasEndpoint);
  },

  buildRequests(bidRequests, bidderRequest) {
    const bidderConfig = config.getBidderConfig();
    const globalSettings = bidderConfig['epomDsp']?.epomSettings || {};

    const requests = bidRequests.map((bid) => {
      const endpoint = bid.params?.endpoint || globalSettings.endpoint;
      const payload = {
        ...bid,
        referer: bidderRequest?.refererInfo?.referer,
        gdprConsent: bidderRequest?.gdprConsent,
        uspConsent: bidderRequest?.uspConsent,
      };
      delete payload.params;

      return {
        method: 'POST',
        url: endpoint,
        data: JSON.parse(JSON.stringify(payload)),
        options: {
          contentType: 'application/json',
          withCredentials: false,
        },
      };
    });

    return requests.filter((request) => request !== null);
  },

  interpretResponse(serverResponse) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response && Array.isArray(response.bids)) {
      response.bids.forEach((bid) => {
        if (bid.cpm && bid.ad && bid.width && bid.height) {
          bidResponses.push({
            requestId: bid.requestId,
            cpm: bid.cpm,
            currency: bid.currency,
            width: bid.width,
            height: bid.height,
            ad: bid.ad,
            creativeId: bid.creativeId || bid.requestId,
            ttl: typeof bid.ttl === 'number' ? bid.ttl : 300,
            netRevenue: bid.netRevenue !== false,
          });
        } else {
          logWarn(`[${BIDDER_CODE}] Invalid bid response:`, bid);
        }
      });
    } else {
      logError(`[${BIDDER_CODE}] Empty or invalid server response:`, serverResponse);
    }

    return bidResponses;
  },

  getUserSyncs(syncOptions, serverResponses) {
    const syncs = [];

    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      serverResponses.forEach((response) => {
        if (response.body?.userSync?.iframe) {
          syncs.push({
            type: 'iframe',
            url: response.body.userSync.iframe,
          });
        }
      });
    }

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      serverResponses.forEach((response) => {
        if (response.body?.userSync?.pixel) {
          syncs.push({
            type: 'image',
            url: response.body.userSync.pixel,
          });
        }
      });
    }

    return syncs;
  },
};

registerBidder(spec);
