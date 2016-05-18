var assert = require("assert");

/* use this method to test individual files instead of the whole prebid.js project */

//TODO refactor to use the spec files
var utils = require('../../src/utils');
var bidmanager = require('../../src/bidmanager');
var bidfactory = require('../../src/bidfactory');
var fixtures = require('../fixtures/fixtures');

describe('replaceTokenInString', function () {

  it('should replace all given tokens in a String', function () {
    var tokensToReplace = {
      'foo': 'bar',
      'zap': 'quux'
    };

    var output = utils.replaceTokenInString("hello %FOO%, I am %ZAP%", tokensToReplace, "%");
    assert.equal(output, "hello bar, I am quux");
  });

  it('should ignore tokens it does not see', function () {
    var output = utils.replaceTokenInString("hello %FOO%", {}, "%");

    assert.equal(output, "hello %FOO%");
  });
});

describe('bidmanager.js', function () {

  describe('getKeyValueTargetingPairs', function () {
    var bid = {};
    var bidPriceCpm = 5.578;
    var bidPbLg = 5.50;
    var bidPbMg = 5.50;
    var bidPbHg = 5.57;
    var bidPbAg = 5.50;

    var adUnitCode = '12345';
    var bidderCode = 'appnexus';
    var size = '300x250';
    var adId = '1adId';

    before(function () {
      bid.cpm = bidPriceCpm;
      bid.pbLg = bidPbLg;
      bid.pbMg = bidPbMg;
      bid.pbHg = bidPbHg;
      bid.pbAg = bidPbAg;

      bid.height = 300;
      bid.width = 250;
      bid.adUnitCode = adUnitCode;
      bid.getSize = function () {
        return this.height + 'x' + this.width;
      };
      bid.bidderCode = bidderCode;
      bid.adId = adId;

    });

    it('No bidder level configuration defined - default', function () {
      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": bidPbMg,
        "hb_size": size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('Custom configuration for all bidders', function () {
      pbjs.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return bidResponse.pbHg;
              }
            }, {
              key: "hb_size",
              val: function (bidResponse) {
                return bidResponse.size;

              }
            }
          ]

        }
      };

      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": bidPbHg,
        "hb_size": size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('Custom configuration for one bidder', function () {
      pbjs.bidderSettings =
      {
        appnexus: {
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return bidResponse.pbHg;
              }
            }, {
              key: "hb_size",
              val: function (bidResponse) {
                return bidResponse.size;

              }
            }
          ]

        }
      };

      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": bidPbHg,
        "hb_size": size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('Custom configuration for one bidder - not matched', function () {
      pbjs.bidderSettings =
      {
        nonExistentBidder: {
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return bidResponse.pbHg;
              }
            }, {
              key: "hb_size",
              val: function (bidResponse) {
                return bidResponse.size;

              }
            }
          ]

        }
      };

      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": bidPbMg,
        "hb_size": size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('Custom bidCpmAdjustment for one bidder and inherit standard', function () {
      pbjs.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
        },
        standard: {
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return 10.00;
              }
            }
          ]

        }
      };

      var expected = { "hb_bidder": bidderCode, "hb_adid": adId, "hb_pb": 10.0 };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('Custom bidCpmAdjustment AND custom configuration for one bidder and inherit standard settings', function () {
      pbjs.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return 15.00;
              }
            }
          ]
        },
        standard: {
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                //change default here
                return 10.00;
              },
            },
            {
              key: "hb_size",
              val: function (bidResponse) {
                return bidResponse.size;

              }
            }
          ]

        }
      };

      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": 15.0,
        "hb_size": "300x250"
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

    it('alwaysUseBid=true and inherit custom', function () {
      pbjs.bidderSettings =
      {
        appnexus: {
          alwaysUseBid: true,
          adserverTargeting: [
            {
              key: "hb_bidder",
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: "hb_adid",
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: "hb_pb",
              val: function (bidResponse) {
                return bidResponse.pbHg;
              }
            }
          ]
        }
      };

      var expected = {
        "hb_bidder": bidderCode,
        "hb_adid": adId,
        "hb_pb": 5.57,
        "hb_size": "300x250"
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);

    });

  });

  describe('addBidResponse', () => {
    before(() => {
      pbjs.adUnits = fixtures.getAdUnits();
    });

    it('should return proper price bucket increments for dense mode', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      // 0 - 3 dollars
      bid.cpm = '1.99';
      let expectedIncrement = '1.99';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      // pop this bid because another test relies on global pbjs._bidsReceived
      let registeredBid = pbjs._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '0 - 3 hits at to 1 cent increment');

      // 3 - 8 dollars
      bid.cpm = '4.39';
      expectedIncrement = '4.35';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = pbjs._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '3 - 8 hits at 5 cent increment');

      // 8 - 20 dollars
      bid.cpm = '19.99';
      expectedIncrement = '19.50';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = pbjs._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '8 - 20 hits at 50 cent increment');

      // 20+ dollars
      bid.cpm = '73.07';
      expectedIncrement = '20.00';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = pbjs._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '20+ caps at 20.00');
    });
  });
});
