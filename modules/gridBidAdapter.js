import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';
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
    if (!validBidRequests.length) {
      return null;
    }
    let pageKeywords = null;
    let jwpseg = null;
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
      const {params: {uid, keywords}, mediaTypes, bidId, adUnitCode, rtd, ortb2Imp} = bid;
      bidsMap[bidId] = bid;
      if (!pageKeywords && !utils.isEmpty(keywords)) {
        pageKeywords = utils.transformBidderParamKeywords(keywords);
      }
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
        id: bidId,
        tagid: uid.toString(),
        ext: {
          divid: adUnitCode
        }
      };
      if (ortb2Imp && ortb2Imp.ext && ortb2Imp.ext.data) {
        impObj.ext.data = ortb2Imp.ext.data;
        if (impObj.ext.data.adserver && impObj.ext.data.adserver.adslot) {
          impObj.ext.gpid = impObj.ext.data.adserver.adslot;
        }
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

    if (config.getConfig('coppa') === true) {
      if (!request.regs) {
        request.regs = {};
      }
      request.regs.coppa = 1;
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(request),
      newFormat: true,
      bidsMap
    };
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
    const bid = bidRequest.bidsMap[serverBid.impid];
    if (bid) {
      const bidResponse = {
        requestId: bid.bidId, // bid.bidderRequestId,
        cpm: serverBid.price,
        width: serverBid.w,
        height: serverBid.h,
        creativeId: serverBid.auid, // bid.bidId,
        currency: 'USD',
        netRevenue: false,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: serverBid && serverBid.adomain ? serverBid.adomain : []
        },
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
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
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
