import { isInteger, logError, isEmpty, logWarn, getUniqueIdentifierStr, _each, deepSetValue } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const AOL_BIDDERS_CODES = {
  AOL: 'aol',
  VERIZON: 'verizon',
  ONEMOBILE: 'onemobile',
  ONEDISPLAY: 'onedisplay'
};

const AOL_ENDPOINTS = {
  DISPLAY: {
    GET: 'display-get'
  },
  MOBILE: {
    GET: 'mobile-get',
    POST: 'mobile-post'
  }
};

const SYNC_TYPES = {
  IFRAME: {
    TAG: 'iframe',
    TYPE: 'iframe'
  },
  IMAGE: {
    TAG: 'img',
    TYPE: 'image'
  }
};

const SUPPORTED_USER_ID_SOURCES = [
  'adserver.org',
  'criteo.com',
  'id5-sync.com',
  'intentiq.com',
  'liveintent.com',
  'quantcast.com',
  'verizonmedia.com',
  'liveramp.com',
  'yahoo.com'
];

const pubapiTemplate = template`${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'};misc=${'misc'};${'dynamicParams'}`;
const nexageBaseApiTemplate = template`${'host'}/bidRequest?`;
const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'dynamicParams'}`;
const MP_SERVER_MAP = {
  us: 'adserver-us.adtech.advertising.com',
  eu: 'adserver-eu.adtech.advertising.com',
  as: 'adserver-as.adtech.advertising.com'
};
const NEXAGE_SERVER = 'c2shb.ssp.yahoo.com';
const ONE_DISPLAY_TTL = 60;
const ONE_MOBILE_TTL = 3600;
const DEFAULT_PROTO = 'https';

const NUMERIC_VALUES = {
  TRUE: 1,
  FALSE: 0
};

function template(strings, ...keys) {
  return function (...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function (key, i) {
      let value = isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
}

function _isMarketplaceBidder(bidderCode) {
  return bidderCode === AOL_BIDDERS_CODES.AOL ||
    bidderCode === AOL_BIDDERS_CODES.VERIZON ||
    bidderCode === AOL_BIDDERS_CODES.ONEDISPLAY;
}

function _isOneMobileBidder(bidderCode) {
  return bidderCode === AOL_BIDDERS_CODES.AOL ||
    bidderCode === AOL_BIDDERS_CODES.VERIZON ||
    bidderCode === AOL_BIDDERS_CODES.ONEMOBILE;
}

function _isNexageRequestPost(bid) {
  if (_isOneMobileBidder(bid.bidder) && bid.params.id && bid.params.imp && bid.params.imp[0]) {
    let imp = bid.params.imp[0];
    return imp.id && imp.tagid && imp.banner && imp.banner.w && imp.banner.h;
  }
}

function _isNexageRequestGet(bid) {
  return _isOneMobileBidder(bid.bidder) && bid.params.dcn && bid.params.pos;
}

function isMarketplaceBid(bid) {
  return _isMarketplaceBidder(bid.bidder) && bid.params.placement && bid.params.network;
}

function isMobileBid(bid) {
  return _isNexageRequestGet(bid) || _isNexageRequestPost(bid);
}

function resolveEndpointCode(bid) {
  if (_isNexageRequestGet(bid)) {
    return AOL_ENDPOINTS.MOBILE.GET;
  } else if (_isNexageRequestPost(bid)) {
    return AOL_ENDPOINTS.MOBILE.POST;
  } else if (isMarketplaceBid(bid)) {
    return AOL_ENDPOINTS.DISPLAY.GET;
  }
}

function getSupportedEids(bid) {
  return bid.userIdAsEids.filter(eid => {
    return SUPPORTED_USER_ID_SOURCES.indexOf(eid.source) !== -1
  });
}

export const spec = {
  code: AOL_BIDDERS_CODES.AOL,
  gvlid: 25,
  aliases: [
    AOL_BIDDERS_CODES.ONEMOBILE,
    AOL_BIDDERS_CODES.ONEDISPLAY,
    AOL_BIDDERS_CODES.VERIZON
  ],
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    return isMarketplaceBid(bid) || isMobileBid(bid);
  },
  buildRequests(bids, bidderRequest) {
    const consentData = {};
    if (bidderRequest) {
      consentData.gdpr = bidderRequest.gdprConsent;
      consentData.uspConsent = bidderRequest.uspConsent;
    }

    return bids.map(bid => {
      const endpointCode = resolveEndpointCode(bid);

      if (endpointCode) {
        return this.formatBidRequest(endpointCode, bid, consentData);
      }
    });
  },
  interpretResponse({ body }, bidRequest) {
    if (!body) {
      logError('Empty bid response', bidRequest.bidderCode, body);
    } else {
      let bid = this._parseBidResponse(body, bidRequest);

      if (bid) {
        return bid;
      }
    }
  },
  getUserSyncs(options, serverResponses) {
    const bidResponse = !isEmpty(serverResponses) && serverResponses[0].body;

    if (bidResponse && bidResponse.ext && bidResponse.ext.pixels) {
      return this.parsePixelItems(bidResponse.ext.pixels);
    }

    return [];
  },

  formatBidRequest(endpointCode, bid, consentData) {
    let bidRequest;

    switch (endpointCode) {
      case AOL_ENDPOINTS.DISPLAY.GET:
        bidRequest = {
          url: this.buildMarketplaceUrl(bid, consentData),
          method: 'GET',
          ttl: ONE_DISPLAY_TTL
        };
        break;

      case AOL_ENDPOINTS.MOBILE.GET:
        bidRequest = {
          url: this.buildOneMobileGetUrl(bid, consentData),
          method: 'GET',
          ttl: ONE_MOBILE_TTL
        };
        break;

      case AOL_ENDPOINTS.MOBILE.POST:
        bidRequest = {
          url: this.buildOneMobileBaseUrl(bid),
          method: 'POST',
          ttl: ONE_MOBILE_TTL,
          data: this.buildOpenRtbRequestData(bid, consentData),
          options: {
            contentType: 'application/json',
            customHeaders: {
              'x-openrtb-version': '2.2'
            }
          }
        };
        break;
    }

    bidRequest.bidderCode = bid.bidder;
    bidRequest.bidId = bid.bidId;
    bidRequest.userSyncOn = bid.params.userSyncOn;

    return bidRequest;
  },
  buildMarketplaceUrl(bid, consentData) {
    const params = bid.params;
    const serverParam = params.server;
    let regionParam = params.region || 'us';
    let server;

    if (!MP_SERVER_MAP.hasOwnProperty(regionParam)) {
      logWarn(`Unknown region '${regionParam}' for AOL bidder.`);
      regionParam = 'us'; // Default region.
    }

    if (serverParam) {
      server = serverParam;
    } else {
      server = MP_SERVER_MAP[regionParam];
    }

    // Set region param, used by AOL analytics.
    params.region = regionParam;

    return this.applyProtocol(pubapiTemplate({
      host: server,
      network: params.network,
      placement: parseInt(params.placement),
      pageid: params.pageId || 0,
      sizeid: params.sizeId || 0,
      alias: params.alias || getUniqueIdentifierStr(),
      misc: new Date().getTime(), // cache busting
      dynamicParams: this.formatMarketplaceDynamicParams(params, consentData)
    }));
  },
  buildOneMobileGetUrl(bid, consentData) {
    let { dcn, pos, ext } = bid.params;
    if (typeof bid.userId === 'object') {
      ext = ext || {};
      let eids = getSupportedEids(bid);
      eids.forEach(eid => {
        ext['eid' + eid.source] = eid.uids[0].id;
      });
    }
    let nexageApi = this.buildOneMobileBaseUrl(bid);
    if (dcn && pos) {
      let dynamicParams = this.formatOneMobileDynamicParams(ext, consentData);
      nexageApi += nexageGetApiTemplate({ dcn, pos, dynamicParams });
    }
    return nexageApi;
  },
  buildOneMobileBaseUrl(bid) {
    return this.applyProtocol(nexageBaseApiTemplate({
      host: bid.params.host || NEXAGE_SERVER
    }));
  },
  applyProtocol(url) {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return (url.indexOf('//') === 0) ? `${DEFAULT_PROTO}:${url}` : `${DEFAULT_PROTO}://${url}`;
  },
  formatMarketplaceDynamicParams(params = {}, consentData = {}) {
    let queryParams = {};

    Object.assign(queryParams, this.formatKeyValues(params.keyValues));
    Object.assign(queryParams, this.formatConsentData(consentData));

    let paramsFormatted = '';
    _each(queryParams, (value, key) => {
      paramsFormatted += `${key}=${encodeURIComponent(value)};`;
    });

    return paramsFormatted;
  },
  formatOneMobileDynamicParams(params = {}, consentData = {}) {
    if (this.isSecureProtocol()) {
      params.secure = NUMERIC_VALUES.TRUE;
    }

    Object.assign(params, this.formatConsentData(consentData));

    let paramsFormatted = '';
    _each(params, (value, key) => {
      paramsFormatted += `&${key}=${encodeURIComponent(value)}`;
    });

    return paramsFormatted;
  },
  buildOpenRtbRequestData(bid, consentData = {}) {
    let openRtbObject = {
      id: bid.params.id,
      imp: bid.params.imp
    };

    if (this.isEUConsentRequired(consentData)) {
      deepSetValue(openRtbObject, 'regs.ext.gdpr', NUMERIC_VALUES.TRUE);
      if (consentData.gdpr.consentString) {
        deepSetValue(openRtbObject, 'user.ext.consent', consentData.gdpr.consentString);
      }
    }

    if (consentData.uspConsent) {
      deepSetValue(openRtbObject, 'regs.ext.us_privacy', consentData.uspConsent);
    }

    if (typeof bid.userId === 'object') {
      openRtbObject.user = openRtbObject.user || {};
      openRtbObject.user.ext = openRtbObject.user.ext || {};

      let eids = getSupportedEids(bid);
      if (eids.length > 0) {
        openRtbObject.user.ext.eids = eids
      }
    }

    return openRtbObject;
  },
  isEUConsentRequired(consentData) {
    return !!(consentData && consentData.gdpr && consentData.gdpr.gdprApplies);
  },
  formatKeyValues(keyValues) {
    let keyValuesHash = {};

    _each(keyValues, (value, key) => {
      keyValuesHash[`kv${key}`] = value;
    });

    return keyValuesHash;
  },
  formatConsentData(consentData) {
    let params = {};

    if (this.isEUConsentRequired(consentData)) {
      params.gdpr = NUMERIC_VALUES.TRUE;

      if (consentData.gdpr.consentString) {
        params.euconsent = consentData.gdpr.consentString;
      }
    }

    if (consentData.uspConsent) {
      params.us_privacy = consentData.uspConsent;
    }

    return params;
  },
  parsePixelItems(pixels) {
    let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
    let tagNameRegExp = /\w*(?=\s)/;
    let srcRegExp = /src=("|')(.*?)\1/;
    let pixelsItems = [];

    if (pixels) {
      let matchedItems = pixels.match(itemsRegExp);
      if (matchedItems) {
        matchedItems.forEach(item => {
          let tagName = item.match(tagNameRegExp)[0];
          let url = item.match(srcRegExp)[2];

          if (tagName && url) {
            pixelsItems.push({
              type: tagName === SYNC_TYPES.IMAGE.TAG ? SYNC_TYPES.IMAGE.TYPE : SYNC_TYPES.IFRAME.TYPE,
              url: url
            });
          }
        });
      }
    }

    return pixelsItems;
  },

  _parseBidResponse(response, bidRequest) {
    let bidData;

    try {
      bidData = response.seatbid[0].bid[0];
    } catch (e) {
      return;
    }

    let cpm;

    if (bidData.ext && bidData.ext.encp) {
      cpm = bidData.ext.encp;
    } else {
      cpm = bidData.price;

      if (cpm === null || isNaN(cpm)) {
        logError('Invalid price in bid response', AOL_BIDDERS_CODES.AOL, bidData);
        return;
      }
    }

    return {
      bidderCode: bidRequest.bidderCode,
      requestId: bidRequest.bidId,
      ad: bidData.adm,
      cpm: cpm,
      width: bidData.w,
      height: bidData.h,
      creativeId: bidData.crid || 0,
      pubapiId: response.id,
      currency: response.cur || 'USD',
      dealId: bidData.dealid,
      netRevenue: true,
      meta: {
        advertiserDomains: bidData && bidData.adomain ? bidData.adomain : []
      },
      ttl: bidRequest.ttl
    };
  },
  isOneMobileBidder: _isOneMobileBidder,
  isSecureProtocol() {
    return document.location.protocol === 'https:';
  }
};

registerBidder(spec);
