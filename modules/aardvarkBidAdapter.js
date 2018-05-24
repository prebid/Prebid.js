import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'aardvark';
const DEFAULT_ENDPOINT = 'bidder.rtk.io';
const SYNC_ENDPOINT = 'sync.rtk.io';
const AARDVARK_TTL = 300;
const AARDVARK_CURRENCY = 'USD';

let hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return ((typeof bid.params.ai === 'string') && !!bid.params.ai.length &&
        (typeof bid.params.sc === 'string') && !!bid.params.sc.length);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    var auctionCodes = [];
    var requests = [];
    var requestsMap = {};
    var referer = utils.getTopWindowUrl();
    var pageCategories = [];

    if (window.top.rtkcategories && Array.isArray(window.top.rtkcategories)) {
      pageCategories = window.top.rtkcategories;
    }

    utils._each(validBidRequests, function(b) {
      var rMap = requestsMap[b.params.ai];
      if (!rMap) {
        rMap = {
          shortCodes: [],
          payload: {
            version: 1,
            jsonp: false,
            rtkreferer: referer
          },
          endpoint: DEFAULT_ENDPOINT
        };

        if (pageCategories && pageCategories.length) {
          rMap.payload.categories = pageCategories.slice(0);
        }

        if (b.params.categories && b.params.categories.length) {
          rMap.payload.categories = rMap.payload.categories || []
          utils._each(b.params.categories, function(cat) {
            rMap.payload.categories.push(cat);
          });
        }

        if (bidderRequest && bidderRequest.gdprConsent) {
          rMap.payload.gdpr = false;
          if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
            rMap.payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
          }
          if (rMap.payload.gdpr) {
            rMap.payload.consent = bidderRequest.gdprConsent.consentString;
          }
        }

        requestsMap[b.params.ai] = rMap;
        auctionCodes.push(b.params.ai);
      }

      rMap.shortCodes.push(b.params.sc);
      rMap.payload[b.params.sc] = b.bidId;

      if ((typeof b.params.host === 'string') && b.params.host.length &&
          (b.params.host !== rMap.endpoint)) {
        rMap.endpoint = b.params.host;
      }
    });

    utils._each(auctionCodes, function(auctionId) {
      var req = requestsMap[auctionId];
      requests.push({
        method: 'GET',
        url: `//${req.endpoint}/${auctionId}/${req.shortCodes.join('_')}/aardvark`,
        data: req.payload,
        bidderRequest
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    var bidResponses = [];

    if (!Array.isArray(serverResponse.body)) {
      serverResponse.body = [serverResponse.body];
    }

    utils._each(serverResponse.body, function(rawBid) {
      var bidResponse = {
        requestId: rawBid.cid,
        cpm: rawBid.cpm || 0,
        width: rawBid.width || 0,
        height: rawBid.height || 0,
        currency: rawBid.currency ? rawBid.currency : AARDVARK_CURRENCY,
        netRevenue: rawBid.netRevenue ? rawBid.netRevenue : true,
        ttl: rawBid.ttl ? rawBid.ttl : AARDVARK_TTL,
        creativeId: rawBid.creativeId || 0
      };

      if (rawBid.hasOwnProperty('dealId')) {
        bidResponse.dealId = rawBid.dealId
      }

      switch (rawBid.media) {
        case 'banner':
          bidResponse.ad = rawBid.adm + utils.createTrackPixelHtml(decodeURIComponent(rawBid.nurl));
          break;

        default:
          return utils.logError('bad Aardvark response (media)', rawBid);
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    var url = '//' + SYNC_ENDPOINT + '/cs';
    var gdprApplies = false;
    if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
      gdprApplies = gdprConsent.gdprApplies;
    }

    if (syncOptions.iframeEnabled) {
      if (!hasSynced) {
        hasSynced = true;
        if (gdprApplies) {
          url = url + '?g=1&c=' + encodeURIComponent(gdprConsent.consentString);
        }
        syncs.push({
          type: 'iframe',
          url: url
        });
      }
    } else {
      utils.logWarn('Aardvark: Please enable iframe based user sync.');
    }
    return syncs;
  }
};

registerBidder(spec);
