import {
  greenbidsAnalyticsAdapter, parseBidderCode,
  ANALYTICS_VERSION, BIDDER_STATUS
} from 'modules/greenbidsAnalyticsAdapter.js';

import {expect} from 'chai';
import sinon from 'sinon';

const events = require('src/events');
const constants = require('src/constants.json');

const pbuid = 'pbuid-AA778D8A796AEA7A0843E2BBEB677766';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';

describe('Greenbids Prebid AnalyticsAdapter Testing', function () {
  describe('event tracking and message cache manager', function () {
    beforeEach(function () {
      const configOptions = {
        pbuid: pbuid,
        sampling: 0,
      };

      greenbidsAnalyticsAdapter.enableAnalytics({
        provider: 'greenbidsAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      greenbidsAnalyticsAdapter.disableAnalytics();
    });

    describe('#parseBidderCode()', function() {
      it('should get lower case bidder code from bidderCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'greenbids',
            bidderCode: 'GREENBIDS',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('greenbids');
      });
      it('should get lower case bidder code from bidder field value as bidderCode field is missing', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'greenbids',
            bidderCode: '',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('greenbids');
      });
    });

    describe('#getCachedAuction()', function() {
      const existing = {timeoutBids: [{}]};
      greenbidsAnalyticsAdapter.cachedAuctions['test_auction_id'] = existing;

      it('should get the existing cached object if it exists', function() {
        const result = greenbidsAnalyticsAdapter.getCachedAuction('test_auction_id');

        expect(result).to.equal(existing);
      });

      it('should create a new object and store it in the cache on cache miss', function() {
        const result = greenbidsAnalyticsAdapter.getCachedAuction('no_such_id');

        expect(result).to.deep.include({
          timeoutBids: [],
        });
      });
    });

    describe('when formatting JSON payload sent to backend', function() {
      const receivedBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit-1',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          requestId: 'a1b2c3d4',
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'USD',
          ad: '<html>fake ad1</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit-1',
          bidder: 'greenbidsx',
          bidderCode: 'greenbidsx',
          requestId: 'b2c3d4e5',
          timeToRespond: 100,
          cpm: 0.08,
          currency: 'USD',
          ad: '<html>fake ad2</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit-2',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'USD',
          ad: '<html>fake ad3</html>'
        },
      ];
      const noBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit-2',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          bidId: 'a1b2c3d4',
        }
      ];
      const timeoutBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit-2',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          bidId: '00123d4c',
        }
      ];
      function assertHavingRequiredMessageFields(message) {
        expect(message).to.include({
          version: ANALYTICS_VERSION,
          auctionId: auctionId,
          pbuid: pbuid,
          referrer: window.location.href,
          sampling: 0,
          prebid: '$prebid.version$',
        });
      }

      describe('#createCommonMessage', function() {
        it('should correctly serialize some common fields', function() {
          const message = greenbidsAnalyticsAdapter.createCommonMessage(auctionId);

          assertHavingRequiredMessageFields(message);
        });
      });

      describe('#serializeBidResponse', function() {
        it('should handle BID properly with timeout false and hasBid true', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID);

          expect(result).to.include({
            bidder: 'greenbids',
            isTimeout: false,
            hasBid: true,
          });
        });

        it('should handle NO_BID properly and set hasBid to false', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.NO_BID);

          expect(result).to.include({
            bidder: 'greenbids',
            isTimeout: false,
            hasBid: false,
          });
        });

        it('should handle TIMEOUT properly and set isTimeout to true', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.TIMEOUT);

          expect(result).to.include({
            bidder: 'greenbids',
            isTimeout: true,
            hasBid: false,
          });
        });
      });

      describe('#addBidResponseToMessage()', function() {
        it('should add a bid response in the output message, grouped by adunit_id and bidder', function() {
          const message = {
            adUnits: [
              {
                code: 'adunit-2',
                bidders: []
              }
            ]
          };
          greenbidsAnalyticsAdapter.addBidResponseToMessage(message, noBids[0], BIDDER_STATUS.NO_BID);

          expect(message.adUnits[0]).to.deep.include({
            code: 'adunit-2',
            bidders: [
              {
                bidder: 'greenbids',
                isTimeout: false,
                hasBid: false,
              }
            ]
          });
        });
      });

      describe('#createBidMessage()', function() {
        it('should format auction message sent to the backend', function() {
          const args = {
            auctionId: auctionId,
            timestamp: 1234567890,
            timeout: 3000,
            auctionEnd: 1234567990,
            adUnitCodes: ['adunit-1', 'adunit-2'],
            adUnits: [
              {
                code: 'adunit-1',
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250], [300, 600]]
                  },
                }
              },
              {
                code: 'adunit-2',
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250], [300, 600]]
                  },
                  video: {
                    context: 'instream',
                    mimes: ['video/mp4'],
                    playerSize: [[640, 480]],
                    skip: 1,
                    protocols: [1, 2, 3, 4]
                  },
                },
                ortb2Imp: {
                  ext: {
                    data: {
                      adunitDFP: 'adunitcustomPathExtension'
                    }
                  }
                }
              },
            ],
            bidsReceived: receivedBids,
            noBids: noBids
          };

          const result = greenbidsAnalyticsAdapter.createBidMessage(args, timeoutBids);

          assertHavingRequiredMessageFields(result);
          expect(result).to.deep.include({
            auctionElapsed: 100,
            adUnits: [
              {
                code: 'adunit-1',
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250], [300, 600]]
                  }
                },
                ortb2Imp: {},
                bidders: [
                  {
                    bidder: 'greenbids',
                    isTimeout: false,
                    hasBid: true
                  },
                  {
                    bidder: 'greenbidsx',
                    isTimeout: false,
                    hasBid: true
                  }
                ]
              },
              {
                code: 'adunit-2',
                ortb2Imp: {
                  ext: {
                    data: {
                      adunitDFP: 'adunitcustomPathExtension'
                    }
                  }
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250], [300, 600]]
                  },
                  video: {
                    context: 'instream',
                    mimes: ['video/mp4'],
                    playerSize: [[640, 480]],
                    skip: 1,
                    protocols: [1, 2, 3, 4]
                  }
                },
                bidders: [
                  {
                    bidder: 'greenbids',
                    isTimeout: true,
                    hasBid: true
                  }
                ]
              }
            ],
          });
        });
      });

      describe('#handleBidTimeout()', function() {
        it('should cached the timeout bid as BID_TIMEOUT event was triggered', function() {
          greenbidsAnalyticsAdapter.cachedAuctions['test_timeout_auction_id'] = { 'timeoutBids': [] };
          const args = [{
            auctionId: 'test_timeout_auction_id',
            timestamp: 1234567890,
            timeout: 3000,
            auctionEnd: 1234567990,
            bidsReceived: receivedBids,
            noBids: noBids
          }];

          greenbidsAnalyticsAdapter.handleBidTimeout(args);
          const result = greenbidsAnalyticsAdapter.getCachedAuction('test_timeout_auction_id');
          expect(result).to.deep.include({
            timeoutBids: [{
              auctionId: 'test_timeout_auction_id',
              timestamp: 1234567890,
              timeout: 3000,
              auctionEnd: 1234567990,
              bidsReceived: receivedBids,
              noBids: noBids
            }]
          });
        });
      });
    });
  });

  describe('greenbids Analytics Adapter track handler ', function () {
    const configOptions = {
      pbuid: pbuid,
      sampling: 1,
    };

    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      greenbidsAnalyticsAdapter.enableAnalytics({
        provider: 'greenbidsAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      greenbidsAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should call handleBidTimeout as BID_TIMEOUT trigger event', function() {
      sinon.spy(greenbidsAnalyticsAdapter, 'handleBidTimeout');
      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      sinon.assert.callCount(greenbidsAnalyticsAdapter.handleBidTimeout, 1);
      greenbidsAnalyticsAdapter.handleBidTimeout.restore();
    });

    it('should call handleAuctionEnd as AUCTION_END trigger event', function() {
      sinon.spy(greenbidsAnalyticsAdapter, 'handleAuctionEnd');
      events.emit(constants.EVENTS.AUCTION_END, {});
      sinon.assert.callCount(greenbidsAnalyticsAdapter.handleAuctionEnd, 1);
      greenbidsAnalyticsAdapter.handleAuctionEnd.restore();
    });
  });

  describe('enableAnalytics and config parser', function () {
    const configOptions = {
      pbuid: pbuid,
      sampling: 0,
    };

    beforeEach(function () {
      greenbidsAnalyticsAdapter.enableAnalytics({
        provider: 'greenbidsAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      greenbidsAnalyticsAdapter.disableAnalytics();
    });

    it('should parse config correctly with optional values', function () {
      expect(greenbidsAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(greenbidsAnalyticsAdapter.getAnalyticsOptions().pbuid).to.equal(configOptions.pbuid);
    });

    it('should not enable Analytics when pbuid is missing', function () {
      const configOptions = {
        options: {
        }
      };
      const validConfig = greenbidsAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });
  });
});
