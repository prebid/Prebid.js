import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as mediaTypes from '../src/mediaTypes.js';
import {_map, deepAccess, isEmpty} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {INSTREAM, OUTSTREAM} from '../src/video.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {parseNativeResponse, getBidFloor} from '../libraries/nexverseUtils/index.js';

const BIDDER_CODE = 'dailyhunt';
const BIDDER_ALIAS = 'dh';
const SUPPORTED_MEDIA_TYPES = [mediaTypes.BANNER, mediaTypes.NATIVE, mediaTypes.VIDEO];

const PROD_PREBID_ENDPOINT_URL = 'https://pbs.dailyhunt.in/openrtb2/auction?partner=';
const PROD_PREBID_TEST_ENDPOINT_URL = 'https://qa-pbs-van.dailyhunt.in/openrtb2/auction?partner=';

const ORTB_NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },
  icon: {
    id: 1,
    type: 1,
    name: 'img'
  },
  image: {
    id: 2,
    type: 3,
    name: 'img'
  },
  sponsoredBy: {
    id: 3,
    name: 'data',
    type: 1
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  cta: {
    id: 5,
    type: 12,
    name: 'data'
  },
  body2: {
    id: 4,
    name: 'data',
    type: 10
  }};

// Extract key from collections.
const extractKeyInfo = (collection, key) => {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i].params, key);
    if (result) {
      return result;
    }
  }
  return undefined
}

// Flattern Array.
const flatten = (arr) => {
  return [].concat(...arr);
}

const createOrtbRequest = (validBidRequests, bidderRequest) => {
  const device = createOrtbDeviceObj(validBidRequests);
  const user = createOrtbUserObj(validBidRequests)
  const site = createOrtbSiteObj(validBidRequests, bidderRequest.refererInfo.page)
  return {
    id: bidderRequest.bidderRequestId,
    imp: [],
    site,
    device,
    user,
  };
}

const createOrtbDeviceObj = (validBidRequests) => {
  const device = { ...extractKeyInfo(validBidRequests, `device`) };
  device.ua = navigator.userAgent;
  return device;
}

const createOrtbUserObj = (validBidRequests) => ({ ...extractKeyInfo(validBidRequests, `user`) })

const createOrtbSiteObj = (validBidRequests, page) => {
  const site = { ...extractKeyInfo(validBidRequests, `site`), page };
  const publisher = createOrtbPublisherObj(validBidRequests);
  if (!site.publisher) {
    site.publisher = publisher
  }
  return site
}

const createOrtbPublisherObj = (validBidRequests) => ({ ...extractKeyInfo(validBidRequests, `publisher`) })

const createOrtbImpObj = (bid) => {
  const params = bid.params
  const testMode = !!bid.params.test_mode

  // Validate Banner Request.
  const bannerObj = deepAccess(bid.mediaTypes, `banner`);
  const nativeObj = deepAccess(bid.mediaTypes, `native`);
  const videoObj = deepAccess(bid.mediaTypes, `video`);

  const imp = {
    id: bid.bidId,
    ext: {
      dailyhunt: {
        placement_id: params.placement_id,
        publisher_id: params.publisher_id,
        partner: params.partner_name
      }
    }
  };

  // Test Mode Campaign.
  if (testMode) {
    imp.ext.test_mode = testMode;
  }

  if (bannerObj) {
    imp.banner = {
      ...createOrtbImpBannerObj(bid, bannerObj)
    }
    imp.bidfloor = getBidFloor(bid, 'banner');
  } else if (nativeObj) {
    imp.native = {
      ...createOrtbImpNativeObj(bid, nativeObj)
    }
    imp.bidfloor = getBidFloor(bid, 'native');
  } else if (videoObj) {
    imp.video = {
      ...createOrtbImpVideoObj(bid, videoObj)
    }
    imp.bidfloor = getBidFloor(bid, 'video');
  }
  return imp;
}

const createOrtbImpBannerObj = (bid, bannerObj) => {
  const format = [];
  bannerObj.sizes.forEach(size => format.push({ w: size[0], h: size[1] }))

  return {
    id: 'banner-' + bid.bidId,
    format
  }
}

const createOrtbImpNativeObj = (bid, nativeObj) => {
  const assets = _map(bid.nativeParams, (bidParams, key) => {
    const props = ORTB_NATIVE_PARAMS[key];
    const asset = {
      required: bidParams.required & 1,
    };
    if (props) {
      let h = 0;
      let w = 0;

      asset.id = props.id;

      if (bidParams.sizes) {
        const sizes = flatten(bidParams.sizes);
        w = sizes[0];
        h = sizes[1];
      }

      asset[props.name] = {
        len: bidParams.len ? bidParams.len : 20,
        type: props.type,
        w,
        h
      };

      return asset;
    }
  }).filter(Boolean);
  const request = {
    assets,
    ver: '1,0'
  }
  return { request: JSON.stringify(request) };
}

const createOrtbImpVideoObj = (bid, videoObj) => {
  let obj = {};
  const params = bid.params
  if (!isEmpty(bid.params.video)) {
    obj = {
      topframe: 1,
      skip: params.video.skippable || 0,
      linearity: params.video.linearity || 1,
      minduration: params.video.minduration || 5,
      maxduration: params.video.maxduration || 60,
      mimes: params.video.mimes || ['video/mp4'],
      protocols: getProtocols(params.video),
      w: params.video.playerSize[0][0],
      h: params.video.playerSize[0][1],
    };
  } else {
    obj = {
      mimes: ['video/mp4'],
    };
  }
  obj.ext = {
    ...videoObj,
  }
  return obj;
}

