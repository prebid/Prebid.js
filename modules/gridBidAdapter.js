import {
  isEmpty,
  deepAccess,
  logError,
  parseGPTSingleSizeArrayToRtbSize,
  generateUUID,
  mergeDeep,
  logWarn,
  parseUrl, isArray, isNumber
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { find } from '../src/polyfill.js';

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';

const ADAPTER_VERSION_FOR_CRITEO_MODE = 34;
const CDB_ENDPOINT = 'https://bidder.criteo.com/cdb';
const PROFILE_ID_INLINE = 207;
const SID_COOKIE_NAME = 'cto_sid';
const IDCPY_COOKIE_NAME = 'cto_idcpy';
const OPTOUT_COOKIE_NAME = 'cto_optout';
const BUNDLE_COOKIE_NAME = 'cto_bundle';

const SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const USER_ID_KEY = 'tmguid';
const GVLID = 686;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
export const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});

const LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
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
  }
};

let hasSynced = false;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['playwire', 'adlivetech', { code: 'trustx', skipPbsAliasing: true }],
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
    let jwpseg = null;
    let content = null;
    let schain = null;
    let userIdAsEids = null;
    let user = null;
    let userExt = null;
    let endpoint = null;
    let forceBidderName = false;
    let {bidderRequestId, auctionId, gdprConsent, uspConsent, timeout, refererInfo} = bidderRequest || {};

    const referer = refererInfo ? encodeURIComponent(refererInfo.page) : '';
    const tmax = timeout || config.getConfig('bidderTimeout');
    const imp = [];
    const bidsMap = {};
    const requests = [];
    const criteoBidsMap = {};
    const criteoBidRequests = [];
    const sources = [];
    const bidsArray = [];

    validBidRequests.forEach((bid) => {
      const bidObject = { bid, savedPrebidBid: null };
      if (bid.params.withCriteo && criteoSpec.isBidRequestValid(bid)) {
        criteoBidsMap[bid.bidId] = bidObject;
        criteoBidRequests.push(bid);
      }
      if (!bid.params.uid && !bid.params.secid) {
        return;
      }
      if (!bidderRequestId) {
        bidderRequestId = bid.bidderRequestId;
      }
      if (!auctionId) {
        auctionId = bid.auctionId;
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
      const { params: { uid, keywords, forceBidder, multiRequest }, mediaTypes, bidId, adUnitCode, rtd, ortb2Imp } = bid;
      const { pubdata, secid, pubid, source, content: bidParamsContent } = bid.params;
      const bidFloor = _getFloor(mediaTypes || {}, bid);
      const jwTargeting = rtd && rtd.jwplayer && rtd.jwplayer.targeting;
      if (jwTargeting) {
        if (!jwpseg && jwTargeting.segments) {
          jwpseg = jwTargeting.segments;
        }
        if (!content && jwTargeting.content) {
          content = jwTargeting.content;
        }
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
          impObj.instl = ortb2Imp.instl;
        }
        if (ortb2Imp.ext && ortb2Imp.ext.data) {
          impObj.ext.data = ortb2Imp.ext.data;
          if (impObj.ext.data.adserver && impObj.ext.data.adserver.adslot) {
            impObj.ext.gpid = impObj.ext.data.adserver.adslot.toString();
          } else {
            impObj.ext.gpid = ortb2Imp.ext.data.pbadslot && ortb2Imp.ext.data.pbadslot.toString();
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
        const video = createVideoRequest(bid, mediaTypes[VIDEO]);
        if (video) {
          impObj.video = video;
        }
      }

      if (impObj.banner || impObj.video) {
        if (multiRequest) {
          const reqSource = {
            tid: bid.auctionId && bid.auctionId.toString(),
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

          const reqJwpseg = (pubdata && pubdata.jwpseg) || (jwTargeting && jwTargeting.segments);

          const siteContent = bidParamsContent || (jwTargeting && jwTargeting.content);

          if (siteContent) {
            request.site.content = siteContent;
          }

          if (reqJwpseg && reqJwpseg.length) {
            request.user = {
              data: [{
                name: 'iow_labs_pub_data',
                segment: segmentProcessing(reqJwpseg, 'jwpseg'),
              }]
            };
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
      tid: auctionId && auctionId.toString(),
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

    if (jwpseg && jwpseg.length) {
      mainRequest.user = {
        data: [{
          name: 'iow_labs_pub_data',
          segment: segmentProcessing(jwpseg, 'jwpseg'),
        }]
      };
    }

    [...requests, mainRequest].forEach((request) => {
      if (!request) {
        return;
      }

      if (request.user) user = request.user;

      const ortb2UserData = deepAccess(bidderRequest, 'ortb2.user.data');
      if (ortb2UserData && ortb2UserData.length) {
        if (!user) user = { data: [] };
        user = mergeDeep(user, {
          data: [...ortb2UserData]
        });
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

      if (uspConsent) {
        if (!request.regs) {
          request.regs = {ext: {}};
        }
        request.regs.ext.us_privacy = uspConsent;
      }

      if (config.getConfig('coppa') === true) {
        if (!request.regs) {
          request.regs = {};
        }
        request.regs.coppa = 1;
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

    const criteoRequest = criteoBidRequests.length && criteoSpec.buildRequests(criteoBidRequests, bidderRequest);
    if (criteoRequest) {
      criteoRequest.criteoBidsMap = criteoBidsMap;
    }

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
    }] : []), ...(criteoRequest ? [criteoRequest] : [])];
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @param {*} RendererConst
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest, RendererConst = Renderer) {
    if (bidRequest.criteoBidsMap && bidRequest.bidRequests) {
      const criteoBids = criteoSpec.interpretResponse(serverResponse, bidRequest);
      return criteoBids.filter((bid) => {
        const { savedPrebidBid } = bidRequest.criteoBidsMap[bid.requestId] || {};
        return canPublishResponse(bid.cpm, savedPrebidBid && savedPrebidBid.cpm);
      });
    } else {
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
    }
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
  let floor = bid.params.bidFloor || bid.params.floorcpm || 0;

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
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
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
        creativeId: serverBid.auid, // bid.bidId
        currency: 'USD',
        netRevenue: true,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: serverBid.adomain ? serverBid.adomain : []
        },
        dealId: serverBid.dealid
      };

      bidObject.savedPrebidBid = bidResponse;

      if (serverBid.ext && serverBid.ext.bidder && serverBid.ext.bidder.grid && serverBid.ext.bidder.grid.demandSource) {
        bidResponse.adserverTargeting = { 'hb_ds': serverBid.ext.bidder.grid.demandSource };
        bidResponse.meta.demandSource = serverBid.ext.bidder.grid.demandSource;
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

function createVideoRequest(bid, mediaType) {
  const { playerSize, mimes, durationRangeSec, protocols } = mediaType;
  const size = (playerSize || bid.sizes || [])[0];
  if (!size) return;

  let result = parseGPTSingleSizeArrayToRtbSize(size);

  if (mimes) {
    result.mimes = mimes;
  }

  if (durationRangeSec && durationRangeSec.length === 2) {
    result.minduration = durationRangeSec[0];
    result.maxduration = durationRangeSec[1];
  }

  if (protocols && protocols.length) {
    result.protocols = protocols;
  }

  return result;
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

function segmentProcessing(segment, forceSegName) {
  return segment
    .map((seg) => {
      const value = seg && (seg.id || seg);
      if (typeof value === 'string' || typeof value === 'number') {
        return {
          value: value.toString(),
          ...(forceSegName && { name: forceSegName }),
          ...(seg.name && { name: seg.name }),
        };
      }
      return null;
    })
    .filter((seg) => !!seg);
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

// ================ Criteo methods ==================

const criteoSpec = {
  /** f
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    // either one of zoneId or networkId should be set
    if (!(bid && bid.params && (bid.params.zoneId || bid.params.networkId))) {
      return false;
    }

    // video media types requires some mandatory params
    if (hasVideoMediaType(bid)) {
      if (!hasValidVideoMediaType(bid)) {
        return false;
      }
    }

    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    let url;
    let data;
    let fpd = bidderRequest.ortb2 || {};

    Object.assign(bidderRequest, {
      publisherExt: fpd.site?.ext,
      userExt: fpd.user?.ext,
      ceh: config.getConfig('criteo.ceh'),
      coppa: config.getConfig('coppa')
    });

    const context = buildContext(bidRequests, bidderRequest);
    url = buildCdbUrl(context);
    data = buildCdbRequest(context, bidRequests, bidderRequest);

    if (data) {
      return { method: 'POST', url, data, bidRequests };
    }
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const body = response.body || response;
    const bids = [];

    if (body && body.slots && isArray(body.slots)) {
      body.slots.forEach(slot => {
        const bidRequest = find(request.bidRequests, b => b.adUnitCode === slot.impid && (!b.params.zoneId || parseInt(b.params.zoneId) === slot.zoneid));
        const bidId = bidRequest.bidId;
        const bid = {
          requestId: bidId,
          cpm: slot.cpm,
          currency: slot.currency,
          netRevenue: true,
          ttl: slot.ttl || 60,
          creativeId: slot.creativecode,
          width: slot.width,
          height: slot.height,
          dealId: slot.dealCode,
        };
        if (body.ext?.paf?.transmission && slot.ext?.paf?.content_id) {
          const pafResponseMeta = {
            content_id: slot.ext.paf.content_id,
            transmission: response.ext.paf.transmission
          };
          bid.meta = Object.assign({}, bid.meta, { paf: pafResponseMeta });
        }
        if (slot.adomain) {
          bid.meta = Object.assign({}, bid.meta, { advertiserDomains: slot.adomain });
        }
        if (slot.video) {
          bid.vastUrl = slot.displayurl;
          bid.mediaType = VIDEO;
        } else {
          bid.ad = slot.creative;
        }
        bids.push(bid);
      });
    }

    return bids;
  }
};

function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}

/**
 * @param {BidRequest[]} bidRequests
 * @param bidderRequest
 */
function buildContext(bidRequests, bidderRequest) {
  let referrer = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    referrer = bidderRequest.refererInfo.page;
  }
  const queryString = parseUrl(bidderRequest?.refererInfo?.topmostLocation).search;

  const context = {
    url: referrer,
    debug: queryString['pbt_debug'] === '1',
    noLog: queryString['pbt_nolog'] === '1',
    amp: false,
  };

  bidRequests.forEach(bidRequest => {
    if (bidRequest.params.integrationMode === 'amp') {
      context.amp = true;
    }
  });

  return context;
}

/**
 * @param {CriteoContext} context
 * @return {string}
 */
function buildCdbUrl(context) {
  let url = CDB_ENDPOINT;
  url += '?profileId=' + PROFILE_ID_INLINE;
  url += '&av=' + String(ADAPTER_VERSION_FOR_CRITEO_MODE);
  url += '&wv=' + encodeURIComponent('$prebid.version$');
  url += '&cb=' + String(Math.floor(Math.random() * 99999999999));

  if (storage.localStorageIsEnabled()) {
    url += '&lsavail=1';
  } else {
    url += '&lsavail=0';
  }

  if (context.amp) {
    url += '&im=1';
  }
  if (context.debug) {
    url += '&debug=1';
  }
  if (context.noLog) {
    url += '&nolog=1';
  }

  const bundle = readFromAllStorages(BUNDLE_COOKIE_NAME);
  if (bundle) {
    url += `&bundle=${bundle}`;
  }

  const optout = readFromAllStorages(OPTOUT_COOKIE_NAME);
  if (optout) {
    url += `&optout=1`;
  }

  const sid = readFromAllStorages(SID_COOKIE_NAME);
  if (sid) {
    url += `&sid=${sid}`;
  }

  const idcpy = readFromAllStorages(IDCPY_COOKIE_NAME);
  if (idcpy) {
    url += `&idcpy=${idcpy}`;
  }

  return url;
}

/**
 * @param {CriteoContext} context
 * @param {BidRequest[]} bidRequests
 * @param bidderRequest
 * @return {*}
 */
function buildCdbRequest(context, bidRequests, bidderRequest) {
  let networkId;
  let schain;
  const request = {
    publisher: {
      url: context.url,
      ext: bidderRequest.publisherExt,
    },
    regs: {
      coppa: bidderRequest.coppa === true ? 1 : (bidderRequest.coppa === false ? 0 : undefined)
    },
    slots: bidRequests.map(bidRequest => {
      networkId = bidRequest.params.networkId || networkId;
      schain = bidRequest.schain || schain;
      const slot = {
        impid: bidRequest.adUnitCode,
        transactionid: bidRequest.transactionId,
        auctionId: bidRequest.auctionId,
      };
      if (bidRequest.params.zoneId) {
        slot.zoneid = bidRequest.params.zoneId;
      }
      if (deepAccess(bidRequest, 'ortb2Imp.ext')) {
        slot.ext = bidRequest.ortb2Imp.ext;
      }
      if (bidRequest.params.ext) {
        slot.ext = Object.assign({}, slot.ext, bidRequest.params.ext);
      }
      if (bidRequest.params.publisherSubId) {
        slot.publishersubid = bidRequest.params.publisherSubId;
      }

      if (hasBannerMediaType(bidRequest)) {
        slot.sizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'), parseSize);
      } else {
        slot.sizes = [];
      }

      if (hasVideoMediaType(bidRequest)) {
        const video = {
          playersizes: parseSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'), parseSize),
          mimes: bidRequest.mediaTypes.video.mimes,
          protocols: bidRequest.mediaTypes.video.protocols,
          maxduration: bidRequest.mediaTypes.video.maxduration,
          api: bidRequest.mediaTypes.video.api,
          skip: bidRequest.mediaTypes.video.skip,
          placement: bidRequest.mediaTypes.video.placement,
          minduration: bidRequest.mediaTypes.video.minduration,
          playbackmethod: bidRequest.mediaTypes.video.playbackmethod,
          startdelay: bidRequest.mediaTypes.video.startdelay
        };
        const paramsVideo = bidRequest.params.video;
        if (paramsVideo !== undefined) {
          video.skip = video.skip || paramsVideo.skip || 0;
          video.placement = video.placement || paramsVideo.placement;
          video.minduration = video.minduration || paramsVideo.minduration;
          video.playbackmethod = video.playbackmethod || paramsVideo.playbackmethod;
          video.startdelay = video.startdelay || paramsVideo.startdelay || 0;
        }

        slot.video = video;
      }

      enrichSlotWithFloors(slot, bidRequest);

      return slot;
    }),
  };
  if (networkId) {
    request.publisher.networkid = networkId;
  }
  if (schain) {
    request.source = {
      ext: {
        schain: schain
      }
    };
  }
  request.user = {
    ext: bidderRequest.userExt
  };
  if (bidderRequest && bidderRequest.ceh) {
    request.user.ceh = bidderRequest.ceh;
  }
  if (bidderRequest && bidderRequest.gdprConsent) {
    request.gdprConsent = {};
    if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      request.gdprConsent.gdprApplies = !!(bidderRequest.gdprConsent.gdprApplies);
    }
    request.gdprConsent.version = bidderRequest.gdprConsent.apiVersion;
    if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
      request.gdprConsent.consentData = bidderRequest.gdprConsent.consentString;
    }
  }
  if (bidderRequest && bidderRequest.uspConsent) {
    request.user.uspIab = bidderRequest.uspConsent;
  }
  return request;
}

function parseSizes(sizes, parser = s => s) {
  if (sizes === undefined) {
    return [];
  }
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parser(size));
  }
  return [parser(sizes)]; // or a single one ? (ie. [728,90])
}

function parseSize(size) {
  return size[0] + 'x' + size[1];
}

function hasVideoMediaType(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.video') !== undefined;
}

function hasBannerMediaType(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.banner') !== undefined;
}

function hasValidVideoMediaType(bidRequest) {
  let isValid = true;

  var requiredMediaTypesParams = ['mimes', 'playerSize', 'maxduration', 'protocols', 'api', 'skip', 'placement', 'playbackmethod'];

  requiredMediaTypesParams.forEach(function (param) {
    if (deepAccess(bidRequest, 'mediaTypes.video.' + param) === undefined && deepAccess(bidRequest, 'params.video.' + param) === undefined) {
      isValid = false;
      logError('TheMediaGrid Bid Adapter (withCriteo mode): mediaTypes.video.' + param + ' is required');
    }
  });

  if (isValid) {
    const videoPlacement = bidRequest.mediaTypes.video.placement || bidRequest.params.video.placement;
    // We do not support long form for now, also we have to check that context & placement are consistent
    if (bidRequest.mediaTypes.video.context === 'instream' && videoPlacement === 1) {
      return true;
    } else if (bidRequest.mediaTypes.video.context === 'outstream' && videoPlacement !== 1) {
      return true;
    }
  }

  return false;
}

function enrichSlotWithFloors(slot, bidRequest) {
  try {
    const slotFloors = {};

    if (bidRequest.getFloor) {
      if (bidRequest.mediaTypes?.banner) {
        slotFloors.banner = {};
        const bannerSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'))
        bannerSizes.forEach(bannerSize => slotFloors.banner[parseSize(bannerSize).toString()] = bidRequest.getFloor({ size: bannerSize, mediaType: BANNER }));
      }

      if (bidRequest.mediaTypes?.video) {
        slotFloors.video = {};
        const videoSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'))
        videoSizes.forEach(videoSize => slotFloors.video[parseSize(videoSize).toString()] = bidRequest.getFloor({ size: videoSize, mediaType: VIDEO }));
      }

      if (Object.keys(slotFloors).length > 0) {
        if (!slot.ext) {
          slot.ext = {}
        }
        Object.assign(slot.ext, {
          floors: slotFloors
        });
      }
    }
  } catch (e) {
    logError('Could not parse floors from Prebid: ' + e);
  }
}

registerBidder(spec);
