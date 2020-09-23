import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hb';
const NEW_ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';
const SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

let hasSynced = false;

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
   * @param {bidderRequest} bidderRequest bidder request object
   * @return {ServerRequest[]} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const oldFormatBids = [];
    const newFormatBids = [];
    validBidRequests.forEach((bid) => {
      bid.params.useNewFormat ? newFormatBids.push(bid) : oldFormatBids.push(bid);
    });
    const requests = [];
    if (newFormatBids.length) {
      requests.push(buildNewRequest(newFormatBids, bidderRequest));
    }
    if (oldFormatBids.length) {
      requests.push(buildOldRequest(oldFormatBids, bidderRequest));
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
  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidRequest, bidResponses);
      });
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.pixelEnabled) {
      let params = '';

      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `&gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (uspConsent) {
        params += `&us_privacy=${uspConsent}`;
      }

      hasSynced = true;
      return {
        type: 'image',
        url: SYNC_URL + params
      };
    }
  }
};

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

function _addBidResponse(serverBid, bidRequest, bidResponses) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    let bid = null;
    let slot = null;
    const bidsMap = bidRequest.bidsMap;
    if (bidRequest.newFormat) {
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

    if (bid) {
      const bidResponse = {
        requestId: bid.bidId, // bid.bidderRequestId,
        bidderCode: spec.code,
        cpm: serverBid.price,
        width: serverBid.w,
        height: serverBid.h,
        creativeId: serverBid.auid, // bid.bidId,
        currency: 'USD',
        netRevenue: false,
        ttl: TIME_TO_LIVE,
        dealId: serverBid.dealid
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
          });
        }
      } else {
        bidResponse.ad = serverBid.adm;
        bidResponse.mediaType = BANNER;
      }
      bidResponses.push(bidResponse);

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
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
}

function buildOldRequest(validBidRequests, bidderRequest) {
  const auids = [];
  const bidsMap = {};
  const slotsMapByUid = {};
  const sizeMap = {};
  const bids = validBidRequests || [];
  let pageKeywords = null;
  let reqId;

  bids.forEach(bid => {
    reqId = bid.bidderRequestId;
    const {params: {uid}, adUnitCode, mediaTypes} = bid;
    auids.push(uid);
    const sizesId = utils.parseSizesInput(bid.sizes);

    if (!pageKeywords && !utils.isEmpty(bid.params.keywords)) {
      pageKeywords = utils.transformBidderParamKeywords(bid.params.keywords);
    }

    const addedSizes = {};
    sizesId.forEach((sizeId) => {
      addedSizes[sizeId] = true;
    });
    const bannerSizesId = utils.parseSizesInput(utils.deepAccess(mediaTypes, 'banner.sizes'));
    const videoSizesId = utils.parseSizesInput(utils.deepAccess(mediaTypes, 'video.playerSize'));
    bannerSizesId.concat(videoSizesId).forEach((sizeId) => {
      if (!addedSizes[sizeId]) {
        addedSizes[sizeId] = true;
        sizesId.push(sizeId);
      }
    });

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

  const configKeywords = utils.transformBidderParamKeywords({
    'user': utils.deepAccess(config.getConfig('fpd.user'), 'keywords') || null,
    'context': utils.deepAccess(config.getConfig('fpd.context'), 'keywords') || null
  });

  if (configKeywords.length) {
    pageKeywords = (pageKeywords || []).concat(configKeywords);
  }

  if (pageKeywords && pageKeywords.length > 0) {
    pageKeywords.forEach(deleteValues);
  }

  const payload = {
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
    bidsMap: bidsMap
  }
}

function buildNewRequest(validBidRequests, bidderRequest) {
  let pageKeywords = null;
  let jwpseg = null;
  let content = null;
  let schain = null;
  let userId = null;
  let user = null;
  let userExt = null;
  let {bidderRequestId, auctionId, gdprConsent, uspConsent, timeout, refererInfo} = bidderRequest;

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
    const {params: {uid, keywords}, mediaTypes, bidId, adUnitCode, realTimeData} = bid;
    bidsMap[bidId] = bid;
    if (!pageKeywords && !utils.isEmpty(keywords)) {
      pageKeywords = utils.transformBidderParamKeywords(keywords);
    }
    if (realTimeData && realTimeData.jwTargeting) {
      if (!jwpseg && realTimeData.jwTargeting.segments) {
        jwpseg = realTimeData.jwTargeting.segments;
      }
      if (!content && realTimeData.jwTargeting.content) {
        content = realTimeData.jwTargeting.content;
      }
    }
    let impObj = {
      id: bidId,
      tagid: uid.toString(),
      ext: {
        divid: adUnitCode
      }
    };

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

  const tmax = config.getConfig('bidderTimeout') || timeout;

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

  if (jwpseg && jwpseg.length) {
    user = {
      data: [{
        name: 'iow_labs_pub_data',
        segment: jwpseg.map((seg) => {
          return {name: 'jwpseg', value: seg};
        })
      }]
    };
  }

  if (gdprConsent && gdprConsent.consentString) {
    userExt = {consent: gdprConsent.consentString};
  }

  if (userId) {
    userExt = userExt || {};
    if (userId.tdid) {
      userExt.unifiedid = userId.tdid;
    }
    if (userId.id5id) {
      userExt.id5id = userId.id5id;
    }
    if (userId.digitrustid && userId.digitrustid.data && userId.digitrustid.data.id) {
      userExt.digitrustid = userId.digitrustid.data.id;
    }
    if (userId.lipb && userId.lipb.lipbid) {
      userExt.liveintentid = userId.lipb.lipbid;
    }
  }

  if (userExt && Object.keys(userExt).length) {
    user = user || {};
    user.ext = userExt;
  }

  if (user) {
    request.user = user;
  }

  const configKeywords = utils.transformBidderParamKeywords({
    'user': utils.deepAccess(config.getConfig('fpd.user'), 'keywords') || null,
    'context': utils.deepAccess(config.getConfig('fpd.context'), 'keywords') || null
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

function createVideoRequest(bid, mediaType) {
  const {playerSize, mimes, durationRangeSec} = mediaType;
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

function outstreamRender (bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}

function createRenderer (bid, rendererParams) {
  const renderer = Renderer.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
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
