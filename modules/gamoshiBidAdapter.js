import {
  deepAccess,
  deepSetValue,
  getDNT,
  isArray,
  isFn,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logWarn,
  mergeDeep
} from '../src/utils.js';
import { config } from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {ortb25Translator} from '../libraries/ortb2.5Translator/translator.js';
import {getCurrencyFromBidderRequest} from '../libraries/ortb2Utils/currency.js';
const ENDPOINTS = {
  'gamoshi': 'https://rtb.gamoshi.io',
  'cleanmedianet': 'https://bidder.cleanmediaads.com'
};
const GVLID = 644;

const DEFAULT_TTL = 360;
const MAX_TMAX = 1000;
const TRANSLATOR = ortb25Translator();

/**
 * Defines the ORTB converter and customization functions
 */
const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },
  imp,
  request,
  bidResponse,
  response
});

export const helper = {
  /**
   * Determines if the current window is the top frame
   * @returns {number} 1 if top frame, 0 otherwise
   */
  getTopFrame: function () {
    try {
      return window.top === window ? 1 : 0;
    } catch (e) {
    }
    return 0;
  },

  /**
   * Checks if a string starts with a specific search string
   * @param {string} str - The string to check
   * @param {string} search - The search string
   * @returns {boolean} True if str starts with search
   */
  startsWith: function (str, search) {
    return str.substr(0, search.length) === search;
  },

  /**
   * Determines the media type from bid extension data
   * @param {Object} bid - The bid object
   * @returns {string} The media type (VIDEO or BANNER)
   */
  getMediaType: function (bid) {
    if (bid.ext) {
      if (bid.ext.media_type) {
        return bid.ext.media_type.toLowerCase();
      } else if (bid.ext.vast_url) {
        return VIDEO;
      } else {
        return BANNER;
      }
    }
    return BANNER;
  },

  /**
   * Gets the bid floor price with currency support
   * @param {Object} bid - The bid request object
   * @param {string} currency - The currency code (default: 'USD')
   * @returns {number|null} The floor price or null if not available
   */
  getBidFloor(bid, currency = 'USD') {
    if (!isFn(bid.getFloor)) {
      return bid.params.bidfloor ? bid.params.bidfloor : null;
    }

    let bidFloor = bid.getFloor({
      mediaType: '*',
      size: '*',
      currency: currency
    });

    if (isPlainObject(bidFloor) && !isNaN(bidFloor.floor) && bidFloor.currency === currency) {
      return bidFloor.floor;
    }

    return null;
  },
  getDeviceType() {
    if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
      return 5; // 'tablet'
    }
    if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
      return 4; // 'mobile'
    }
    return 2; // 'desktop'
},
  getUserSyncParams(gdprConsent, uspConsent, gppConsent) {
    let params = {
      'gdpr': 0,
      'gdpr_consent': '',
      'us_privacy': '',
      'gpp': '',
      'gpp_sid': ''
    };
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params['gdpr'] = gdprConsent.gdprApplies === true ? 1 : 0;
      }
      if (params['gdpr'] === 1 && typeof gdprConsent.consentString === 'string') {
        params['gdpr_consent'] = encodeURIComponent(gdprConsent.consentString || '');
      }
    }

    if (uspConsent) {
      params['us_privacy'] = encodeURIComponent(uspConsent);
    }

    if (gppConsent?.gppString) {
      params['gpp'] = gppConsent.gppString;
      params['gpp_sid'] = encodeURIComponent(gppConsent.applicableSections?.toString());
    }
    return params;
  },
  addExternalUserId(eids, value, source, rtiPartner) {
  if (isStr(value)) {
    eids.push({
      source,
      uids: [{
        id: value,
        ext: {
          rtiPartner
        }
      }]
    });
  }
},
replaceMacros(url, macros) {
  return url
    .replace('[GDPR]', macros['gdpr'])
    .replace('[CONSENT]', macros['gdpr_consent'])
    .replace('[US_PRIVACY]', macros['us_privacy'])
    .replace('[GPP_SID]', macros['gpp_sid'])
    .replace('[GPP]', macros['gpp']);
  },
  addRequestEids(eids, inRequest) {
  inRequest.forEach(({ source, uids = []}) => {
    try {
      const hasUID = uids.length > 0 && uids[0].id;
      if (hasUID) {
        logWarn('Gamoshi: uidData.id is missing for source:', source, uids);
        return;
      }
      if (!isStr(source) || !source.trim()) {
        logWarn('Gamoshi: Invalid source:', source, uids);
        return;
      }
      if (eids.filter(eid => eid.source === source).length > 0) {
        logWarn('Gamoshi: Duplicate source found:', source, uids);
        return;
      }
      let firstUid = uids[0];
      eids.push({
        source: source,
        uids: [{
          id: firstUid.id,
          atype: firstUid.atype || 1, // Default to 1 if atype is not provided
          ext: {
            rtiPartner: firstUid.ext?.rtiPartner || ''
          }
        }],
      });
    } catch (e) {
      // Log any errors encountered during processing
      logWarn('Gamoshi: error reading eid:', { source, uids }, e);
    }
  });
  return eids;
}
};

