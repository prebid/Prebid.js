import analyticsAdapter from 'modules/33acrossAnalyticsAdapter.js';
import { log } from 'modules/33acrossAnalyticsAdapter.js';
import * as mockGpt from 'test/spec/integration/faker/googletag.js';
import * as events from 'src/events.js';
import * as faker from 'faker';
import CONSTANTS from 'src/constants.json';
import { uspDataHandler } from '../../../src/adapterManager';
import { DEFAULT_ENDPOINT } from '../../../modules/33acrossAnalyticsAdapter';
const { EVENTS, BID_STATUS } = CONSTANTS;

describe('33acrossAnalyticsAdapter:', function () {
  let sandbox;
  let assert = getLocalAssert();

  beforeEach(function () {
    mockGpt.enable();

    sandbox = sinon.createSandbox({
      useFakeTimers: {
        now: new Date(2023, 3, 3, 0, 1, 33, 425),
      },
    });

    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.spy(log, 'info');
    sandbox.spy(log, 'warn');
    sandbox.spy(log, 'error');

    sandbox.stub(navigator, 'sendBeacon').callsFake(function (url, data) {
      const json = JSON.parse(data);
      assert.isValidAnalyticsReport(json);

      return true;
    });
  });

  afterEach(function () {
    analyticsAdapter.disableAnalytics();
    mockGpt.disable();
    sandbox.restore();
  });

  describe('enableAnalytics:', function () {
    context('When pid is given', function () {
      context('but endpoint is not', function () {
        it('uses the default endpoint', function () {
          analyticsAdapter.enableAnalytics({
            options: {
              pid: 'test-pid',
            },
          });

          assert.equal(analyticsAdapter.getUrl(), DEFAULT_ENDPOINT);
        });
      });

      context('but the endpoint is invalid', function () {
        it('it logs an info message', function () {
          analyticsAdapter.enableAnalytics({
            options: {
              pid: 'test-pid',
              endpoint: 'foo'
            },
          });

          assert.calledWithExactly(log.info, 'Invalid endpoint provided for "options.endpoint". Using default endpoint.');
        });
      });
    });

    context('When endpoint is given', function () {
      context('but pid is not', function () {
        it('it logs an error message', function () {
          analyticsAdapter.enableAnalytics({
            options: {
              endpoint: faker.internet.url()
            },
          });

          assert.calledWithExactly(log.error, 'No partnerId provided for "options.pid". No analytics will be sent.');
        });
      });
    });

    context('When pid and endpoint are given', function () {
      context('and an invalid timeout config value is given', function () {
        it('it logs an info message', function () {
          [null, 'foo', -1].forEach(timeout => {
            analyticsAdapter.enableAnalytics({
              options: {
                pid: 'test-pid',
                endpoint: 'http://test-endpoint',
                timeout
              },
            });
            analyticsAdapter.disableAnalytics();

            assert.calledWithExactly(log.info, 'Invalid timeout provided for "options.timeout". Using default timeout of 10000ms.');
            log.info.resetHistory();
          });
        });
      });
    });
  });

  // check that upcoming tests are derived from a valid report
  describe('Report Mocks', function () {
    it('the standard report should have the correct format', function () {
      assert.isValidAnalyticsReport(createReportWithThreeBidWonEvents());
    });
  });

  describe('Event Handling', function () {
    beforeEach(function () {
      this.defaultTimeout = 10000;
      this.enableAnalytics = (options) => {
        analyticsAdapter.enableAnalytics({
          options: {
            endpoint: 'http://test-endpoint',
            pid: 'test-pid',
            timeout: this.defaultTimeout,
            ...options
          },
        });
      }
    });

    context('when an auction is complete', function () {
      context('and the AnalyticsReport is sent successfully to the given endpoint', function () {
        it('it calls "sendBeacon" with all won bids', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1000);

          const [url, jsonString] = navigator.sendBeacon.firstCall.args;
          const { auctions } = JSON.parse(jsonString);

          assert.lengthOf(mapToBids(auctions).filter(bid => bid.hasWon), 3);
        });

        it('it calls "sendBeacon" with the correct report string', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1000);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, createReportWithThreeBidWonEvents());
        });

        it('it logs an info message containing the report', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()))
            .returns(true);

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledWithExactly(log.info, `Analytics report sent to ${endpoint}`, createReportWithThreeBidWonEvents());
        });

        it('it calls "sendBeacon" as soon as all values are available (before timeout)', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

          performStandardAuction();
          sandbox.clock.tick(1);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, createReportWithThreeBidWonEvents());
        });
      });

      context('and a valid US Privacy configuration is present', function () {
        ['1YNY', '1---', '1NY-', '1Y--', '1--Y', '1N--', '1--N', '1NNN'].forEach(consent => {
          it(`it calls "sendBeacon" with a report containing the "${consent}" privacy string`, function () {
            sandbox.stub(uspDataHandler, 'getConsentData').returns(consent);
            this.enableAnalytics();

            const reportWithConsent = {
              ...createReportWithThreeBidWonEvents(),
              usPrivacy: consent
            };
            navigator.sendBeacon
              .withArgs('http://test-endpoint', reportWithConsent);

            performStandardAuction();
            sandbox.clock.tick(this.defaultTimeout + 1);

            assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, 'http://test-endpoint', reportWithConsent);
          });
        });
      });

      context('and an *invalid* US Privacy configuration is present', function () {
        ['2ABC', '1234', '1YNYN', '11YNY'].forEach(consent => {
          it('it calls "sendBeacon" without the usPrivacy field', function () {
            sandbox.stub(uspDataHandler, 'getConsentData').returns(consent);
            this.enableAnalytics();

            navigator.sendBeacon
              .withArgs('http://test-endpoint', createReportWithThreeBidWonEvents());

            performStandardAuction();
            sandbox.clock.tick(this.defaultTimeout + 1);

            assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, 'http://test-endpoint', createReportWithThreeBidWonEvents());
          });
        });
      });
    });

    context('when an error occurs while sending the AnalyticsReport', function () {
      it('logs an error', function () {
        this.enableAnalytics();
        navigator.sendBeacon.returns(false);

        performStandardAuction();
        sandbox.clock.tick(this.defaultTimeout + 1);

        assert.calledWithExactly(log.error, 'Analytics report exceeded User-Agent data limits and was not sent.', createReportWithThreeBidWonEvents());
      });
    });

    context('when an auction report was already sent', function () {
      context('and a new bid won event is returned after the report completes', function () {
        it('it finishes the auction without error', function () {
          const incompleteAnalyticsReport = createReportWithThreeBidWonEvents();
          incompleteAnalyticsReport.auctions.forEach(auction => {
            auction.adUnits.forEach(adUnit => {
              adUnit.bids.forEach(bid => {
                delete bid.bidResponse;
                bid.hasWon = 0;
                bid.status = 'pending';
              });
            });
          });

          this.enableAnalytics();
          const { prebid: [auction] } = getMockEvents();

          events.emit(EVENTS.AUCTION_INIT, auction.AUCTION_INIT);
          for (let bidRequestedEvent of auction.BID_REQUESTED) {
            events.emit(EVENTS.BID_REQUESTED, bidRequestedEvent);
          };

          sandbox.clock.tick(this.defaultTimeout + 1);

          for (let bidResponseEvent of auction.BID_RESPONSE) {
            events.emit(EVENTS.BID_RESPONSE, bidResponseEvent);
          };
          for (let bidWonEvent of auction.BID_WON) {
            events.emit(EVENTS.BID_WON, bidWonEvent);
          };

          events.emit(EVENTS.AUCTION_END, auction.AUCTION_END);

          sandbox.clock.tick(1);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, 'http://test-endpoint', incompleteAnalyticsReport);
        });
      });

      context('and another auction completes after that', function () {
        it('it sends the new report', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1);

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledTwice(navigator.sendBeacon);
        });
      });
    });

    context('when two auctions overlap', function() {
      it('it sends a report for each auction', function () {
        const endpoint = faker.internet.url();
        this.enableAnalytics({ endpoint });

        navigator.sendBeacon
          .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

        performStandardAuction();
        performStandardAuction();
        sandbox.clock.tick(this.defaultTimeout + 1);

        assert.calledTwice(navigator.sendBeacon);
      });
    });

    context('when an AUCTION_END event is received before BID_WON events', function () {
      it('it sends a report with the bids that have won', function () {
        const endpoint = faker.internet.url();
        this.enableAnalytics({ endpoint });

        navigator.sendBeacon
          .withArgs(endpoint, JSON.stringify(createReportWithThreeBidWonEvents()));

        const { prebid: [auction] } = getMockEvents();

        performStandardAuction({ exclude: [EVENTS.BID_WON] });

        for (let bidWon of auction.BID_WON) {
          events.emit(EVENTS.BID_WON, bidWon);
        }

        assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, createReportWithThreeBidWonEvents());
      });
    });

    context('when a BID_WON event is received', function () {
      context('and there is no record of that bid being requested', function () {
        it('logs a warning message', function () {
          this.enableAnalytics();

          const mockEvents = getMockEvents();
          const { prebid } = mockEvents;
          const [auction] = prebid;

          events.emit(EVENTS.AUCTION_INIT, auction.AUCTION_INIT);

          const fakeBidWonEvent = Object.assign(auction.BID_WON[0], {
            transactionId: 'foo'
          })

          events.emit(EVENTS.BID_WON, fakeBidWonEvent);

          const { auctionId, requestId, transactionId } = fakeBidWonEvent;
          assert.calledWithExactly(log.error, `Cannot find bid "${requestId}". Auction ID: "${auctionId}". Transaction ID: "${transactionId}".`);
        });
      });
    });

    context('when a transaction does not reach its complete state', function () {
      context('and a timeout config value has been given', function () {
        context('and the timeout value has elapsed', function () {
          it('logs a warning', function () {
            this.enableAnalytics({ timeout: 2000 });

            performStandardAuction({exclude: ['bidWon', 'auctionEnd']});

            sandbox.clock.tick(this.defaultTimeout + 1);

            assert.calledWithExactly(log.warn, 'Timed out waiting for ad transactions to complete. Sending report.');
          });
        })
      });

      context('when a timeout config value has not been given', function () {
        context('and the default timeout has elapsed', function () {
          it('logs an error', function () {
            this.enableAnalytics();

            performStandardAuction({exclude: ['bidWon', 'auctionEnd']});

            sandbox.clock.tick(this.defaultTimeout + 1);

            assert.calledWithExactly(log.warn, 'Timed out waiting for ad transactions to complete. Sending report.');
          });
        })
      });

      context('and the incomplete report has been sent successfully', function () {
        it('it sends a report string', function () {
          navigator.sendBeacon.returns(true);

          this.enableAnalytics();

          performStandardAuction({exclude: ['bidWon', 'auctionEnd']});
          sandbox.clock.tick(this.defaultTimeout + 1);

          const incompleteSentBid = JSON.parse(navigator.sendBeacon.firstCall.args[1]).auctions[0].adUnits[1].bids[0];
          assert.strictEqual(incompleteSentBid.hasWon, 0);
        });

        it('it logs an info message', function () {
          navigator.sendBeacon.returns(true);

          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          performStandardAuction({exclude: ['bidWon', 'auctionEnd']});
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledWith(log.info, `Analytics report sent to ${endpoint}`);
        });
      });
    });
  });
});

