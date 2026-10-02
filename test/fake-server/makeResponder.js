/* eslint no-console: 0 */
const path = require('path');
const generateFixtures = require('./fixtures/index.js');
const _ = require('lodash');

function makeResponder(fixtureGroup, matchRequests = (actualRequest, mockRequest) => _.isEqual(actualRequest, mockRequest), makeResponse = (actualRequest, mockResponse) => mockResponse) {
  const fixturesPath = path.join(__dirname, 'fixtures', fixtureGroup);
  const reqResMap = generateFixtures(fixturesPath);
  const requestResponsePairs = Object.keys(reqResMap).map(testName => reqResMap[testName]);

  /**
   * Matches 'req.body' with the responseBody pair
   * @param {object} requestBody - `req.body` of incoming request
   * @returns {object} responseBody
   */
  const matchResponse = function (requestBody) {
    const match = requestResponsePairs.filter(
      reqRes => reqRes.request.httpRequest &&
        matchRequests(_.cloneDeep(requestBody), _.cloneDeep(reqRes.request.httpRequest.body))
    );

    try {
      if (match.length === 0) {
        throw new Error('No mock response found');
      } else if (match.length > 1) {
        throw new Error('More than one mock response found');
      }
    } catch (e) {
      console.error(e);
      console.error('Request:', JSON.stringify(requestBody, null, 2));
      throw e;
    }

    return makeResponse(requestBody, _.cloneDeep(match[0].response.httpResponse.body));
  };

  return function (req, res, next) {
    const request = JSON.parse(req.body);

    const response = matchResponse(request);

    res.type('json');
    res.write(JSON.stringify(response));

    next();
  };
}

module.exports = makeResponder;