export const spec = {
  code: 'gamoshi',
  gvlid: GVLID,
  aliases: ['gambid', 'cleanmedianet'],
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    let supplyPartnerId = bid.params.supplyPartnerId ||
      bid.params.supply_partner_id || bid.params.inventory_id;
    let hasEndpoint = (!bid.params['rtbEndpoint'] || isStr(bid.params['rtbEndpoint']));

    let floorIfExistMustBeValidPositiveNumber =
      bid.params.bidfloor === undefined ||
        (!isNaN(Number(bid.params.bidfloor)) &&
        Number(bid.params.bidfloor) > 0);

    return !!supplyPartnerId && !isNaN(Number(supplyPartnerId)) && hasEndpoint && floorIfExistMustBeValidPositiveNumber;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      try {
        const params = bidRequest.params;
        const supplyPartnerId = params.supplyPartnerId || params.supply_partner_id || params.inventory_id;
        let type = bidRequest.mediaTypes['banner'] ? BANNER : VIDEO;

        if (!supplyPartnerId && type != null) {
          logError('Gamoshi: supplyPartnerId is required');
          return;
        }
        bidRequest.mediaTypes.mediaType = type;
        if (!bidderRequest.timeout || bidderRequest.timeout > MAX_TMAX) {
          bidderRequest.timeout = MAX_TMAX;
        }
        const bidderCode = bidderRequest.bidderCode || 'gamoshi';
        const baseEndpoint = params['rtbEndpoint'] || ENDPOINTS[bidderCode] || 'https://rtb.gamoshi.io';
        const rtbEndpoint = `${baseEndpoint}/r/${supplyPartnerId}/bidr?rformat=open_rtb&reqformat=rtb_json&bidder=prebid` + (params.query ? '&' + params.query : '');
        // Use ORTB converter to build the request
        const ortbRequest = CONVERTER.toORTB({
          bidderRequest,
          bidRequests: [bidRequest]
        });
        if (!ortbRequest || !ortbRequest.imp || ortbRequest.imp.length === 0) {
          logWarn('Gamoshi: Failed to build valid ORTB request');
          return;
        }
        return {
          method: 'POST',
          url: rtbEndpoint,
          data: ortbRequest,
          bidRequest
        };
      } catch (error) {
        logError('Gamoshi: Error building request:', error);
      }
    }).filter(Boolean);
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response || !response.seatbid || !Array.isArray(response.seatbid) ||
      response.seatbid.length === 0) {
      logWarn("Gamoshi: Invalid response format or empty seatbid array");
      return [];
    }
    let seats = response.seatbid.filter(seatBid => {
      if (!seatBid.bid || !Array.isArray(seatBid.bid) || seatBid.bid.length === 0) {
        logWarn('Gamoshi: Empty bid array in seatbid', seatBid);
        return false;
      }
      return true;
    });
    if (seats.length === 0) {
      return [];
    }
    const bids = [];
      if (response && Array.isArray(response.seatbid)) {
        response.seatbid.forEach(seatBid => {
          if (seatBid && Array.isArray(seatBid.bid)) {
            bids.push(...seatBid.bid);
          }
        });
   }
    let outBids = [];
    bids.forEach(bid => {
      const outBid = {
        requestId: bidRequest.bidRequest.bidId,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ttl: DEFAULT_TTL,
        creativeId: bid.crid || bid.adid,
        netRevenue: true,
        currency: bid.cur || response.cur,
        mediaType: helper.getMediaType(bid),
      };

      if (bid.adomain && bid.adomain.length) {
        outBid.meta = {
          advertiserDomains: bid.adomain
        }
      }
      if (bid.ext && bid.ext.video) {
        outBid.meta = {
          ...outBid.meta,
          ...bid.ext.video
        };
      }
      if (deepAccess(bidRequest.bidRequest, 'mediaTypes.' + outBid.mediaType)) {
        if (outBid.mediaType === BANNER) {
          outBids.push(Object.assign({}, outBid, {ad: bid.adm}));
        } else if (outBid.mediaType === VIDEO) {
          const context = deepAccess(bidRequest.bidRequest, 'mediaTypes.video.context') || '';
          outBids.push(Object.assign({}, outBid, {
            vastUrl: bid.ext.vast_url,
            vastXml: bid.adm,
            renderer: context === 'outstream' ? newRenderer(bidRequest.bidRequest, bid) : undefined
          }));
        }
      }
    });
    return outBids;
  },
  getUserSyncs (syncOptcions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    const params = helper.getUserSyncParams(gdprConsent, uspConsent, serverResponses[0]?.gppConsent);
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext['utrk'])) {
          bidResponse.ext['utrk']
            .forEach(pixel => {
              const url = helper.replaceMacros(pixel.url, params);
              syncs.push({type: pixel.type, url});
            });
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext['utrk'])) {
                  bid.ext['utrk']
                    .forEach(pixel => {
                      const url = helper.replaceMacros(pixel.url, params);
                      syncs.push({type: pixel.type, url});
                    });
                }
              });
            }
          });
        }
      }
    });
    return syncs;
  }
};
function newRenderer(bidRequest, bid, rendererOptions = {}) {
  const renderer = Renderer.install({
    url: (bidRequest.params && bidRequest.params.rendererUrl) || (bid.ext && bid.ext.renderer_url) || 'https://s.gamoshi.io/video/latest/renderer.js',
    config: rendererOptions,
    loaded: false,
  });
  try {
    renderer.setRender(renderOutstream);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}
function renderOutstream(bid) {
  bid.renderer.push(() => {
    const unitId = bid.adUnitCode + '/' + bid.adId;
    window['GamoshiPlayer'].renderAd({
      id: unitId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: document.getElementById(bid.adUnitCode),
      width: bid.width,
      height: bid.height,
      events: {
        ALL_ADS_COMPLETED: () => window.setTimeout(() => {
          window['GamoshiPlayer'].removeAd(unitId);
        }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

function getGdprConsent(bidderRequest) {
  const gdprConsent = bidderRequest.gdprConsent;

  if (gdprConsent && gdprConsent.consentString && gdprConsent.gdprApplies) {
    return {
      consent_string: gdprConsent.consentString,
      consent_required: gdprConsent.gdprApplies
    };
  }

  return {
    consent_required: false,
    consent_string: '',
  };
}
/**
 * Builds an impression object for the ORTB 2.5 request.
 *
 * @param {function} buildImp - The function for building an imp object.
 * @param {Object} bidRequest - The bid request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 imp object.
 */
function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  const params = bidRequest.params;
  const currency = getCurrencyFromBidderRequest(context.bidderRequest) || 'USD';

  imp.tagid = bidRequest.adUnitCode;
  imp.instl = deepAccess(context.bidderRequest, 'ortb2Imp.instl') === 1 || params.instl === 1 ? 1 : 0;
  imp.bidfloor = helper.getBidFloor(bidRequest, currency) || 0;
  imp.bidfloorcur = currency;

  // Add video-specific properties if applicable
  if (imp.video) {
    const playerSize = bidRequest.mediaTypes?.video?.playerSize || bidRequest.sizes;
    const paramsVideo = bidRequest.params.video;
    if (paramsVideo) {
      deepSetValue(imp, 'video', {
        ...imp.video,
        protocols: bidRequest.mediaTypes.video.protocols || params.protocols || [1, 2, 3, 4, 5, 6],
        pos: deepAccess(bidRequest, 'mediaTypes.video.pos') || params.pos || 0,
        skip: bidRequest.mediaTypes.video.skip || paramsVideo.skip,
        plcmt: bidRequest.mediaTypes.video.plcmt || paramsVideo.plcmt || 1,
        placement: bidRequest.mediaTypes.video.placement || paramsVideo.placement,
        minduration: bidRequest.mediaTypes.video.minduration || paramsVideo.minduration,
        maxduration: bidRequest.mediaTypes.video.maxduration || paramsVideo.maxduration,
        playbackmethod: bidRequest.mediaTypes.video.playbackmethod || paramsVideo.playbackmethod,
        startdelay: bidRequest.mediaTypes.video.startdelay || paramsVideo.startdelay
      });
    }
    if (isArray(playerSize[0])) {
      imp.video.w = playerSize[0][0];
      imp.video.h = playerSize[0][1];
    } else if (isNumber(playerSize[0])) {
      imp.video.w = playerSize[0];
      imp.video.h = playerSize[1];
    } else {
      imp.video.w = 300;
      imp.video.h = 250;
    }
    deepSetValue(imp, 'video.ext.context', bidRequest.mediaTypes.video.context);
  } else {
      if (imp.banner) {
        const sizes = bidRequest.mediaTypes?.banner?.sizes || bidRequest.sizes;
        if (isArray(sizes[0])) {
          imp.banner.w = sizes[0][0];
          imp.banner.h = sizes[0][1];
        } else if (isNumber(sizes[0])) {
          imp.banner.w = sizes[0];
          imp.banner.h = sizes[1];
        } else {
          imp.banner.w = 300;
          imp.banner.h = 250;
        }
        imp.banner.pos = deepAccess(bidRequest, 'mediaTypes.banner.pos') || params.pos || 0;
      }
    }

  return imp;
}

/**
 * Builds a request object for the ORTB 2.5 request.
 *
 * @param {function} buildRequest - The function for building a request object.
 * @param {Array} imps - An array of ORTB 2.5 impression objects.
 * @param {Object} bidderRequest - The bidder request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);
  const bidRequest = context.bidRequests[0];
  const supplyPartnerId = bidRequest.params.supplyPartnerId || bidRequest.params.supply_partner_id || bidRequest.params.inventory_id;
  // Site/page info
  if (!request.site) request.site = {};
    request.site.domain = deepAccess(bidderRequest, 'refererInfo.domain') || document.location.host;
    request.site.page = deepAccess(bidderRequest, 'refererInfo.page') || deepAccess(bidderRequest, 'refererInfo.location');
    request.site.ref = deepAccess(bidderRequest, 'refererInfo.ref') || request.site.page;
    request.device = {
      ua: navigator.userAgent,
      devicetype: helper.getDeviceType(),
      dnt: getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language
    };

  // Add user IDs
  let eids = [];
  if (bidRequest && bidRequest.userId) {
    helper.addExternalUserId(eids, deepAccess(bidRequest, `userId.id5id.uid`), 'id5-sync.com', 'ID5ID');
    helper.addExternalUserId(eids, deepAccess(bidRequest, `userId.tdid`), 'adserver.org', 'TDID');
    helper.addExternalUserId(eids, deepAccess(bidRequest, `userId.idl_env`), 'liveramp.com', 'idl');
    helper.addExternalUserId(eids, deepAccess(bidRequest, `userId.criteoid`), 'criteo.com', 'criteo');
    helper.addExternalUserId(eids, deepAccess(bidRequest, 'userId.pubcid'), 'pubcid.org', 'shared_id');
  }

  if (bidRequest.userIdAsEids && Array.isArray(bidRequest.userIdAsEids)) {
    bidderRequest.userIdAsEids.forEach(e => {
        if (e.source && e.uids && e.uids.length > 0) {
          if (eids.filter(eid => eid.source === e.source).length > 0) {
            logWarn('Gamoshi: Duplicate source found:', e.source, e.uids);
            return;
          }
          eids.push({
            source: e.source,
            uids: e.uids.filter(uids => uids.id != null).map(uid => {
              let uidData = {
                id: uid.id,
                atype: uid.atype || 1, // Default to 1 if atype is not provided
              };
              if (uid.ext?.rtiPartner && uid.ext.rtiPartner !== '') {
                uidData.ext = {'rtiPartner': uid.ext.rtiPartner};
              }
              return uidData;
            })
          });
        }
    });
  }

  if (bidRequest.ortb2?.user?.ext?.eids) {
     eids = helper.addRequestEids(eids, bidRequest.ortb2.user.ext.eids);
  }
  if (eids.length > 0) {
    deepSetValue(request, 'user.ext.eids', eids);
  }

  // Add consent data
  const gdprConsent = getGdprConsent(bidderRequest);
  deepSetValue(request, 'ext.gdpr_consent', gdprConsent);
  deepSetValue(request, 'regs.ext.gdpr', gdprConsent.consent_required === true ? 1 : 0);
  deepSetValue(request, 'user.ext.consent', gdprConsent.consent_string);

  if (bidderRequest && bidderRequest.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  // Add GPP support
  if (bidderRequest.gppConsent) {
    deepSetValue(request, 'regs.ext.gpp', bidderRequest.gppConsent.gppString);
    deepSetValue(request, 'regs.ext.gpp_sid', bidderRequest.gppConsent.applicableSections);
  }

  if (config.getConfig("coppa") === true || (bidderRequest.ortb2?.regs?.coppa && bidderRequest.ortb2.regs.coppa === 1)) {
    deepSetValue(request, 'regs.coppa', 1);
  }

  // Add ortb2 first party data
  if (bidderRequest.ortb2?.site) {
    mergeDeep(request.site, bidderRequest.ortb2.site);
  }

  if (bidderRequest.ortb2?.app) {
    if (!request.app) request.app = {};
    mergeDeep(request.app, bidderRequest.ortb2.app);
  }

  if (bidderRequest.ortb2?.user) {
    if (!request.user) request.user = {};
    mergeDeep(request.user, bidderRequest.ortb2.user);
  }

  // Supply chain
  const schain = bidRequest?.ortb2?.source?.ext?.schain;
  if (schain) {
    deepSetValue(request, 'source.ext.schain', schain);
  }

  // Gamoshi-specific parameters
  deepSetValue(request, 'ext.gamoshi', {
    supplyPartnerId: supplyPartnerId
  });
  request = TRANSLATOR(request);
  return request;
}

/**
 * Build bid from oRTB 2.5 bid.
 *
 * @param buildBidResponse
 * @param bid
 * @param context
 * @returns {*}
 */
function bidResponse(buildBidResponse, bid, context) {
  let bidResponse = buildBidResponse(bid, context);
  const mediaType = helper.getMediaType(bid);

  bidResponse.mediaType = mediaType;

  if (bid.adomain && bid.adomain.length) {
    bidResponse.meta = {
      ...bidResponse.meta,
      advertiserDomains: bid.adomain
    };
  }

  if (mediaType === VIDEO) {
    bidResponse.vastUrl = bid.ext?.vast_url;
    bidResponse.vastXml = bid.adm;

    const videoContext = deepAccess(bidResponse, 'context.bidRequest.mediaTypes.video.context');
    if (videoContext === 'outstream') {
      bidResponse.renderer = newRenderer(bidResponse.context.bidRequest, bid);
    }

    // Add video-specific meta data
    if (bid.ext?.video) {
      bidResponse.meta = {
        ...bidResponse.meta,
        ...bid.ext.video
      };
    }
  }
  return bidResponse;
}

/**
 * Builds bid response from the oRTB 2.5 bid response.
 *
 * @param buildResponse
 * @param bidResponses
 * @param ortbResponse
 * @param context
 * @returns *
 */
function response(buildResponse, bidResponses, ortbResponse, context) {
  return buildResponse(bidResponses, ortbResponse, context);
}
registerBidder(spec);
