import { isEmpty, deepAccess, logError, parseGPTSingleSizeArrayToRtbSize, generateUUID, mergeDeep, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';
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
    return !!bid.params.uid;
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
    const bidderTimeout = config.getConfig('bidderTimeout') || timeout;
    const tmax = timeout ? Math.min(bidderTimeout, timeout) : bidderTimeout;
    const imp = [];
    const bidsMap = {};
    const requests = [];
    const sources = [];
    const bidsArray = [];

    validBidRequests.forEach((bid) => {
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
      bidsMap[bidId] = bid;
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
          bidsArray.push(bid);
        } else {
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

      const ortb2UserData = deepAccess(bidderRequest, 'ortb2.user.data');
      if (ortb2UserData && ortb2UserData.length) {
        user = request.user || { data: [] };
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
        bid: bidsArray[i],
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
  interpretResponse: function(serverResponse, bidRequest, RendererConst = Renderer) {
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
    const bid = bidRequest.bidsMap ? bidRequest.bidsMap[serverBid.impid] : bidRequest.bid;
    if (bid) {
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
      const value = seg && (seg.value || seg.id || seg);
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
