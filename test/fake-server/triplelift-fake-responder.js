/* eslint no-console: 0 */
const deepEqual = require('deep-equal');
const generateFixtures = require('./fixtures/index.js');
const path = require('path');

// path to the fixture directory
const fixturesPath = path.join(__dirname, 'fixtures');

/**
 * Matches 'req.body' with the responseBody pair
 * @param {object} requestBody - `req.body` of incoming request hitting middleware 'fakeResponder'.
 * @returns {object} responseBody
 */
const matchResponse = function (requestBody) {
  console.log('requestBody', JSON.stringify(requestBody));

  requestBody = removeTid(requestBody);

  const reqResMap = generateFixtures(fixturesPath);
  const requestResponsePairs = Object.keys(reqResMap).map(testName => reqResMap[testName]);

  const match = requestResponsePairs.filter(reqRes => reqRes.request.httpRequest && deepEqual(reqRes.request.httpRequest.body, requestBody));

  try {
    if (match.length === 0) {
      throw new Error('No mock response found');
    } else if (match.length > 1) {
      throw new Error('More than one mock response found');
    }
  } catch (e) {
    console.error(e);
    console.error('Tags:', JSON.stringify(requestBody.tags, null, 2));
    throw e;
  }

  // match the 'actual' requestBody with the 'expected' requestBody and find the 'responseBody'
  const responseBody = match[0].response.httpResponse.body;

  return responseBody;
};

const removeTid = function(obj) {
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
}

/**
 * An ExpressJs middleware function that checks the incoming Request Body
 * and returns the corresponding Fake Response Body pertaining to that Request.
 */

const tripleLiftFakeResponder = function (req, res, next) {
  const request = JSON.parse(req.body);

  const response = matchResponse(request);

  res.type('json');
  res.write(JSON.stringify(response));

  next();
};

module.exports = tripleLiftFakeResponder;
