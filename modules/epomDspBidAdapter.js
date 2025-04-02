/**
 * @name epomDspBidAdapter
 * @version 1.0.0
 * @description Adapter for Epom DSP and AdExchange
 * @module modules/epomDspBidAdapter
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logError, logWarn, getBidIdParameter, isFn, isPlainObject, deepClone } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'epom_dsp';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid(bid) {
    const globalSettings = config.getBidderConfig()[BIDDER_CODE]?.epomSettings || {};
    const endpoint = bid.params?.endpoint || globalSettings.endpoint;

    if (!endpoint || typeof endpoint !== 'string') {
      logWarn(`[${BIDDER_CODE}] Invalid endpoint: expected a non-empty string.`);
      return false;
    }

    if (!endpoint.startsWith('https://')) {
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

        const payload = {
          ...deepClone(bid),
          id: bid.bidId || 'default-id',
          imp: [
            {
              id: bid.bidId,
              tagid: bid.adUnitCode,
              bidfloor: getBidFloor(bid),
              banner: {
                w: bid.sizes[0][0],
                h: bid.sizes[0][1],
              },
            }
          ],
          site: {
            domain: bidderRequest?.refererInfo?.domain || 'unknown.com',
            page: bidderRequest?.refererInfo?.referer || 'https://unknown.com',
            publisher: { id: 'unknown-publisher' }
          },
          device: {
            ua: navigator.userAgent || '',
            ip: '0.0.0.0',
            devicetype: 2,
          },
          referer: bidderRequest?.refererInfo?.referer,
          gdprConsent: bidderRequest?.gdprConsent,
          uspConsent: bidderRequest?.uspConsent,
          bidfloor: getBidFloor(bid),
          sizes: bid.sizes[0] || [],
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
      }).filter(request => request !== null);
    } catch (error) {
      logError(`[${BIDDER_CODE}] Error in buildRequests:`, error);
      return [];
    }
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

function getBidFloor(bid) {
  let floor = parseFloat(getBidIdParameter('bidfloor', bid.params)) || null;
  let floorcur = getBidIdParameter('bidfloorcur', bid.params) || 'USD';

  if (!floor && isFn(bid.getFloor)) {
    try {
      const floorObj = bid.getFloor({
        currency: floorcur,
        mediaType: '*',
        size: '*'
      });

      if (
        isPlainObject(floorObj) &&
        !isNaN(parseFloat(floorObj.floor)) &&
        floorObj.currency === floorcur
      ) {
        floor = parseFloat(floorObj.floor);
      }
    } catch (e) {
      logError('Error retrieving floor price:', e);
    }
  }

  return floor || 0;
}

registerBidder(spec);
