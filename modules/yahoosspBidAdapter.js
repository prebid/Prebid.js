import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, isFn, isStr, isNumber, isArray, isEmpty, isPlainObject, generateUUID, logInfo, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';

const INTEGRATION_METHOD = 'prebid.js';
const BIDDER_CODE = 'yahoossp';
const GVLID = 25;
const ADAPTER_VERSION = '1.0.2';
const PREBID_VERSION = '$prebid.version$';
const DEFAULT_BID_TTL = 300;
const TEST_MODE_DCN = '8a969516017a7a396ec539d97f540011';
const TEST_MODE_PUBID_DCN = '1234567';
const TEST_MODE_BANNER_POS = '8a969978017a7aaabab4ab0bc01a0009';
const TEST_MODE_VIDEO_POS = '8a96958a017a7a57ac375d50c0c700cc';
const DEFAULT_RENDERER_TIMEOUT = 700;
const DEFAULT_CURRENCY = 'USD';
const SSP_ENDPOINT_DCN_POS = 'https://c2shb.pubgw.yahoo.com/bidRequest';
const SSP_ENDPOINT_PUBID = 'https://c2shb.pubgw.yahoo.com/admax/bid/partners/PBJS';
const SUPPORTED_USER_ID_SOURCES = [
  'admixer.net',
  'adserver.org',
  'adtelligent.com',
  'akamai.com',
  'amxrtb.com',
  'audigent.com',
  'britepool.com',
  'criteo.com',
  'crwdcntrl.net',
  'deepintent.com',
  'hcn.health',
  'id5-sync.com',
  'idx.lat',
  'intentiq.com',
  'intimatemerger.com',
  'liveintent.com',
  'liveramp.com',
  'mediawallahscript.com',
  'merkleinc.com',
  'netid.de',
  'neustar.biz',
  'nextroll.com',
  'novatiq.com',
  'parrable.com',
  'pubcid.org',
  'quantcast.com',
  'quantcast.com',
  'tapad.com',
  'uidapi.com',
  'verizonmedia.com',
  'yahoo.com',
  'zeotap.com'
];

/* Utility functions */
function hasPurpose1Consent(bidderRequest) {
  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies && bidderRequest.gdprConsent.apiVersion === 2) {
      return !!false;
    }
  }
  return true;
}

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

function getSupportedEids(bid) {
  if (isArray(deepAccess(bid, 'userIdAsEids'))) {
    return bid.userIdAsEids.filter(eid => {
      return SUPPORTED_USER_ID_SOURCES.indexOf(eid.source) !== -1;
    });
  }
  return [];
}

function isSecure(bid) {
  return deepAccess(bid, 'params.bidOverride.imp.secure') || (document.location.protocol === 'https:') ? 1 : 0;
};

function getPubIdMode(bid) {
  let pubIdMode;
  if (deepAccess(bid, 'params.pubId')) {
    pubIdMode = true;
  } else if (deepAccess(bid, 'params.dcn') && deepAccess(bid, 'params.pos')) {
    pubIdMode = false;
  };
  return pubIdMode;
};

function getAdapterMode() {
  let adapterMode = config.getConfig('yahoossp.mode');
  adapterMode = adapterMode ? adapterMode.toLowerCase() : undefined;
  if (typeof adapterMode === 'undefined' || adapterMode === BANNER) {
    return BANNER;
  } else if (adapterMode === VIDEO) {
    return VIDEO;
  } else if (adapterMode === 'all') {
    return '*';
  }
};

function getResponseFormat(bid) {
  const adm = bid.adm;
  if (adm.indexOf('o2playerSettings') !== -1 || adm.indexOf('YAHOO.VideoPlatform.VideoPlayer') !== -1 || adm.indexOf('AdPlacement') !== -1) {
    return BANNER;
  } else if (adm.indexOf('VAST') !== -1) {
    return VIDEO;
  }
};

