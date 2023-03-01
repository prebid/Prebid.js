import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, isFn, isStr, isNumber, isArray, isEmpty, isPlainObject, generateUUID, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gpdr.js';

const INTEGRATION_METHOD = 'prebid.js';
const BIDDER_CODE = 'adtrgtme';
const ENDPOINT = 'https://z.cdn.adtarget.market/ssp?prebid&s=';
const ADAPTER_VERSION = '1.0.0';
const PREBID_VERSION = '$prebid.version$';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

function transformSizes(sizes) {
  const getSize = (size) => {
    return {
      w: parseInt(size[0]),
      h: parseInt(size[1])
    }
  }
  if (isArray(sizes) && sizes.length === 2 && !isArray(sizes[0])) {
    return [ getSize(sizes) ];
  }
  return sizes.map(getSize);
}

function extractUserSyncUrls(syncOptions, pixels) {
  let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
  let tagNameRegExp = /\w*(?=\s)/;
  let srcRegExp = /src=("|')(.*?)\1/;
  let userSyncObjects = [];

  if (pixels) {
    let matchedItems = pixels.match(itemsRegExp);
    if (matchedItems) {
      matchedItems.forEach(item => {
        let tagName = item.match(tagNameRegExp)[0];
        let url = item.match(srcRegExp)[2];
        if (tagName && url) {
          let tagType = tagName.toLowerCase() === 'img' ? 'image' : 'iframe';
          if ((!syncOptions.iframeEnabled && tagType === 'iframe') ||
                (!syncOptions.pixelEnabled && tagType === 'image')) {
            return;
          }
          userSyncObjects.push({
            type: tagType,
            url: url
          });
        }
      });
    }
  }
  return userSyncObjects;
}

function isSecure(bid) {
  return deepAccess(bid, 'params.bidOverride.imp.secure') || (document.location.protocol === 'https:') ? 1 : 0;
};

function getMediaType(bid) {
  return deepAccess(bid, 'mediaTypes.banner') ? BANNER : false;
}

function validateAppendObject(validationFunction, allowedKeys, inputObject, appendToObject) {
  const outputObject = {
    ...appendToObject
  };
  if (allowedKeys.length > 0 && typeof validationFunction === 'function') {
    for (const objectKey in inputObject) {
      if (allowedKeys.indexOf(objectKey) !== -1 && validationFunction(inputObject[objectKey])) {
        outputObject[objectKey] = inputObject[objectKey]
      }
    }
  }
  return outputObject;
};

function getTtl(bidderRequest) {
  const ttl = config.getConfig('adtrgtme.ttl');
  const validateTTL = (ttl) => {
    return (isNumber(ttl) && ttl > 0 && ttl < 3600) ? ttl : DEFAULT_BID_TTL
  };
  return ttl ? validateTTL(ttl) : validateTTL(deepAccess(bidderRequest, 'params.ttl'));
};

function getFloorModuleData(bid) {
  const getFloorRequestObject = {
    currency: deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY,
    mediaType: BANNER,
    size: '*'
  };
  return (isFn(bid.getFloor)) ? bid.getFloor(getFloorRequestObject) : false;
};

function generateOpenRtbObject(bidderRequest, bid) {
  if (bidderRequest) {
    let outBoundBidRequest = {
      id: generateUUID(),
      cur: [getFloorModuleData(bidderRequest).currency || deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY],
      imp: [],
      site: {
        page: deepAccess(bidderRequest, 'refererInfo.page')
      },
      device: {
        dnt: 0,
        ua: navigator.userAgent,
        ip: deepAccess(bid, 'params.bidOverride.device.ip') || deepAccess(bid, 'params.ext.ip') || undefined
      },
      regs: {
        ext: {
          'us_privacy': bidderRequest.uspConsent ? bidderRequest.uspConsent : '',
          gdpr: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies ? 1 : 0
        }
      },
      source: {
        ext: {
          hb: 1,
          adapterver: ADAPTER_VERSION,
          prebidver: PREBID_VERSION,
          integration: {
            name: INTEGRATION_METHOD,
            ver: PREBID_VERSION
          }
        },
        fd: 1
      },
      user: {
        ext: {
          consent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies
            ? bidderRequest.gdprConsent.consentString : ''
        }
      }
    };

    outBoundBidRequest.site.id = bid.params.sid;

    if (bidderRequest.ortb2) {
      outBoundBidRequest = appendFirstPartyData(outBoundBidRequest, bid);
    };

    if (deepAccess(bid, 'schain')) {
      outBoundBidRequest.source.ext.schain = bid.schain;
      outBoundBidRequest.source.ext.schain.nodes[0].rid = outBoundBidRequest.id;
    };

    return outBoundBidRequest;
  };
};

function appendImpObject(bid, openRtbObject) {
  const mediaTypeMode = getMediaType(bid);

  if (openRtbObject && bid) {
    const impObject = {
      id: bid.bidId,
      secure: isSecure(bid),
      bidfloor: getFloorModuleData(bid).floor || deepAccess(bid, 'params.bidOverride.imp.bidfloor') || 0.000001
    };

    if (mediaTypeMode === BANNER) {
      impObject.banner = {
        mimes: bid.mediaTypes.banner.mimes || ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: transformSizes(bid.sizes)
      };
      if (bid.mediaTypes.banner.pos) {
        impObject.banner.pos = bid.mediaTypes.banner.pos;
      };
    };

    impObject.ext = {
      dfp_ad_unit_code: bid.adUnitCode
    };

    if (deepAccess(bid, 'params.zid')) {
      impObject.tagid = bid.params.zid;
    }

    if (deepAccess(bid, 'ortb2Imp.ext.data') && isPlainObject(bid.ortb2Imp.ext.data)) {
      impObject.ext.data = bid.ortb2Imp.ext.data;
    };

    if (deepAccess(bid, 'ortb2Imp.instl') && isNumber(bid.ortb2Imp.instl) && (bid.ortb2Imp.instl === 1)) {
      impObject.instl = bid.ortb2Imp.instl;
    };

    openRtbObject.imp.push(impObject);
  };
};

function appendFirstPartyData(outBoundBidRequest, bid) {
  const ortb2Object = bid.ortb2;
  const siteObject = deepAccess(ortb2Object, 'site') || undefined;
  const siteContentObject = deepAccess(siteObject, 'content') || undefined;
  const userObject = deepAccess(ortb2Object, 'user') || undefined;

  if (siteObject && isPlainObject(siteObject)) {
    const allowedSiteStringKeys = ['name', 'domain', 'page', 'ref', 'keywords'];
    const allowedSiteArrayKeys = ['cat', 'sectioncat', 'pagecat'];
    const allowedSiteObjectKeys = ['ext'];
    outBoundBidRequest.site = validateAppendObject(isStr, allowedSiteStringKeys, siteObject, outBoundBidRequest.site);
    outBoundBidRequest.site = validateAppendObject(isArray, allowedSiteArrayKeys, siteObject, outBoundBidRequest.site);
    outBoundBidRequest.site = validateAppendObject(isPlainObject, allowedSiteObjectKeys, siteObject, outBoundBidRequest.site);
  };

  if (siteContentObject && isPlainObject(siteContentObject)) {
    const allowedContentStringKeys = ['id', 'title', 'language'];
    const allowedContentArrayKeys = ['cat'];
    outBoundBidRequest.site.content = validateAppendObject(isStr, allowedContentStringKeys, siteContentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject(isArray, allowedContentArrayKeys, siteContentObject, outBoundBidRequest.site.content);
  };

  if (userObject && isPlainObject(userObject)) {
    const allowedUserStrings = ['id', 'buyeruid', 'gender', 'keywords', 'customdata'];
    const allowedUserObjects = ['ext'];
    outBoundBidRequest.user = validateAppendObject(isStr, allowedUserStrings, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user.ext = validateAppendObject(isPlainObject, allowedUserObjects, userObject, outBoundBidRequest.user.ext);
  };

  return outBoundBidRequest;
};

function generateServerRequest({payload, requestOptions, bidderRequest}) {
  return {
    url: (config.getConfig('adtrgtme.endpoint') || ENDPOINT) + (payload.site.id || ''),
    method: 'POST',
    data: payload,
    options: requestOptions,
    bidderRequest: bidderRequest
  };
};

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    const params = bid.params;
    if (isPlainObject(params) && isNumber(params.sid)) {
      return true;
    } else {
      logWarn('Adtrgtme bidder params missing or incorrect');
      return false;
    }
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (isEmpty(validBidRequests) || isEmpty(bidderRequest)) {
      logWarn('Adtrgtme Adapter: buildRequests called with empty request');
      return undefined;
    };

    const requestOptions = {
      contentType: 'application/json',
      customHeaders: {
        'x-openrtb-version': '2.5'
      }
    };

    requestOptions.withCredentials = hasPurpose1Consent(bidderRequest.gdprConsent);

    if (config.getConfig('adtrgtme.singleRequestMode') === true) {
      const payload = generateOpenRtbObject(bidderRequest, validBidRequests[0]);
      validBidRequests.forEach(bid => {
        appendImpObject(bid, payload);
      });

      return generateServerRequest({payload, requestOptions, bidderRequest});
    }

    return validBidRequests.map(bid => {
      const payloadClone = generateOpenRtbObject(bidderRequest, bid);
      appendImpObject(bid, payloadClone);

      return generateServerRequest({payload: payloadClone, requestOptions, bidderRequest: bid});
    });
  },

  interpretResponse: function(serverResponse, { data, bidderRequest }) {
    const response = [];
    if (!serverResponse.body || !Array.isArray(serverResponse.body.seatbid)) {
      return response;
    }

    let seatbids = serverResponse.body.seatbid;
    seatbids.forEach(seatbid => {
      let bid;

      try {
        bid = seatbid.bid[0];
      } catch (e) {
        return response;
      }

      let cpm = bid.price;

      let bidResponse = {
        adId: deepAccess(bid, 'adId') ? bid.adId : bid.impid || bid.crid,
        ad: bid.adm,
        adUnitCode: bidderRequest.adUnitCode,
        requestId: bid.impid,
        cpm: cpm,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid || 0,
        currency: bid.cur || DEFAULT_CURRENCY,
        dealId: bid.dealid ? bid.dealid : null,
        netRevenue: true,
        ttl: getTtl(bidderRequest),
        mediaType: BANNER,
        meta: {
          advertiserDomains: bid.adomain,
          mediaType: BANNER,
        }
      };

      response.push(bidResponse);
    });

    return response;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent = {}, uspConsent = '') {
    const bidResponse = !isEmpty(serverResponses) && serverResponses[0].body;
    if (bidResponse && bidResponse.ext && bidResponse.ext.pixels) {
      return extractUserSyncUrls(syncOptions, bidResponse.ext.pixels);
    }
    return [];
  }
};

registerBidder(spec);
