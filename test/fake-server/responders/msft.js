const makeResponder = require('../makeResponder.js');
const _ = require('lodash');

/**
 * The msft adapter posts an OpenRTB request built with the ortb converter. Only `imp` is
 * compared with the fixture: the rest of the body carries values that depend on the page
 * and the browser (site, device, referrer detection, `ext.appnexus.sdk.version`...).
 *
 * Within `imp`, three things cannot be pinned by a stored fixture:
 *
 *  - `tid`, the transaction ids (`imp.ext.tid`);
 *  - `imp.id`, which the converter sets to the Prebid `bidId` - a fresh uuid per auction;
 *  - `imp.banner.topframe`, which depends on whether the driver reports the page as framed
 *    (the same page has been seen to send both 0 and 1 under webdriver).
 *
 * All are stripped before the incoming request is compared with `request.json`.
 */
const removeTid = function (obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeTid);
  }

  if (obj !== null && typeof obj === 'object') {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'tid') {
        result[key] = removeTid(value);
      }
    }

    return result;
  }

  return obj;
};

const normalizeImps = function (request) {
  return (request.imp || []).map(imp => {
    const normalized = removeTid(imp);
    delete normalized.id;
    if (normalized.banner) {
      delete normalized.banner.topframe;
    }
    return normalized;
  });
};

module.exports = makeResponder(
  'msft',
  (actualRequest, mockRequest) => _.isEqual(normalizeImps(actualRequest), normalizeImps(mockRequest)),
  /**
   * The converter maps each returned bid back to its bid request by matching `bid.impid`
   * against `imp.id`. Fixtures record `impid` as the index of the imp it answers, which is
   * replaced here with the id of that imp in the incoming request.
   */
  (actualRequest, mockResponse) => {
    const imps = actualRequest.imp || [];

    (mockResponse.seatbid || []).forEach(seatbid => {
      (seatbid.bid || []).forEach(bid => {
        const imp = imps[Number(bid.impid)];
        if (imp) {
          bid.impid = imp.id;
        }
      });
    });
    mockResponse.id = actualRequest.id;

    return mockResponse;
  }
);
