import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, isFn, isStr, isNumber, isArray, isEmpty, isPlainObject, generateUUID, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gpdr.js';

const INTEGRATION_METHOD = 'prebid.js';
const BIDDER_CODE = 'adtargetme';
const ENDPOINT = 'https://z.cdn.adtarget.market/ssp?s=';
const ADAPTER_VERSION = '1.0.0';
const PREBID_VERSION = '$prebid.version$';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

/* TEST MODE */
const TEST_MODE_BANNER_SID = 1220291391;

function getSize(size) {
  return {
    w: parseInt(size[0]),
    h: parseInt(size[1])
  }
}

function transformSizes(sizes) {
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

function validateAppendObject(validationType, allowedKeys, inputObject, appendToObject) {
  const outputObject = {
    ...appendToObject
  };

  for (const objectKey in inputObject) {
    switch (validationType) {
      case 'string':
        if (allowedKeys.indexOf(objectKey) !== -1 && isStr(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
      case 'number':
        if (allowedKeys.indexOf(objectKey) !== -1 && isNumber(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;

      case 'array':
        if (allowedKeys.indexOf(objectKey) !== -1 && isArray(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
      case 'object':
        if (allowedKeys.indexOf(objectKey) !== -1 && isPlainObject(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
      case 'objectAllKeys':
        if (isPlainObject(inputObject)) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
    };
  };
  return outputObject;
};

function getTtl(bidderRequest) {
  const ttl = config.getConfig('adtargetme.ttl');
  return ttl ? validateTTL(ttl) : validateTTL(deepAccess(bidderRequest, 'params.ttl')) ;
};

function validateTTL(ttl) {
  return (isNumber(ttl) && ttl > 0 && ttl < 3600) ? ttl : DEFAULT_BID_TTL
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
/*
    if (deepAccess(bid, 'params.zid')) {
      outBoundBidRequest.site.ext = outBoundBidRequest.site.ext || {};
      outBoundBidRequest.site.ext.zid = bid.params.zid;
    }
*/

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

    if (bid.mediaTypes.banner && (typeof mediaTypeMode === 'undefined' || mediaTypeMode === BANNER)) {
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
  const siteContentDataArray = deepAccess(siteObject, 'content.data') || undefined;
  const appContentObject = deepAccess(ortb2Object, 'app.content') || undefined;
  const appContentDataArray = deepAccess(ortb2Object, 'app.content.data') || undefined;
  const userObject = deepAccess(ortb2Object, 'user') || undefined;

  if (siteObject && isPlainObject(siteObject)) {
    const allowedSiteStringKeys = ['name', 'domain', 'page', 'ref', 'keywords', 'search'];
    const allowedSiteArrayKeys = ['cat', 'sectioncat', 'pagecat'];
    const allowedSiteObjectKeys = ['ext'];
    outBoundBidRequest.site = validateAppendObject('string', allowedSiteStringKeys, siteObject, outBoundBidRequest.site);
    outBoundBidRequest.site = validateAppendObject('array', allowedSiteArrayKeys, siteObject, outBoundBidRequest.site);
    outBoundBidRequest.site = validateAppendObject('object', allowedSiteObjectKeys, siteObject, outBoundBidRequest.site);
  };

  if (siteContentObject && isPlainObject(siteContentObject)) {
    const allowedContentStringKeys = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language'];
    const allowedContentNumberkeys = ['episode', 'prodq', 'context', 'livestream', 'len'];
    const allowedContentArrayKeys = ['cat'];
    const allowedContentObjectKeys = ['ext'];
    outBoundBidRequest.site.content = validateAppendObject('string', allowedContentStringKeys, siteContentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('number', allowedContentNumberkeys, siteContentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('array', allowedContentArrayKeys, siteContentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('object', allowedContentObjectKeys, siteContentObject, outBoundBidRequest.site.content);

    if (siteContentDataArray && isArray(siteContentDataArray)) {
      siteContentDataArray.every(dataObject => {
        let newDataObject = {};
        const allowedContentDataStringKeys = ['id', 'name'];
        const allowedContentDataArrayKeys = ['segment'];
        const allowedContentDataObjectKeys = ['ext'];
        newDataObject = validateAppendObject('string', allowedContentDataStringKeys, dataObject, newDataObject);
        newDataObject = validateAppendObject('array', allowedContentDataArrayKeys, dataObject, newDataObject);
        newDataObject = validateAppendObject('object', allowedContentDataObjectKeys, dataObject, newDataObject);
        outBoundBidRequest.site.content.data = [];
        outBoundBidRequest.site.content.data.push(newDataObject);
      })
    };
  };

  if (appContentObject && isPlainObject(appContentObject)) {
    if (appContentDataArray && isArray(appContentDataArray)) {
      appContentDataArray.every(dataObject => {
        let newDataObject = {};
        const allowedContentDataStringKeys = ['id', 'name'];
        const allowedContentDataArrayKeys = ['segment'];
        const allowedContentDataObjectKeys = ['ext'];
        newDataObject = validateAppendObject('string', allowedContentDataStringKeys, dataObject, newDataObject);
        newDataObject = validateAppendObject('array', allowedContentDataArrayKeys, dataObject, newDataObject);
        newDataObject = validateAppendObject('object', allowedContentDataObjectKeys, dataObject, newDataObject);
        outBoundBidRequest.app = {
          content: {
            data: []
          }
        };
        outBoundBidRequest.app.content.data.push(newDataObject);
      })
    };
  };

  if (userObject && isPlainObject(userObject)) {
    const allowedUserStrings = ['id', 'buyeruid', 'gender', 'keywords', 'customdata'];
    const allowedUserNumbers = ['yob'];
    const allowedUserArrays = ['data'];
    const allowedUserObjects = ['ext'];
    outBoundBidRequest.user = validateAppendObject('string', allowedUserStrings, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user = validateAppendObject('number', allowedUserNumbers, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user = validateAppendObject('array', allowedUserArrays, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user.ext = validateAppendObject('object', allowedUserObjects, userObject, outBoundBidRequest.user.ext);
  };

  return outBoundBidRequest;
};

function generateServerRequest({payload, requestOptions, bidderRequest}) {
  return {
    url: (config.getConfig('adtargetme.endpoint') || ENDPOINT) + (payload.site.id || ""),
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
      logWarn('Adtargetme bidder params missing or incorrect');
      return false;
    }
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (isEmpty(validBidRequests) || isEmpty(bidderRequest)) {
      logWarn('Adtargetme Adapter: buildRequests called with empty request');
      return undefined;
    };

    const requestOptions = {
      contentType: 'application/json',
      customHeaders: {
        'x-openrtb-version': '2.5'
      }
    };

    requestOptions.withCredentials = hasPurpose1Consent(bidderRequest.gdprConsent);

    if (config.getConfig('adtargetme.singleRequestMode') === true) {
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

      let cpm = (bid.ext && bid.ext.encp) ? bid.ext.encp : bid.price;

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

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const bidResponse = !isEmpty(serverResponses) && serverResponses[0].body;

    if (bidResponse && bidResponse.ext && bidResponse.ext.pixels) {
      return extractUserSyncUrls(syncOptions, bidResponse.ext.pixels);
    }

    return [];
  }
};

registerBidder(spec);

