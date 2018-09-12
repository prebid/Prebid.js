import find from 'core-js/library/fn/array/find';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adagio';
const VERSION = '1.0.0';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];

/**
 * Based on https://github.com/ua-parser/uap-cpp/blob/master/UaParser.cpp#L331, with the following updates:
 * - replaced `mobile` by `mobi` in the table regexp, so Opera Mobile on phones is not detected as a tablet.
 */
function _getDeviceType() {
  let ua = navigator.userAgent;

  // Tablets must be checked before phones.
  if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
    return 5; // "tablet"
  }
  if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
    return 4; // "phone"
  }
  // Consider that all other devices are personal computers
  return 2;
};

function _getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    user_agent: navigator.userAgent,
    language: navigator[language],
    device_type: _getDeviceType(),
    dnt: utils.getDNT() ? 1 : 0,
    geo: {},
    js: 1
  };
};

function _getSite() {
  const topLocation = utils.getTopWindowLocation();
  return {
    domain: topLocation.hostname,
    page: topLocation.href,
    referrer: utils.getTopWindowReferrer()
  };
};

function _getPageviewId() {
  return (!window.top.ADAGIO || !window.top.ADAGIO.pageviewId) ? '_' : window.top.ADAGIO.pageviewId;
};

function _getFeatures(bidRequest) {
  if (!window.top._ADAGIO || !window.top._ADAGIO.features) {
    return {};
  }

  const rawFeatures = window.top._ADAGIO.features.getFeatures(
    document.getElementById(bidRequest.adUnitCode),
    function(features) {
      return {
        site_id: bidRequest.params.site,
        placement: bidRequest.params.placement,
        pagetype: bidRequest.params.pagetype,
        category: (bidRequest.params.categories && bidRequest.params.categories.length) ? bidRequest.params.categories.join(',') : '_'
      };
    }
  );
  return rawFeatures;
}

function _getGdprConsent(bidderRequest) {
  const consentConfig = {};
  if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      consentConfig.consentString = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      consentConfig.consentRequired = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
  }
  return consentConfig;
}

export const spec = {
  code: BIDDER_CODE,

  supportedMediaType: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid.params.publisher && bid.params.site && bid.params.placement);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = {
      id: utils.generateUUID(),
      secure: (location.protocol === 'https:') ? 1 : 0,
      device: _getDevice(),
      site: _getSite(),
      pageviewId: _getPageviewId(),
      ad_units: utils._map(validBidRequests, (bidRequest, k) => {
        if (typeof bidRequest.params.categories === 'string') {
          var category = bidRequest.params.categories;
          bidRequest.params.categories = [category];
        }
        bidRequest.params.features = _getFeatures(bidRequest);
        return bidRequest;
      }),
      gdpr: _getGdprConsent(bidderRequest),
      adapter_version: VERSION
    };

    return {
      method: 'POST',
      url: ENDPOINT,
      data: requests,
      options: {
        contentType: 'application/json'
      }
    }
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        response.bids.forEach(bidObj => {
          const bidReq = (find(bidRequest.data.ad_units, bid => bid.bidId === bidObj.requestId));
          if (bidReq) {
            bidObj.placement = bidReq.params.placement;
            bidObj.pagetype = bidReq.params.pagetype
            bidObj.category = (bidReq.params.features && bidReq.params.features.category) ? bidReq.params.features.category : '_';
            bidObj.subcategory = (bidReq.params.features && bidReq.params.features.subcategory) ? bidReq.params.features.subcategory : '_';
          }
          bidResponses.push(bidObj);
        });
      }
    } catch (err) {
      utils.logError(err);
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
      return false;
    }
    const syncs = serverResponses[0].body.userSyncs.map((sync) => {
      return {
        type: sync.t === 'p' ? 'image' : 'iframe',
        url: sync.u
      }
    })
    return syncs;
  }
}

registerBidder(spec);
