import {
  greenbidsAnalyticsAdapter, parseBidderCode, parseAdUnitCode,
  ANALYTICS_VERSION, BIDDER_STATUS
} from 'modules/greenbidsAnalyticsAdapter.js';

import {expect} from 'chai';
import sinon from 'sinon';

const events = require('src/events');
const constants = require('src/constants.json');

const pbuid = 'pbuid-AA778D8A796AEA7A0843E2BBEB677766';
const adid = 'test-ad-83444226E44368D1E32E49EEBE6D29';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';

describe('Greenbids Prebid AnalyticsAdapter Testing', function () {
  describe('event tracking and message cache manager', function () {
    beforeEach(function () {
      const configOptions = {
        pbuid: pbuid,
        adid: adid,
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

    describe('#parseAdUnitCode()', function() {
      it('should get lower case adUnit code from adUnitCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'ADUNIT',
            bidder: 'greenbids',
            bidderCode: 'GREENBIDS',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseAdUnitCode(receivedBids[0]);
        expect(result).to.equal('adunit');
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
          adUnitCode: 'adunit_1',
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
          adUnitCode: 'adunit_1',
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
          adUnitCode: 'adunit_2',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'USD',
          ad: '<html>fake ad3</html>'
        },
      ];
      const highestCpmBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          // No requestId
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'USD',
          ad: '<html>fake ad1</html>'
        }
      ];
      const noBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'greenbids',
          bidderCode: 'greenbids',
          bidId: 'a1b2c3d4',
        }
      ];
      const timeoutBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
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
          // referrer: window.location.href,
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
        it('should handle BID properly and serialize bid price related fields', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID);

          expect(result).to.include({
            isTimeout: false,
            status: BIDDER_STATUS.BID,
            time: 72,
            cpm: 0.1,
            currency: 'USD',
          });
        });

        it('should handle NO_BID properly and set status to noBid', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.NO_BID);

          expect(result).to.include({
            isTimeout: false,
            status: BIDDER_STATUS.NO_BID,
          });
        });

        it('should handle TIMEOUT properly and set status to timeout and isTimeout to true', function() {
          const result = greenbidsAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.TIMEOUT);

          expect(result).to.include({
            isTimeout: true,
            status: BIDDER_STATUS.TIMEOUT,
          });
        });
      });

      describe('#addBidResponseToMessage()', function() {
        it('should add a bid response in the output message, grouped by adunit_id and bidder', function() {
          const message = {
            adUnits: {}
          };
          greenbidsAnalyticsAdapter.addBidResponseToMessage(message, noBids[0], BIDDER_STATUS.NO_BID);

          expect(message.adUnits).to.deep.include({
            'adunit_2': {
              'greenbids': {
                isTimeout: false,
                status: BIDDER_STATUS.NO_BID,
              }
            }
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
            adUnitCodes: ['adunit_1', 'adunit_2'],
            bidsReceived: receivedBids,
            noBids: noBids
          };

          const result = greenbidsAnalyticsAdapter.createBidMessage(args, timeoutBids);

          assertHavingRequiredMessageFields(result);
          expect(result).to.deep.include({
            auctionElapsed: 100,
            adUnits: {
              'adunit_1': {
                'greenbids': {
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 72,
                  cpm: 0.1,
                  currency: 'USD',
                },
                'greenbidsx': {
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 100,
                  cpm: 0.08,
                  currency: 'USD',
                }
              },
              'adunit_2': {
                // this bid result exists in both bid and noBid arrays and should be treated as bid
                'greenbids': {
                  isTimeout: true,
                  status: BIDDER_STATUS.TIMEOUT,
                }
              }
            }
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
      expect(greenbidsAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
    });

    it('should not enable Analytics when pbuid is missing', function () {
      const configOptions = {
        options: {
        }
      };
      const validConfig = greenbidsAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });
    it('should fall back to default value when sampling factor is not number', function () {
      const configOptions = {
        options: {
          pbuid: pbuid,
          sampling: 'string',
        }
      };
      greenbidsAnalyticsAdapter.enableAnalytics({
        provider: 'greenbidsAnalytics',
        options: configOptions
      });

      expect(greenbidsAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
    });
  });
});
