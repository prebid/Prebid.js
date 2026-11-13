import { createTrackPixelHtml, getWindowSelf, getWindowTop, isArray, isFn, isPlainObject } from '../../src/utils.js';

export function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidFloor ? bid.params.bidFloor : null;
  }

  const floor = bid.getFloor({
    currency: 'USD', mediaType: '*', size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

export function isIframe() {
  try {
    return getWindowSelf() !== getWindowTop();
  } catch (e) {
    return true;
  }
}

export function getProcessedSizes(sizes = []) {
  const bidSizes = ((isArray(sizes) && isArray(sizes[0])) ? sizes : [sizes]).filter(size => isArray(size));
  return bidSizes.map(size => ({ w: parseInt(size[0], 10), h: parseInt(size[1], 10) }));
}

export function getDeviceType(ua = navigator.userAgent, sua) {
  if (sua?.mobile || (/(ios|ipod|ipad|iphone|android)/i).test(ua)) {
    return 1;
  }

  if ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(ua)) {
    return 3;
  }

  return 2;
}

export function getAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += createTrackPixelHtml(bid.nurl);
  }
  return adm;
}
