import { Renderer } from 'src/Renderer';
import * as utils from 'src/utils';
import adaptermanager from 'src/adaptermanager';
import { newBidder } from 'src/adapters/bidderFactory';
import { POST } from '../src/ajax';

const BIDDER_CODE = 'appnexusAst';
const ENDPOINT = '//ib.adnxs.com/ut/v3/prebid';
const SUPPORTED_AD_TYPES = ['banner', 'video', 'video-outstream', 'native'];
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playback_method', 'frameworks'];
const USER_PARAMS = ['age', 'external_uid', 'segments', 'gender', 'dnt', 'language'];
const NATIVE_MAPPING = {
  body: 'description',
  image: {
    serverName: 'main_image',
    serverParams: { required: true, sizes: [{}] }
  },
  icon: {
    serverName: 'icon',
    serverParams: { required: true, sizes: [{}] }
  },
  sponsoredBy: 'sponsored_by'
};

const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bidParams The params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  areParamsValid: function(bidParams) {
    return !!(bidParams.placementId || (bidParams.member && bidParams.invCode));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    const tags = bidRequests.map(bidToTag);
    const userObjBid = bidRequests.find(hasUserInfo);
    let userObj;
    if (userObjBid) {
      userObj = {};
      Object.keys(userObjBid.params.user)
        .filter(param => USER_PARAMS.includes(param))
        .forEach(param => userObj[param] = userObjBid.params.user[param]);
    }

    const memberIdBid = bidRequests.find(hasMemberId);
    const member = memberIdBid ? parseInt(memberIdBid.params.member, 10) : 0;

    const payload = {tags: [...tags], user: userObj};
    if (member > 0) {
      payload.member_id = member;
    }
    const payloadString = JSON.stringify(payload);
    return {
      type: POST,
      endpoint: ENDPOINT,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const parsed = JSON.parse(serverResponse);
    const bids = [];
    parsed.tags.forEach(serverBid => {
      const rtbBid = getRtbBid(serverBid);
      if (rtbBid) {
        if (rtbBid.cpm !== 0 && SUPPORTED_AD_TYPES.includes(rtbBid.ad_type)) {
          const bid = newBid(serverBid, rtbBid);
          bid.mediaType = parseMediaType(rtbBid);
          bids.push(bid);
        }
      }
    });
    return bids;
  }
}

// TODO: Patch UserSync into the spec, once the UserSync PR has been merged.
// function userSyncCode() {
//   const iframe = utils.createInvisibleIframe();
//   iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
//   try {
//     document.body.appendChild(iframe);
//   } catch (error) {
//     utils.logError(error);
//   }
// }

function newRenderer(adUnitCode, rtbBid) {
  const renderer = Renderer.install({
    id: rtbBid.renderer_id,
    url: rtbBid.renderer_url,
    config: { adText: `AppNexus Outstream Video Ad via Prebid.js` },
    loaded: false,
  });
  renderer.setRender(outstreamRender);

  renderer.setEventHandlers({
    impression: () => utils.logMessage('AppNexus outstream video impression event'),
    loaded: () => utils.logMessage('AppNexus outstream video loaded event'),
    ended: () => {
      utils.logMessage('AppNexus outstream renderer video event');
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
 * @return Bid
 */
function newBid(serverBid, rtbBid) {
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    creative_id: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
  };

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastUrl: rtbBid.rtb.video.asset_url,
      descriptionUrl: rtbBid.rtb.video.asset_url
    });
    // This supports Outstream Video
    if (rtbBid.renderer_url) {
      Object.assign(bid, {
        adResponse: serverBid,
        renderer: newRenderer(bid.adUnitCode, rtbBid)
      });
      bid.adResponse.ad = bid.adResponse.ads[0];
      bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
    }
  } else if (rtbBid.rtb.native) {
    const native = rtbBid.rtb.native;
    bid.native = {
      title: native.title,
      body: native.desc,
      sponsoredBy: native.sponsored,
      image: native.main_img && native.main_img.url,
      icon: native.icon && native.icon.url,
      clickUrl: native.link.url,
      impressionTrackers: native.impression_trackers,
    };
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
  tag.uuid = bid.bidId;
  if (bid.params.placementId) {
    tag.id = parseInt(bid.params.placementId, 10);
  } else {
    tag.code = bid.params.invCode;
  }
  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
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
    tag.private_sizes = getSizes(bid.params.privateSizes);
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

  if (bid.mediaType === 'native') {
    tag.ad_types = ['native'];

    if (bid.nativeParams) {
      const nativeRequest = {};

      // map standard prebid native asset identifier to /ut parameters
      // e.g., tag specifies `body` but /ut only knows `description`
      // mapping may be in form {tag: '<server name>'} or
      // {tag: {serverName: '<server name>', serverParams: {...}}}
      Object.keys(bid.nativeParams).forEach(key => {
        // check if one of the <server name> forms is used, otherwise
        // a mapping wasn't specified so pass the key straight through
        const requestKey =
          (NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverName) ||
          NATIVE_MAPPING[key] ||
          key;

        // if the mapping for this identifier specifies required server
        // params via the `serverParams` object, merge that in
        const params = Object.assign({},
          bid.nativeParams[key],
          NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverParams
        );

        nativeRequest[requestKey] = params;
      });

      tag.native = {layouts: [nativeRequest]};
    }
  }

  if (bid.mediaType === 'video') { tag.require_asset_url = true; }
  if (bid.params.video) {
    tag.video = {};
    // place any valid video params on the tag
    Object.keys(bid.params.video)
      .filter(param => VIDEO_TARGETING.includes(param))
      .forEach(param => tag.video[param] = bid.params.video[param]);
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
  return tag && tag.ads && tag.ads.length && tag.ads.find(ad => ad.rtb);
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (rtbBid.renderer_url) {
    return 'video-outstream';
  } else if (adType === 'video') {
    return 'video';
  } else if (adType === 'native') {
    return 'native';
  } else {
    return 'banner';
  }
}

export const adapter = newBidder(spec);

adaptermanager.registerBidAdapter(adapter, 'appnexusAst', {
  supportedMediaTypes: ['video', 'native']
});
