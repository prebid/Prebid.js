import analyticsAdapter from 'modules/33acrossAnalyticsAdapter.js';
import { log } from 'modules/33acrossAnalyticsAdapter.js';
import * as mockGpt from 'test/spec/integration/faker/googletag.js';
import * as events from 'src/events.js';
import * as faker from 'faker';
import CONSTANTS from 'src/constants.json';
import { uspDataHandler } from '../../../src/adapterManager';
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
      assert.isAnalyticsReport(json);

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
        it('it logs an info message', function () {
          analyticsAdapter.enableAnalytics({
            options: {
              pid: 'test-pid',
            },
          });

          assert.calledWithExactly(log.info, 'Invalid endpoint provided for "options.endpoint". Using default endpoint.');
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
      assert.isAnalyticsReport(getStandardAnalyticsReport());
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
        it('it calls "sendBeacon" with 3 won bids', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

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
            .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1000);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, getStandardAnalyticsReport());
        });

        it('it logs an info message containing the report', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()))
            .returns(true);

          performStandardAuction();
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledWithExactly(log.info, `Analytics report sent to ${endpoint}`, getStandardAnalyticsReport());
        });

        it('it calls "sendBeacon" as soon as all values are available (before timeout)', function () {
          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          navigator.sendBeacon
            .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

          performStandardAuction();
          sandbox.clock.tick(1);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, getStandardAnalyticsReport());
        });
      });

      context('and a valid US Privacy configuration is present', function () {
        ['1YNY', '1---', '1NY-', '1Y--', '1--Y', '1N--', '1--N', '1NNN'].forEach(consent => {
          it(`it calls "sendBeacon" with a report containing the "${consent}" privacy string`, function () {
            sandbox.stub(uspDataHandler, 'getConsentData').returns(consent);
            this.enableAnalytics();

            const reportWithConsent = {
              ...getStandardAnalyticsReport(),
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
              .withArgs('http://test-endpoint', getStandardAnalyticsReport());

            performStandardAuction();
            sandbox.clock.tick(this.defaultTimeout + 1);

            assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, 'http://test-endpoint', getStandardAnalyticsReport());
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

        assert.calledWithExactly(log.error, 'Analytics report exceeded User-Agent data limits and was not sent.', getStandardAnalyticsReport());
      });
    });

    context('when an auction report was already sent', function () {
      context('and a new bid won event is returned after the report completes', function () {
        it('it finishes the auction without error', function () {
          const incompleteAnalyticsReport = getStandardAnalyticsReport();
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
            .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

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
          .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

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
          .withArgs(endpoint, JSON.stringify(getStandardAnalyticsReport()));

        const { prebid: [auction] } = getMockEvents();

        performStandardAuction({ exclude: [EVENTS.BID_WON] });

        for (let bidWon of auction.BID_WON) {
          events.emit(EVENTS.BID_WON, bidWon);
        }

        assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, getStandardAnalyticsReport());
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
          const incompleteAnalyticsReport = getStandardAnalyticsReport();
          incompleteAnalyticsReport.auctions.forEach(auction => {
            auction.adUnits.forEach(adUnit => {
              adUnit.bids.forEach(bid => {
                bid.hasWon = 0;
              });
            });
          });

          navigator.sendBeacon.returns(true);

          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          performStandardAuction({exclude: ['bidWon', 'auctionEnd']});
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledOnceWithStringJsonEquivalent(navigator.sendBeacon, endpoint, incompleteAnalyticsReport);
        });

        it('it logs an info message', function () {
          const incompleteAnalyticsReport = getStandardAnalyticsReport();
          incompleteAnalyticsReport.auctions.forEach(auction => {
            auction.adUnits.forEach(adUnit => {
              adUnit.bids.forEach(bid => {
                bid.hasWon = 0;
              });
            });
          });

          navigator.sendBeacon.returns(true);

          const endpoint = faker.internet.url();
          this.enableAnalytics({ endpoint });

          performStandardAuction({exclude: ['bidWon', 'auctionEnd']});
          sandbox.clock.tick(this.defaultTimeout + 1);

          assert.calledWithExactly(log.info, `Analytics report sent to ${endpoint}`, incompleteAnalyticsReport);
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

  if (!exclude.includes('slotRenderEnded')) {
    for (let gEvent of gam.slotRenderEnded) {
      mockGpt.emitEvent(gEvent);
    }
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
  // Derived from ReportDefnition.cue -> AnalyticsReport
  function isAnalyticsReport(report) {
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
    report.auctions.forEach(isAuction);
  }
  function isAuction(auction) {
    assert.hasAllKeys(auction, ['adUnits', 'auctionId', 'userIds']);
    assert.isArray(auction.adUnits);
    assert.isString(auction.auctionId);
    assert.isArray(auction.userIds);
    auction.adUnits.forEach(isAdUnit);
  }
  function isAdUnit(adUnit) {
    assert.hasAllKeys(adUnit, ['transactionId', 'adUnitCode', 'slotId', 'mediaTypes', 'sizes', 'bids']);
    assert.isString(adUnit.transactionId);
    assert.isString(adUnit.adUnitCode);
    assert.isString(adUnit.slotId);
    assert.isArray(adUnit.mediaTypes);
    assert.isArray(adUnit.sizes);
    assert.isArray(adUnit.bids);
    adUnit.mediaTypes.forEach(isMediaType);
    adUnit.sizes.forEach(isSizeString);
    adUnit.bids.forEach(isBid);
  }
  function isBid(bid) {
    assert.containsAllKeys(bid, ['bidder', 'bidId', 'source', 'status', 'hasWon']);
    if ('bidResponse' in bid) {
      isBidResponse(bid.bidResponse);
    }
    assert.isString(bid.bidder);
    assert.isString(bid.bidId);
    assert.isString(bid.source);
    assert.oneOf(bid.status, [...Object.values(BID_STATUS), 'pending']);
    assert.oneOf(bid.hasWon, [0, 1]);
  }
  function isBidResponse(bidResponse) {
    assert.containsAllKeys(bidResponse, ['mediaType', 'size', 'cur', 'cpm', 'cpmFloor']);
    if ('cpmOrig' in bidResponse) {
      assert.isNumber(bidResponse.cpmOrig);
    }
    isMediaType(bidResponse.mediaType);
    isSizeString(bidResponse.size);
    assert.isString(bidResponse.cur);
    assert.isNumber(bidResponse.cpm);
    assert.isNumber(bidResponse.cpmFloor);
  }
  function isMediaType(mediaType) {
    assert.oneOf(mediaType, ['banner', 'video', 'native']);
  }
  function isSizeString(size) {
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
    isAnalyticsReport,
    isAuction,
    isAdUnit,
    isBid,
    isBidResponse,
    isMediaType,
    isSizeString
  }
};

function getStandardAnalyticsReport() {
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
  const ad = '<!-- Creative --><div>ad</div>';
  const auctionId = 'auction-000';

  return {
    gam: {
      slotRenderEnded: [
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: true,
          slotContentChanged: true,
          size: null,
          advertiserId: null,
          campaignId: null,
          creativeId: null,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: null,
          isBackfill: false,
        },
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: false,
          slotContentChanged: true,
          size: [1, 1],
          advertiserId: 12345,
          campaignId: 400000001,
          creativeId: 6789,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: 1011,
          isBackfill: false,
          yieldGroupIds: null,
          companyIds: null,
        },
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: false,
          slotContentChanged: true,
          size: [728, 90],
          advertiserId: 12346,
          campaignId: 299999000,
          creativeId: 6790,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: 1012,
          isBackfill: false,
          yieldGroupIds: null,
          companyIds: null,
        },
      ],
    },
    prebid: [{
      AUCTION_INIT: {
        auctionId,
        timestamp: 1680279732944,
        auctionStatus: 'inProgress',
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
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [300, 250],
              [300, 600],
            ],
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            ortb2Imp: {
              ext: {
                tid: 'ef947609-7b55-4420-8407-599760d0e373',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-0',
                  },
                  pbadslot: '/19968336/header-bid-tag-0',
                },
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
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [728, 90],
              [970, 250],
            ],
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            ortb2Imp: {
              ext: {
                tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-1',
                  },
                  pbadslot: '/19968336/header-bid-tag-1',
                },
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
            floors: {
              currency: 'USD',
              schema: {
                delimiter: '|',
                fields: ['mediaType', 'size'],
              },
              values: {
                'banner|300x250': 0.01,
              },
            },
            bids: [
              {
                bidder: '33across',
                params: {
                  siteId: 'dukr5O4SWr6iygaKkGJozW',
                  productId: 'siab',
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placementId: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            ortb2Imp: {
              ext: {
                tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/17118521/header-bid-tag-2',
                  },
                  pbadslot: '/17118521/header-bid-tag-2',
                },
                gpid: '/17118521/header-bid-tag-2',
              },
            },
          },
        ],
        adUnitCodes: [
          '/19968336/header-bid-tag-0',
          '/19968336/header-bid-tag-1',
          '/17118521/header-bid-tag-2',
        ],
        bidderRequests: [
          {
            bidderCode: 'bidder0',
            auctionId,
            bidderRequestId: '196b58215c10dc9',
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'ef947609-7b55-4420-8407-599760d0e373',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-0',
                      },
                      pbadslot: '/19968336/header-bid-tag-0',
                    },
                    gpid: '/19968336/header-bid-tag-0',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-0',
                transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
                bidId: '20661fc5fbb5d9b',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-1',
                      },
                      pbadslot: '/19968336/header-bid-tag-1',
                    },
                    gpid: '/19968336/header-bid-tag-1',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [728, 90],
                      [970, 250],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
                bidId: '21ad295f40dd7ab',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/17118521/header-bid-tag-2',
                      },
                      pbadslot: '/17118521/header-bid-tag-2',
                    },
                    gpid: '/17118521/header-bid-tag-2',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/17118521/header-bid-tag-2',
                transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                sizes: [[300, 250]],
                bidId: '22108ac7b778717',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
            ],
            auctionStart: 1680279732944,
            timeout: 3000,
            refererInfo: {
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['https://site.example.com/pb.html'],
              topmostLocation: 'https://site.example.com/pb.html',
              location: 'https://site.example.com/pb.html',
              canonicalUrl: null,
              page: 'https://site.example.com/pb.html',
              domain: 'site.example.com',
              ref: null,
              legacy: {
                reachedTop: true,
                isAmp: false,
                numIframes: 0,
                stack: ['https://site.example.com/pb.html'],
                referer: 'https://site.example.com/pb.html',
                canonicalUrl: null,
              },
            },
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
            start: 1680279732963,
          }
        ],
        noBids: [],
        bidsReceived: [],
        bidsRejected: [],
        winningBids: [],
        timeout: 3000,
        seatNonBids: [],
        config: {
          publisherId: '1001',
        },
      },
      BID_REQUESTED: [
        {
          bidderCode: 'bidder0',
          auctionId,
          transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
          bids: [
            {
              bidder: 'bidder0',
              params: {
                placement_id: 12345678,
              },
              userId: {
                '33acrossId': {
                  envelope:
                    'v1.0014',
                },
              },
              userIdAsEids: [
                {
                  source: '33across.com',
                  uids: [
                    {
                      id: 'v1.0014',
                      atype: 1,
                    },
                  ],
                },
              ],
              crumbs: {
                pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
              },
              ortb2Imp: {
                ext: {
                  tid: 'ef947609-7b55-4420-8407-599760d0e373',
                  data: {
                    adserver: {
                      name: 'gam',
                      adslot: '/19968336/header-bid-tag-0',
                    },
                    pbadslot: '/19968336/header-bid-tag-0',
                  },
                  gpid: '/19968336/header-bid-tag-0',
                },
              },
              mediaTypes: {
                banner: {
                  sizes: [
                    [300, 250],
                    [300, 600],
                  ],
                },
              },
              adUnitCode: '/19968336/header-bid-tag-0',
              transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
              sizes: [
                [300, 250],
                [300, 600],
              ],
              bidId: '20661fc5fbb5d9b',
              bidderRequestId: '196b58215c10dc9',
              auctionId,
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0,
              ortb2: {
                site: {
                  page: 'https://site.example.com/pb.html',
                  domain: 'site.example.com',
                  publisher: {
                    domain: 'site.example.com',
                  },
                },
                device: {
                  w: 594,
                  h: 976,
                  dnt: 0,
                  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                  language: 'en',
                  sua: {
                    source: 2,
                    platform: {
                      brand: 'macOS',
                      version: ['13', '2', '1'],
                    },
                    browsers: [
                      {
                        brand: 'Google Chrome',
                        version: ['111', '0', '5563', '110'],
                      },
                      {
                        brand: 'Not(A:Brand',
                        version: ['8', '0', '0', '0'],
                      },
                      {
                        brand: 'Chromium',
                        version: ['111', '0', '5563', '110'],
                      },
                    ],
                    mobile: 0,
                    model: '',
                    bitness: '64',
                    architecture: 'arm',
                  },
                },
              },
            },
            {
              bidder: 'bidder0',
              params: {
                placement_id: 12345678,
              },
              userId: {
                '33acrossId': {
                  envelope:
                    'v1.0014',
                },
              },
              userIdAsEids: [
                {
                  source: '33across.com',
                  uids: [
                    {
                      id: 'v1.0014',
                      atype: 1,
                    },
                  ],
                },
              ],
              crumbs: {
                pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
              },
              ortb2Imp: {
                ext: {
                  tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                  data: {
                    adserver: {
                      name: 'gam',
                      adslot: '/19968336/header-bid-tag-1',
                    },
                    pbadslot: '/19968336/header-bid-tag-1',
                  },
                  gpid: '/19968336/header-bid-tag-1',
                },
              },
              mediaTypes: {
                banner: {
                  sizes: [
                    [728, 90],
                    [970, 250],
                  ],
                },
              },
              adUnitCode: '/19968336/header-bid-tag-1',
              transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
              sizes: [
                [728, 90],
                [970, 250],
              ],
              bidId: '21ad295f40dd7ab',
              bidderRequestId: '196b58215c10dc9',
              auctionId,
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0,
              ortb2: {
                site: {
                  page: 'https://site.example.com/pb.html',
                  domain: 'site.example.com',
                  publisher: {
                    domain: 'site.example.com',
                  },
                },
                device: {
                  w: 594,
                  h: 976,
                  dnt: 0,
                  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                  language: 'en',
                  sua: {
                    source: 2,
                    platform: {
                      brand: 'macOS',
                      version: ['13', '2', '1'],
                    },
                    browsers: [
                      {
                        brand: 'Google Chrome',
                        version: ['111', '0', '5563', '110'],
                      },
                      {
                        brand: 'Not(A:Brand',
                        version: ['8', '0', '0', '0'],
                      },
                      {
                        brand: 'Chromium',
                        version: ['111', '0', '5563', '110'],
                      },
                    ],
                    mobile: 0,
                    model: '',
                    bitness: '64',
                    architecture: 'arm',
                  },
                },
              },
            },
            {
              bidder: 'bidder0',
              params: {
                placement_id: 20216405,
              },
              userId: {
                '33acrossId': {
                  envelope:
                    'v1.0014',
                },
              },
              userIdAsEids: [
                {
                  source: '33across.com',
                  uids: [
                    {
                      id: 'v1.0014',
                      atype: 1,
                    },
                  ],
                },
              ],
              crumbs: {
                pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
              },
              ortb2Imp: {
                ext: {
                  tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                  data: {
                    adserver: {
                      name: 'gam',
                      adslot: '/17118521/header-bid-tag-2',
                    },
                    pbadslot: '/17118521/header-bid-tag-2',
                  },
                  gpid: '/17118521/header-bid-tag-2',
                },
              },
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]],
                },
              },
              adUnitCode: '/17118521/header-bid-tag-2',
              transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
              sizes: [[300, 250]],
              bidId: '22108ac7b778717',
              bidderRequestId: '196b58215c10dc9',
              auctionId,
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0,
              ortb2: {
                site: {
                  page: 'https://site.example.com/pb.html',
                  domain: 'site.example.com',
                  publisher: {
                    domain: 'site.example.com',
                  },
                },
                device: {
                  w: 594,
                  h: 976,
                  dnt: 0,
                  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                  language: 'en',
                  sua: {
                    source: 2,
                    platform: {
                      brand: 'macOS',
                      version: ['13', '2', '1'],
                    },
                    browsers: [
                      {
                        brand: 'Google Chrome',
                        version: ['111', '0', '5563', '110'],
                      },
                      {
                        brand: 'Not(A:Brand',
                        version: ['8', '0', '0', '0'],
                      },
                      {
                        brand: 'Chromium',
                        version: ['111', '0', '5563', '110'],
                      },
                    ],
                    mobile: 0,
                    model: '',
                    bitness: '64',
                    architecture: 'arm',
                  },
                },
              },
            },
          ],
          auctionStart: 1680279732944,
          timeout: 3000,
          refererInfo: {
            reachedTop: true,
            isAmp: false,
            numIframes: 0,
            stack: ['https://site.example.com/pb.html'],
            topmostLocation: 'https://site.example.com/pb.html',
            location: 'https://site.example.com/pb.html',
            canonicalUrl: null,
            page: 'https://site.example.com/pb.html',
            domain: 'site.example.com',
            ref: null,
            legacy: {
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['https://site.example.com/pb.html'],
              referer: 'https://site.example.com/pb.html',
              canonicalUrl: null,
            },
          },
          ortb2: {
            site: {
              page: 'https://site.example.com/pb.html',
              domain: 'site.example.com',
              publisher: {
                domain: 'site.example.com',
              },
            },
            device: {
              w: 594,
              h: 976,
              dnt: 0,
              ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
              language: 'en',
              sua: {
                source: 2,
                platform: {
                  brand: 'macOS',
                  version: ['13', '2', '1'],
                },
                browsers: [
                  {
                    brand: 'Google Chrome',
                    version: ['111', '0', '5563', '110'],
                  },
                  {
                    brand: 'Not(A:Brand',
                    version: ['8', '0', '0', '0'],
                  },
                  {
                    brand: 'Chromium',
                    version: ['111', '0', '5563', '110'],
                  },
                ],
                mobile: 0,
                model: '',
                bitness: '64',
                architecture: 'arm',
              },
            },
          },
          start: 1680279732963,
        }],
      BID_RESPONSE: [{
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '123456789abcdef',
        requestId: '20661fc5fbb5d9b',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-0',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        bidder: 'bidder0',
        timeToRespond: 341,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '300x250',
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 728,
        height: 90,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '21ad295f40dd7ab',
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733305,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        status: 'targetingSet',
      },
      {
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '22108ac7b778717',
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/17118521/header-bid-tag-2',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733305,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        status: 'targetingSet',
      }],
      BID_WON: [{
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '123456789abcdef',
        requestId: '20661fc5fbb5d9b',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-0',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733304,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 341,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '300x250',
        adserverTargeting: {
          bidder: 'bidder0',
          hb_adid: '123456789abcdef',
          hb_pb: '1.50',
          hb_size: '300x250',
          hb_source: 'client',
          hb_format: 'banner',
          hb_adomain: '',
          hb_acat: '',
        },
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 728,
        height: 90,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '21ad295f40dd7ab',
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733304,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        adserverTargeting: {
          bidder: 'bidder0',
          hb_adid: '3969aa0dc284f9e',
          hb_pb: '1.50',
          hb_size: '728x90',
          hb_source: 'client',
          hb_format: 'banner',
          hb_adomain: '',
          hb_acat: '',
        },
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '22108ac7b778717',
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/17118521/header-bid-tag-2',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733305,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        status: 'targetingSet',
      }],
      AUCTION_END: {
        auctionId,
        timestamp: 1680279732944,
        auctionEnd: 1680279733675,
        auctionStatus: 'completed',
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
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [300, 250],
              [300, 600],
            ],
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            ortb2Imp: {
              ext: {
                tid: 'ef947609-7b55-4420-8407-599760d0e373',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-0',
                  },
                  pbadslot: '/19968336/header-bid-tag-0',
                },
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
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [728, 90],
              [970, 250],
            ],
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            ortb2Imp: {
              ext: {
                tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-1',
                  },
                  pbadslot: '/19968336/header-bid-tag-1',
                },
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
            floors: {
              currency: 'USD',
              schema: {
                delimiter: '|',
                fields: ['mediaType', 'size'],
              },
              values: {
                'banner|300x250': 0.01,
              },
            },
            bids: [
              {
                bidder: '33across',
                params: {
                  siteId: 'dukr5O4SWr6iygaKkGJozW',
                  productId: 'siab',
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placementId: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            ortb2Imp: {
              ext: {
                tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/17118521/header-bid-tag-2',
                  },
                  pbadslot: '/17118521/header-bid-tag-2',
                },
                gpid: '/17118521/header-bid-tag-2',
              },
            },
          },
        ],
        adUnitCodes: [
          '/19968336/header-bid-tag-0',
          '/19968336/header-bid-tag-1',
          '/17118521/header-bid-tag-2',
        ],
        bidderRequests: [
          {
            bidderCode: 'bidder0',
            auctionId,
            bidderRequestId: '196b58215c10dc9',
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'ef947609-7b55-4420-8407-599760d0e373',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-0',
                      },
                      pbadslot: '/19968336/header-bid-tag-0',
                    },
                    gpid: '/19968336/header-bid-tag-0',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-0',
                transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
                bidId: '20661fc5fbb5d9b',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-1',
                      },
                      pbadslot: '/19968336/header-bid-tag-1',
                    },
                    gpid: '/19968336/header-bid-tag-1',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [728, 90],
                      [970, 250],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
                bidId: '21ad295f40dd7ab',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/17118521/header-bid-tag-2',
                      },
                      pbadslot: '/17118521/header-bid-tag-2',
                    },
                    gpid: '/17118521/header-bid-tag-2',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/17118521/header-bid-tag-2',
                transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                sizes: [[300, 250]],
                bidId: '22108ac7b778717',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
            ],
            auctionStart: 1680279732944,
            timeout: 3000,
            refererInfo: {
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['https://site.example.com/pb.html'],
              topmostLocation: 'https://site.example.com/pb.html',
              location: 'https://site.example.com/pb.html',
              canonicalUrl: null,
              page: 'https://site.example.com/pb.html',
              domain: 'site.example.com',
              ref: null,
              legacy: {
                reachedTop: true,
                isAmp: false,
                numIframes: 0,
                stack: ['https://site.example.com/pb.html'],
                referer: 'https://site.example.com/pb.html',
                canonicalUrl: null,
              },
            },
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
            start: 1680279732963,
          }
        ],
        noBids: [ /* no need to populate */],
        bidsReceived: [
          {
            bidderCode: 'bidder0',
            width: 300,
            height: 250,
            statusMessage: 'Bid available',
            adId: '123456789abcdef',
            requestId: '20661fc5fbb5d9b',
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            auctionId,
            mediaType: 'banner',
            source: 'client',
            cpm: 1.5,
            creativeId: 96846035,
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            adUnitCode: '/19968336/header-bid-tag-0',
            bidder0: {
              buyerMemberId: 1234,
            },
            ad,
            adapterCode: 'bidder0',
            originalCpm: 1.5,
            originalCurrency: 'USD',
            floorData: {
              cpmAfterAdjustments: 1
            },
            bidder: 'bidder0',
            timeToRespond: 341,
            pbLg: '1.50',
            pbMg: '1.50',
            pbHg: '1.50',
            pbAg: '1.50',
            pbDg: '1.50',
            pbCg: '',
            size: '300x250',
            status: 'rendered',
            params: [
              {
                placementId: 12345678,
              },
            ],
          },
          {
            bidderCode: 'bidder0',
            width: 728,
            height: 90,
            statusMessage: 'Bid available',
            adId: '3969aa0dc284f9e',
            requestId: '21ad295f40dd7ab',
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            auctionId,
            mediaType: 'banner',
            source: 'client',
            cpm: 1.5,
            creativeId: 98476543,
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            adUnitCode: '/19968336/header-bid-tag-1',
            bidder0: {
              buyerMemberId: 1234,
            },
            ad,
            adapterCode: 'bidder0',
            originalCpm: 1.5,
            originalCurrency: 'USD',
            floorData: {
              cpmAfterAdjustments: 1
            },
            responseTimestamp: 1680279733305,
            requestTimestamp: 1680279732963,
            bidder: 'bidder0',
            timeToRespond: 342,
            pbLg: '1.50',
            pbMg: '1.50',
            pbHg: '1.50',
            pbAg: '1.50',
            pbDg: '1.50',
            pbCg: '',
            size: '728x90',
            status: 'targetingSet',
          },
        ],
        bidsRejected: [],
        winningBids: [],
        timeout: 3000,
        seatNonBids: [],
      },
    }]
  };
}
