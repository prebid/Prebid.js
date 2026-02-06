import {isFn, isPlainObject} from '../../src/utils.js';

export function hasUserInfo(bid) {
  return !!(bid.params && bid.params.user);
}

export function hasAppDeviceInfo(bid) {
  return !!(bid.params && bid.params.app);
}

export function hasAppId(bid) {
  return !!(bid.params && bid.params.app && bid.params.app.id);
}

export function addUserId(eids, id, source, rti) {
  if (id) {
    if (rti) {
      eids.push({source, id, rti_partner: rti});
    } else {
      eids.push({source, id});
    }
  }
  return eids;
}

export function getBidFloor(bid, currency = 'USD') {
  if (!isFn(bid.getFloor)) {
    return bid.params && bid.params.reserve ? bid.params.reserve : null;
  }

  const floor = bid.getFloor({
    currency,
    mediaType: '*',
    size: '*'
  });

  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === currency) {
    return floor.floor;
  }

  return null;
}
