const makeResponder = require('../makeResponder.js');
const _ = require('lodash');

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

module.exports = makeResponder(
  'triplelift',
  (actualRequest, mockRequest) => _.isEqual(removeTid(actualRequest).imp, removeTid(mockRequest).imp)
);