function performStandardAuction({ exclude = [] } = {}) {
  const mockEvents = getMockEvents();
  const { prebid, gam } = mockEvents;
  const [auction] = prebid;

  if (!exclude.includes(EVENTS.AUCTION_INIT)) {
    events.emit(EVENTS.AUCTION_INIT, auction.AUCTION_INIT);
  }

  if (!exclude.includes(EVENTS.BID_REQUESTED)) {
    for (let bidRequestedEvent of auction.BID_REQUESTED) {
      events.emit(EVENTS.BID_REQUESTED, bidRequestedEvent);
    };
  }

  if (!exclude.includes(EVENTS.BID_RESPONSE)) {
    for (let bidResponseEvent of auction.BID_RESPONSE) {
      events.emit(EVENTS.BID_RESPONSE, bidResponseEvent);
    };
  }

  // Note: AUCTION_END *frequently* (but not always) emits before BID_WON,
  // even if the auction is ending because all bids have been won.
  if (!exclude.includes(EVENTS.AUCTION_END)) {
    events.emit(EVENTS.AUCTION_END, auction.AUCTION_END);
  }

  if (!exclude.includes(EVENTS.BID_WON)) {
    for (let bidWonEvent of auction.BID_WON) {
      events.emit(EVENTS.BID_WON, bidWonEvent);
    };
  }
}

