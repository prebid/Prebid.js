import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find.js';
import includes from 'core-js-pure/features/array/includes.js';

const BIDDER_CODE = '1ad4good';
const URL = 'https://hb.1ad4good.org/prebid';
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playback_method', 'frameworks'];
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
const APP_DEVICE_PARAMS = ['geo', 'device_id']; // appid is collected separately
const SOURCE = 'pbjs';
const MAX_IMPS_PER_REQUEST = 15;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adsforgood', 'ads4good', '1adsforgood'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const tags = bidRequests.map(bidToTag);
    const userObjBid = find(bidRequests, hasUserInfo);
    let userObj;
    if (userObjBid) {
      userObj = {};
      Object.keys(userObjBid.params.user)
        .filter(param => includes(USER_PARAMS, param))
        .forEach(param => userObj[param] = userObjBid.params.user[param]);
    }

    const appDeviceObjBid = find(bidRequests, hasAppDeviceInfo);
    let appDeviceObj;
    if (appDeviceObjBid && appDeviceObjBid.params && appDeviceObjBid.params.app) {
      appDeviceObj = {};
      Object.keys(appDeviceObjBid.params.app)
        .filter(param => includes(APP_DEVICE_PARAMS, param))
        .forEach(param => appDeviceObj[param] = appDeviceObjBid.params.app[param]);
    }

    const appIdObjBid = find(bidRequests, hasAppId);
    let appIdObj;
    if (appIdObjBid && appIdObjBid.params && appDeviceObjBid.params.app && appDeviceObjBid.params.app.id) {
      appIdObj = {
        appid: appIdObjBid.params.app.id
      };
    }

    const payload = {
      tags: [...tags],
      user: userObj,
      sdk: {
        source: SOURCE,
        version: '$prebid.version$'
      }
    };

    if (appDeviceObjBid) {
      payload.device = appDeviceObj
    }
    if (appIdObjBid) {
      payload.app = appIdObj;
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      // note - objects for impbus use underscore instead of camelCase
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }

    if (bidderRequest && bidderRequest.refererInfo) {
      let refererinfo = {
        rd_ref: encodeURIComponent(bidderRequest.refererInfo.referer),
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
        rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
      }
      payload.referrer_detection = refererinfo;
    }

    const request = formatRequest(payload, bidderRequest);
    return request;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bids;
    }

    if (serverResponse.tags) {
      serverResponse.tags.forEach(serverBid => {
        const rtbBid = getRtbBid(serverBid);
        if (rtbBid) {
          if (rtbBid.cpm !== 0 && includes(this.supportedMediaTypes, rtbBid.ad_type)) {
            const bid = newBid(serverBid, rtbBid, bidderRequest);
            bid.mediaType = parseMediaType(rtbBid);
            bids.push(bid);
          }
        }
      });
    }

    return bids;
  },

  transformBidParams: function(params, isOpenRtb) {
    params = utils.convertTypes({
      'placementId': 'number',
      'keywords': utils.transformBidderParamKeywords
    }, params);

    if (isOpenRtb) {
      params.use_pmt_rule = (typeof params.usePaymentRule === 'boolean') ? params.usePaymentRule : false;
      if (params.usePaymentRule) { delete params.usePaymentRule; }

      if (isPopulatedArray(params.keywords)) {
        params.keywords.forEach(deleteValues);
      }

      Object.keys(params).forEach(paramKey => {
        let convertedKey = utils.convertCamelToUnderscore(paramKey);
        if (convertedKey !== paramKey) {
          params[convertedKey] = params[paramKey];
          delete params[paramKey];
        }
      });
    }

    return params;
  },

  /**
   * Add element selector to javascript tracker to improve native viewability
   * @param {Bid} bid
   */
  onBidWon: function(bid) {
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

function formatRequest(payload, bidderRequest) {
  let request = [];

  if (payload.tags.length > MAX_IMPS_PER_REQUEST) {
    const clonedPayload = utils.deepClone(payload);

    utils.chunk(payload.tags, MAX_IMPS_PER_REQUEST).forEach(tags => {
      clonedPayload.tags = tags;
      const payloadString = JSON.stringify(clonedPayload);
      request.push({
        method: 'POST',
        url: URL,
        data: payloadString,
        bidderRequest
      });
    });
  } else {
    const payloadString = JSON.stringify(payload);
    request = {
      method: 'POST',
      url: URL,
      data: payloadString,
      bidderRequest
    };
  }

  return request;
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, rtbBid, bidderRequest) {
  const bidRequest = utils.getBidRequest(serverBid.uuid, [bidderRequest]);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    creativeId: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    adUnitCode: bidRequest.adUnitCode,
    ads4good: {
      buyerMemberId: rtbBid.buyer_member_id,
      dealPriority: rtbBid.deal_priority,
      dealCode: rtbBid.deal_code
    }
  };

  if (rtbBid.advertiser_id) {
    bid.meta = Object.assign({}, bid.meta, { advertiserId: rtbBid.advertiser_id });
  }

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastUrl: rtbBid.rtb.video.asset_url,
      vastImpUrl: rtbBid.notify_url,
      ttl: 3600
    });
  } else {
    Object.assign(bid, {
      width: rtbBid.rtb.banner.width,
      height: rtbBid.rtb.banner.height,
      ad: rtbBid.rtb.banner.content
    });
    try {
      const url = rtbBid.rtb.trackers[0].impression_urls[0];
      const tracker = utils.createTrackPixelHtml(url);
      bid.ad += tracker;
    } catch (error) {
      utils.logError('Error appending tracking pixel', error);
    }
  }

  return bid;
}

