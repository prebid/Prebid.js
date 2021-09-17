import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';

const INTEGRATION_METHOD = 'prebid.js';
const BIDDER_CODE = 'yahoossp';
const ADAPTER_VERSION = '1.0.0';
const PREBID_VERSION = '$prebid.version$';
const BID_RESPONSE_TTL = 3600;
const TEST_MODE_DCN = '8a969516017a7a396ec539d97f540011';
const TEST_MODE_BANNER_POS = '8a969978017a7aaabab4ab0bc01a0009';
const TEST_MODE_VIDEO_POS = '8a96958a017a7a57ac375d50c0c700cc';
const DEFAULT_RENDERER_TIMEOUT = 700;
const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_USER_ID_SOURCES = [
  'adserver.org',
  'criteo.com',
  'id5-sync.com',
  'intentiq.com',
  'liveintent.com',
  'quantcast.com',
  'verizonmedia.com',
  'liveramp.com',
  'pubcid.org',
  'parrable.com',
  'britepool.com',
  'hcn.health',
  'crwdcntrl.net',
  'criteo.com',
  'merkleinc.com',
  'netid.de',
  'zeotap.com',
  'audigent.com',
  'quantcast.com',
  'nextroll.com',
  'idx.lat',
  'neustar.biz',
  'mediawallahscript.com',
  'tapad.com',
  'novatiq.com',
  'uidapi.com',
  'deepintent.com',
  'akamai.com',
  'admixer.net',
  'adtelligent.com',
  'amxrtb.com',
  'intimatemerger.com'
];

const SSP_ENDPOINT = 'https://c2shb.ssp.yahoo.com/bidRequest';

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
  if (utils.isArray(sizes) && sizes.length === 2 && !utils.isArray(sizes[0])) {
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
  if (utils.isArray(utils.deepAccess(bid, 'userIdAsEids'))) {
    return bid.userIdAsEids.filter(eid => {
      return SUPPORTED_USER_ID_SOURCES.indexOf(eid.source) !== -1;
    });
  }
  return [];
}

function isSecure(bid) {
  return utils.deepAccess(bid, 'params.bidOverride.imp.secure') || (document.location.protocol === 'https:') ? 1 : 0;
};

function getAdapterMode() {
  let adapterMode = config.getConfig('yahoossp.mode');
  adapterMode = adapterMode ? adapterMode.toLowerCase() : undefined;
  if (typeof adapterMode === 'undefined' || adapterMode === 'banner') {
    return 'banner';
  } else if (adapterMode === 'video') {
    return 'video';
  } else if (adapterMode === 'all') {
    return '*';
  }
};

function getResponseFormat(bid) {
  const adm = bid.adm;
  if (adm.includes('o2playerSettings') || adm.includes('YAHOO.VideoPlatform.VideoPlayer') || adm.includes('AdPlacement')) {
    return 'banner';
  } else if (adm.includes('VAST')) {
    return 'video';
  }
};

function getFloorModuleData(bid) {
  const adapterMode = getAdapterMode();
  const getFloorRequestObject = {
    currency: utils.deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY,
    mediaType: adapterMode,
    size: '*'
  };
  return (utils.isFn(bid.getFloor)) ? bid.getFloor(getFloorRequestObject) : false;
};

