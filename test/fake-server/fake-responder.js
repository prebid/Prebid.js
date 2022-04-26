/* eslint no-console: 0 */
const deepEqual = require('deep-equal');
const generateFixtures = require('./fixtures');
const path = require('path');

// path to the fixture directory
const fixturesPath = path.join(__dirname, 'fixtures');

/**
 * Matches 'req.body' with the responseBody pair
 * @param {object} requestBody - `req.body` of incoming request hitting middleware 'fakeResponder'.
 * @returns {objct} responseBody
 */
const matchResponse = function (requestBody) {
  let actualUuids = [];
  let reqResMap = generateFixtures(fixturesPath);
  const requestResponsePairs = Object.keys(reqResMap).map(testName => reqResMap[testName]);

  // delete 'uuid' property
  requestBody.tags.forEach(body => {
    // store the 'uuid' before deleting it.
    actualUuids.push(body.uuid);

    // delete the 'uuid'
    delete body.uuid;
  });

  ['sdk', 'referrer_detection', 'gdpr_consent'].forEach(prop => {
    if (requestBody && requestBody[prop]) {
      delete requestBody[prop];
    }
  });

  // delete 'uuid' from `expected request body`
  requestResponsePairs
    .forEach(reqRes => { reqRes.request.httpRequest && reqRes.request.httpRequest.body.tags.forEach(body => body.uuid && delete body.uuid) });

  const match = requestResponsePairs.filter(reqRes => reqRes.request.httpRequest && deepEqual(reqRes.request.httpRequest.body.tags, requestBody.tags));

  try {
    if (match.length === 0) {
      throw new Error('No mock response found');
    } else if (match.length > 1) {
      throw new Error('More than one mock response found')
    }
  } catch (e) {
    console.error(e);
    console.error('Tags:', JSON.stringify(requestBody.tags, null, 2));
    throw e;
  }

  // match the 'actual' requestBody with the 'expected' requestBody and find the 'responseBody'
  const responseBody = match[0].response.httpResponse.body;

  // ENABLE THE FOLLOWING CODE FOR TROUBLE-SHOOTING FAKED REQUESTS; COMMENT AGAIN WHEN DONE
  // console.log('value found for responseBody:', responseBody);
  // responseBody.tags.forEach((tag, index) => {
  //   console.log('value found for responseBody.tag[', index, ']:ads', tag.ads);
  // });

  // copy the actual uuids to the responseBody
  // TODO:: what if responseBody is 'undefined'
  responseBody.tags.forEach(body => {
    body.uuid = actualUuids.shift();
  });

  return responseBody;
}

/**
 * An ExpressJs middleware function that checks the incoming Request Body
 * and returns the corresponding Fake Response Body pertaining to that Request.
 */

const fakeResponder = function (req, res, next) {
  const request = JSON.parse(req.body);

  const response = matchResponse(request);

  res.type('json');
  res.write(JSON.stringify(response));

  next();
}

module.exports = fakeResponder;
