import { deepAccess, isArray, parseSizesInput } from '../../src/utils.js';

export function getIsSecureBidRequest(bidderRequest) {
  if (bidderRequest?.refererInfo?.stack?.length) {
    const el = document.createElement('a');
    el.href = bidderRequest.refererInfo.stack[0];
    return (el.protocol === 'https:') ? 1 : 0;
  }

  return 0;
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
  // clever check for NaN
  if (!(w !== w || h !== h)) { // eslint-disable-line
    return [w, h];
  }
  return false;
}
