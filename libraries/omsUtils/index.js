import {getWindowSelf, getWindowTop, isFn, isPlainObject} from '../../src/utils.js';

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
