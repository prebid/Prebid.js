/**
 * @name epomDspBidAdapter
 * @version 1.0.0
 * @description Adapter for Epom DSP and AdExchange
 * @module modules/epomDspBidAdapter
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logError, logWarn, deepClone } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'epom_dsp';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['epomdsp'],

  isBidRequestValid(bid) {
    const globalSettings = config.getBidderConfig()[BIDDER_CODE]?.epomSettings || {};
    const endpoint = bid.params?.endpoint || globalSettings.endpoint;
    if (!endpoint || typeof endpoint !== 'string') {
      logWarn(`[${BIDDER_CODE}] Invalid endpoint: expected a non-empty string.`);
      return false;
    }

    if (!(endpoint.startsWith('https://') || endpoint.startsWith('http://'))) {
      logWarn(`[${BIDDER_CODE}] Invalid endpoint: must start with "https://".`);
      return false;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    try {
      const bidderConfig = config.getBidderConfig();
      const globalSettings = bidderConfig[BIDDER_CODE]?.epomSettings || {};

      return bidRequests.map((bid) => {
        const endpoint = bid.params?.endpoint || globalSettings.endpoint;
        if (!endpoint) {
          logWarn(`[${BIDDER_CODE}] Missing endpoint for bid request.`);
          return null;
        }

        const impArray = Array.isArray(bid.imp) ? bid.imp : [];
        const defaultSize = bid.mediaTypes?.banner?.sizes?.[0] || bid.sizes?.[0];
        if (!defaultSize) {
          logWarn(`[${BIDDER_CODE}] No size found in mediaTypes or bid.sizes.`);
        }

        impArray.forEach(imp => {
          if (imp.id && (!imp.banner?.w || !imp.banner?.h) && defaultSize) {
            imp.banner = {
              w: defaultSize[0],
              h: defaultSize[1],
            };
          }
        });
        const extraData = deepClone(bid);
        const payload = {
          ...extraData,
          id: bid.id,
          imp: impArray,
          referer: bidderRequest?.refererInfo?.referer,
          gdprConsent: bidderRequest?.gdprConsent,
          uspConsent: bidderRequest?.uspConsent,
        };

        return {
          method: 'POST',
          url: endpoint,
          data: payload,
          options: {
            contentType: 'application/json',
            withCredentials: false,
          },
        };
      }).filter(req => req !== null);
    } catch (error) {
      logError(`[${BIDDER_CODE}] Error in buildRequests:`, error);
      return [];
    }
  },

  interpretResponse(serverResponse, request) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response && response.seatbid && Array.isArray(response.seatbid)) {
      response.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
          if (!bid.adm) {
            logError(`[${BIDDER_CODE}] Missing 'adm' in bid response`, bid);
            return;
          }
          bidResponses.push({
            requestId: request?.data?.bidId || bid.impid,
            cpm: bid.price,
            nurl: bid.nurl,
            currency: response.cur || 'USD',
            width: bid.w,
            height: bid.h,
            ad: bid.adm,
            creativeId: bid.crid || bid.adid,
            ttl: 300,
            netRevenue: true,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          });
        });
      });
    } else {
      logError(`[${BIDDER_CODE}] Empty or invalid response`, serverResponse);
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
