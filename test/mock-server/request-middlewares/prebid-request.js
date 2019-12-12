/**
 * This middleware will be used to find matching request hitting the ut endpoint by prebid.
 * As of now it only uses the request payload to compare with httpRequest.body defined in expectations dir.
 * Matching headers or cookies can also be the use case.
 */

const glob = require('glob');
const path = require('path');
const deepEqual = require('deep-equal');

module.exports = function (req, res, next) {
  let reqBody;
  try {
    if (req.method === 'GET') {
      reqBody = JSON.parse(req.query.q);
    } else {
      reqBody = JSON.parse(req.body);
    }
  } catch (e) {
    // error
  }

  // prebid uses uuid to match request response pairs.
  // On each request new uuid is generated, so here i am grabbing the uuid from incoming request and adding it to matched response.
  let uuidObj = {};
  if (reqBody && reqBody.uuid) {
    uuidObj.response = reqBody.uuid;
    delete reqBody.uuid;
  }

  if (reqBody && reqBody.tags) {
    uuidObj.tags = reqBody.tags.map((tag) => {
      let uuid = tag.uuid;
      delete tag.uuid;
      return uuid;
    });
  }

  // values within these request props are dynamically generated and aren't
  // vital to check in these tests, so they are deleted rather than updating
  // the request-response pairs continuously
  ['sdk', 'referrer_detection'].forEach(prop => {
    if (reqBody && reqBody[prop]) {
      delete reqBody[prop];
    }
  });

  // Parse all the expectation to find response for this request
  glob.sync('./test/mock-server/expectations/**/*.js').some((file) => {
    file = require(path.resolve(file));
    let expectedReqBody = JSON.parse(JSON.stringify(file.getRequest().httpRequest.body));
    // respond to all requests
    // TODO send a 404 if resource not found
    res.set({
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': req.headers.origin
    });

    // As of now only body is compared. We can also add other request properties like headers, cookies if required
    if (deepEqual(reqBody, expectedReqBody)) {
      let response = file.getResponse().httpResponse.body;
      if (Object.keys(uuidObj).length > 0) {
        response.tags.forEach((tag, index) => {
          tag.uuid = uuidObj.tags[index];
        });
      }
      res.type('json');
      response = JSON.stringify(response);
      res.write(response);
      return true;
    }
  });

  next();
};
