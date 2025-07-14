import {
  deepAccess,
  isArray,
  getUniqueIdentifierStr,
  contains,
  isFn,
  isPlainObject,
  getBidIdParameter
} from '../src/utils.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { createBid } from '../src/bidfactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { STATUS } from '../src/constants.js';
import { OUTSTREAM, INSTREAM } from '../src/video.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'datawrkz';
const ALIASES = [];
const ENDPOINT_URL = 'https://at.datawrkz.com/exchange/openrtb23/';
const RENDERER_URL = 'https://js.datawrkz.com/prebid/osRenderer.min.js';
const OUTSTREAM_TYPES = ['inline', 'slider_top_left', 'slider_top_right', 'slider_bottom_left', 'slider_bottom_right', 'interstitial_close', 'listicle']
const OUTSTREAM_MIMES = ['video/mp4']
const SUPPORTED_AD_TYPES = [BANNER, NATIVE, VIDEO];

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.site_id && (deepAccess(bid, 'mediaTypes.video.context') !== 'adpod'));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {*} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];

    if (validBidRequests.length > 0) {
      validBidRequests.forEach(bidRequest => {
        if (!bidRequest.mediaTypes) return;
        if (bidRequest.mediaTypes.banner && ((bidRequest.mediaTypes.banner.sizes && bidRequest.mediaTypes.banner.sizes.length !== 0) ||
          (bidRequest.sizes))) {
          requests.push(buildBannerRequest(bidRequest, bidderRequest));
        } else if (bidRequest.mediaTypes.native) {
          requests.push(buildNativeRequest(bidRequest, bidderRequest));
        } else if (bidRequest.mediaTypes.video) {
          requests.push(buildVideoRequest(bidRequest, bidderRequest));
        }
      });
    }
    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    var bidResponses = [];
    const bidRequest = request.bidRequest
    const bidResponse = serverResponse.body;

    // valid object?
    if ((!bidResponse || !bidResponse.id) || (!bidResponse.seatbid || bidResponse.seatbid.length === 0 ||
     !bidResponse.seatbid[0].bid || bidResponse.seatbid[0].bid.length === 0)) {
      return [];
    }

    if (getMediaTypeOfResponse(bidRequest) === BANNER) {
      bidResponses = buildBannerResponse(bidRequest, bidResponse);
    } else if (getMediaTypeOfResponse(bidRequest) === NATIVE) {
      bidResponses = buildNativeResponse(bidRequest, bidResponse);
    } else if (getMediaTypeOfResponse(bidRequest) === VIDEO) {
      bidResponses = buildVideoResponse(bidRequest, bidResponse);
    }
    return bidResponses;
  },
}

/* Generate bid request for banner adunit */
function buildBannerRequest(bidRequest, bidderRequest) {
  const bidFloor = getBidFloor(bidRequest);

  let adW = 0;
  let adH = 0;

  const bannerSizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  const bidSizes = isArray(bannerSizes) ? bannerSizes : bidRequest.sizes;
  if (isArray(bidSizes)) {
    if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      adW = parseInt(bidSizes[0]);
      adH = parseInt(bidSizes[1]);
    } else {
      adW = parseInt(bidSizes[0][0]);
      adH = parseInt(bidSizes[0][1]);
    }
  }

  var deals = [];
  if (bidRequest.params.deals && bidRequest.params.deals.length > 0) {
    deals = bidRequest.params.deals;
  }

  const imp = [{
    id: bidRequest.bidId,
    banner: {
      w: adW,
      h: adH
    },
    bidfloor: bidFloor,
    pmp: {
      deals: deals
    }
  }];

  bidRequest.requestedMediaType = BANNER;
  const scriptUrl = generateScriptUrl(bidRequest);
  const payloadString = generatePayload(imp, bidderRequest);

  return {
    method: 'POST',
    url: scriptUrl,
    data: payloadString,
    bidRequest
  };
}

