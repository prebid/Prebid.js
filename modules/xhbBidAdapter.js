import { Renderer } from '../src/Renderer';
import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'xhb';
const URL = 'https://ib.adnxs.com/ut/v3/prebid';
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playback_method', 'frameworks'];
const USER_PARAMS = ['age', 'external_uid', 'segments', 'gender', 'dnt', 'language'];
const NATIVE_MAPPING = {
  body: 'description',
  cta: 'ctatext',
  image: {
    serverName: 'main_image',
    requiredParams: { required: true },
    minimumParams: { sizes: [{}] },
  },
  icon: {
    serverName: 'icon',
    requiredParams: { required: true },
    minimumParams: { sizes: [{}] },
  },
  sponsoredBy: 'sponsored_by',
};
const SOURCE = 'pbjs';

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
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

    const memberIdBid = find(bidRequests, hasMemberId);
    const member = memberIdBid ? parseInt(memberIdBid.params.member, 10) : 0;

    const payload = {
      tags: [...tags],
      user: userObj,
      sdk: {
        source: SOURCE,
        version: '$prebid.version$'
      }
    };
    if (member > 0) {
      payload.member_id = member;
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      // note - objects for impbus use underscore instead of camelCase
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: URL,
      data: payloadString,
      bidderRequest
    };
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

  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
      }];
    }
  }
};

function newRenderer(adUnitCode, rtbBid, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: rtbBid.renderer_id,
    url: rtbBid.renderer_url,
    config: rendererOptions,
    loaded: false,
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => utils.logMessage('xhb outstream video impression event'),
    loaded: () => utils.logMessage('xhb outstream video loaded event'),
    ended: () => {
      utils.logMessage('xhb outstream renderer video event');
      document.querySelector(`#${adUnitCode}`).style.display = 'none';
    }
  });
  return renderer;
}

/* Turn keywords parameter into ut-compatible format */
function getKeywords(keywords) {
  let arrs = [];

  utils._each(keywords, (v, k) => {
    if (utils.isArray(v)) {
      let values = [];
      utils._each(v, (val) => {
        val = utils.getValueString('keywords.' + k, val);
        if (val) { values.push(val); }
      });
      v = values;
    } else {
      v = utils.getValueString('keywords.' + k, v);
      if (utils.isStr(v)) {
        v = [v];
      } else {
        return;
      } // unsuported types - don't send a key
    }
    arrs.push({key: k, value: v});
  });

  return arrs;
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, rtbBid, bidderRequest) {
  const bid = {
    requestId: serverBid.uuid,
    cpm: 0.00,
    creativeId: rtbBid.creative_id,
    dealId: 99999999,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    appnexus: {
      buyerMemberId: rtbBid.buyer_member_id
    }
  };

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastUrl: rtbBid.rtb.video.asset_url,
      vastImpUrl: rtbBid.notify_url,
      ttl: 3600
    });
    // This supports Outstream Video
    if (rtbBid.renderer_url) {
      const rendererOptions = utils.deepAccess(
        bidderRequest.bids[0],
        'renderer.options'
      );

      Object.assign(bid, {
        adResponse: serverBid,
        renderer: newRenderer(bid.adUnitCode, rtbBid, rendererOptions)
      });
      bid.adResponse.ad = bid.adResponse.ads[0];
      bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
    }
  } else if (rtbBid.rtb[NATIVE]) {
    const nativeAd = rtbBid.rtb[NATIVE];
    bid[NATIVE] = {
      title: nativeAd.title,
      body: nativeAd.desc,
      cta: nativeAd.ctatext,
      sponsoredBy: nativeAd.sponsored,
      clickUrl: nativeAd.link.url,
      clickTrackers: nativeAd.link.click_trackers,
      impressionTrackers: nativeAd.impression_trackers,
      javascriptTrackers: nativeAd.javascript_trackers,
    };
    if (nativeAd.main_img) {
      bid['native'].image = {
        url: nativeAd.main_img.url,
        height: nativeAd.main_img.height,
        width: nativeAd.main_img.width,
      };
    }
    if (nativeAd.icon) {
      bid['native'].icon = {
        url: nativeAd.icon.url,
        height: nativeAd.icon.height,
        width: nativeAd.icon.width,
      };
    }
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
  } else {
    tag.code = bid.params.invCode;
  }
  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
  tag.use_pmt_rule = bid.params.usePaymentRule || false;
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
    tag.keywords = getKeywords(bid.params.keywords);
  }

  if (bid.mediaType === NATIVE || utils.deepAccess(bid, `mediaTypes.${NATIVE}`)) {
    tag.ad_types.push(NATIVE);

    if (bid.nativeParams) {
      const nativeRequest = buildNativeRequest(bid.nativeParams);
      tag[NATIVE] = {layouts: [nativeRequest]};
    }
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

function hasMemberId(bid) {
  return !!parseInt(bid.params.member, 10);
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

function buildNativeRequest(params) {
  const request = {};

  // map standard prebid native asset identifier to /ut parameters
  // e.g., tag specifies `body` but /ut only knows `description`.
  // mapping may be in form {tag: '<server name>'} or
  // {tag: {serverName: '<server name>', requiredParams: {...}}}
  Object.keys(params).forEach(key => {
    // check if one of the <server name> forms is used, otherwise
    // a mapping wasn't specified so pass the key straight through
    const requestKey =
      (NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverName) ||
      NATIVE_MAPPING[key] ||
      key;

    // required params are always passed on request
    const requiredParams = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].requiredParams;
    request[requestKey] = Object.assign({}, requiredParams, params[key]);

    // minimum params are passed if no non-required params given on adunit
    const minimumParams = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].minimumParams;

    if (requiredParams && minimumParams) {
      // subtract required keys from adunit keys
      const adunitKeys = Object.keys(params[key]);
      const requiredKeys = Object.keys(requiredParams);
      const remaining = adunitKeys.filter(key => !includes(requiredKeys, key));

      // if none are left over, the minimum params needs to be sent
      if (remaining.length === 0) {
        request[requestKey] = Object.assign({}, request[requestKey], minimumParams);
      }
    }
  });

  return request;
}

function outstreamRender(bid) {
  // push to render queue because ANOutstreamVideo may not be loaded yet
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      tagId: bid.adResponse.tag_id,
      sizes: [bid.getSize().split('x')],
      targetId: bid.adUnitCode, // target div id to render video
      uuid: bid.adResponse.uuid,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    }, handleOutstreamRendererEvents.bind(null, bid));
  });
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id, eventName });
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else if (adType === NATIVE) {
    return NATIVE;
  } else {
    return BANNER;
  }
}

registerBidder(spec);
