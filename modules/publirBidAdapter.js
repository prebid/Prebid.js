import {
  logWarn,
  logInfo,
  isArray,
  deepAccess,
  triggerPixel,
  getDNT,
  getBidIdParameter
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import {
  getEndpoint,
  generateBidsParams,
  generateGeneralParams,
  buildBidResponse,
} from '../libraries/riseUtils/index.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'publir';
const ADAPTER_VERSION = '1.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const DEFAULT_SELLER_ENDPOINT = 'https://prebid.publir.com/publirPrebidEndPoint';
const DEFAULT_IMPS_ENDPOINT = 'https://prebidimpst.publir.com/publirPrebidImpressionTracker';
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
export const spec = {
  code: BIDDER_CODE,
  version: ADAPTER_VERSION,
  aliases: ['plr'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params.pubId) {
      logWarn('pubId is a mandatory param for Publir adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const reqObj = {};
    const generalObject = validBidRequests[0];
    reqObj.params = generatePubGeneralsParams(generalObject, bidderRequest);
    reqObj.bids = generateBidsParams(validBidRequests, bidderRequest);
    reqObj.bids.timestamp = timestamp();
    let options = {
      withCredentials: false
    };

    return {
      method: 'POST',
      url: DEFAULT_SELLER_ENDPOINT,
      data: reqObj,
      options
    }
  },
  interpretResponse: function ({ body }) {
    const bidResponses = [];
    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = buildBidResponse(adUnit, CURRENCY, TTL, VIDEO, BANNER);
        if (adUnit?.meta?.ad_key) {
          bidResponse.meta.ad_key = adUnit.meta.ad_key ?? null;
        }
        if (adUnit.campId) {
          bidResponse.campId = adUnit.campId;
        }
        bidResponse.bidder = BIDDER_CODE;
        bidResponses.push(bidResponse);
      });
    } else {
      return [];
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
      if (response.body && response.body.params) {
        if (syncOptions.iframeEnabled && response.body.params.userSyncURL) {
          syncs.push({
            type: 'iframe',
            url: response.body.params.userSyncURL
          });
        }
        if (syncOptions.pixelEnabled && isArray(response.body.params.userSyncPixels)) {
          const pixels = response.body.params.userSyncPixels.map(pixel => {
            return {
              type: 'image',
              url: pixel
            }
          })
          syncs.push(...pixels)
        }
      }
    }
    return syncs;
  },
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }
    logInfo('onBidWon:', bid);
    ajax(DEFAULT_IMPS_ENDPOINT, null, JSON.stringify(bid), { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  },
};

registerBidder(spec);

/**
 * Get local storage data
 * @param {string} cookieObjName
 * @returns {string}
 */
function getLocalStorage(cookieObjName) {
  if (storage.localStorageIsEnabled()) {
    const lstData = storage.getDataFromLocalStorage(cookieObjName);
    return lstData;
  }
  return '';
}

/**
 * Generate general params for Publir adapter
 * @param {Object} generalObject
 * @param {Object} bidderRequest
 * @returns {Object} the general params object
 */
function generatePubGeneralsParams(generalObject, bidderRequest) {
  const domain = bidderRequest.refererInfo.domain || window.location.hostname;
  const { syncEnabled, filterSettings } = config.getConfig('userSync') || {};
  const { bidderCode, timeout } = bidderRequest;
  const generalBidParams = generalObject.params;

  const generalParams = {
    wrapper_type: 'prebidjs',
    wrapper_vendor: '$$PREBID_GLOBAL$$',
    wrapper_version: '$prebid.version$',
    adapter_version: ADAPTER_VERSION,
    auction_start: bidderRequest.auctionStart,
    publisher_id: generalBidParams.pubId,
    publisher_name: domain,
    site_domain: domain,
    dnt: getDNT() ? 1 : 0,
    device_type: getDeviceType(navigator.userAgent),
    ua: navigator.userAgent,
    is_wrapper: !!generalBidParams.isWrapper,
    session_id: generalBidParams.sessionId || getBidIdParameter('bidderRequestId', generalObject),
    tmax: timeout,
    user_cookie: getLocalStorage('_publir_prebid_creative')
  };

  const userIdsParam = getBidIdParameter('userId', generalObject);
  if (userIdsParam) {
    generalParams.userIds = JSON.stringify(userIdsParam);
  }

  const ortb2Metadata = bidderRequest.ortb2 || {};
  if (ortb2Metadata.site) {
    generalParams.site_metadata = JSON.stringify(ortb2Metadata.site);
  }
  if (ortb2Metadata.user) {
    generalParams.user_metadata = JSON.stringify(ortb2Metadata.user);
  }

  if (syncEnabled) {
    const allowedSyncMethod = getAllowedSyncMethod(filterSettings, bidderCode);
    if (allowedSyncMethod) {
      generalParams.cs_method = allowedSyncMethod;
    }
  }

  if (bidderRequest.uspConsent) {
    generalParams.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
    generalParams.gdpr = bidderRequest.gdprConsent.gdprApplies;
    generalParams.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  if (generalObject.schain) {
    generalParams.schain = getSupplyChain(generalObject.schain);
  }

  if (bidderRequest && bidderRequest.refererInfo) {
    generalParams.page_url = deepAccess(bidderRequest, 'refererInfo.page') || deepAccess(window, 'location.href');
  }

  return generalParams;
}
