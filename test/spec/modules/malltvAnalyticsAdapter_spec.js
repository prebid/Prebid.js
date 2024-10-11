import {
  malltvAnalyticsAdapter, parseBidderCode, parseAdUnitCode,
  ANALYTICS_VERSION, BIDDER_STATUS, DEFAULT_SERVER
} from 'modules/malltvAnalyticsAdapter.js'
import { expect } from 'chai'
import { getCpmInEur } from '../../../modules/malltvAnalyticsAdapter'
import * as events from 'src/events'
import { EVENTS } from 'src/constants.js'

const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e'
const propertyId = '123456'
const server = 'https://analytics.server.url/v1'

describe('Malltv Prebid AnalyticsAdapter Testing', function () {
  describe('event tracking and message cache manager', function () {
    beforeEach(function () {
      const configOptions = { propertyId }

      sinon.stub(events, 'getEvents').returns([])
      malltvAnalyticsAdapter.enableAnalytics({
        provider: 'malltvAnalytics',
        options: configOptions
      })
    })

    afterEach(function () {
      malltvAnalyticsAdapter.disableAnalytics()
      events.getEvents.restore()
    })

    describe('#getCpmInEur()', function() {
      it('should get bid cpm as currency is EUR', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'malltv',
            bidderCode: 'MALLTV',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            ad: '<html>fake ad1</html>'
          },
        ]
        const result = getCpmInEur(receivedBids[0])
        expect(result).to.equal(0.1)
      })
    })

    describe('#parseBidderCode()', function() {
      it('should get lower case bidder code from bidderCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'malltv',
            bidderCode: 'MALLTV',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            ad: '<html>fake ad1</html>'
          },
        ]
        const result = parseBidderCode(receivedBids[0])
        expect(result).to.equal('malltv')
      })

      it('should get lower case bidder code from bidder field value as bidderCode field is missing', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'adunit_1',
            bidder: 'MALLTV',
            bidderCode: '',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            ad: '<html>fake ad1</html>'
          },
        ]
        const result = parseBidderCode(receivedBids[0])
        expect(result).to.equal('malltv')
      })
    })

    describe('#parseAdUnitCode()', function() {
      it('should get lower case adUnit code from adUnitCode field value', function() {
        const receivedBids = [
          {
            auctionId: auctionId,
            adUnitCode: 'ADUNIT',
            bidder: 'malltv',
            bidderCode: 'MALLTV',
            requestId: 'a1b2c3d4',
            timeToRespond: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            ad: '<html>fake ad1</html>'
          },
        ]
        const result = parseAdUnitCode(receivedBids[0])
        expect(result).to.equal('adunit')
      })
    })

    describe('#getCachedAuction()', function() {
      const existing = {timeoutBids: [{}]}
      malltvAnalyticsAdapter.cachedAuctions['test_auction_id'] = existing

      it('should get the existing cached object if it exists', function() {
        const result = malltvAnalyticsAdapter.getCachedAuction('test_auction_id')

        expect(result).to.equal(existing)
      })

      it('should create a new object and store it in the cache on cache miss', function() {
        const result = malltvAnalyticsAdapter.getCachedAuction('no_such_id')

        expect(result).to.deep.include({
          timeoutBids: [],
        })
      })
    })

    describe('when formatting JSON payload sent to backend', function() {
      const receivedBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'malltv',
          bidderCode: 'malltv',
          requestId: 'a1b2c3d4',
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'EUR',
          originalCpm: 0.1,
          originalCurrency: 'EUR',
          ad: '<html>fake ad1</html>',
          vastUrl: null
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'gjirafa',
          bidderCode: 'gjirafa',
          requestId: 'b2c3d4e5',
          timeToRespond: 100,
          cpm: 0.08,
          currency: 'EUR',
          originalCpm: 0.08,
          originalCurrency: 'EUR',
          ad: '<html>fake ad2</html>',
          vastUrl: null
        },
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'malltv',
          bidderCode: 'malltv',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'EUR',
          originalCpm: 0.09,
          originalCurrency: 'EUR',
          ad: '<html>fake ad3</html>',
          vastUrl: null
        },
      ]
      const highestCpmBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_1',
          bidder: 'malltv',
          bidderCode: 'malltv',
          // No requestId
          timeToRespond: 72,
          cpm: 0.1,
          currency: 'EUR',
          originalCpm: 0.1,
          originalCurrency: 'EUR',
          ad: '<html>fake ad1</html>',
          vastUrl: null
        }
      ]
      const noBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'malltv',
          bidderCode: 'malltv',
          bidId: 'a1b2c3d4',
        }
      ]
      const timeoutBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'gjirafa',
          bidderCode: 'gjirafa',
          bidId: '00123d4c',
        }
      ]
      const withoutOriginalCpmBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'malltv',
          bidderCode: 'malltv',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.29,
          currency: 'EUR',
          originalCpm: '',
          originalCurrency: 'EUR',
          ad: '<html>fake ad3</html>'
        },
      ]
      const withoutOriginalCurrencyBids = [
        {
          auctionId: auctionId,
          adUnitCode: 'adunit_2',
          bidder: 'malltv',
          bidderCode: 'malltv',
          requestId: 'c3d4e5f6',
          timeToRespond: 120,
          cpm: 0.09,
          currency: 'EUR',
          originalCpm: 0.09,
          originalCurrency: '',
          ad: '<html>fake ad3</html>'
        },
      ]

      function assertHavingRequiredMessageFields(message) {
        expect(message).to.include({
          analyticsVersion: ANALYTICS_VERSION,
          auctionId: auctionId,
          propertyId: propertyId,
          prebidVersion: '$prebid.version$',
        })
      }

      describe('#createCommonMessage', function() {
        it('should correctly serialize some common fields', function() {
          const message = malltvAnalyticsAdapter.createCommonMessage(auctionId)

          assertHavingRequiredMessageFields(message)
        })
      })

      describe('#serializeBidResponse', function() {
        it('should handle BID properly and serialize bid price related fields', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID)

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.BID,
            time: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            cpmEur: 0.1,
          })
        })

        it('should handle NO_BID properly and set status to noBid', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.NO_BID)

          expect(result).to.include({
            prebidWon: false,
            isTimeout: false,
            status: BIDDER_STATUS.NO_BID,
          })
        })

        it('should handle BID_WON properly and serialize bid price related fields', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(receivedBids[0], BIDDER_STATUS.BID_WON)

          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 72,
            cpm: 0.1,
            currency: 'EUR',
            originalCpm: 0.1,
            originalCurrency: 'EUR',
            cpmEur: 0.1,
          })
        })

        it('should handle TIMEOUT properly and set status to timeout and isTimeout to true', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(noBids[0], BIDDER_STATUS.TIMEOUT)

          expect(result).to.include({
            prebidWon: false,
            isTimeout: true,
            status: BIDDER_STATUS.TIMEOUT,
          })
        })

        it('should handle BID_WON properly and fill originalCpm field with cpm in missing originalCpm case', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(withoutOriginalCpmBids[0], BIDDER_STATUS.BID_WON)

          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 120,
            cpm: 0.29,
            currency: 'EUR',
            originalCpm: 0.29,
            originalCurrency: 'EUR',
            cpmEur: 0.29,
          })
        })

        it('should handle BID_WON properly and fill originalCurrency field with currency in missing originalCurrency case', function() {
          const result = malltvAnalyticsAdapter.serializeBidResponse(withoutOriginalCurrencyBids[0], BIDDER_STATUS.BID_WON)
          expect(result).to.include({
            prebidWon: true,
            isTimeout: false,
            status: BIDDER_STATUS.BID_WON,
            time: 120,
            cpm: 0.09,
            currency: 'EUR',
            originalCpm: 0.09,
            originalCurrency: 'EUR',
            cpmEur: 0.09,
          })
        })
      })

      describe('#addBidResponseToMessage()', function() {
        it('should add a bid response in the output message, grouped by adunit_id and bidder', function() {
          const message = {
            adUnits: {}
          }
          malltvAnalyticsAdapter.addBidResponseToMessage(message, noBids[0], BIDDER_STATUS.NO_BID)

          expect(message.adUnits).to.deep.include({
            'adunit_2': {
              'malltv': {
                prebidWon: false,
                isTimeout: false,
                status: BIDDER_STATUS.NO_BID,
              }
            }
          })
        })
      })

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
          }

          const result = malltvAnalyticsAdapter.createBidMessage(args, highestCpmBids, timeoutBids)

          assertHavingRequiredMessageFields(result)
          expect(result).to.deep.include({
            auctionElapsed: 100,
            timeout: 3000,
            adUnits: {
              'adunit_1': {
                'malltv': {
                  prebidWon: true,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 72,
                  cpm: 0.1,
                  currency: 'EUR',
                  originalCpm: 0.1,
                  originalCurrency: 'EUR',
                  cpmEur: 0.1,
                  vastUrl: null
                },
                'gjirafa': {
                  prebidWon: false,
                  isTimeout: false,
                  status: BIDDER_STATUS.BID,
                  time: 100,
                  cpm: 0.08,
                  currency: 'EUR',
                  originalCpm: 0.08,
                  originalCurrency: 'EUR',
                  cpmEur: 0.08,
                  vastUrl: null
                }
              },
              'adunit_2': {
                // this bid result exists in both bid and noBid arrays and should be treated as bid
                'malltv': {
                  prebidWon: false,
                  isTimeout: false,
                  time: 120,
                  cpm: 0.09,
                  currency: 'EUR',
                  originalCpm: 0.09,
                  originalCurrency: 'EUR',
                  cpmEur: 0.09,
                  status: BIDDER_STATUS.BID,
                  vastUrl: null
                },
                'gjirafa': {
                  prebidWon: false,
                  isTimeout: true,
                  status: BIDDER_STATUS.TIMEOUT,
                }
              }
            }
          })
        })
      })

      describe('#handleBidTimeout()', function() {
        it('should cached the timeout bid as BID_TIMEOUT event was triggered', function() {
          malltvAnalyticsAdapter.cachedAuctions['test_timeout_auction_id'] = { 'timeoutBids': [] }
          const args = [{
            auctionId: 'test_timeout_auction_id',
            timestamp: 1234567890,
            timeout: 3000,
            auctionEnd: 1234567990,
            bidsReceived: receivedBids,
            noBids: noBids
          }]

          malltvAnalyticsAdapter.handleBidTimeout(args)
          const result = malltvAnalyticsAdapter.getCachedAuction('test_timeout_auction_id')
          expect(result).to.deep.include({
            timeoutBids: [{
              auctionId: 'test_timeout_auction_id',
              timestamp: 1234567890,
              timeout: 3000,
              auctionEnd: 1234567990,
              bidsReceived: receivedBids,
              noBids: noBids
            }]
          })
        })
      })
    })
  })

  describe('Malltv Analytics Adapter track handler ', function () {
    const configOptions = { propertyId }

    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([])
      malltvAnalyticsAdapter.enableAnalytics({
        provider: 'malltvAnalytics',
        options: configOptions
      })
    })

    afterEach(function () {
      malltvAnalyticsAdapter.disableAnalytics()
      events.getEvents.restore()
    })

    it('should call handleBidTimeout as BID_TIMEOUT trigger event', function() {
      sinon.spy(malltvAnalyticsAdapter, 'handleBidTimeout')
      events.emit(EVENTS.BID_TIMEOUT, {})
      sinon.assert.callCount(malltvAnalyticsAdapter.handleBidTimeout, 1)
      malltvAnalyticsAdapter.handleBidTimeout.restore()
    })

    it('should call handleAuctionEnd as AUCTION_END trigger event', function() {
      sinon.spy(malltvAnalyticsAdapter, 'handleAuctionEnd')
      events.emit(EVENTS.AUCTION_END, {})
      sinon.assert.callCount(malltvAnalyticsAdapter.handleAuctionEnd, 1)
      malltvAnalyticsAdapter.handleAuctionEnd.restore()
    })
  })

  describe('enableAnalytics and config parser', function () {
    const configOptions = { propertyId, server }

    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([])
      malltvAnalyticsAdapter.enableAnalytics({
        provider: 'malltvAnalytics',
        options: configOptions
      })
    })

    afterEach(function () {
      malltvAnalyticsAdapter.disableAnalytics()
      events.getEvents.restore()
    })

    it('should parse config correctly with optional values', function () {
      const { options, propertyId, server } = malltvAnalyticsAdapter.getAnalyticsOptions()

      expect(options).to.deep.equal(configOptions)
      expect(propertyId).to.equal(configOptions.propertyId)
      expect(server).to.equal(configOptions.server)
    })

    it('should not enable Analytics when propertyId is missing', function() {
      const configOptions = {
        options: { }
      }

      const isConfigValid = malltvAnalyticsAdapter.initConfig(configOptions)
      expect(isConfigValid).to.equal(false)
    })

    it('should use DEFAULT_SERVER when server is missing', function () {
      const configOptions = {
        options: {
          propertyId
        }
      }
      malltvAnalyticsAdapter.initConfig(configOptions)
      expect(malltvAnalyticsAdapter.getAnalyticsOptions().server).to.equal(DEFAULT_SERVER)
    })
  })
})
