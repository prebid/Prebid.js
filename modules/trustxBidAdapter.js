import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'trustx';
const ENDPOINT_URL = 'https://sofia.trustx.org/hb';
const NEW_ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson?sp=trustx';
const ADDITIONAL_SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const ADAPTER_SYNC_URL = 'https://sofia.trustx.org/push_sync';
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

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
export const spec = {
  code: BIDDER_CODE,
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
   * @param {bidderRequest} - bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests || [];
    const newFormatBids = [];
    const oldFormatBids = [];
    const requests = [];
    bids.forEach(bid => {
      if (bid.params.useNewFormat) {
        newFormatBids.push(bid);
      } else {
        oldFormatBids.push(bid);
      }
    });
    if (newFormatBids.length) {
      const newFormatRequests = newFormatRequest(newFormatBids, bidderRequest);
      if (newFormatRequests) {
        requests.push(newFormatRequests);
      }
    }
    if (oldFormatBids.length) {
      const oldFormatRequests = oldFormatRequest(oldFormatBids, bidderRequest);
      if (oldFormatRequests) {
        requests.push(oldFormatRequests);
      }
    }
    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
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

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidRequest, bidResponses, RendererConst);
      });
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, responses, gdprConsent, uspConsent) {
    if (syncOptions.pixelEnabled) {
      const syncsPerBidder = config.getConfig('userSync.syncsPerBidder');
      let params = [];
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params.push(`gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`);
        } else {
          params.push(`gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        params.push(`us_privacy=${uspConsent}`);
      }
      const stringParams = params.join('&');
      const syncs = [{
        type: 'image',
        url: ADAPTER_SYNC_URL + (stringParams ? `?${stringParams}` : '')
      }];
      if (syncsPerBidder > 1) {
        syncs.push({
          type: 'image',
          url: ADDITIONAL_SYNC_URL + (stringParams ? `&${stringParams}` : '')
        });
      }
      return syncs;
    }
  }
}

function isPopulatedArray(arr) {
  return !!(utils.isArray(arr) && arr.length > 0);
}

function deleteValues(keyPairObj) {
  if (isPopulatedArray(keyPairObj.value) && keyPairObj.value[0] === '') {
    delete keyPairObj.value;
  }
}

function _getBidFromResponse(respItem) {
  if (!respItem) {
    utils.logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    utils.logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    utils.logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function _addBidResponse(serverBid, bidRequest, bidResponses, RendererConst) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const { bidsMap, priceType, newFormat } = bidRequest;
    let bid;
    let slot;
    if (newFormat) {
      bid = bidsMap[serverBid.impid];
    } else {
      const awaitingBids = bidsMap[serverBid.auid];
      if (awaitingBids) {
        const sizeId = `${serverBid.w}x${serverBid.h}`;
        if (awaitingBids[sizeId]) {
          slot = awaitingBids[sizeId][0];
          bid = slot.bids.shift();
        }
      } else {
        errorMessage = LOG_ERROR_MESS.noPlacementCode + serverBid.auid;
      }
    }

    if (!errorMessage && bid) {
      const bidResponse = {
        requestId: bid.bidId, // bid.bidderRequestId,
        cpm: serverBid.price,
        width: serverBid.w,
        height: serverBid.h,
        creativeId: serverBid.auid, // bid.bidId,
        currency: 'USD',
        netRevenue: newFormat ? false : priceType !== 'gross',
        ttl: TIME_TO_LIVE,
        dealId: serverBid.dealid,
        meta: {
          advertiserDomains: serverBid.adomain ? serverBid.adomain : []
        },
      };
      if (serverBid.content_type === 'video') {
        bidResponse.vastXml = serverBid.adm;
        bidResponse.mediaType = VIDEO;
        bidResponse.adResponse = {
          content: bidResponse.vastXml
        };
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

      bidResponses.push(bidResponse);
    }

    if (slot && !slot.bids.length) {
      slot.parents.forEach(({parent, key, uid}) => {
        const index = parent[key].indexOf(slot);
        if (index > -1) {
          parent[key].splice(index, 1);
        }
        if (!parent[key].length) {
          delete parent[key];
          if (!utils.getKeys(parent).length) {
            delete bidsMap[uid];
          }
        }
      });
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
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
  const rendererInst = RendererConst.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false
  });

  try {
    rendererInst.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  return rendererInst;
}

function createVideoRequest(bid, mediaType) {
  const {playerSize, mimes, durationRangeSec, protocols} = mediaType;
  const size = (playerSize || bid.sizes || [])[0];
  if (!size) return;

  let result = utils.parseGPTSingleSizeArrayToRtbSize(size);

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

  let format = sizes.map((size) => utils.parseGPTSingleSizeArrayToRtbSize(size));
  let result = utils.parseGPTSingleSizeArrayToRtbSize(sizes[0]);

  if (format.length) {
    result.format = format
  }
  return result;
}

function addSegments(name, segName, segments, data, bidConfigName) {
  if (segments && segments.length) {
    data.push({
      name: name,
      segment: segments.map((seg) => {
        return {name: segName, value: seg};
      })
    });
  } else if (bidConfigName) {
    const configData = config.getConfig('ortb2.user.data');
    let segData = null;
    configData && configData.some(({name, segment}) => {
      if (name === bidConfigName) {
        segData = segment;
        return true;
      }
    });
    if (segData && segData.length) {
      data.push({
        name: name,
        segment: segData.map((seg) => {
          return {name: segName, value: seg};
        })
      });
    }
  }
}

/**
 * Gets bidfloor
 * @param {Object} mediaTypes
 * @param {Object} bid
 * @returns {Number} floor
 */
function _getFloor (mediaTypes, bid) {
  const curMediaType = mediaTypes.video ? 'video' : 'banner';
  let floor = bid.params.bidFloor || 0;

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

function newFormatRequest(validBidRequests, bidderRequest) {
  if (!validBidRequests.length) {
    return null;
  }
  let pageKeywords = null;
  let jwpseg = null;
  let permutiveseg = null;
  let content = null;
  let schain = null;
  let userId = null;
  let userIdAsEids = null;
  let user = null;
  let userExt = null;
  let {bidderRequestId, auctionId, gdprConsent, uspConsent, timeout, refererInfo} = bidderRequest || {};

  const referer = refererInfo ? encodeURIComponent(refererInfo.referer) : '';
  const imp = [];
  const bidsMap = {};

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
    if (!userId) {
      userId = bid.userId;
    }
    if (!userIdAsEids) {
      userIdAsEids = bid.userIdAsEids;
    }
    const {params: {uid, keywords}, mediaTypes, bidId, adUnitCode, rtd} = bid;
    bidsMap[bidId] = bid;
    if (!pageKeywords && !utils.isEmpty(keywords)) {
      pageKeywords = utils.transformBidderParamKeywords(keywords);
    }
    const bidFloor = _getFloor(mediaTypes || {}, bid);
    if (rtd) {
      const jwTargeting = rtd.jwplayer && rtd.jwplayer.targeting;
      if (jwTargeting) {
        if (!jwpseg && jwTargeting.segments) {
          jwpseg = jwTargeting.segments;
        }
        if (!content && jwTargeting.content) {
          content = jwTargeting.content;
        }
      }
      const permutiveTargeting = rtd.p_standard && rtd.p_standard.targeting;
      if (!permutiveseg && permutiveTargeting && permutiveTargeting.segments) {
        permutiveseg = permutiveTargeting.segments;
      }
    }
    let impObj = {
      id: bidId,
      tagid: uid.toString(),
      ext: {
        divid: adUnitCode
      }
    };

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
      imp.push(impObj);
    }
  });

  const source = {
    tid: auctionId,
    ext: {
      wrapper: 'Prebid_js',
      wrapper_version: '$prebid.version$'
    }
  };

  if (schain) {
    source.ext.schain = schain;
  }

  const bidderTimeout = config.getConfig('bidderTimeout') || timeout;
  const tmax = timeout ? Math.min(bidderTimeout, timeout) : bidderTimeout;

  let request = {
    id: bidderRequestId,
    site: {
      page: referer
    },
    tmax,
    source,
    imp
  };

  if (content) {
    request.site.content = content;
  }

  const userData = [];
  addSegments('iow_labs_pub_data', 'jwpseg', jwpseg, userData);
  addSegments('permutive', 'p_standard', permutiveseg, userData, 'permutive.com');

  if (userData.length) {
    user = {
      data: userData
    };
  }

  if (gdprConsent && gdprConsent.consentString) {
    userExt = {consent: gdprConsent.consentString};
  }

  if (userIdAsEids && userIdAsEids.length) {
    userExt = userExt || {};
    userExt.eids = [...userIdAsEids];
  }

  if (userExt && Object.keys(userExt).length) {
    user = user || {};
    user.ext = userExt;
  }

  if (user) {
    request.user = user;
  }

  const configKeywords = utils.transformBidderParamKeywords({
    'user': utils.deepAccess(config.getConfig('ortb2.user'), 'keywords') || null,
    'context': utils.deepAccess(config.getConfig('ortb2.site'), 'keywords') || null
  });

  if (configKeywords.length) {
    pageKeywords = (pageKeywords || []).concat(configKeywords);
  }

  if (pageKeywords && pageKeywords.length > 0) {
    pageKeywords.forEach(deleteValues);
  }

  if (pageKeywords) {
    request.ext = {
      keywords: pageKeywords
    };
  }

  if (gdprConsent && gdprConsent.gdprApplies) {
    request.regs = {
      ext: {
        gdpr: gdprConsent.gdprApplies ? 1 : 0
      }
    }
  }

  if (uspConsent) {
    if (!request.regs) {
      request.regs = {ext: {}};
    }
    request.regs.ext.us_privacy = uspConsent;
  }

  return {
    method: 'POST',
    url: NEW_ENDPOINT_URL,
    data: JSON.stringify(request),
    newFormat: true,
    bidsMap
  };
}

function oldFormatRequest(validBidRequests, bidderRequest) {
  const auids = [];
  const bidsMap = {};
  const slotsMapByUid = {};
  const sizeMap = {};
  const bids = validBidRequests || [];
  let priceType = 'net';
  let jwpseg = null;
  let permutiveseg = null;
  let pageKeywords;
  let reqId;

  bids.forEach(bid => {
    if (bid.params.priceType === 'gross') {
      priceType = 'gross';
    }
    reqId = bid.bidderRequestId;
    const {params: {uid}, adUnitCode, rtd} = bid;
    auids.push(uid);
    const sizesId = utils.parseSizesInput(bid.sizes);

    if (!pageKeywords && !utils.isEmpty(bid.params.keywords)) {
      const keywords = utils.transformBidderParamKeywords(bid.params.keywords);

      if (keywords.length > 0) {
        keywords.forEach(deleteValues);
      }
      pageKeywords = keywords;
    }

    if (rtd) {
      const jwTargeting = rtd.jwplayer && rtd.jwplayer.targeting;
      if (jwTargeting) {
        if (!jwpseg && jwTargeting.segments) {
          jwpseg = jwTargeting.segments;
        }
      }
      const permutiveTargeting = rtd.p_standard && rtd.p_standard.targeting;
      if (!permutiveseg && permutiveTargeting && permutiveTargeting.segments) {
        permutiveseg = permutiveTargeting.segments;
      }
    }

    if (!slotsMapByUid[uid]) {
      slotsMapByUid[uid] = {};
    }
    const slotsMap = slotsMapByUid[uid];
    if (!slotsMap[adUnitCode]) {
      slotsMap[adUnitCode] = {adUnitCode, bids: [bid], parents: []};
    } else {
      slotsMap[adUnitCode].bids.push(bid);
    }
    const slot = slotsMap[adUnitCode];

    sizesId.forEach((sizeId) => {
      sizeMap[sizeId] = true;
      if (!bidsMap[uid]) {
        bidsMap[uid] = {};
      }

      if (!bidsMap[uid][sizeId]) {
        bidsMap[uid][sizeId] = [slot];
      } else {
        bidsMap[uid][sizeId].push(slot);
      }
      slot.parents.push({parent: bidsMap[uid], key: sizeId, uid});
    });
  });

  const segmentsData = [];
  addSegments('iow_labs_pub_data', 'jwpseg', jwpseg, segmentsData);
  addSegments('permutive', 'p_standard', permutiveseg, segmentsData, 'permutive.com');

  if (segmentsData.length) {
    if (!pageKeywords) {
      pageKeywords = [];
    }
    segmentsData.forEach(({segment}) => {
      if (segment.length) {
        pageKeywords.push({
          key: segment[0].name,
          value: segment.map(({value}) => value)
        });
      }
    });
  }

  const payload = {
    pt: priceType,
    auids: auids.join(','),
    sizes: utils.getKeys(sizeMap).join(','),
    r: reqId,
    wrapperType: 'Prebid_js',
    wrapperVersion: '$prebid.version$'
  };

  if (pageKeywords) {
    payload.keywords = JSON.stringify(pageKeywords);
  }

  if (bidderRequest) {
    if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
      payload.u = bidderRequest.refererInfo.referer;
    }
    if (bidderRequest.timeout) {
      payload.wtimeout = bidderRequest.timeout;
    }
    if (bidderRequest.gdprConsent) {
      if (bidderRequest.gdprConsent.consentString) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
      }
      payload.gdpr_applies =
        (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean')
          ? Number(bidderRequest.gdprConsent.gdprApplies) : 1;
    }
    if (bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }
  }

  return {
    method: 'GET',
    url: ENDPOINT_URL,
    data: utils.parseQueryStringParameters(payload).replace(/\&$/, ''),
    bidsMap,
    priceType
  };
}

registerBidder(spec);
