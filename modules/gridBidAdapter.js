import {
  isEmpty,
  deepAccess,
  logError,
  parseGPTSingleSizeArrayToRtbSize,
  generateUUID,
  mergeDeep,
  logWarn,
  isNumber,
  isStr
} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';
const USP_DELETE_DATA_HANDLER = 'https://media.grid.bidswitch.net/uspapi_delete_c2s'

const SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const USER_ID_KEY = 'tmguid';
const GVLID = 686;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const LOG_ERROR_MESS = {
  noAdid: 'Bid from response has no adid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  emptyUids: 'Uids should be not empty',
  emptySeatbid: 'Seatbid array from response has empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - '
};

const ALIAS_CONFIG = {
  'trustx': {
    endpoint: 'https://grid.bidswitch.net/hbjson?sp=trustx',
    syncurl: 'https://x.bidswitch.net/sync?ssp=themediagrid',
    bidResponseExternal: {
      netRevenue: false
    }
  },
  'gridNM': {
    defaultParams: {
      multiRequest: true
    }
  },
};

let hasSynced = false;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['playwire', 'adlivetech', 'gridNM', { code: 'trustx', skipPbsAliasing: true }],
  supportedMediaTypes: [ BANNER, VIDEO ],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return bid && Boolean(bid.params.uid || bid.params.secid);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest bidder request object
   * @return {ServerRequest[]} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    if (!validBidRequests.length) {
      return null;
    }
    let pageKeywords = null;
    let content = null;
    let schain = null;
    let userIdAsEids = null;
    let user = null;
    let userExt = null;
    let endpoint = null;
    let forceBidderName = false;
    let {bidderRequestId, gdprConsent, uspConsent, timeout, refererInfo, gppConsent} = bidderRequest || {};

    const referer = refererInfo ? encodeURIComponent(refererInfo.page) : '';
    const tmax = parseInt(timeout) || null;
    const imp = [];
    const bidsMap = {};
    const requests = [];
    const sources = [];
    const bidsArray = [];

    validBidRequests.forEach((bid) => {
      const bidObject = { bid, savedPrebidBid: null };
      if (!bid.params.uid && !bid.params.secid) {
        return;
      }
      if (!bidderRequestId) {
        bidderRequestId = bid.bidderRequestId;
      }
      if (!schain) {
        schain = bid.schain;
      }
      if (!userIdAsEids) {
        userIdAsEids = bid.userIdAsEids;
      }
      if (!endpoint) {
        endpoint = ALIAS_CONFIG[bid.bidder] && ALIAS_CONFIG[bid.bidder].endpoint;
      }
      const { params, mediaTypes, bidId, adUnitCode, rtd, ortb2Imp } = bid;
      const { defaultParams } = ALIAS_CONFIG[bid.bidder] || {};
      const { secid, pubid, source, uid, keywords, forceBidder, multiRequest, content: bidParamsContent, video: videoParams } = { ...defaultParams, ...params };
      const bidFloor = _getFloor(mediaTypes || {}, bid);
      const jwTargeting = rtd && rtd.jwplayer && rtd.jwplayer.targeting;
      if (jwTargeting && !content && jwTargeting.content) {
        content = jwTargeting.content;
      }

      let impObj = {
        id: bidId.toString(),
        tagid: (secid || uid).toString(),
        ext: {
          divid: adUnitCode.toString()
        }
      };
      if (ortb2Imp) {
        if (ortb2Imp.instl) {
          impObj.instl = parseInt(ortb2Imp.instl) || null;
        }

        if (ortb2Imp.ext) {
          impObj.ext.gpid = ortb2Imp.ext.gpid?.toString() || ortb2Imp.ext.data?.pbadslot?.toString() || ortb2Imp.ext.data?.adserver?.adslot?.toString();
          if (ortb2Imp.ext.data) {
            impObj.ext.data = ortb2Imp.ext.data;
          }
        }
      }
      if (!isEmpty(keywords)) {
        if (!pageKeywords) {
          pageKeywords = keywords;
        }
        impObj.ext.bidder = { keywords };
      }

      if (bidFloor) {
        impObj.bidfloor = bidFloor;
      }

      if (!mediaTypes || mediaTypes[BANNER]) {
        const banner = createBannerRequest(bid, mediaTypes ? mediaTypes[BANNER] : {});
        if (banner) {
          impObj.banner = banner;
        }
      }
      if (mediaTypes && mediaTypes[VIDEO]) {
        const video = createVideoRequest(videoParams, mediaTypes[VIDEO], bid.sizes);
        if (video) {
          impObj.video = video;
        }
      }

      if (impObj.banner || impObj.video) {
        if (multiRequest) {
          const reqSource = {
            tid: bidderRequest?.ortb2?.source?.tid?.toString?.(),
            ext: {
              wrapper: 'Prebid_js',
              wrapper_version: '$prebid.version$'
            }
          };
          if (bid.schain) {
            reqSource.ext.schain = bid.schain;
          }
          const request = {
            id: bid.bidderRequestId && bid.bidderRequestId.toString(),
            site: {
              page: referer,
            },
            tmax,
            source: reqSource,
            imp: [impObj]
          };

          if (pubid) {
            request.site.publisher = { id: pubid };
          }

          const siteContent = bidParamsContent || (jwTargeting && jwTargeting.content);

          if (siteContent) {
            request.site.content = siteContent;
          }

          requests.push(request);
          sources.push(source);
          bidsArray.push(bidObject);
        } else {
          bidsMap[bidId] = bidObject;
          imp.push(impObj);
        }
      }

      if (!forceBidderName && forceBidder && ALIAS_CONFIG[forceBidder]) {
        forceBidderName = forceBidder;
      }
    });

    forceBidderName = config.getConfig('forceBidderName') || forceBidderName;

    if (forceBidderName && ALIAS_CONFIG[forceBidderName]) {
      endpoint = ALIAS_CONFIG[forceBidderName].endpoint;
      this.forceBidderName = forceBidderName;
    }

    const reqSource = {
      tid: bidderRequest?.ortb2?.source?.tid?.toString?.(),
      ext: {
        wrapper: 'Prebid_js',
        wrapper_version: '$prebid.version$'
      }
    };

    if (schain) {
      reqSource.ext.schain = schain;
    }

    const mainRequest = (imp.length || !requests.length) ? {
      id: bidderRequestId && bidderRequestId.toString(),
      site: {
        page: referer
      },
      tmax,
      source: reqSource,
      imp
    } : null;

    if (content) {
      mainRequest.site.content = content;
    }

    [...requests, mainRequest].forEach((request) => {
      if (!request) {
        return;
      }

      user = null;

      const ortb2UserData = deepAccess(bidderRequest, 'ortb2.user.data');
      if (ortb2UserData && ortb2UserData.length) {
        user = { data: [...ortb2UserData] };
      }

      if (gdprConsent && gdprConsent.consentString) {
        userExt = {consent: gdprConsent.consentString};
      }

      const ortb2UserExtDevice = deepAccess(bidderRequest, 'ortb2.user.ext.device');
      if (ortb2UserExtDevice) {
        userExt = userExt || {};
        userExt.device = { ...ortb2UserExtDevice };
      }

      if (userIdAsEids && userIdAsEids.length) {
        userExt = userExt || {};
        userExt.eids = [...userIdAsEids];
      }

      if (userExt && Object.keys(userExt).length) {
        user = user || {};
        user.ext = userExt;
      }

      const fpdUserId = getUserIdFromFPDStorage();

      if (fpdUserId) {
        user = user || {};
        user.id = fpdUserId.toString();
      }

      if (user) {
        request.user = user;
      }

      const userKeywords = deepAccess(bidderRequest, 'ortb2.user.keywords') || null;
      const siteKeywords = deepAccess(bidderRequest, 'ortb2.site.keywords') || null;

      if (userKeywords) {
        pageKeywords = pageKeywords || {};
        pageKeywords.user = pageKeywords.user || {};
        pageKeywords.user.ortb2 = [
          {
            name: 'keywords',
            keywords: userKeywords.split(','),
          }
        ];
      }
      if (siteKeywords) {
        pageKeywords = pageKeywords || {};
        pageKeywords.site = pageKeywords.site || {};
        pageKeywords.site.ortb2 = [
          {
            name: 'keywords',
            keywords: siteKeywords.split(','),
          }
        ];
      }

      if (pageKeywords) {
        pageKeywords = reformatKeywords(pageKeywords);
        if (pageKeywords) {
          request.ext = {
            keywords: pageKeywords
          };
        }
      }

      if (gdprConsent && gdprConsent.gdprApplies) {
        request.regs = {
          ext: {
            gdpr: gdprConsent.gdprApplies ? 1 : 0
          }
        };
      }
      const ortb2Regs = deepAccess(bidderRequest, 'ortb2.regs') || {};
      if (gppConsent || ortb2Regs?.gpp) {
        const gpp = {
          gpp: gppConsent?.gppString ?? ortb2Regs?.gpp,
          gpp_sid: gppConsent?.applicableSections ?? ortb2Regs?.gpp_sid
        };
        request.regs = mergeDeep(request?.regs ?? {}, gpp);
      }

      if (uspConsent) {
        if (!request.regs) {
          request.regs = {ext: {}};
        }
        if (!request.regs.ext) {
          request.regs.ext = {};
        }
        request.regs.ext.us_privacy = uspConsent;
      }

      if (config.getConfig('coppa') === true) {
        if (!request.regs) {
          request.regs = {};
        }
        request.regs.coppa = 1;
      }

      if (ortb2Regs?.ext?.dsa) {
        if (!request.regs) {
          request.regs = {ext: {}};
        }
        if (!request.regs.ext) {
          request.regs.ext = {};
        }
        request.regs.ext.dsa = ortb2Regs.ext.dsa;
      }

      const site = deepAccess(bidderRequest, 'ortb2.site');
      if (site) {
        const pageCategory = [...(site.cat || []), ...(site.pagecat || [])].filter((category) => {
          return category && typeof category === 'string'
        });
        if (pageCategory.length) {
          request.site.cat = pageCategory;
        }
        const genre = deepAccess(site, 'content.genre');
        if (genre && typeof genre === 'string') {
          request.site.content = {...request.site.content, genre};
        }
        const data = deepAccess(site, 'content.data');
        if (data && data.length) {
          const siteContent = request.site.content || {};
          request.site.content = mergeDeep(siteContent, { data });
        }
        const id = deepAccess(site, 'content.id');
        if (id) {
          request.site.content = {...request.site.content, id};
        }
      }
    });

    return [...requests.map((req, i) => {
      let sp;
      const url = (endpoint || ENDPOINT_URL).replace(/[?&]sp=([^?&=]+)/, (i, found) => {
        if (found) {
          sp = found;
        }
        return '';
      });
      let currentSource = sources[i] || sp;
      const urlWithParams = url + (url.indexOf('?') > -1 ? '&' : '?') + 'no_mapping=1' + (currentSource ? `&sp=${currentSource}` : '');
      return {
        method: 'POST',
        url: urlWithParams,
        data: JSON.stringify(req),
        bidObject: bidsArray[i],
      };
    }), ...(mainRequest ? [{
      method: 'POST',
      url: endpoint || ENDPOINT_URL,
      data: JSON.stringify(mainRequest),
      bidsMap
    }] : [])];
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @param {*} RendererConst
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest, RendererConst = Renderer) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    const bidderCode = this.forceBidderName || this.code;

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidRequest, bidResponses, RendererConst, bidderCode);
      });
    }
    if (errorMessage) logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function (...args) {
    const [syncOptions,, gdprConsent, uspConsent] = args;
    if (!hasSynced && syncOptions.pixelEnabled) {
      let params = '';

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `&gdpr=${Number(gdprConsent.gdprApplies)}`;
        }
        if (typeof gdprConsent.consentString === 'string') {
          params += `&gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (uspConsent) {
        params += `&us_privacy=${uspConsent}`;
      }

      const bidderCode = this.forceBidderName || this.code;
      const syncUrl = (ALIAS_CONFIG[bidderCode] && ALIAS_CONFIG[bidderCode].syncurl) || SYNC_URL;

      hasSynced = true;
      return {
        type: 'image',
        url: syncUrl + params
      };
    }
  },

  ajaxCall: function(url, cb, data, options) {
    options.browsingTopics = false;
    return ajax(url, cb, data, options);
  },

  onDataDeletionRequest: function(data) {
    spec.ajaxCall(USP_DELETE_DATA_HANDLER, null, null, {method: 'GET'});
  }
};

/**
 * Gets bidfloor
 * @param {Object} mediaTypes
 * @param {Object} bid
 * @returns {Number} floor
 */
function _getFloor (mediaTypes, bid) {
  const curMediaType = mediaTypes.video ? 'video' : 'banner';
  let floor = parseFloat(bid.params.bidFloor || bid.params.floorcpm || 0) || null;

  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: curMediaType,
      size: bid.sizes.map(([w, h]) => ({w, h}))
    });

    if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' &&
      !isNaN(parseFloat(floorInfo.floor))) {
      floor = Math.max(floor, parseFloat(floorInfo.floor));
    }
  }

  return floor;
}

function _getBidFromResponse(respItem) {
  if (!respItem) {
    logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function _addBidResponse(serverBid, bidRequest, bidResponses, RendererConst, bidderCode) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.adid) errorMessage = LOG_ERROR_MESS.noAdid + JSON.stringify(serverBid);
  if (!errorMessage && !serverBid.adm && !serverBid.nurl) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const bidObject = bidRequest.bidsMap ? bidRequest.bidsMap[serverBid.impid] : bidRequest.bidObject;
    const { bid, savedPrebidBid } = bidObject || {};
    if (bid && canPublishResponse(serverBid.price, savedPrebidBid && savedPrebidBid.cpm)) {
      const bidResponse = {
        requestId: bid.bidId, // bid.bidderRequestId
        cpm: serverBid.price,
        width: serverBid.w,
        height: serverBid.h,
        creativeId: serverBid.adid,
        currency: 'USD',
        netRevenue: true,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: serverBid.adomain ? serverBid.adomain : [],
        },
        dealId: serverBid.dealid
      };

      bidObject.savedPrebidBid = bidResponse;

      if (serverBid.ext && serverBid.ext.bidder && serverBid.ext.bidder.grid && serverBid.ext.bidder.grid.demandSource) {
        bidResponse.adserverTargeting = { 'hb_ds': serverBid.ext.bidder.grid.demandSource };
        bidResponse.meta.demandSource = serverBid.ext.bidder.grid.demandSource;
      }

      if (serverBid.ext && serverBid.ext.dsa) {
        bidResponse.meta.dsa = serverBid.ext.dsa;
      }

      if (serverBid.content_type === 'video') {
        if (serverBid.adm) {
          bidResponse.vastXml = serverBid.adm;
          bidResponse.adResponse = {
            content: bidResponse.vastXml
          };
        } else if (serverBid.nurl) {
          bidResponse.vastUrl = serverBid.nurl;
        }
        bidResponse.mediaType = VIDEO;
        if (!bid.renderer && (!bid.mediaTypes || !bid.mediaTypes.video || bid.mediaTypes.video.context === 'outstream')) {
          bidResponse.renderer = createRenderer(bidResponse, {
            id: bid.bidId,
            url: RENDERER_URL
          }, RendererConst);
        }
      } else {
        bidResponse.ad = serverBid.adm;
        bidResponse.mediaType = BANNER;
      }
      const bidResponseExternal = (ALIAS_CONFIG[bidderCode] && ALIAS_CONFIG[bidderCode].bidResponseExternal) || {};
      bidResponses.push(mergeDeep(bidResponse, bidResponseExternal));
    }
  }
  if (errorMessage) {
    logError(errorMessage);
  }
}

function createVideoRequest(videoParams, mediaType, bidSizes) {
  const { mind, maxd, size, playerSize, protocols, durationRangeSec = [], ...videoData } = { ...mediaType, ...videoParams };
  if (size && isStr(size)) {
    const sizeArray = size.split('x');
    if (sizeArray.length === 2 && parseInt(sizeArray[0]) && parseInt(sizeArray[1])) {
      videoData.w = parseInt(sizeArray[0]);
      videoData.h = parseInt(sizeArray[1]);
    }
  }
  if (!videoData.w || !videoData.h) {
    const pSizesString = (playerSize || bidSizes || []).toString();
    const pSizeString = (pSizesString.match(/^\d+,\d+/) || [])[0];
    const pSize = pSizeString && pSizeString.split(',').map((d) => parseInt(d));
    if (pSize && pSize.length === 2) {
      Object.assign(videoData, parseGPTSingleSizeArrayToRtbSize(pSize));
    }
  }

  if (!videoData.w || !videoData.h) return;

  const minDur = mind || durationRangeSec[0] || parseInt(videoData.minduration) || null;
  const maxDur = maxd || durationRangeSec[1] || parseInt(videoData.maxduration) || null;

  if (minDur) {
    videoData.minduration = minDur;
  }
  if (maxDur) {
    videoData.maxduration = maxDur;
  }

  if (protocols && protocols.length) {
    videoData.protocols = protocols;
  }

  return videoData;
}

function createBannerRequest(bid, mediaType) {
  const sizes = mediaType.sizes || bid.sizes;
  if (!sizes || !sizes.length) return;

  let format = sizes.map((size) => parseGPTSingleSizeArrayToRtbSize(size));
  let result = parseGPTSingleSizeArrayToRtbSize(sizes[0]);

  if (format.length) {
    result.format = format
  }
  return result;
}

function makeNewUserIdInFPDStorage() {
  if (config.getConfig('localStorageWriteAllowed')) {
    const value = generateUUID().replace(/-/g, '');

    storage.setDataInLocalStorage(USER_ID_KEY, value);
    return value;
  }
  return null;
}

function getUserIdFromFPDStorage() {
  return storage.getDataFromLocalStorage(USER_ID_KEY) || makeNewUserIdInFPDStorage();
}

function reformatKeywords(pageKeywords) {
  const formatedPageKeywords = {};
  Object.keys(pageKeywords).forEach((name) => {
    const keywords = pageKeywords[name];
    if (keywords) {
      if (name === 'site' || name === 'user') {
        const formatedKeywords = {};
        Object.keys(keywords).forEach((pubName) => {
          if (Array.isArray(keywords[pubName])) {
            const formatedPublisher = [];
            keywords[pubName].forEach((pubItem) => {
              if (typeof pubItem === 'object' && pubItem.name) {
                const formatedPubItem = { name: pubItem.name, segments: [] };
                Object.keys(pubItem).forEach((key) => {
                  if (Array.isArray(pubItem[key])) {
                    pubItem[key].forEach((keyword) => {
                      if (keyword) {
                        if (typeof keyword === 'string') {
                          formatedPubItem.segments.push({ name: key, value: keyword });
                        } else if (key === 'segments' && typeof keyword.name === 'string' && typeof keyword.value === 'string') {
                          formatedPubItem.segments.push(keyword);
                        }
                      }
                    });
                  }
                });
                if (formatedPubItem.segments.length) {
                  formatedPublisher.push(formatedPubItem);
                }
              }
            });
            if (formatedPublisher.length) {
              formatedKeywords[pubName] = formatedPublisher;
            }
          }
        });
        formatedPageKeywords[name] = formatedKeywords;
      } else {
        formatedPageKeywords[name] = keywords;
      }
    }
  });
  return Object.keys(formatedPageKeywords).length && formatedPageKeywords;
}

function canPublishResponse(price, savedPrice) {
  if (isNumber(savedPrice)) {
    return price > savedPrice || (price === savedPrice && Math.random() > 0.5);
  }
  return true;
}

function outstreamRender (bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}

function createRenderer (bid, rendererParams, RendererConst) {
  const renderer = RendererConst.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

export function resetUserSync() {
  hasSynced = false;
}

export function getSyncUrl() {
  return SYNC_URL;
}

registerBidder(spec);
