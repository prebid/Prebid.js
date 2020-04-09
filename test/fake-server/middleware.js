const bannerFixtures = require('./fixtures/banner');

/**
 * An ExpressJs middleware function that checks the incoming Request Body
 * and returns the corresponding Fake Response Body pertaining to that Request.
 */

const fakeResponder = function (req, res, next) {
  const request = req.body;
  const response = bannerFixtures.getResponse().httpResponse.body;

  // replace response uuid with request uuid
  const requestUUID = JSON.parse(request).tags[0].uuid

  // console.log('requestUUID', requestUUID);

  response.tags[0].uuid = requestUUID;

  res.type('json');
  res.write(JSON.stringify(response));

  next();
}

module.exports = fakeResponder;
