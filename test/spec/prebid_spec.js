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
  
  describe('getAdserverTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should return correct targeting with default bidder settings', () => {
      var targeting = prebid.getAdserverTargeting();
      var expected = {
        "/19968336/header-bid-tag-0": {
          "foobar": "300x250",
          "hb_size": "300x250",
          "hb_pb": "10.00",
          "hb_adid": "233bcbee889d46d",
          "hb_bidder": "appnexus"
        },
        "/19968336/header-bid-tag1": {
          "foobar": "728x90",
          "hb_size": "728x90",
          "hb_pb": "10.00",
          "hb_adid": "24bd938435ec3fc",
          "hb_bidder": "appnexus"
        }
      };
      assert.deepEqual(targeting, expected);
    });

    it('should return correct targeting with bid landscape targeting on', () => {

      // Enable bid landscape targeting.
      prebid.enableSendAllBids();

      var targeting = prebid.getAdserverTargeting();
      var expected = fixtures.getAdServerTargeting();
      assert.deepEqual(targeting, expected);

      // Disable bid landscape targeting.
      prebid.disableSendAllBids();

    });

  });

});
