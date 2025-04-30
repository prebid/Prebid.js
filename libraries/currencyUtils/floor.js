import * as utils from '../../src/utils.js';

/**
 * get BidFloor
 * @param {*} bid
 * @returns
 */
export function getBidFloor(bid) {
  if (!utils.isFn(bid.getFloor)) {
    return utils.deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor?.floor;
  } catch (_) {
    return 0;
  }
}
