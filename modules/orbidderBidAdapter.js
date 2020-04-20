import {detectReferer} from '../src/refererDetection.js';
import {ajax} from '../src/ajax.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

export const spec = {
  code: 'orbidder',
  bidParams: {},
  orbidderHost: (() => {
    let ret = 'https://orbidder.otto.de';
    try {
      ret = storage.getDataFromLocalStorage('ov_orbidder_host') || ret;
    } catch (e) {
    }
    return ret;
  })(),

  isBidRequestValid(bid) {
    return !!(bid.sizes && bid.bidId && bid.params &&
      (bid.params.accountId && (typeof bid.params.accountId === 'string')) &&
      (bid.params.placementId && (typeof bid.params.placementId === 'string')) &&
      ((typeof bid.params.bidfloor === 'undefined') || (typeof bid.params.bidfloor === 'number')) &&
      ((typeof bid.params.profile === 'undefined') || (typeof bid.params.profile === 'object')));
  },

  buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map((bidRequest) => {
      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.referer || '';
      }

      const ret = {
        url: `${spec.orbidderHost}/bid`,
        method: 'POST',
        options: { withCredentials: true },
        data: {
          v: $$PREBID_GLOBAL$$.version,
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          sizes: bidRequest.sizes,
          params: bidRequest.params
        }
      };
      spec.bidParams[bidRequest.bidId] = bidRequest.params;
      if (bidderRequest && bidderRequest.gdprConsent) {
        ret.data.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies
        };
      }
      return ret;
    });
  },

  interpretResponse(serverResponse) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bid) => {
        const bidResponse = {};
        for (const requiredKey of ['requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency']) {
          if (!bid.hasOwnProperty(requiredKey)) {
            return [];
          }
          bidResponse[requiredKey] = bid[requiredKey];
        }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  onBidWon(bid) {
    const getRefererInfo = detectReferer(window);

    bid.v = $$PREBID_GLOBAL$$.version;
    bid.pageUrl = getRefererInfo().referer;
    if (spec.bidParams[bid.requestId] && (typeof bid.params === 'undefined')) {
      bid.params = [spec.bidParams[bid.requestId]];
    }
    spec.ajaxCall(`${spec.orbidderHost}/win`, JSON.stringify(bid));
  },

  ajaxCall(endpoint, data) {
    ajax(endpoint, null, data, { withCredentials: true });
  }
};

registerBidder(spec);
