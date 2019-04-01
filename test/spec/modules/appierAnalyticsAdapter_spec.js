import {
  appierAnalyticsAdapter, ANALYTICS_VERSION, BIDDER_STATUS
} from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';
import * as ajax from 'src/ajax';

const events = require('src/events');

const affiliateId = 'WhctHaViHtI';
const configId = 'd9cc9a9b-e9b2-40ed-a17c-f1c9a8a4b29c';
const serverUrl = 'https://analytics.server.url/v1';
const autoPick = 'none';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';

describe('Appier Prebid AnalyticsAdapter', function () {
  describe('event tracking and message cache manager', function () {
    let ajaxStub;

    beforeEach(function () {
      const configOptions = {
        affiliateId: affiliateId,
        configId: configId,
        server: serverUrl,
        autoPick: autoPick,
        sampling: 0,
        adSampling: 1,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      sinon.stub(events, 'getEvents').returns([]);

      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function (url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', {getResponseHeader: fakeResponse});
      });
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
      ajaxStub.restore();
    });

    describe('#getCachedAuction()', function() {
      const existing = {timeoutBids: [{}]};
      appierAnalyticsAdapter.cachedAuctions['test_auction_id'] = existing;

      it('should get the existing cached object if it exists', function() {
        const result = appierAnalyticsAdapter.getCachedAuction('test_auction_id');

        expect(Object.is(result, existing)).to.be.true;
      });

      it('should create a new object and store it in the cache on cache miss', function() {
        const result = appierAnalyticsAdapter.getCachedAuction('no_such_id');

        expect(result).to.deep.include({
          timeoutBids: []
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
                'appier': {
                  prebidWon: false,
                  isTimeout: false,
                  status: BIDDER_STATUS.NO_BID,
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
    });
  });

  describe('enableAnalytics and config parser', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should parse config correctly with minimum required options', function () {
      let configOptions = {
        affiliateId: affiliateId,
        configId: configId,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().affiliateId).to.equal(configOptions.affiliateId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().configId).to.equal(configOptions.configId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal('https://prebid-analytics.c.appier.net/v1');
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(null);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(true);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(false);
    });

    it('should parse config correctly with optional values', function () {
      let configOptions = {
        affiliateId: affiliateId,
        configId: configId,
        server: serverUrl,
        autoPick: autoPick,
        sampling: 0,
        adSampling: 1,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().affiliateId).to.equal(configOptions.affiliateId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().configId).to.equal(configOptions.configId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal(configOptions.server);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(configOptions.autoPick);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(true);
    });

    it('should not enable Analytics when affiliateId is missing', function () {
      let configOptions = {
        options: {
          configId: configId
        }
      };
      let validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should not enable Analytics when configId is missing', function () {
      let configOptions = {
        options: {
          affiliateId: affiliateId
        }
      };
      let validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should fall back to default value when sampling factor is not number', function () {
      let configOptions = {
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
