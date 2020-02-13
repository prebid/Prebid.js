import {
  appierAnalyticsAdapter, getCpmInUsd, parseBidderCode, parseAdUnitCode,
  ANALYTICS_VERSION, BIDDER_STATUS
} from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';
const events = require('src/events');
const constants = require('src/constants.json');

const affiliateId = 'WhctHaViHtI';
const configId = 'd9cc9a9be9b240eda17cf1c9a8a4b29c';
const serverUrl = 'https://analytics.server.url/v1';
const autoPick = 'none';
const predictionId = '2a91ca5de54a4a2e89950af439f7a27f';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';

describe('Appier Prebid AnalyticsAdapter Testing', function () {
  describe('event tracking and message cache manager', function () {
    beforeEach(function () {
      const configOptions = {
        affiliateId: affiliateId,
        configId: configId,
        server: serverUrl,
        autoPick: autoPick,
        predictionId: predictionId,
        sampling: 0,
        adSampling: 1,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
    });

    describe('#getCpmInUsd()', function() {
      it('should get bid cpm as currency is USD', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'appier',
            bidderCode: 'APPIER',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ]
        const result = getCpmInUsd(receivedBids[0]);
        expect(result).to.equal(0.1);
      });
    });

    describe('#parseBidderCode()', function() {
      it('should get lower case bidder code from bidderCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'appier',
            bidderCode: 'APPIER',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('appier');
      });
      it('should get lower case bidder code from bidder field value as bidderCode field is missing', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'APPIER',
            bidderCode: '',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseBidderCode(receivedBids[0]);
        expect(result).to.equal('appier');
      });
    });

    describe('#parseAdUnitCode()', function() {
      it('should get lower case adUnit code from adUnitCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'ADUNIT',
            bidder: 'appier',
            bidderCode: 'APPIER',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            ad: '<html>fake ad1</html>'
          },
        ];
        const result = parseAdUnitCode(receivedBids[0]);
        expect(result).to.equal('adunit');
      });
    });

    describe('#getCachedAuction()', function() {
      const existing = {timeoutBids: [{}]};
      appierAnalyticsAdapter.cachedAuctions['test_auction_id'] = existing;

      it('should get the existing cached object if it exists', function() {
        const result = appierAnalyticsAdapter.getCachedAuction('test_auction_id');

        expect(result).to.equal(existing);
      });

      it('should create a new object and store it in the cache on cache miss', function() {
        const result = appierAnalyticsAdapter.getCachedAuction('no_such_id');

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
          bidder: 'appier',
          bidderCode: 'appier',
          requestId: 'a1b2c3d4',
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'USD',
          originalCpm: 0.1,
          originalCurrency: 'USD',
          ad: '<html>fake ad1</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'reippa',
          bidderCode: 'reippa',
          requestId: 'b2c3d4e5',
          timeToRespond: 100,
          cpm: 0.08,
          currency: 'USD',
          originalCpm: 0.08,
          originalCurrency: 'USD',
          ad: '<html>fake ad2</html>'
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'appier',
          bidderCode: 'appier',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'USD',
          originalCpm: 0.09,
          originalCurrency: 'USD',
          ad: '<html>fake ad3</html>'
        },
      ];
      const highestCpmBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'appier',
          bidderCode: 'appier',
          // No requestId
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'USD',
          originalCpm: 0.1,
          originalCurrency: 'USD',
          ad: '<html>fake ad1</html>'
        }
      ];
      const noBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'appier',
          bidderCode: 'appier',
          bidId: 'a1b2c3d4',
        }
      ];
      const timeoutBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'reippa',
          bidderCode: 'reippa',
          bidId: '00123d4c',
        }
      ];
      const withoutOriginalCpmBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'appier',
          bidderCode: 'appier',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.29,
          currency: 'USD',
          originalCpm: '',
          originalCurrency: 'USD',
          ad: '<html>fake ad3</html>'
        },
      ];
      const withoutOriginalCurrencyBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'appier',
          bidderCode: 'appier',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'USD',
          originalCpm: 0.09,
          originalCurrency: '',
          ad: '<html>fake ad3</html>'
        },
      ];
      function assertHavingRequiredMessageFields(message) {
        expect(message).to.include({
          version: ANALYTICS_VERSION,
          auctionId: auctionId,
          affiliateId: affiliateId,
          configId: configId,
          // referrer: window.location.href,
          sampling: 0,
          adSampling: 1,
          prebid: '$prebid.version$',
          // autoPick: 'manual',
        });
      }

      describe('#createCommonMessage', function() {
        it('should correctly serialize some common fields', function() {
          const message = appierAnalyticsAdapter.createCommonMessage(auctionId);

          assertHavingRequiredMessageFields(message);
        });
      });

      describe('#serializeBidResponse', function() {
        it('should handle BID properly and serialize bid price related fields', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID);

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.BID,
            time: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            cpmUsd: 0.1,
          });
        });

        it('should handle NO_BID properly and set status to noBid', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.NO_BID);

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.NO_BID,
          });
        });

        it('should handle BID_WON properly and serialize bid price related fields', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID_WON);

          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 72,
            cpm: 0.1,
            currency: 'USD',
            originalCpm: 0.1,
            originalCurrency: 'USD',
            cpmUsd: 0.1,
          });
        });

        it('should handle TIMEOUT properly and set status to timeout and isTimeout to true', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.TIMEOUT);

          expect(result).to.include({
            prebidWon: false,
            isTimeout: true,
            status: BIDDER_STATUS.TIMEOUT,
          });
        });

        it('should handle BID_WON properly and fill originalCpm field with cpm in missing originalCpm case', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(withoutOriginalCpmBids[0], BIDDER_STATUS.BID_WON);

          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 120,
            cpm: 0.29,
            currency: 'USD',
            originalCpm: 0.29,
            originalCurrency: 'USD',
            cpmUsd: 0.29,
          });
        });

        it('should handle BID_WON properly and fill originalCurrency field with currency in missing originalCurrency case', function() {
          const result = appierAnalyticsAdapter.serializeBidResponse(withoutOriginalCurrencyBids[0], BIDDER_STATUS.BID_WON);
          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 120,
            cpm: 0.09,
            currency: 'USD',
            originalCpm: 0.09,
            originalCurrency: 'USD',
            cpmUsd: 0.09,
          });
        });
      });

      describe('#addBidResponseToMessage()', function() {
        it('should add a bid response in the output message, grouped by adunit_id and bidder', function() {
          const message = {
            adUnits: {}
          };
          appierAnalyticsAdapter.addBidResponseToMessage(message, noBids[0], BIDDER_STATUS.NO_BID);

          expect(message.adUnits).to.deep.include({
            'adunit_2': {
              'appier': {
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

          const result = appierAnalyticsAdapter.createBidMessage(args, highestCpmBids, timeoutBids);

          assertHavingRequiredMessageFields(result);
          expect(result).to.deep.include({
            auctionElapsed: 100,
            timeout: 3000,
            adUnits: {
              'adunit_1': {
                'appier': {
                  prebidWon: true,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 72,
                  cpm: 0.1,
                  currency: 'USD',
                  originalCpm: 0.1,
                  originalCurrency: 'USD',
                  cpmUsd: 0.1,
                },
                'reippa': {
                  prebidWon: false,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 100,
                  cpm: 0.08,
                  currency: 'USD',
                  originalCpm: 0.08,
                  originalCurrency: 'USD',
                  cpmUsd: 0.08,
                }
              },
              'adunit_2': {
                // this bid result exists in both bid and noBid arrays and should be treated as bid
                'appier': {
                  prebidWon: false,
                  isTimeout: false,
                  time: 120,
                  cpm: 0.09,
                  currency: 'USD',
                  originalCpm: 0.09,
                  originalCurrency: 'USD',
                  cpmUsd: 0.09,
                  status: BIDDER_STATUS.BID,
                },
                'reippa': {
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
          const result = appierAnalyticsAdapter.createImpressionMessage(bid);

          assertHavingRequiredMessageFields(result);
          expect(result.adUnits).to.deep.include({
            'adunit_1': {
              'appier': {
                prebidWon: true,
                isTimeout: false,
                status: BIDDER_STATUS.BID_WON,
                time: 72,
                cpm: 0.1,
                currency: 'USD',
                originalCpm: 0.1,
                originalCurrency: 'USD',
                cpmUsd: 0.1,
              }
            }
          });
        });
      });

      describe('#createCreativeMessage()', function() {
        it('should generate message sent to the backend with ad html grouped by adunit and bidder', function() {
          const result = appierAnalyticsAdapter.createCreativeMessage(auctionId, receivedBids);

          assertHavingRequiredMessageFields(result);
          expect(result.adUnits).to.deep.include({
            'adunit_1': {
              'appier': {
                ad: '<html>fake ad1</html>'
              },
              'reippa': {
                ad: '<html>fake ad2</html>'
              },
            },
            'adunit_2': {
              'appier': {
                ad: '<html>fake ad3</html>'
              }
            }
          });
        });
      });
      describe('#handleBidTimeout()', function() {
        it('should cached the timeout bid as BID_TIMEOUT event was triggered', function() {
          appierAnalyticsAdapter.cachedAuctions['test_timeout_auction_id'] = { 'timeoutBids': [] };
          const args = [{
            auctionId: 'test_timeout_auction_id',
            timestamp: 1234567890,
            timeout: 3000,
            auctionEnd: 1234567990,
            bidsReceived: receivedBids,
            noBids: noBids
          }];

          appierAnalyticsAdapter.handleBidTimeout(args);
          const result = appierAnalyticsAdapter.getCachedAuction('test_timeout_auction_id');
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
          sinon.spy(appierAnalyticsAdapter, 'createImpressionMessage');
          const receivedBids = [
            {
              auctionId: auctionId,
              adUnitCode: 'adunit_1',
              bidder: 'appier',
              bidderCode: 'appier',
              requestId: 'a1b2c3d4',
              timeToRespond: 72,
              cpm: 0.1,
              currency: 'USD',
              originalCpm: 0.1,
              originalCurrency: 'USD',
              ad: '<html>fake ad1</html>'
            },
          ]

          appierAnalyticsAdapter.handleBidWon(receivedBids[0]);
          sinon.assert.callCount(appierAnalyticsAdapter.createImpressionMessage, 1);
          appierAnalyticsAdapter.createImpressionMessage.restore();
        });
      });
    });
  });

  describe('Appier Analytics Adapter track handler ', function () {
    const configOptions = {
      affiliateId: affiliateId,
      configId: configId,
      server: serverUrl,
      autoPick: autoPick,
      sampling: 1,
      adSampling: 1,
    };

    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should call handleBidWon as BID_WON trigger event', function() {
      sinon.spy(appierAnalyticsAdapter, 'handleBidWon');
      events.emit(constants.EVENTS.BID_WON, {});
      sinon.assert.callCount(appierAnalyticsAdapter.handleBidWon, 1);
      appierAnalyticsAdapter.handleBidWon.restore();
    });

    it('should call handleBidTimeout as BID_TIMEOUT trigger event', function() {
      sinon.spy(appierAnalyticsAdapter, 'handleBidTimeout');
      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      sinon.assert.callCount(appierAnalyticsAdapter.handleBidTimeout, 1);
      appierAnalyticsAdapter.handleBidTimeout.restore();
    });

    it('should call handleAuctionEnd as AUCTION_END trigger event', function() {
      sinon.spy(appierAnalyticsAdapter, 'handleAuctionEnd');
      events.emit(constants.EVENTS.AUCTION_END, {});
      sinon.assert.callCount(appierAnalyticsAdapter.handleAuctionEnd, 1);
      appierAnalyticsAdapter.handleAuctionEnd.restore();
    });

    it('should call createCreativeMessage as AUCTION_END trigger event in adSampled is true', function() {
      const configOptions = {
        options: {
          affiliateId: affiliateId,
          configId: configId,
          server: serverUrl,
          autoPick: autoPick,
          sampling: 1,
          adSampling: 1,
          adSampled: true,
        }
      };
      const args = {
        auctionId: 'test_timeout_auction_id',
        timestamp: 1234567890,
        timeout: 3000,
        auctionEnd: 1234567990,
      };
      appierAnalyticsAdapter.initConfig(configOptions);
      sinon.stub(appierAnalyticsAdapter, 'sendEventMessage').returns({});
      sinon.stub(appierAnalyticsAdapter, 'createBidMessage').returns({});
      sinon.spy(appierAnalyticsAdapter, 'createCreativeMessage');
      events.emit(constants.EVENTS.AUCTION_END, args);
      sinon.assert.callCount(appierAnalyticsAdapter.createCreativeMessage, 1);
      appierAnalyticsAdapter.sendEventMessage.restore();
      appierAnalyticsAdapter.createBidMessage.restore();
      appierAnalyticsAdapter.createCreativeMessage.restore();
    });
  });

  describe('enableAnalytics and config parser', function () {
    const configOptions = {
      affiliateId: affiliateId,
      configId: configId,
      server: serverUrl,
      autoPick: autoPick,
      sampling: 0,
      adSampling: 1,
    };

    beforeEach(function () {
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
    });

    it('should parse config correctly with optional values', function () {
      expect(appierAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().affiliateId).to.equal(configOptions.affiliateId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().configId).to.equal(configOptions.configId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal(configOptions.server);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(configOptions.autoPick);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(true);
    });

    it('should not enable Analytics when affiliateId is missing', function () {
      const configOptions = {
        options: {
          configId: configId
        }
      };
      const validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should use DEFAULT_SERVER when server is missing', function () {
      const configOptions = {
        options: {
          configId: configId,
          affiliateId: affiliateId
        }
      };
      appierAnalyticsAdapter.initConfig(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal('https://prebid-analytics.c.appier.net/v1');
    });

    it('should use null when autoPick is missing', function () {
      const configOptions = {
        options: {
          configId: configId,
          affiliateId: affiliateId
        }
      };
      appierAnalyticsAdapter.initConfig(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(null);
    });

    it('should not enable Analytics when configId is missing', function () {
      const configOptions = {
        options: {
          affiliateId: affiliateId
        }
      };
      const validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should fall back to default value when sampling factor is not number', function () {
      const configOptions = {
        options: {
          affiliateId: affiliateId,
          configId: configId,
          sampling: 'string',
          adSampling: 'string'
        }
      };
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(true);
    });
  });
});
