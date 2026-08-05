const makeResponder = require('../makeResponder.js');
const _ = require('lodash');

function normalizeRequest(requestBody) {
  requestBody.tags.forEach(body => {
    delete body.uuid;
    delete body.tid;
  });
  ['sdk', 'referrer_detection', 'gdpr_consent'].forEach(prop => {
    if (requestBody && requestBody[prop]) {
      delete requestBody[prop];
    }
  });
  return requestBody;
}

module.exports = makeResponder(
  'appnexus',
  (actualRequest, mockRequest) => _.isEqual(normalizeRequest(actualRequest).tags, normalizeRequest(mockRequest).tags),
  (actualRequest, mockResponse) => {
    mockResponse.tags.forEach((body, i) => {
      body.uuid = actualRequest.tags[i].uuid;
    });
    return mockResponse;
  }
);