/* Generate bid request for native adunit */
function buildNativeRequest(bidRequest, bidderRequest) {
  let counter = 0;
  const assets = [];

  const bidFloor = getBidFloor(bidRequest);

  const title = deepAccess(bidRequest, 'mediaTypes.native.title');
  if (title && title.len) {
    assets.push(generateNativeTitleObj(title, ++counter));
  }
  const image = deepAccess(bidRequest, 'mediaTypes.native.image');
  if (image) {
    assets.push(generateNativeImgObj(image, 'image', ++counter));
  }
  const icon = deepAccess(bidRequest, 'mediaTypes.native.icon');
  if (icon) {
    assets.push(generateNativeImgObj(icon, 'icon', ++counter));
  }
  const sponsoredBy = deepAccess(bidRequest, 'mediaTypes.native.sponsoredBy');
  if (sponsoredBy) {
    assets.push(generateNativeDataObj(sponsoredBy, 'sponsored', ++counter));
  }
  const cta = deepAccess(bidRequest, 'mediaTypes.native.cta');
  if (cta) {
    assets.push(generateNativeDataObj(cta, 'cta', ++counter));
  }
  const body = deepAccess(bidRequest, 'mediaTypes.native.body');
  if (body) {
    assets.push(generateNativeDataObj(body, 'desc', ++counter));
  }

  const request = JSON.stringify({assets: assets});
  const native = {
    request: request
  };

  var deals = [];
  if (bidRequest.params.deals && bidRequest.params.deals.length > 0) {
    deals = bidRequest.params.deals;
  }

  const imp = [{
    id: bidRequest.bidId,
    native: native,
    bidfloor: bidFloor,
    pmp: {
      deals: deals
    }
  }];

  bidRequest.requestedMediaType = NATIVE;
  bidRequest.assets = assets;
  const scriptUrl = generateScriptUrl(bidRequest);
  const payloadString = generatePayload(imp, bidderRequest);

  return {
    method: 'POST',
    url: scriptUrl,
    data: payloadString,
    bidRequest
  };
}

/* Generate bid request for video adunit */
function buildVideoRequest(bidRequest, bidderRequest) {
  const bidFloor = getBidFloor(bidRequest);

  const sizeObj = getVideoAdUnitSize(bidRequest);

  const video = {
    w: sizeObj.adW,
    h: sizeObj.adH,
    api: deepAccess(bidRequest, 'mediaTypes.video.api'),
    mimes: deepAccess(bidRequest, 'mediaTypes.video.mimes'),
    protocols: deepAccess(bidRequest, 'mediaTypes.video.protocols'),
    playbackmethod: deepAccess(bidRequest, 'mediaTypes.video.playbackmethod'),
    minduration: deepAccess(bidRequest, 'mediaTypes.video.minduration'),
    maxduration: deepAccess(bidRequest, 'mediaTypes.video.maxduration'),
    startdelay: deepAccess(bidRequest, 'mediaTypes.video.startdelay'),
    minbitrate: deepAccess(bidRequest, 'mediaTypes.video.minbitrate'),
    maxbitrate: deepAccess(bidRequest, 'mediaTypes.video.maxbitrate'),
    delivery: deepAccess(bidRequest, 'mediaTypes.video.delivery'),
    linearity: deepAccess(bidRequest, 'mediaTypes.video.linearity'),
    skip: deepAccess(bidRequest, 'mediaTypes.video.skip'),
    skipafter: deepAccess(bidRequest, 'mediaTypes.video.skipafter')
  };

  const context = deepAccess(bidRequest, 'mediaTypes.video.context');
  if (context === 'outstream' && !bidRequest.renderer) video.mimes = OUTSTREAM_MIMES;

  var imp = [];
  var deals = [];
  if (bidRequest.params.deals && bidRequest.params.deals.length > 0) {
    deals = bidRequest.params.deals;
  }

  if (context !== 'adpod') {
    imp.push({
      id: bidRequest.bidId,
      video: video,
      bidfloor: bidFloor,
      pmp: {
        deals: deals
      }
    });
  }
  bidRequest.requestedMediaType = VIDEO;
  const scriptUrl = generateScriptUrl(bidRequest);
  const payloadString = generatePayload(imp, bidderRequest);

  return {
    method: 'POST',
    url: scriptUrl,
    data: payloadString,
    bidRequest
  };
}

/* Convert video player size to bid request compatible format */
function getVideoAdUnitSize(bidRequest) {
  var adH = 0;
  var adW = 0;
  const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (isArray(playerSize)) {
    if (playerSize.length === 2 && typeof playerSize[0] === 'number' && typeof playerSize[1] === 'number') {
      adW = parseInt(playerSize[0]);
      adH = parseInt(playerSize[1]);
    } else {
      adW = parseInt(playerSize[0][0]);
      adH = parseInt(playerSize[0][1]);
    }
  }
  return {adH: adH, adW: adW}
}

/* Get mediatype of the adunit from request */
function getMediaTypeOfResponse(bidRequest) {
  if (bidRequest.requestedMediaType === BANNER) return BANNER;
  else if (bidRequest.requestedMediaType === NATIVE) return NATIVE;
  else if (bidRequest.requestedMediaType === VIDEO) return VIDEO;
  else return '';
}