function bidToTag(bid) {
  const tag = {};
  tag.sizes = transformSizes(bid.sizes);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [];
  tag.uuid = bid.bidId;
  if (bid.params.placementId) {
    tag.id = parseInt(bid.params.placementId, 10);
  }
  if (bid.params.cpm) {
    tag.cpm = bid.params.cpm;
  }
  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
  tag.use_pmt_rule = bid.params.usePaymentRule || false
  tag.prebid = true;
  tag.disable_psa = true;
  if (bid.params.reserve) {
    tag.reserve = bid.params.reserve;
  }
  if (bid.params.position) {
    tag.position = {'above': 1, 'below': 2}[bid.params.position] || 0;
  }
  if (bid.params.trafficSourceCode) {
    tag.traffic_source_code = bid.params.trafficSourceCode;
  }
  if (bid.params.privateSizes) {
    tag.private_sizes = transformSizes(bid.params.privateSizes);
  }
  if (bid.params.supplyType) {
    tag.supply_type = bid.params.supplyType;
  }
  if (bid.params.pubClick) {
    tag.pubclick = bid.params.pubClick;
  }
  if (bid.params.extInvCode) {
    tag.ext_inv_code = bid.params.extInvCode;
  }
  if (bid.params.externalImpId) {
    tag.external_imp_id = bid.params.externalImpId;
  }
  if (!utils.isEmpty(bid.params.keywords)) {
    let keywords = utils.transformBidderParamKeywords(bid.params.keywords);

    if (keywords.length > 0) {
      keywords.forEach(deleteValues);
    }
    tag.keywords = keywords;
  }

  const videoMediaType = utils.deepAccess(bid, `mediaTypes.${VIDEO}`);
  const context = utils.deepAccess(bid, 'mediaTypes.video.context');

  if (bid.mediaType === VIDEO || videoMediaType) {
    tag.ad_types.push(VIDEO);
  }

  // instream gets vastUrl, outstream gets vastXml
  if (bid.mediaType === VIDEO || (videoMediaType && context !== 'outstream')) {
    tag.require_asset_url = true;
  }

  if (bid.params.video) {
    tag.video = {};
    // place any valid video params on the tag
    Object.keys(bid.params.video)
      .filter(param => includes(VIDEO_TARGETING, param))
      .forEach(param => tag.video[param] = bid.params.video[param]);
  }

  if (bid.renderer) {
    tag.video = Object.assign({}, tag.video, {custom_renderer_present: true});
  }

  if (
    (utils.isEmpty(bid.mediaType) && utils.isEmpty(bid.mediaTypes)) ||
    (bid.mediaType === BANNER || (bid.mediaTypes && bid.mediaTypes[BANNER]))
  ) {
    tag.ad_types.push(BANNER);
  }

  return tag;
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

function hasUserInfo(bid) {
  return !!bid.params.user;
}

function hasAppDeviceInfo(bid) {
  if (bid.params) {
    return !!bid.params.app
  }
}

function hasAppId(bid) {
  if (bid.params && bid.params.app) {
    return !!bid.params.app.id
  }
  return !!bid.params.app
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else {
    return BANNER;
  }
}

registerBidder(spec);
