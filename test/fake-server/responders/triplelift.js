const makeResponder = require('../makeResponder.js');
const _ = require('lodash');

/**
 * Two things in a Triplelift request cannot be pinned by a stored fixture:
 *
 *  - `tid`, the transaction ids, anywhere in the body;
 *  - `imp[].id`. The adapter builds its request with the ortb converter, whose default
 *    imp processor sets `imp.id` to the Prebid `bidId` - a fresh uuid per auction.
 *    (Before that migration the adapter numbered imps by their index in the array,
 *    which is why this fixture used to be able to record them as 0 and 1.)
 *
 * Both are stripped before the incoming request is compared with `request.json`.
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
    return normalized;
  });
};

module.exports = makeResponder(
  'triplelift',
  (actualRequest, mockRequest) => _.isEqual(normalizeImps(actualRequest), normalizeImps(mockRequest)),
  /**
   * `interpretResponse` maps each returned bid back to its bid request by matching
   * `bid.imp_id` against `bidRequest.bidId`.
   */
  (actualRequest, mockResponse) => {
    const imps = actualRequest.imp || [];

    (mockResponse.bids || []).forEach(bid => {
      const imp = imps[Number(bid.imp_id)];
      if (imp) {
        bid.imp_id = imp.id;
      }
    });

    return mockResponse;
  }
);