/* Generate endpoint url */
function generateScriptUrl(bidRequest) {
  const queryParams = 'hb=1';
  const siteId = getBidIdParameter('site_id', bidRequest.params);
  return ENDPOINT_URL + siteId + '?' + queryParams;
}

/* Generate request payload for the adunit */
function generatePayload(imp, bidderRequest) {
  const domain = window.location.host;
  const page = window.location.host + window.location.pathname + location.search + location.hash;

  const site = {
    domain: domain,
    page: page,
    publisher: {}
  };

  const regs = {ext: {}};

  if (bidderRequest.uspConsent) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }
  if (bidderRequest.gdprConsent && typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
    regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? '1' : '0';
  }

  if (config.getConfig('coppa') === true) {
    regs.coppa = '1';
  }

  const device = {
    ua: window.navigator.userAgent
  };

  const payload = {
    id: getUniqueIdentifierStr(),
    imp: imp,
    site: site,
    device: device,
    regs: regs
  };

  return JSON.stringify(payload);
}

/* Generate image asset object */
function generateNativeImgObj(obj, type, id) {
  let adW = 0;
  let adH = 0;
  const bidSizes = obj.sizes;

  var typeId;
  if (type === 'icon') typeId = 1;
  else if (type === 'image') typeId = 3;

  if (isArray(bidSizes)) {
    if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      adW = parseInt(bidSizes[0]);
      adH = parseInt(bidSizes[1]);
    } else {
      adW = parseInt(bidSizes[0][0]);
      adH = parseInt(bidSizes[0][1]);
    }
  }

  const required = obj.required ? 1 : 0;
  const image = {
    type: parseInt(typeId),
    w: adW,
    h: adH
  };
  return {
    id: id,
    required: required,
    img: image
  };
}

/* Generate title asset object */
function generateNativeTitleObj(obj, id) {
  const required = obj.required ? 1 : 0;
  const title = {
    len: obj.len
  };
  return {
    id: id,
    required: required,
    title: title
  };
}

/* Generate data asset object */
function generateNativeDataObj(obj, type, id) {
  var typeId;
  switch (type) {
    case 'sponsored': typeId = 1;
      break;
    case 'desc' : typeId = 2;
      break;
    case 'cta' : typeId = 12;
      break;
  }

  const required = obj.required ? 1 : 0;
  const data = {
    type: typeId
  };
  if (typeId === 2 && obj.len) {
    data.len = parseInt(obj.len);
  }
  return {
    id: id,
    required: required,
    data: data
  };
}

function createBaseBidResponse(bidRequest, bidderBid, bidResponses) {
  const responseCPM = parseFloat(bidderBid.price);
  if (responseCPM === 0 || isNaN(responseCPM)) {
    let bid = createBid(2);
    bid.requestId = bidRequest.bidId;
    bid.bidderCode = bidRequest.bidder;
    bidResponses.push(bid);
    return null;
  }
  let bidResponse = createBid(1);
  bidRequest.status = STATUS.GOOD;
  bidResponse.requestId = bidRequest.bidId;
  bidResponse.placementCode = bidRequest.placementCode || '';
  bidResponse.cpm = responseCPM;
  bidResponse.creativeId = bidderBid.id;
  bidResponse.bidderCode = bidRequest.bidder;
  bidResponse.ttl = 300;
  bidResponse.netRevenue = true;
  bidResponse.currency = 'USD';
  return bidResponse;
}

/* Convert banner bid response to compatible format */
function buildBannerResponse(bidRequest, bidResponse) {
  const bidResponses = [];
  bidResponse.seatbid[0].bid.forEach(function (bidderBid) {
    if (bidRequest) {
      let bidResponse = createBaseBidResponse(bidRequest, bidderBid, bidResponses);
      if (!bidResponse) return;
      let bidSizes = (deepAccess(bidRequest, 'mediaTypes.banner.sizes')) ? deepAccess(bidRequest, 'mediaTypes.banner.sizes') : bidRequest.sizes;
      bidResponse.size = bidSizes;
      bidResponse.width = parseInt(bidderBid.w);
      bidResponse.height = parseInt(bidderBid.h);
      const responseAd = bidderBid.adm;
      const responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px">';
      bidResponse.ad = decodeURIComponent(responseAd + responseNurl);
      bidResponse.mediaType = BANNER;
      bidResponses.push(bidResponse);
    }
  });
  return bidResponses;
}

