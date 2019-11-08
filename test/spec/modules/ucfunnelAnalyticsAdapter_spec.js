import {
  ucfunnelAnalyticsAdapter, parseBidderCode, parseAdUnitCode,
  ANALYTICS_VERSION, BIDDER_STATUS
} from 'modules/ucfunnelAnalyticsAdapter';

import {expect} from 'chai';

const events = require('src/events');
const constants = require('src/constants.json');

const pbuid = 'pbuid-AA778D8A796AEA7A0843E2BBEB677766';
const adid = 'test-ad-83444226E44368D1E32E49EEBE6D29';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';

describe('ucfunnel Prebid AnalyticsAdapter Testing', function () {
  describe('event tracking and message cache manager', function () {
    let xhr;

    beforeEach(function () {
      const configOptions = {
        pbuid: pbuid,
        adid: adid,
        sampling: 0,
      };

      ucfunnelAnalyticsAdapter.enableAnalytics({
        provider: 'ucfunnelAnalytics',
        options: configOptions
      });
      xhr = sinon.useFakeXMLHttpRequest();
    });

    afterEach(function () {
      ucfunnelAnalyticsAdapter.disableAnalytics();
      xhr.restore();
    });

    describe('#parseBidderCode()', function() {
      it('should get lower case bidder code from bidderCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'ucfunnel',
            bidderCode: 'UCFUNNEL',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('ucfunnel');
      });
      it('should get lower case bidder code from bidder field value as bidderCode field is missing', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'UCFUNNEL',
            bidderCode: '',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('ucfunnel');
      });
    });

    describe('#parseAdUnitCode()', function() {
      it('should get lower case adUnit code from adUnitCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'ADUNIT',
            bidder: 'ucfunnel',
            bidderCode: 'UCFUNNEL',
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
      ucfunnelAnalyticsAdapter.cachedAuctions['test_auction_id'] = existing;

      it('should get the existing cached object if it exists', function() {
        const result = ucfunnelAnalyticsAdapter.getCachedAuction('test_auction_id');

        expect(result).to.equal(existing);
      });

      it('should create a new object and store it in the cache on cache miss', function() {
        const result = ucfunnelAnalyticsAdapter.getCachedAuction('no_such_id');

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
          bidder: 'ucfunnel',
          bidderCode: 'ucfunnel',
          requestId: 'a1b2c3d4',
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'USD',
          ad: '<html>fake ad1</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'ucfunnelx',
          bidderCode: 'ucfunnelx',
          requestId: 'b2c3d4e5',
          timeToRespond: 100,
          cpm: 0.08,
          currency: 'USD',
          ad: '<html>fake ad2</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'ucfunnel',
          bidderCode: 'ucfunnel',
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
          bidder: 'ucfunnel',
          bidderCode: 'ucfunnel',
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
          bidder: 'ucfunnel',
          bidderCode: 'ucfunnel',
          bidId: 'a1b2c3d4',
        }
      ];
      const timeoutBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'ucfunnel',
          bidderCode: 'ucfunnel',
          bidId: '00123d4c',
        }
      ];
      function assertHavingRequiredMessageFields(message) {
        expect(message).to.include({
          version: ANALYTICS_VERSION,
          auctionId: auctionId,
          pbuid: pbuid,
          adid: adid,
          // referrer: window.location.href,
          sampling: 0,
          prebid: '$prebid.version$',
        });
      }

      describe('#createCommonMessage', function() {
        it('should correctly serialize some common fields', function() {
          const message = ucfunnelAnalyticsAdapter.createCommonMessage(auctionId);

          assertHavingRequiredMessageFields(message);
        });
      });

      describe('#serializeBidResponse', function() {
        it('should handle BID properly and serialize bid price related fields', function() {
          const result = ucfunnelAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID);

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.BID,
            time: 72,
            cpm: 0.1,
            currency: 'USD',
          });
        });

        it('should handle NO_BID properly and set status to noBid', function() {
          const result = ucfunnelAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.NO_BID);

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.NO_BID,
          });
        });

        it('should handle BID_WON properly and serialize bid price related fields', function() {
          const result = ucfunnelAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID_WON);

          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 72,
            cpm: 0.1,
            currency: 'USD',
          });
        });

        it('should handle TIMEOUT properly and set status to timeout and isTimeout to true', function() {
          const result = ucfunnelAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.TIMEOUT);

          expect(result).to.include({
            prebidWon: false,
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
          ucfunnelAnalyticsAdapter.addBidResponseToMessage(message, noBids[0], BIDDER_STATUS.NO_BID);

          expect(message.adUnits).to.deep.include({
            'adunit_2': {
              'ucfunnel': {
                prebidWon: false,
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

          const result = ucfunnelAnalyticsAdapter.createBidMessage(args, highestCpmBids, timeoutBids);

          assertHavingRequiredMessageFields(result);
          expect(result).to.deep.include({
            auctionElapsed: 100,
            adUnits: {
              'adunit_1': {
                'ucfunnel': {
                  prebidWon: true,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 72,
                  cpm: 0.1,
                  currency: 'USD',
                },
                'ucfunnelx': {
                  prebidWon: false,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 100,
                  cpm: 0.08,
                  currency: 'USD',
                }
              },
              'adunit_2': {
                // this bid result exists in both bid and noBid arrays and should be treated as bid
                'ucfunnel': {
                  prebidWon: false,
                  isTimeout: true,
                  status: BIDDER_STATUS.TIMEOUT,
                }
              }
            }
          });
        });
      });

      describe('#createImpressionMessage()', function() {
        it('should format message sent to the backend with the bid result', function() {
          const bid = receivedBids[0];
          const result = ucfunnelAnalyticsAdapter.createImpressionMessage(bid);

          assertHavingRequiredMessageFields(result);
          expect(result.adUnits).to.deep.include({
            'adunit_1': {
              'ucfunnel': {
                prebidWon: true,
                isTimeout: false,
                status: BIDDER_STATUS.BID_WON,
                time: 72,
                cpm: 0.1,
                currency: 'USD',
              }
            }
          });
        });
      });

      describe('#handleBidTimeout()', function() {
        it('should cached the timeout bid as BID_TIMEOUT event was triggered', function() {
          ucfunnelAnalyticsAdapter.cachedAuctions['test_timeout_auction_id'] = { 'timeoutBids': [] };
          const args = [{
            auctionId: 'test_timeout_auction_id',
            timestamp: 1234567890,
            timeout: 3000,
            auctionEnd: 1234567990,
            bidsReceived: receivedBids,
            noBids: noBids
          }];

          ucfunnelAnalyticsAdapter.handleBidTimeout(args);
          const result = ucfunnelAnalyticsAdapter.getCachedAuction('test_timeout_auction_id');
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
      describe('#handleBidWon()', function() {
        it('should call createImpressionMessage once as BID_WON event was triggered', function() {
          sinon.spy(ucfunnelAnalyticsAdapter, 'createImpressionMessage');
          const receivedBids = [
            {
              auctionId: auctionId,
              adUnitCode: 'adunit_1',
              bidder: 'ucfunnel',
              bidderCode: 'ucfunnel',
              requestId: 'a1b2c3d4',
              timeToRespond: 72,
              cpm: 0.1,
              currency: 'USD',
              ad: '<html>fake ad1</html>'
            },
          ]

          ucfunnelAnalyticsAdapter.handleBidWon(receivedBids[0]);
          sinon.assert.callCount(ucfunnelAnalyticsAdapter.createImpressionMessage, 1);
          ucfunnelAnalyticsAdapter.createImpressionMessage.restore();
        });
      });
    });
  });

  describe('ucfunnel Analytics Adapter track handler ', function () {
    const configOptions = {
      pbuid: pbuid,
      adid: adid,
      sampling: 1,
    };

    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      ucfunnelAnalyticsAdapter.enableAnalytics({
        provider: 'ucfunnelAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      ucfunnelAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should call handleBidWon as BID_WON trigger event', function() {
      sinon.spy(ucfunnelAnalyticsAdapter, 'handleBidWon');
      events.emit(constants.EVENTS.BID_WON, {});
      sinon.assert.callCount(ucfunnelAnalyticsAdapter.handleBidWon, 1);
      ucfunnelAnalyticsAdapter.handleBidWon.restore();
    });

    it('should call handleBidTimeout as BID_TIMEOUT trigger event', function() {
      sinon.spy(ucfunnelAnalyticsAdapter, 'handleBidTimeout');
      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      sinon.assert.callCount(ucfunnelAnalyticsAdapter.handleBidTimeout, 1);
      ucfunnelAnalyticsAdapter.handleBidTimeout.restore();
    });

    it('should call handleAuctionEnd as AUCTION_END trigger event', function() {
      sinon.spy(ucfunnelAnalyticsAdapter, 'handleAuctionEnd');
      events.emit(constants.EVENTS.AUCTION_END, {});
      sinon.assert.callCount(ucfunnelAnalyticsAdapter.handleAuctionEnd, 1);
      ucfunnelAnalyticsAdapter.handleAuctionEnd.restore();
    });
  });

  describe('enableAnalytics and config parser', function () {
    const configOptions = {
      pbuid: pbuid,
      adid: adid,
      sampling: 0,
    };

    beforeEach(function () {
      ucfunnelAnalyticsAdapter.enableAnalytics({
        provider: 'ucfunnelAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      ucfunnelAnalyticsAdapter.disableAnalytics();
    });

    it('should parse config correctly with optional values', function () {
      expect(ucfunnelAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(ucfunnelAnalyticsAdapter.getAnalyticsOptions().pbuid).to.equal(configOptions.pbuid);
      expect(ucfunnelAnalyticsAdapter.getAnalyticsOptions().adid).to.equal(configOptions.adid);
      expect(ucfunnelAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
    });

    it('should not enable Analytics when adid is missing', function () {
      const configOptions = {
        options: {
          pbuid: pbuid
        }
      };
      const validConfig = ucfunnelAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should not enable Analytics when pbuid is missing', function () {
      const configOptions = {
        options: {
          adid: adid
        }
      };
      const validConfig = ucfunnelAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });
    it('should fall back to default value when sampling factor is not number', function () {
      const configOptions = {
        options: {
          pbuid: pbuid,
          adid: adid,
          sampling: 'string',
        }
      };
      ucfunnelAnalyticsAdapter.enableAnalytics({
        provider: 'ucfunnelAnalytics',
        options: configOptions
      });

      expect(ucfunnelAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
    });
  });
});