function mapToBids(auctions) {
  return auctions.flatMap(
    auction => auction.adUnits.flatMap(
      au => au.bids
    )
  );
}

function getLocalAssert() {
  function isValidAnalyticsReport(report) {
    assert.containsAllKeys(report, ['analyticsVersion', 'pid', 'src', 'pbjsVersion', 'auctions']);
    if ('usPrivacy' in report) {
      assert.match(report.usPrivacy, /[0|1][Y|N|-]{3}/);
    }
    assert.equal(report.analyticsVersion, '1.0.0');
    assert.isString(report.pid);
    assert.isString(report.src);
    assert.equal(report.pbjsVersion, '$prebid.version$');
    assert.isArray(report.auctions);
    assert.isAbove(report.auctions.length, 0);
    report.auctions.forEach(isValidAuction);
  }
  function isValidAuction(auction) {
    assert.hasAllKeys(auction, ['adUnits', 'auctionId', 'userIds']);
    assert.isArray(auction.adUnits);
    assert.isString(auction.auctionId);
    assert.isArray(auction.userIds);
    auction.adUnits.forEach(isValidAdUnit);
  }
  function isValidAdUnit(adUnit) {
    assert.hasAllKeys(adUnit, ['transactionId', 'adUnitCode', 'slotId', 'mediaTypes', 'sizes', 'bids']);
    assert.isString(adUnit.transactionId);
    assert.isString(adUnit.adUnitCode);
    assert.isString(adUnit.slotId);
    assert.isArray(adUnit.mediaTypes);
    assert.isArray(adUnit.sizes);
    assert.isArray(adUnit.bids);
    adUnit.mediaTypes.forEach(isValidMediaType);
    adUnit.sizes.forEach(isValidSizeString);
    adUnit.bids.forEach(isValidBid);
  }
  function isValidBid(bid) {
    assert.containsAllKeys(bid, ['bidder', 'bidId', 'source', 'status', 'hasWon']);
    if ('bidResponse' in bid) {
      isValidBidResponse(bid.bidResponse);
    }
    assert.isString(bid.bidder);
    assert.isString(bid.bidId);
    assert.isString(bid.source);
    assert.oneOf(bid.status, [...Object.values(BID_STATUS), 'pending']);
    assert.oneOf(bid.hasWon, [0, 1]);
  }
  function isValidBidResponse(bidResponse) {
    assert.containsAllKeys(bidResponse, ['mediaType', 'size', 'cur', 'cpm', 'cpmFloor']);
    if ('cpmOrig' in bidResponse) {
      assert.isNumber(bidResponse.cpmOrig);
    }
    isValidMediaType(bidResponse.mediaType);
    isValidSizeString(bidResponse.size);
    assert.isString(bidResponse.cur);
    assert.isNumber(bidResponse.cpm);
    assert.isNumber(bidResponse.cpmFloor);
  }
  function isValidMediaType(mediaType) {
    assert.oneOf(mediaType, ['banner', 'video', 'native']);
  }
  function isValidSizeString(size) {
    assert.match(size, /[0-9]+x[0-9]+/);
  }

  function calledOnceWithStringJsonEquivalent(sinonSpy, ...args) {
    sinon.assert.calledOnce(sinonSpy);
    args.forEach((arg, i) => {
      const stubCallArgs = sinonSpy.firstCall.args[i]

      if (typeof arg === 'object') {
        assert.deepEqual(JSON.parse(stubCallArgs), arg);
      } else {
        assert.strictEqual(stubCallArgs, arg);
      }
    });
  }

  sinon.assert.expose(assert, { prefix: '' });
  return {
    ...assert,
    calledOnceWithStringJsonEquivalent,
    isValidAnalyticsReport,
    isValidAuction,
    isValidAdUnit,
    isValidBid,
    isValidBidResponse,
    isValidMediaType,
    isValidSizeString,
  }
};