/* Convert native bid response to compatible format */
function buildNativeResponse(bidRequest, response) {
  const bidResponses = [];
  response.seatbid[0].bid.forEach(function (bidderBid) {
    if (bidRequest) {
      let bidResponse = createBaseBidResponse(bidRequest, bidderBid, bidResponses);
      if (!bidResponse) return;

      const nativeResponse = JSON.parse(bidderBid.adm).native;

      const native = {
        clickUrl: nativeResponse.link.url,
        impressionTrackers: nativeResponse.imptrackers
      };

      nativeResponse.assets.forEach(function(asset) {
        const keyVal = getNativeAssestObj(asset, bidRequest.assets);
        native[keyVal.key] = keyVal.value;
      });

      if (bidRequest.sizes) { bidResponse.size = bidRequest.sizes; }
      bidResponse.native = native;
      bidResponse.mediaType = NATIVE;
      bidResponses.push(bidResponse);
    }
  });
  return bidResponses;
}

/* Convert video bid response to compatible format */
function buildVideoResponse(bidRequest, response) {
  const bidResponses = [];
  response.seatbid[0].bid.forEach(function (bidderBid) {
    if (bidRequest) {
      let bidResponse = createBaseBidResponse(bidRequest, bidderBid, bidResponses);
      if (!bidResponse) return;
      let context = bidRequest.mediaTypes.video.context;

      let vastXml = decodeURIComponent(bidderBid.adm);

      var ext = bidderBid.ext;
      var vastUrl = '';
      if (ext) {
        vastUrl = ext.vast_url;
      }
      var adUnitCode = bidRequest.adUnitCode;
      var sizeObj = getVideoAdUnitSize(bidRequest);

      bidResponse.height = sizeObj.adH;
      bidResponse.width = sizeObj.adW;

      switch (context) {
        case OUTSTREAM:
          var outstreamType = contains(OUTSTREAM_TYPES, bidRequest.params.outstreamType) ? bidRequest.params.outstreamType : '';
          bidResponse.outstreamType = outstreamType;
          bidResponse.ad = vastXml;
          if (!bidRequest.renderer) {
            const renderer = Renderer.install({
              id: bidderBid.id,
              url: RENDERER_URL,
              config: bidRequest.params.outstreamConfig || {},
              loaded: false,
              adUnitCode
            });
            renderer.setRender(outstreamRender);
            bidResponse.renderer = renderer;
          } else { bidResponse.adResponse = vastXml; }
          break;
        case INSTREAM:
          bidResponse.vastUrl = vastUrl;
          bidResponse.adserverTargeting = setTargeting(vastUrl);
          break;
      }
      bidResponse.mediaType = VIDEO;
      bidResponses.push(bidResponse);
    }
  });
  return bidResponses;
}

/* Generate renderer for outstream ad unit */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.osRenderer({
      adResponse: bid.ad,
      height: bid.height,
      width: bid.width,
      targetId: bid.adUnitCode, // target div id to render video
      outstreamType: bid.outstreamType,
      options: bid.renderer.getConfig(),
    });
  });
}

/* Set targeting params used for instream video that is required to generate cache url  */
function setTargeting(query) {
  var targeting = {};
  var hash;
  var hashes = query.slice(query.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    targeting['hb_' + hash[0]] = hash[1];
  }
  return targeting;
}

/* Get image type with respect to the id */
function getAssetImageType(id, assets) {
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].id === id) {
      if (assets[i].img.type === 1) { return 'icon'; } else if (assets[i].img.type === 3) { return 'image'; }
    }
  }
  return '';
}

/* Get type of data asset with respect to the id */
function getAssetDataType(id, assets) {
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].id === id) {
      if (assets[i].data.type === 1) { return 'sponsored'; } else if (assets[i].data.type === 2) { return 'desc'; } else if (assets[i].data.type === 12) { return 'cta'; }
    }
  }
  return '';
}

/* Convert response assests to compatible format */
function getNativeAssestObj(obj, assets) {
  if (obj.title) {
    return {
      key: 'title',
      value: obj.title.text
    }
  }
  if (obj.data) {
    return {
      key: getAssetDataType(obj.id, assets),
      value: obj.data.value
    }
  }
  if (obj.img) {
    return {
      key: getAssetImageType(obj.id, assets),
      value: {
        url: obj.img.url,
        height: obj.img.h,
        width: obj.img.w
      }
    }
  }
}

// BUILD REQUESTS: BIDFLOORS
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.bidfloor) ? bid.params.bidfloor : null;
  }

  const floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
