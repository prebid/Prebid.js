import { deepAccess, isArray, parseSizesInput } from '../../src/utils.js';

export function getIsSecureBidRequest(bidderRequest) {
  if (bidderRequest?.refererInfo?.stack?.length) {
    const el = document.createElement('a');
    el.href = bidderRequest.refererInfo.stack[0];
    return (el.protocol === 'https:') ? 1 : 0;
  }

  return 0;
}

export function buildImpressionList(bidRequests, bidderRequest, slotsToBids, options) {
  const { frameExt, getFloor, defaultVideoConfig } = options;
  const impList = [];
  const isSecure = getIsSecureBidRequest(bidderRequest);

  for (let i = 0; i < bidRequests.length; i++) {
    const bidRequestData = bidRequests[i];
    slotsToBids[bidRequestData.adUnitCode] = bidRequestData;

    const impObj = {
      id: bidRequestData.adUnitCode,
      secure: isSecure,
      ext: frameExt(bidRequestData)
    };

    if (deepAccess(bidRequestData, 'mediaTypes.banner') || deepAccess(bidRequestData, 'mediaType') === 'banner') {
      const banner = frameBanner(bidRequestData);
      if (banner) {
        impObj.banner = banner;
      }
    }

    if (deepAccess(bidRequestData, 'mediaTypes.video') || deepAccess(bidRequestData, 'mediaType') === 'video') {
      impObj.video = frameVideo(bidRequestData, defaultVideoConfig);
    }

    if (!(impObj.banner || impObj.video)) {
      continue;
    }

    if (typeof getFloor === 'function') {
      impObj.bidfloor = getFloor(bidRequestData);
    }

    impList.push(impObj);
  }

  return impList;
}

export function interpretCommonResponse(serverResponse, slotsToBids, options = {}) {
  const {
    baseBidResponse,
    videoBidResponse,
    bannerBidResponse
  } = options;
  let responses = serverResponse.body || [];
  const bids = [];

  if (responses.seatbid) {
    const flattenedResponses = [];
    for (let i = 0; i < responses.seatbid.length; i++) {
      for (let j = 0; j < responses.seatbid[i].bid.length; j++) {
        flattenedResponses.push(responses.seatbid[i].bid[j]);
      }
    }
    responses = flattenedResponses;
  }

  for (let i = 0; i < responses.length; i++) {
    const bid = responses[i];
    const bidRequest = slotsToBids[bid.impid];
    if (!bidRequest) {
      continue;
    }

    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: parseFloat(bid.price),
      width: bid.w,
      height: bid.h,
      creativeId: bid.crid,
      currency: 'USD',
      netRevenue: true,
      ttl: 350
    };

    if (typeof baseBidResponse === 'function') {
      Object.assign(bidResponse, baseBidResponse(bid, bidRequest));
    }

    if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
      if (typeof videoBidResponse === 'function') {
        Object.assign(bidResponse, videoBidResponse(bid, bidRequest));
      }
    } else {
      if (typeof bannerBidResponse === 'function') {
        Object.assign(bidResponse, bannerBidResponse(bid, bidRequest));
      }
    }

    bids.push(bidResponse);
  }

  return bids;
}

export function frameBanner(adUnit) {
  // adUnit.sizes is scheduled to be deprecated, continue its support but prefer adUnit.mediaTypes.banner
  let sizeList = adUnit.sizes;
  if (adUnit.mediaTypes && adUnit.mediaTypes.banner) {
    sizeList = adUnit.mediaTypes.banner.sizes;
  }

  const sizeStringList = parseSizesInput(sizeList);
  const format = [];
  sizeStringList.forEach(function (size) {
    if (size) {
      const dimensionList = getValidSizeSet(size.split('x'));
      if (dimensionList) {
        format.push({
          w: dimensionList[0],
          h: dimensionList[1],
        });
      }
    }
  });

  return format.length ? { format } : false;
}

export function frameVideo(bid, defaultVideoConfig) {
  let size = [];
  if (deepAccess(bid, 'mediaTypes.video.playerSize')) {
    let dimensionSet = bid.mediaTypes.video.playerSize;
    if (isArray(bid.mediaTypes.video.playerSize[0])) {
      dimensionSet = bid.mediaTypes.video.playerSize[0];
    }
    const validSize = getValidSizeSet(dimensionSet)
    if (validSize) {
      size = validSize;
    }
  }
  return {
    mimes: deepAccess(bid, 'mediaTypes.video.mimes') || defaultVideoConfig.SUPPORTED_VIDEO_MIMES,
    protocols: deepAccess(bid, 'mediaTypes.video.protocols') || defaultVideoConfig.SUPPORTED_VIDEO_PROTOCOLS,
    w: size[0],
    h: size[1],
    startdelay: deepAccess(bid, 'mediaTypes.video.startdelay') || 0,
    skip: deepAccess(bid, 'mediaTypes.video.skip') || 0,
    playbackmethod: deepAccess(bid, 'mediaTypes.video.playbackmethod') || defaultVideoConfig.SUPPORTED_VIDEO_PLAYBACK_METHODS,
    delivery: deepAccess(bid, 'mediaTypes.video.delivery') || defaultVideoConfig.SUPPORTED_VIDEO_DELIVERY,
    api: deepAccess(bid, 'mediaTypes.video.api') || defaultVideoConfig.SUPPORTED_VIDEO_API,
  }
}

function getValidSizeSet(dimensionList) {
  const w = parseInt(dimensionList[0]);
  const h = parseInt(dimensionList[1]);
  if (!Number.isNaN(w) && !Number.isNaN(h)) {
    return [w, h];
  }
  return false;
}
