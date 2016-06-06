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
  
  describe('getAlwaysUseBidTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should include the adserver targeting of bids with `alwaysUseBid=true`', () => {

      // Let's make sure we're getting the expected losing bid.
      assert.equal(pbjs._bidsReceived[0]['bidderCode'], 'triplelift');
      assert.equal(pbjs._bidsReceived[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      pbjs._bidsReceived[0]['alwaysUseBid'] = true;
      pbjs._bidsReceived[0]['adserverTargeting'] = {
        'always_use_me': 'abc',
      };

      var targeting = prebid.getAlwaysUseBidTargeting();
      var expected = [
        {
          "/19968336/header-bid-tag-0": [
            {
              "always_use_me": [
                "abc"
              ]
            }
          ]
        },
        {
          "/19968336/header-bid-tag-0": [
            {
              "foobar": [
                "300x250"
              ]
            }
          ]
        },
        {
          "/19968336/header-bid-tag1": [
            {
              "foobar": [
                "728x90"
              ]
            }
          ]
        }
      ]

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

    it("should include a losing bid's custom ad targeting key when the bid has `alwaysUseBid` set to `true`", () => {

      // Let's make sure we're getting the expected losing bid.
      assert.equal(pbjs._bidsReceived[0]['bidderCode'], 'triplelift');
      assert.equal(pbjs._bidsReceived[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      pbjs._bidsReceived[0]['alwaysUseBid'] = true;
      pbjs._bidsReceived[0]['adserverTargeting'] = {
        'always_use_me': 'abc',
      };

      var targeting = prebid.getAdserverTargeting();

      // Ensure targeting for both ad placements includes the custom key. 
      assert.equal(
        targeting['/19968336/header-bid-tag-0'].hasOwnProperty('always_use_me'),
        true
      );

      var expected = {
        "/19968336/header-bid-tag-0": {
          "foobar": "300x250",
          "hb_size": "300x250",
          "hb_pb": "10.00",
          "hb_adid": "233bcbee889d46d",
          "hb_bidder": "appnexus",
          "always_use_me": "abc"
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

  });

});