function getFloorModuleData(bid) {
  const adapterMode = getAdapterMode();
  const getFloorRequestObject = {
    currency: deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY,
    mediaType: adapterMode,
    size: '*'
  };
  return (isFn(bid.getFloor)) ? bid.getFloor(getFloorRequestObject) : false;
};

function filterBidRequestByMode(validBidRequests) {
  const mediaTypesMode = getAdapterMode();
  let result = [];
  if (mediaTypesMode === BANNER) {
    result = validBidRequests.filter(bid => {
      return Object.keys(bid.mediaTypes).some(item => item === BANNER);
    });
  } else if (mediaTypesMode === VIDEO) {
    result = validBidRequests.filter(bid => {
      return Object.keys(bid.mediaTypes).some(item => item === VIDEO);
    });
  } else if (mediaTypesMode === '*') {
    result = validBidRequests.filter(bid => {
      return Object.keys(bid.mediaTypes).some(item => item === BANNER || item === VIDEO);
    });
  };
  return result;
};

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
  const globalTTL = config.getConfig('yahoossp.ttl');
  return globalTTL ? validateTTL(globalTTL) : validateTTL(deepAccess(bidderRequest, 'params.ttl'));
};

function validateTTL(ttl) {
  return (isNumber(ttl) && ttl > 0 && ttl < 3600) ? ttl : DEFAULT_BID_TTL
};

function isNotEmptyStr(value) {
  return (isStr(value) && value.length > 0);
};

