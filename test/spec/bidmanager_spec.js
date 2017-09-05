import useSandbox from 'test/mocks/sandbox';
import * as utils from 'src/utils';
import * as bidmanager from 'src/bidmanager';
import * as bidfactory from 'src/bidfactory';
import * as fixtures from 'test/fixtures/fixtures';
import * as assert from 'assert';

describe('replaceTokenInString', function () {
  it('should replace all given tokens in a String', function () {
    var tokensToReplace = {
      'foo': 'bar',
      'zap': 'quux'
    };

    var output = utils.replaceTokenInString('hello %FOO%, I am %ZAP%', tokensToReplace, '%');
    assert.equal(output, 'hello bar, I am quux');
  });

  it('should ignore tokens it does not see', function () {
    var output = utils.replaceTokenInString('hello %FOO%', {}, '%');

    assert.equal(output, 'hello %FOO%');
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
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbMg,
        'hb_size': size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for all bidders', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbHg,
        'hb_size': size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbHg,
        'hb_size': size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder - not matched', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        nonExistentBidder: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbMg,
        'hb_size': size
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom bidCpmAdjustment for one bidder and inherit standard', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
        },
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              }
            }
          ]

        }
      };

      var expected = { 'hb_bidder': bidderCode, 'hb_adid': adId, 'hb_pb': 10.0 };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom bidCpmAdjustment AND custom configuration for one bidder and inherit standard settings', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 15.00;
              }
            }
          ]
        },
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              },
            },
            {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': 15.0,
        'hb_size': '300x250'
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('alwaysUseBid=true, sendStandardTargeting=false, and inherit custom', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          alwaysUseBid: true,
          sendStandardTargeting: false,
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                return bidResponse.pbHg;
              }
            }
          ]
        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': 5.57,
        'hb_size': '300x250'
      };
      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
      assert.equal(bid.alwaysUseBid, true);
      assert.equal(bid.sendStandardTargeting, false);
    });

    it('suppressEmptyKeys=true', function() {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          suppressEmptyKeys: true,
          adserverTargeting: [
            {
              key: 'aKeyWithAValue',
              val: 42
            },
            {
              key: 'aKeyWithAnEmptyValue',
              val: ''
            }
          ]
        }
      };

      var expected = {
        'aKeyWithAValue': 42
      };

      var response = bidmanager.getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });
  });

  describe('adjustBids', () => {
    it('should adjust bids if greater than zero and pass copy of bid object', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      assert.equal(bid.cpm, 0.5);

      $$PREBID_GLOBAL$$.bidderSettings =
      {
        brealtime: {
          bidCpmAdjustment: function (bidCpm, bidObj) {
            assert.deepEqual(bidObj, bid);
            if (bidObj.adUnitCode === 'negative') {
              return bidCpm * -0.5;
            }
            if (bidObj.adUnitCode === 'zero') {
              return 0;
            }
            return bidCpm * 0.5;
          },
        },
        standard: {
          adserverTargeting: [
          ]
        }
      };

      // negative
      bid.adUnitCode = 'negative';
      bidmanager.adjustBids(bid)
      assert.equal(bid.cpm, 0.5);

      // positive
      bid.adUnitCode = 'normal';
      bidmanager.adjustBids(bid)
      assert.equal(bid.cpm, 0.25);

      // zero
      bid.adUnitCode = 'zero';
      bidmanager.adjustBids(bid)
      assert.equal(bid.cpm, 0);

      // reset bidderSettings so we don't mess up further tests
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });
  });

  describe('addBidResponse', () => {
    before(() => {
      $$PREBID_GLOBAL$$.adUnits = fixtures.getAdUnits();
    });

    const getSandbox = useSandbox()

    it('should return proper price bucket increments for dense mode', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      // 0 - 3 dollars
      bid.cpm = '1.99';
      let expectedIncrement = '1.99';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      // pop this bid because another test relies on global $$PREBID_GLOBAL$$._bidsReceived
      let registeredBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '0 - 3 hits at to 1 cent increment');

      // 3 - 8 dollars
      bid.cpm = '4.39';
      expectedIncrement = '4.35';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '3 - 8 hits at 5 cent increment');

      // 8 - 20 dollars
      bid.cpm = '19.99';
      expectedIncrement = '19.50';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '8 - 20 hits at 50 cent increment');

      // 20+ dollars
      bid.cpm = '73.07';
      expectedIncrement = '20.00';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      registeredBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(registeredBid.pbDg, expectedIncrement, '20+ caps at 20.00');
    });

    it('should place dealIds in adserver targeting', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[0]
      );

      bid.dealId = 'test deal';
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      const addedBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(addedBid.adserverTargeting[`hb_deal`], bid.dealId, 'dealId placed in adserverTargeting');
    });

    it('should not alter bid adID', () => {
      const bid1 = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[1]
      );
      const bid2 = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[3]
      );

      bidmanager.addBidResponse(bid1.adUnitCode, Object.assign({}, bid1));
      bidmanager.addBidResponse(bid2.adUnitCode, Object.assign({}, bid2));

      const addedBid2 = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(addedBid2.adId, bid2.adId);
      const addedBid1 = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(addedBid1.adId, bid1.adId);
    });

    it('should not add banner bids that have no width or height', () => {
      const bid = Object.assign({},
        bidfactory.createBid(1),
        {
          width: undefined,
          height: undefined
        }
      );

      bidmanager.addBidResponse('adUnitCode', bid);

      const addedBid = $$PREBID_GLOBAL$$._bidsReceived[$$PREBID_GLOBAL$$._bidsReceived.length - 1];

      assert.notEqual(bid.adId, addedBid.adId);
    });

    it('should add banner bids that have no width or height but single adunit size', () => {
      getSandbox().stub(utils, 'getBidderRequest').callsFake(() => {
        return {
          bids: [{
            sizes: [[300, 250]],
          }]
        }
      });

      const bid = Object.assign({},
        bidfactory.createBid(1),
        {
          width: undefined,
          height: undefined
        }
      );

      bidmanager.addBidResponse('adUnitCode', bid);

      const addedBid = $$PREBID_GLOBAL$$._bidsReceived[$$PREBID_GLOBAL$$._bidsReceived.length - 1];

      assert.equal(bid.adId, addedBid.adId);
      assert.equal(addedBid.width, 300);
      assert.equal(addedBid.height, 250);
    });

    it('should not add native bids that do not have required assets', () => {
      getSandbox().stub(utils, 'getBidRequest').callsFake(() => {
        return {
          bidder: 'appnexusAst',
          nativeParams: {
            title: {'required': true},
          },
          mediaType: 'native',
        }
      });

      const bid = Object.assign({},
        bidfactory.createBid(1),
        {
          bidderCode: 'appnexusAst',
          mediaType: 'native',
          native: {title: undefined}
        }
      );

      const bidsRecCount = $$PREBID_GLOBAL$$._bidsReceived.length;
      bidmanager.addBidResponse('adUnit-code', bid);
      assert.equal(bidsRecCount, $$PREBID_GLOBAL$$._bidsReceived.length);
    });

    it('should add native bids that do have required assets', () => {
      getSandbox().stub(utils, 'getBidRequest').callsFake(() => {
        return {
          bidder: 'appnexusAst',
          nativeParams: {
            title: {'required': true},
          },
          mediaType: 'native',
        }
      });

      const bid = Object.assign({},
        bidfactory.createBid(1),
        {
          bidderCode: 'appnexusAst',
          mediaType: 'native',
          native: {title: 'foo'}
        }
      );

      const bidsRecCount = $$PREBID_GLOBAL$$._bidsReceived.length;
      bidmanager.addBidResponse('adUnit-code', bid);
      assert.equal(bidsRecCount + 1, $$PREBID_GLOBAL$$._bidsReceived.length);
    });

    it('installs publisher-defined renderers on bids', () => {
      getSandbox().stub(utils, 'getBidderRequest').callsFake(() => {
        return {
          bids: [{
            renderer: {
              url: 'renderer.js',
              render: (bid) => bid
            }
          }]
        };
      });

      const bid = Object.assign({}, bidfactory.createBid(1), {
        bidderCode: 'appnexusAst',
        mediaType: 'video-outstream',
      });

      bidmanager.addBidResponse('adUnit-code', bid);
      const addedBid = $$PREBID_GLOBAL$$._bidsReceived.pop();
      assert.equal(addedBid.renderer.url, 'renderer.js');
    });
  });
});