export function getProtocols({protocols}) {
  const defaultValue = [2, 3, 5, 6, 7, 8];
  const listProtocols = [
    {key: 'VAST_1_0', value: 1},
    {key: 'VAST_2_0', value: 2},
    {key: 'VAST_3_0', value: 3},
    {key: 'VAST_1_0_WRAPPER', value: 4},
    {key: 'VAST_2_0_WRAPPER', value: 5},
    {key: 'VAST_3_0_WRAPPER', value: 6},
    {key: 'VAST_4_0', value: 7},
    {key: 'VAST_4_0_WRAPPER', value: 8}
  ];
  if (protocols) {
    return listProtocols.filter(p => {
      return protocols.indexOf(p.key) !== -1
    }).map(p => p.value);
  } else {
    return defaultValue;
  }
}

const createServerRequest = (ortbRequest, validBidRequests, isTestMode = 'false') => ({
  method: 'POST',
  url: isTestMode === 'true' ? PROD_PREBID_TEST_ENDPOINT_URL + validBidRequests[0].params.partner_name : PROD_PREBID_ENDPOINT_URL + validBidRequests[0].params.partner_name,
  data: JSON.stringify(ortbRequest),
  options: {
    contentType: 'application/json',
    withCredentials: true
  },
  bids: validBidRequests
})

const createPrebidBannerBid = (bid, bidResponse) => ({
  requestId: bid.bidId,
  cpm: bidResponse.price.toFixed(2),
  creativeId: bidResponse.crid,
  width: bidResponse.w,
  height: bidResponse.h,
  ttl: 360,
  netRevenue: bid.netRevenue === 'net',
  currency: 'USD',
  ad: bidResponse.adm,
  mediaType: 'banner',
  winUrl: bidResponse.nurl,
  adomain: bidResponse.adomain
})

const createPrebidNativeBid = (bid, bidResponse) => ({
  requestId: bid.bidId,
  cpm: bidResponse.price.toFixed(2),
  creativeId: bidResponse.crid,
  currency: 'USD',
  ttl: 360,
  netRevenue: bid.netRevenue === 'net',
  native: parseNativeResponse(bidResponse),
  mediaType: 'native',
  winUrl: bidResponse.nurl,
  width: bidResponse.w,
  height: bidResponse.h,
  adomain: bidResponse.adomain
})

const createPrebidVideoBid = (bid, bidResponse) => {
  const videoBid = {
    requestId: bid.bidId,
    cpm: bidResponse.price.toFixed(2),
    creativeId: bidResponse.crid,
    width: bidResponse.w,
    height: bidResponse.h,
    ttl: 360,
    netRevenue: bid.netRevenue === 'net',
    currency: 'USD',
    mediaType: 'video',
    winUrl: bidResponse.nurl,
    adomain: bidResponse.adomain
  };

  const videoContext = bid.mediaTypes.video.context;
  switch (videoContext) {
    case OUTSTREAM:
      videoBid.vastXml = bidResponse.adm;
      break;
    case INSTREAM:
      videoBid.videoCacheKey = bidResponse.ext.bidder.cacheKey;
      videoBid.vastUrl = bidResponse.ext.bidder.vastUrl;
      break;
  }
  return videoBid;
}

const getQueryVariable = (variable) => {
  const query = window.location.search.substring(1);
  const vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  return false;
}

export const spec = {
  code: BIDDER_CODE,

  aliases: [BIDDER_ALIAS],

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: bid => !!bid.params.placement_id && !!bid.params.publisher_id && !!bid.params.partner_name,

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const serverRequests = [];

    // ORTB Request.
    const ortbReq = createOrtbRequest(validBidRequests, bidderRequest);

    validBidRequests.forEach((bid) => {
      const imp = createOrtbImpObj(bid)
      ortbReq.imp.push(imp);
    });

    serverRequests.push({ ...createServerRequest(ortbReq, validBidRequests, getQueryVariable('dh_test')) });

    return serverRequests;
  },

  interpretResponse: function (serverResponse, request) {
    const { seatbid } = serverResponse.body;
    const bids = request.bids;
    const prebidResponse = [];

    const seatBids = seatbid[0].bid;

    seatBids.forEach(ortbResponseBid => {
      const bidId = ortbResponseBid.impid;
      const actualBid = ((bids) || []).find((bid) => bid.bidId === bidId);
      const bidMediaType = ortbResponseBid.ext.prebid.type
      switch (bidMediaType) {
        case mediaTypes.BANNER:
          prebidResponse.push(createPrebidBannerBid(actualBid, ortbResponseBid));
          break;
        case mediaTypes.NATIVE:
          prebidResponse.push(createPrebidNativeBid(actualBid, ortbResponseBid));
          break;
        case mediaTypes.VIDEO:
          prebidResponse.push(createPrebidVideoBid(actualBid, ortbResponseBid));
          break;
      }
    })
    return prebidResponse;
  },

  onBidWon: function(bid) {
    ajax(bid.winUrl, null, null, {
      method: 'GET'
    })
  }
}

registerBidder(spec);