function createReportWithThreeBidWonEvents() {
  return {
    pid: 'test-pid',
    src: 'pbjs',
    analyticsVersion: '1.0.0',
    pbjsVersion: '$prebid.version$',
    auctions: [{
      adUnits: [{
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        adUnitCode: '/19968336/header-bid-tag-0',
        slotId: '/19968336/header-bid-tag-0',
        mediaTypes: ['banner'],
        sizes: ['300x250', '300x600'],
        bids: [{
          bidder: 'bidder0',
          bidId: '20661fc5fbb5d9b',
          source: 'client',
          status: 'rendered',
          bidResponse: {
            cpm: 1.5,
            cur: 'USD',
            cpmOrig: 1.5,
            cpmFloor: 1,
            mediaType: 'banner',
            size: '300x250'
          },
          hasWon: 1
        }]
      }, {
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        adUnitCode: '/19968336/header-bid-tag-1',
        slotId: '/19968336/header-bid-tag-1',
        mediaTypes: ['banner'],
        sizes: ['728x90', '970x250'],
        bids: [{
          bidder: 'bidder0',
          bidId: '21ad295f40dd7ab',
          source: 'client',
          status: 'rendered',
          bidResponse: {
            cpm: 1.5,
            cur: 'USD',
            cpmOrig: 1.5,
            cpmFloor: 1,
            mediaType: 'banner',
            size: '728x90'
          },
          hasWon: 1
        }]
      }, {
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        adUnitCode: '/17118521/header-bid-tag-2',
        slotId: '/17118521/header-bid-tag-2',
        mediaTypes: ['banner'],
        sizes: ['300x250'],
        bids: [{
          bidder: 'bidder0',
          bidId: '22108ac7b778717',
          source: 'client',
          status: 'targetingSet',
          bidResponse: {
            cpm: 1.5,
            cur: 'USD',
            cpmOrig: 1.5,
            cpmFloor: 1,
            mediaType: 'banner',
            size: '728x90'
          },
          hasWon: 1
        }]
      }],
      auctionId: 'auction-000',
      userIds: ['33acrossId']
    }],
  };
}

