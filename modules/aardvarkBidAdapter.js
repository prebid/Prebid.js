import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

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
  gvlid: 52,
  aliases: ['adsparc', 'safereach'],

  isBidRequestValid: function(bid) {
    return ((typeof bid.params.ai === 'string') && !!bid.params.ai.length &&
      (typeof bid.params.sc === 'string') && !!bid.params.sc.length);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    var auctionCodes = [];
    var requests = [];
    var requestsMap = {};
    var referer = bidderRequest.refererInfo.referer;
    var pageCategories = [];
    var tdId = '';
    var width = window.innerWidth;
    var height = window.innerHeight;
    var schain = '';

    // This reference to window.top can cause issues when loaded in an iframe if not protected with a try/catch.
    try {
      var topWin = utils.getWindowTop();
      if (topWin.rtkcategories && Array.isArray(topWin.rtkcategories)) {
        pageCategories = topWin.rtkcategories;
      }
      width = topWin.innerWidth;
      height = topWin.innerHeight;
    } catch (e) {}

    if (utils.isStr(utils.deepAccess(validBidRequests, '0.userId.tdid'))) {
      tdId = validBidRequests[0].userId.tdid;
    }

    schain = spec.serializeSupplyChain(utils.deepAccess(validBidRequests, '0.schain'));

    utils._each(validBidRequests, function(b) {
      var rMap = requestsMap[b.params.ai];
      if (!rMap) {
        rMap = {
          shortCodes: [],
          payload: {
            version: 1,
            jsonp: false,
            rtkreferer: referer,
            w: width,
            h: height
          },
          endpoint: DEFAULT_ENDPOINT
        };

        if (tdId) {
          rMap.payload.tdid = tdId;
        }
        if (schain) {
          rMap.payload.schain = schain;
        }

        if (pageCategories && pageCategories.length) {
          rMap.payload.categories = pageCategories.slice(0);
        }

        if (b.params.categories && b.params.categories.length) {
          rMap.payload.categories = rMap.payload.categories || []
          utils._each(b.params.categories, function(cat) {
            rMap.payload.categories.push(cat);
          });
        }

        if (bidderRequest.gdprConsent) {
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

      if (bidderRequest.uspConsent) {
        rMap.payload.us_privacy = bidderRequest.uspConsent
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
        url: `https://${req.endpoint}/${auctionId}/${req.shortCodes.join('_')}/aardvark`,
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
      var cpm = +(rawBid.cpm || 0);

      if (!cpm) {
        return;
      }

      var bidResponse = {
        requestId: rawBid.cid,
        cpm: cpm,
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

      if (rawBid.hasOwnProperty('ex')) {
        bidResponse.ex = rawBid.ex;
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

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    const params = [];
    var gdprApplies = false;
    if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
      gdprApplies = gdprConsent.gdprApplies;
    }

    if (!syncOptions.iframeEnabled) {
      utils.logWarn('Aardvark: Please enable iframe based user sync.');
      return syncs;
    }

    if (hasSynced) {
      return syncs;
    }

    hasSynced = true;
    if (gdprApplies) {
      params.push(['g', '1']);
      params.push(['c', gdprConsent.consentString]);
    }

    if (uspConsent) {
      params.push(['us_privacy', uspConsent]);
    }

    var queryStr = '';
    if (params.length) {
      queryStr = '?' + params.map(p => p[0] + '=' + encodeURIComponent(p[1])).join('&')
    }

    syncs.push({
      type: 'iframe',
      url: `https://${SYNC_ENDPOINT}/cs${queryStr}`
    });
    return syncs;
  },

  /**
   * Serializes schain params according to OpenRTB requirements
   * @param {Object} supplyChain
   * @returns {String}
   */
  serializeSupplyChain: function (supplyChain) {
    if (!hasValidSupplyChainParams(supplyChain)) {
      return '';
    }

    return `${supplyChain.ver},${supplyChain.complete}!${spec.serializeSupplyChainNodes(supplyChain.nodes)}`;
  },

  /**
   * Properly sorts schain object params
   * @param {Array} nodes
   * @returns {String}
   */
  serializeSupplyChainNodes: function (nodes) {
    const nodePropOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    return nodes.map(node => {
      return nodePropOrder.map(prop => encodeURIComponent(node[prop] || '')).join(',');
    }).join('!');
  },
};

/**
 * Make sure the required params are present
 * @param {Object} schain
 * @param {Bool}
 */
export function hasValidSupplyChainParams(schain) {
  if (!schain || !schain.nodes) {
    return false;
  }
  const requiredFields = ['asi', 'sid', 'hp'];

  let isValid = schain.nodes.reduce((status, node) => {
    if (!status) {
      return status;
    }
    return requiredFields.every(field => node[field]);
  }, true);
  if (!isValid) {
    utils.logError('Aardvark: required schain params missing');
  }
  return isValid;
}

registerBidder(spec);
