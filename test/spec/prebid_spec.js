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

});
