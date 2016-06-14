var assert = require("assert");

var utils = require('../../src/utils');
var bidmanager = require('../../src/bidmanager');
var bidfactory = require('../../src/bidfactory');
var fixtures = require('../fixtures/fixtures');
var prebid = require('../../src/prebid');


describe('prebid.js', function () {

  describe('getWinningBidTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should return correct winning bid targeting', () => {
      var targeting = prebid.getWinningBidTargeting();
      var expected = fixtures.getWinningBidTargeting();
      assert.deepEqual(targeting, expected);
    });

  });

  describe('getBidLandscapeTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should return correct bid landscape targeting', () => {
      var targeting = prebid.getBidLandscapeTargeting();
      var expected = fixtures.getBidLandscapeTargeting();
      assert.deepEqual(targeting, expected);
    });

  });

});