function generateOpenRtbObject(bidderRequest, bid) {
  if (bidderRequest) {
    let outBoundBidRequest = {
      id: generateUUID(),
      cur: [getFloorModuleData(bidderRequest).currency || deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY],
      imp: [],
      site: {
        page: deepAccess(bidderRequest, 'refererInfo.referer'),
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
            ? bidderRequest.gdprConsent.consentString : '',
          eids: getSupportedEids(bid)
        }
      }
    };

    if (getPubIdMode(bid) === true) {
      outBoundBidRequest.site.publisher = {
        id: bid.params.pubId
      }
      if (deepAccess(bid, 'params.bidOverride.site.id') || deepAccess(bid, 'params.siteId')) {
        outBoundBidRequest.site.id = deepAccess(bid, 'params.bidOverride.site.id') || bid.params.siteId;
      }
    } else {
      outBoundBidRequest.site.id = bid.params.dcn;
    };

    if (config.getConfig('ortb2')) {
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
  const mediaTypeMode = getAdapterMode();

  if (openRtbObject && bid) {
    const impObject = {
      id: bid.bidId,
      secure: isSecure(bid),
      bidfloor: getFloorModuleData(bid).floor || deepAccess(bid, 'params.bidOverride.imp.bidfloor')
    };

    if (bid.mediaTypes.banner && (typeof mediaTypeMode === 'undefined' || mediaTypeMode === BANNER || mediaTypeMode === '*')) {
      impObject.banner = {
        mimes: bid.mediaTypes.banner.mimes || ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: transformSizes(bid.sizes)
      };
      if (bid.mediaTypes.banner.pos) {
        impObject.banner.pos = bid.mediaTypes.banner.pos;
      };
    };

    if (bid.mediaTypes.video && (mediaTypeMode === VIDEO || mediaTypeMode === '*')) {
      const playerSize = transformSizes(bid.mediaTypes.video.playerSize);
      impObject.video = {
        mimes: deepAccess(bid, 'params.bidOverride.imp.video.mimes') || bid.mediaTypes.video.mimes || ['video/mp4', 'application/javascript'],
        w: deepAccess(bid, 'params.bidOverride.imp.video.w') || playerSize[0].w,
        h: deepAccess(bid, 'params.bidOverride.imp.video.h') || playerSize[0].h,
        maxbitrate: deepAccess(bid, 'params.bidOverride.imp.video.maxbitrate') || bid.mediaTypes.video.maxbitrate || undefined,
        maxduration: deepAccess(bid, 'params.bidOverride.imp.video.maxduration') || bid.mediaTypes.video.maxduration || undefined,
        minduration: deepAccess(bid, 'params.bidOverride.imp.video.minduration') || bid.mediaTypes.video.minduration || undefined,
        api: deepAccess(bid, 'params.bidOverride.imp.video.api') || bid.mediaTypes.video.api || [2],
        delivery: deepAccess(bid, 'params.bidOverride.imp.video.delivery') || bid.mediaTypes.video.delivery || undefined,
        pos: deepAccess(bid, 'params.bidOverride.imp.video.pos') || bid.mediaTypes.video.pos || undefined,
        playbackmethod: deepAccess(bid, 'params.bidOverride.imp.video.playbackmethod') || bid.mediaTypes.video.playbackmethod || undefined,
        placement: deepAccess(bid, 'params.bidOverride.imp.video.placement') || bid.mediaTypes.video.placement || undefined,
        linearity: deepAccess(bid, 'params.bidOverride.imp.video.linearity') || bid.mediaTypes.video.linearity || 1,
        protocols: deepAccess(bid, 'params.bidOverride.imp.video.protocols') || bid.mediaTypes.video.protocols || [2, 5],
        startdelay: deepAccess(bid, 'params.bidOverride.imp.video.startdelay') || bid.mediaTypes.video.startdelay || 0,
        rewarded: deepAccess(bid, 'params.bidOverride.imp.video.rewarded') || undefined,
      }
    }

    impObject.ext = {
      dfp_ad_unit_code: bid.adUnitCode
    };

    if (deepAccess(bid, 'params.kvp') && isPlainObject(bid.params.kvp)) {
      impObject.ext.kvs = {};
      for (const key in bid.params.kvp) {
        if (isStr(bid.params.kvp[key]) || isNumber(bid.params.kvp[key])) {
          impObject.ext.kvs[key] = bid.params.kvp[key];
        } else if (isArray(bid.params.kvp[key])) {
          const array = bid.params.kvp[key];
          if (array.every(value => isStr(value)) || array.every(value => isNumber(value))) {
            impObject.ext.kvs[key] = bid.params.kvp[key];
          }
        }
      }
    };

    if (deepAccess(bid, 'ortb2Imp.ext.data') && isPlainObject(bid.ortb2Imp.ext.data)) {
      impObject.ext.data = bid.ortb2Imp.ext.data;
    };

    if (deepAccess(bid, 'ortb2Imp.instl') && isNumber(bid.ortb2Imp.instl) && (bid.ortb2Imp.instl === 1)) {
      impObject.instl = bid.ortb2Imp.instl;
    };

    if (getPubIdMode(bid) === false) {
      impObject.tagid = bid.params.pos;
      impObject.ext.pos = bid.params.pos;
    } else if (deepAccess(bid, 'params.placementId')) {
      impObject.tagid = bid.params.placementId
    };

    openRtbObject.imp.push(impObject);
  };
};

function appendFirstPartyData(outBoundBidRequest, bid) {
  const ortb2Object = config.getConfig('ortb2');
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
  const pubIdMode = getPubIdMode(bidderRequest);
  let sspEndpoint = config.getConfig('yahoossp.endpoint') || SSP_ENDPOINT_DCN_POS;

  if (pubIdMode === true) {
    sspEndpoint = config.getConfig('yahoossp.endpoint') || SSP_ENDPOINT_PUBID;
  };

  if (deepAccess(bidderRequest, 'params.testing.e2etest') === true) {
    logInfo('yahoossp adapter e2etest mode is active');
    requestOptions.withCredentials = false;

    if (pubIdMode === true) {
      payload.site.id = TEST_MODE_PUBID_DCN;
    } else {
      const mediaTypeMode = getAdapterMode();
      payload.site.id = TEST_MODE_DCN;
      payload.imp.forEach(impObject => {
        impObject.ext.e2eTestMode = true;
        if (mediaTypeMode === BANNER) {
          impObject.tagid = TEST_MODE_BANNER_POS; // banner passback
        } else if (mediaTypeMode === VIDEO) {
          impObject.tagid = TEST_MODE_VIDEO_POS; // video passback
        } else {
          logWarn('yahoossp adapter e2etest mode does not support yahoossp.mode="all". \n Please specify either "banner" or "video"');
          logWarn('yahoossp adapter e2etest mode: Please make sure your adUnit matches the yahoossp.mode video or banner');
        }
      });
    }
  };
  logWarn('yahoossp adapter endpoint override enabled. Pointing requests to: ', sspEndpoint);

  return {
    url: sspEndpoint,
    method: 'POST',
    data: payload,
    options: requestOptions,
    bidderRequest: bidderRequest
  };
};

function createRenderer(bidderRequest, bidResponse) {
  const renderer = Renderer.install({
    url: 'https://cdn.vidible.tv/prod/hb-outstream-renderer/renderer.js',
    loaded: false,
    adUnitCode: bidderRequest.adUnitCode
  })

  try {
    renderer.setRender(function(bidResponse) {
      setTimeout(function() {
        // eslint-disable-next-line no-undef
        o2PlayerRender(bidResponse);
      }, deepAccess(bidderRequest, 'params.testing.renderer.setTimeout') || DEFAULT_RENDERER_TIMEOUT);
    });
  } catch (error) {
    logWarn('yahoossp renderer error: setRender() failed', error);
  }
  return renderer;
}
/* Utility functions */

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    const params = bid.params;
    if (deepAccess(params, 'testing.e2etest') === true) {
      return true;
    } else if (
      isPlainObject(params) &&
      (isNotEmptyStr(params.pubId) || (isNotEmptyStr(params.dcn) && isNotEmptyStr(params.pos)))
    ) {
      return true;
    } else {
      logWarn('yahoossp bidder params missing or incorrect, please pass object with either: dcn & pos OR pubId');
      return false;
    }
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (isEmpty(validBidRequests) || isEmpty(bidderRequest)) {
      logWarn('yahoossp Adapter: buildRequests called with either empty "validBidRequests" or "bidderRequest"');
      return undefined;
    };

    const requestOptions = {
      contentType: 'application/json',
      customHeaders: {
        'x-openrtb-version': '2.5'
      }
    };

    requestOptions.withCredentials = hasPurpose1Consent(bidderRequest);

    const filteredBidRequests = filterBidRequestByMode(validBidRequests);

    if (config.getConfig('yahoossp.singleRequestMode') === true) {
      const payload = generateOpenRtbObject(bidderRequest, filteredBidRequests[0]);
      filteredBidRequests.forEach(bid => {
        appendImpObject(bid, payload);
      });

      return generateServerRequest({payload, requestOptions, bidderRequest});
    }

    return filteredBidRequests.map(bid => {
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
        adUnitCode: bidderRequest.adUnitCode,
        requestId: bid.impid,
        bidderCode: spec.code,
        cpm: cpm,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid || 0,
        currency: bid.cur || DEFAULT_CURRENCY,
        dealId: bid.dealid ? bid.dealid : null,
        netRevenue: true,
        ttl: getTtl(bidderRequest),
        meta: {
          advertiserDomains: bid.adomain,
        }
      };

      const responseAdmFormat = getResponseFormat(bid);
      if (responseAdmFormat === BANNER) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = bid.adm;
        bidResponse.meta.mediaType = BANNER;
      } else if (responseAdmFormat === VIDEO) {
        bidResponse.mediaType = VIDEO;
        bidResponse.meta.mediaType = VIDEO;
        bidResponse.vastXml = bid.adm;

        if (bid.nurl) {
          bidResponse.vastUrl = bid.nurl;
        };
      }

      if (deepAccess(bidderRequest, 'mediaTypes.video.context') === 'outstream' && !bidderRequest.renderer) {
        bidResponse.renderer = createRenderer(bidderRequest, bidResponse) || undefined;
      }

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