function getMockEvents() {
  const auctionId = 'auction-000';
  const userId = {
    '33acrossId': {
      envelope: 'v1.0014',
    },
  };

  return {
    prebid: [{
      AUCTION_INIT: {
        auctionId,
        adUnits: [
          {
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                userId,
              },
            ],
            sizes: [
              [300, 250],
              [300, 600],
            ],
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            ortb2Imp: {
              ext: {
                gpid: '/19968336/header-bid-tag-0',
              },
            },
          },
          {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                userId,
              },
            ],
            sizes: [
              [728, 90],
              [970, 250],
            ],
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            ortb2Imp: {
              ext: {
                gpid: '/19968336/header-bid-tag-1',
              },
            },
          },
          {
            code: '/17118521/header-bid-tag-2',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            bids: [
              {
                bidder: '33across',
                userId,
              },
              {
                bidder: 'bidder0',
                userId,
              },
            ],
            sizes: [[300, 250]],
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            ortb2Imp: {
              ext: {
                gpid: '/17118521/header-bid-tag-2',
              },
            },
          },
        ],
        bidderRequests: [
          {
            bids: [
              { userId },
            ],
          }
        ],
      },
      BID_REQUESTED: [
        {
          auctionId,
          bids: [
            {
              bidder: 'bidder0',
              transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
              bidId: '20661fc5fbb5d9b',
              src: 'client',
            },
            {
              bidder: 'bidder0',
              transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
              bidId: '21ad295f40dd7ab',
              src: 'client',
            },
            {
              bidder: 'bidder0',
              transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
              bidId: '22108ac7b778717',
              src: 'client',
            },
          ],
        }],
      BID_RESPONSE: [{
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '20661fc5fbb5d9b',
        size: '300x250',
        source: 'client',
        status: 'rendered'
      },
      {
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '21ad295f40dd7ab',
        size: '728x90',
        source: 'client',
        status: 'targetingSet',
      },
      {
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '22108ac7b778717',
        size: '728x90',
        source: 'client',
        status: 'targetingSet',
      }],
      BID_WON: [{
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '20661fc5fbb5d9b',
        size: '300x250',
        source: 'client',
        status: 'rendered',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
      },
      {
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '21ad295f40dd7ab',
        size: '728x90',
        source: 'client',
        status: 'rendered',
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
      },
      {
        auctionId,
        cpm: 1.5,
        currency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        mediaType: 'banner',
        originalCpm: 1.5,
        requestId: '22108ac7b778717',
        size: '728x90',
        source: 'client',
        status: 'targetingSet',
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
      }],
      AUCTION_END: {
        auctionId,
      },
    }]
  };
}