function filterBidRequestByMode(validBidRequests) {
  const mediaTypesMode = getAdapterMode();
  let result = [];
  if (mediaTypesMode === 'banner') {
    result = validBidRequests.filter(bid => {
      return Object.keys(bid.mediaTypes).some(item => item === BANNER);
    });
  } else if (mediaTypesMode === 'video') {
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
        if (allowedKeys.includes(objectKey) && utils.isStr(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
      case 'number':
        if (allowedKeys.includes(objectKey) && utils.isNumber(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;

      case 'array':
        if (allowedKeys.includes(objectKey) && utils.isArray(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
      case 'object':
        if (allowedKeys.includes(objectKey) && utils.isPlainObject(inputObject[objectKey])) {
          outputObject[objectKey] = inputObject[objectKey];
        };
        break;
    };
  };
  return outputObject;
};

function generateOpenRtbObject(bidderRequest, bid) {
  if (bidderRequest) {
    let outBoundBidRequest = {
      id: utils.generateUUID(),
      cur: [getFloorModuleData(bidderRequest).currency || utils.deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY],
      imp: [],
      site: {
        id: utils.deepAccess(bid, 'params.dcn'),
        page: utils.deepAccess(bidderRequest, 'refererInfo.referer'),
      },
      device: {
        dnt: 0,
        ua: navigator.userAgent,
        ip: utils.deepAccess(bid, 'params.bidOverride.device.ip') || utils.deepAccess(bid, 'params.ext.ip') || undefined
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
        regs: {
          gdpr: {
            euconsent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies
              ? bidderRequest.gdprConsent.consentString : ''
          }
        },
        ext: {
          eids: getSupportedEids(bid)
        }
      }
    };

    if (config.getConfig('ortb2')) {
      outBoundBidRequest = appendFirstPartyData(outBoundBidRequest, bid);
    };

    if (utils.deepAccess(bid, 'schain')) {
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
      tagid: bid.params.pos,
      bidfloor: getFloorModuleData(bid).floor || utils.deepAccess(bid, 'params.bidOverride.imp.bidfloor')
    };

    if (bid.mediaTypes.banner && (typeof mediaTypeMode === 'undefined' || mediaTypeMode === 'banner' || mediaTypeMode === '*')) {
      impObject.banner = {
        mimes: bid.mediaTypes.banner.mimes || ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: transformSizes(bid.sizes)
      };
      if (bid.mediaTypes.banner.pos) {
        impObject.banner.pos = bid.mediaTypes.banner.pos;
      };
    };

    if (bid.mediaTypes.video && (mediaTypeMode === 'video' || mediaTypeMode === '*')) {
      const playerSize = transformSizes(bid.mediaTypes.video.playerSize);
      impObject.video = {
        mimes: utils.deepAccess(bid, 'params.bidOverride.imp.video.mimes') || bid.mediaTypes.video.mimes || ['video/mp4', 'application/javascript'],
        w: utils.deepAccess(bid, 'params.bidOverride.imp.video.w') || playerSize[0].w,
        h: utils.deepAccess(bid, 'params.bidOverride.imp.video.h') || playerSize[0].h,
        maxbitrate: utils.deepAccess(bid, 'params.bidOverride.imp.video.maxbitrate') || bid.mediaTypes.video.maxbitrate || undefined,
        maxduration: utils.deepAccess(bid, 'params.bidOverride.imp.video.maxduration') || bid.mediaTypes.video.maxduration || undefined,
        minduration: utils.deepAccess(bid, 'params.bidOverride.imp.video.minduration') || bid.mediaTypes.video.minduration || undefined,
        api: utils.deepAccess(bid, 'params.bidOverride.imp.video.api') || bid.mediaTypes.video.api || [2],
        delivery: utils.deepAccess(bid, 'params.bidOverride.imp.video.delivery') || bid.mediaTypes.video.delivery || undefined,
        pos: utils.deepAccess(bid, 'params.bidOverride.imp.video.pos') || bid.mediaTypes.video.pos || undefined,
        playbackmethod: utils.deepAccess(bid, 'params.bidOverride.imp.video.playbackmethod') || bid.mediaTypes.video.playbackmethod || undefined,
        placement: utils.deepAccess(bid, 'params.bidOverride.imp.video.placement') || bid.mediaTypes.video.placement || undefined,
        linearity: utils.deepAccess(bid, 'params.bidOverride.imp.video.linearity') || bid.mediaTypes.video.linearity || 1,
        protocols: utils.deepAccess(bid, 'params.bidOverride.imp.video.protocols') || bid.mediaTypes.video.protocols || [2, 5],
        rewarded: utils.deepAccess(bid, 'params.bidOverride.imp.video.rewarded') || undefined,
      }
    }

    impObject.ext = {
      pos: bid.params.pos,
      dfp_ad_unit_code: bid.adUnitCode
    };

    if (utils.deepAccess(bid, 'params.ortb2Imp')) {
      const ortb2ImpExt = utils.deepAccess(bid, 'params.ortb2Imp.ext.data');
      const allowedImpExtKeys = ['data']
      impObject.ext = validateAppendObject('object', allowedImpExtKeys, ortb2ImpExt, impObject.ext);
    };

    openRtbObject.imp.push(impObject);
  };
};

function appendFirstPartyData(outBoundBidRequest, bid) {
  const ortb2Object = config.getConfig('ortb2');
  const siteObject = ortb2Object.site || undefined;
  const contentObject = utils.deepAccess(siteObject, 'content') || undefined;
  const userObject = utils.deepAccess(ortb2Object, 'user') || undefined;

  if (siteObject && utils.isPlainObject(siteObject)) {
    const allowedSiteStringKeys = ['name', 'domain', 'page', 'ref', 'keywords', 'search'];
    const allowedSiteArrayKeys = ['cat', 'sectioncat', 'pagecat']
    outBoundBidRequest.site = validateAppendObject('string', allowedSiteStringKeys, siteObject, outBoundBidRequest.site);
    outBoundBidRequest.site = validateAppendObject('array', allowedSiteArrayKeys, siteObject, outBoundBidRequest.site);
  };

  if (contentObject && utils.isPlainObject(contentObject)) {
    const allowedContentStringKeys = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language'];
    const allowedContentNumberkeys = ['episode', 'prodq', 'context', 'livestream', 'len'];
    const allowedContentArrayKeys = ['cat'];
    const allowedContentObjectKeys = ['ext'];
    outBoundBidRequest.site.content = validateAppendObject('string', allowedContentStringKeys, contentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('number', allowedContentNumberkeys, contentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('array', allowedContentArrayKeys, contentObject, outBoundBidRequest.site.content);
    outBoundBidRequest.site.content = validateAppendObject('object', allowedContentObjectKeys, contentObject, outBoundBidRequest.site.content);
  };

  if (userObject && utils.isPlainObject(userObject)) {
    const allowedUserStrings = ['id', 'buyeruid', 'gender', 'keywords', 'customdata'];
    const allowedUserNumbers = ['yob'];
    const allowedUserObjects = ['data', 'ext'];
    outBoundBidRequest.user = validateAppendObject('string', allowedUserStrings, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user = validateAppendObject('number', allowedUserNumbers, userObject, outBoundBidRequest.user);
    outBoundBidRequest.user = validateAppendObject('object', allowedUserObjects, userObject, outBoundBidRequest.user);
  };

  return outBoundBidRequest;
};

function generateServerRequest({payload, requestOptions, bidderRequest}) {
  if (utils.deepAccess(bidderRequest, 'params.testing.e2etest') === true) {
    utils.logInfo('yahoossp adapter e2etest mode is active');
    // Allows testing mode to override SSP ad-server issue
    requestOptions.withCredentials = false;
    // https://jira.vzbuilders.com/browse/CLS-8239
    // https://jira.vzbuilders.com/browse/SSP-18233

    const mediaTypeMode = getAdapterMode();

    payload.imp.forEach(impObject => {
      impObject.ext.e2eTestMode = true;
      if (mediaTypeMode === 'banner') {
        impObject.tagid = TEST_MODE_BANNER_POS; // banner passback
      } else if (mediaTypeMode === 'video') {
        impObject.tagid = TEST_MODE_VIDEO_POS; // video passback
      } else {
        utils.logWarn('yahoossp adapter e2etest mode does not support yahoossp.mode="all". \n Please specify either "banner" or "video"');
        utils.logWarn('yahoossp adapter e2etest mode: Please make sure your adUnit matches the yahoossp.mode video or banner');
      }
    });
    payload.site.id = TEST_MODE_DCN;
  };

  return {
    url: config.getConfig('yahoossp.endpoint') || SSP_ENDPOINT,
    method: 'POST',
    data: payload,
    options: requestOptions,
    bidderRequest: bidderRequest
  };
};

function newRenderer(bidderRequest, bidResponse) {
  if (!bidderRequest.renderer) {
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
        }, utils.deepAccess(bidderRequest, 'params.testing.renderer.setTimeout') || DEFAULT_RENDERER_TIMEOUT);
      });
    } catch (error) {
      utils.logWarn('yahoossp renderer error: setRender() failed', error);
    }
    return renderer;
  }
}
/* Utility functions */

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    const params = bid.params;
    if (utils.deepAccess(params, 'testing.e2etest') === true) {
      // e2e test mode skip validations
      return true;
    } else if (
      utils.isPlainObject(params) &&
      utils.isStr(params.dcn) && params.dcn.length > 0 &&
      utils.isStr(params.pos) && params.pos.length > 0
    ) {
      return true
    } else {
      utils.logWarn('yahoossp bidder params missing or incorrect, please pass object with dcn & pos');
      return false
    }
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (utils.isEmpty(validBidRequests) || utils.isEmpty(bidderRequest)) {
      utils.logWarn('yahoossp Adapter: buildRequests called with either empty "validBidRequests" or "bidderRequest"');
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
    utils.logWarn('+++ serverResponse: ', serverResponse);
    utils.logWarn('+++ data: ', data);
    utils.logWarn('+++ bidderRequest: ', bidderRequest);

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
        adId: bid.id,
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
        ttl: BID_RESPONSE_TTL,
        meta: {
          advertiserDomains: bid.adomain,
        }
      };

      const responseAdmFormat = getResponseFormat(bid);
      if (responseAdmFormat === 'banner') {
        bidResponse.mediaType = 'banner';
        bidResponse.ad = bid.adm;
        bidResponse.meta.mediaType = 'banner';
      } else if (responseAdmFormat === 'video') {
        bidResponse.mediaType = 'video';
        bidResponse.meta.mediaType = 'video';
        bidResponse.vastXml = bid.adm;

        if (bid.nurl) {
          bidResponse.vastUrl = bid.nurl;
        };
      }

      if (utils.deepAccess(bidderRequest, 'mediaTypes.video.context') === 'outstream' && !bidResponse.renderer) {
        bidResponse.renderer = newRenderer(bidderRequest, bidResponse) || undefined;
      }

      response.push(bidResponse);
    });

    return response;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const bidResponse = !utils.isEmpty(serverResponses) && serverResponses[0].body;

    if (bidResponse && bidResponse.ext && bidResponse.ext.pixels) {
      return extractUserSyncUrls(syncOptions, bidResponse.ext.pixels);
    }

    return [];
  }
};

registerBidder(spec);
