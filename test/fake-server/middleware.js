/* eslint no-console: 0 */

const bannerFixtures = require('./fixtures/banner');

/**
 * An ExpressJs middleware function that checks the incoming Request Body
 * and returns the corresponding Fake Response Body pertaining to that Request.
 */

const fakeResponder = function (req, res, next) {
  const request = req.body;
  const response = bannerFixtures.getResponse().httpResponse.body;

  // replace response uuid with request uuid
  const incomingRequestAdUnit_1_uuid = JSON.parse(request).tags[0].uuid;
  const incomingRequestAdUnit_2_uuid = JSON.parse(request).tags[1].uuid;

  response.tags[0].uuid = incomingRequestAdUnit_1_uuid;
  response.tags[1].uuid = incomingRequestAdUnit_2_uuid;

  res.type('json');
  res.write(JSON.stringify(response));

  next();
}

module.exports = fakeResponder;
