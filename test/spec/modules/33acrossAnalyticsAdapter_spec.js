/* eslint-disable indent */
import { expect } from 'chai';

import analyticsAdapter from 'modules/33acrossAnalyticsAdapter.js';

import * as mockGpt from 'test/spec/integration/faker/googletag.js';

import * as utils from 'src/utils.js';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
const { EVENTS } = CONSTANTS;

describe.only('33acrossAnalyticsAdapter:', function() {
  let sandbox, clock;

  beforeEach(function() {
    mockGpt.enable();
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers(1680287706002);
  });

  afterEach(function() {
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
  });

  describe('enableAnalytics', function() {
    context('when endpoint hasn\'t been given', function() {
      it('logs an error', function() {
        sandbox.spy(utils, 'logError');

        analyticsAdapter.enableAnalytics({
          provider: '33across',
          options: {
            pid: 'test-pid',
          },
        });

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledWithExactly(utils.logError, '33across Analytics: No endpoint provided for "options.endpoint". No analytics will be sent.');
      });
    });

    context('when pid hasn\'t been given', function() {
      it('logs an error', function() {
        sandbox.spy(utils, 'logError');
        analyticsAdapter.enableAnalytics({
          provider: '33across',
          options: {
            endpoint: 'test-endpoint',
          },
        });

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledWithExactly(utils.logError, '33across Analytics: No partnerId provided for "options.pid". No analytics will be sent.');
      });
    });

    context('when pid and endpoint have been given', function() {
      context('and an invalid timeout config value has been given', function() {
        it('logs an info message', function() {
          sandbox.spy(utils, 'logInfo');

          [ null, 'foo', -1 ].forEach((value, index) => {
            analyticsAdapter.enableAnalytics({
              provider: '33across',
              options: {
                pid: 'test-pid',
                endpoint: 'test-endpoint',
                timeout: value
              },
            });
            analyticsAdapter.disableAnalytics();

            sinon.assert.calledWithExactly(utils.logInfo.getCall(index), '33across Analytics: Invalid timeout provided for "options.timeout". Using default timeout of 3000ms.');
          });
        });
      });

      it('logs any received GAM slotRenderEnded event', function() {
        sandbox.spy(utils, 'logInfo');

        analyticsAdapter.enableAnalytics({
          provider: '33across',
          options: {
            pid: 'test-pid',
            endpoint: 'test-endpoint'
          },
        });

        window.googletag.cmd.forEach(fn => fn());

        const { gam } = getMockEvents();
        const [ gEvent ] = gam.slotRenderEnded;

        mockGpt.emitEvent('slotRenderEnded', gEvent);

        sinon.assert.calledOnce(utils.logInfo);
        sinon.assert.calledWithExactly(utils.logInfo, '33across Analytics: slotRenderEnded', Object.assign({ eventName: 'slotRenderEnded'}, gEvent));
      });
    });
  });

  describe('disableAnalytics()', function() {
    xit('removes the GAM slotRenderEnded event listeners', ()=> {

    });
  });

  describe('when handling events', function() {
    beforeEach(function() {
      this.defaultTimeout = 3000;
      this.enableAnalytics = (options) => {
        analyticsAdapter.enableAnalytics({
          provider: '33across',
          options: {
            endpoint: 'test-endpoint',
            pid: 'test-pid',
            timeout: this.defaultTimeout,
            ...options
          },
        });
      }
    });

    it('sends a correctly formed AnalyticsReport to the given endpoint when an auction is complete', function() {
      this.enableAnalytics({ endpoint: 'foo-endpoint' });

      sandbox.stub(navigator, 'sendBeacon').returns(true);
      performStandardAuction();
      clock.tick(this.defaultTimeout + 1);

      sinon.assert.calledOnce(navigator.sendBeacon);
      sinon.assert.calledWithExactly(navigator.sendBeacon, 'foo-endpoint',
        JSON.stringify(getStandardAnalyticsReport()));
    });

    context('when an error occurs while sending the AnalyticsReport', function() {
      it('logs an error', function() {
        sandbox.spy(utils, 'logError');
        this.enableAnalytics({ endpoint: 'foo-endpoint' });

        sandbox.stub(navigator, 'sendBeacon').returns(false);
        performStandardAuction();
        clock.tick(this.defaultTimeout + 1);

        sinon.assert.calledOnce(utils.logError);

        // FIXME: The args match doesn't work
        // sinon.assert.calledWith(utils.logError, 'Analytics report exceeded User-Agent data limits and was not sent.', sinon.match.object);
      });
    });

    context('when a transaction doesn\'t reach its complete state', function() {
      context('and a timeout config value has been given', function() {
        context('and the timeout value has elapsed', function() {
          it('logs an error', function() {
            this.enableAnalytics({ timeout: 2000 });

            sandbox.spy(utils, 'logWarn');

            performAuctionWithMissingBidWon();

            clock.tick(2001);

            sinon.assert.calledWithExactly(utils.logWarn, '33across Analytics: Timed out waiting for ad transactions to complete. Sending report.');
          });
        })
      });

      context('and a timeout config value hasn\'t been given', function() {
        context('and the default timeout has elapsed', function() {
          it('logs an error', function() {
            this.enableAnalytics();

            sandbox.spy(utils, 'logWarn');

            performAuctionWithMissingBidWon();

            clock.tick(this.defaultTimeout + 1);

            sinon.assert.calledWithExactly(utils.logWarn, '33across Analytics: Timed out waiting for ad transactions to complete. Sending report.');
          });
        })
      });

      xit('sends the report in its current state', function() {
        sandbox.stub(navigator, 'sendBeacon').returns(true);

        // As soon as the analyticsAdapter is enabled, its event handler
        // will start getting events from another unit test.
        // Every enablement of the adapter has its own instance
        // of the transaction manager but the mocked transaction IDs
        // are the same.
        //
        // We need to start generation different transaction IDs for the mocked
        // events and evaluate having a structure like
        // this.#transactions[auctionId][transactionId]
        this.enableAnalytics();

        performAuctionWithMissingBidWon();

        clock.tick(this.defaultTimeout + 1);

        sinon.assert.calledOnce(navigator.sendBeacon);
        // sinon.assert.calledWith(navigator.sendBeacon, 'test-endpoint');
      });
    });
  });
});

/**
 * Events in possible order of execution
 * ADD_AD_UNITS
 * REQUEST_BIDS
 * BEFORE_REQUEST_BIDS
 * AUCTION_INIT
 * BID_REQUESTED
 * BEFORE_BIDDER_HTTP
 * NO_BID
 * BIDDER_DONE
 * BID_ADJUSTMENT
 * BID_RESPONSE
 * BIDDER_DONE
 * NO_BID
 * TCF2_ENFORCEMENT
 * AUCTION_END
 * SET_TARGETING
 * BIDDER_DONE
 * - GAM SLOT RENDER EVENT
 * BID_WON
 * AD_RENDER_SUCCEEDED
 * AD_RENDER_FAILED
 * BID_TIMEOUT
 */

function performStandardAuction() {
  const mockEvents = getMockEvents();
  const { prebid, gam } = mockEvents;

  for (let auction of prebid) {
    events.emit(EVENTS.AUCTION_INIT, auction.AUCTION_INIT);
    events.emit(EVENTS.AUCTION_END, auction.AUCTION_END);

    for (let gEvent of gam.slotRenderEnded) {
      mockGpt.emitEvent(gEvent);
    }

    auction.BID_WON.forEach((bidWonEvent) => {
      events.emit(EVENTS.BID_WON, bidWonEvent);
    });
  }
}

function performAuctionWithMissingBidWon() {
  const mockEvents = getMockEvents();
  let { prebid, gam } = mockEvents;

  const [ auction ] = prebid;

  events.emit(EVENTS.AUCTION_INIT, auction.AUCTION_INIT);
  events.emit(EVENTS.AUCTION_END, auction.AUCTION_END);
}

function getStandardAnalyticsReport() {
  return {
    siteId: '',
    pid: 'test-pid',
    src: 'pbjs',
    analyticsVersion: '1.0.0',
    pbjsVersion: '$prebid.version$',
    auctions: [{
      adUnits: [{
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        adUnitCode: '/19968336/header-bid-tag-0',
        slotId: '',
        mediaTypes: ['banner'],
        sizes: ['300x250', '300x600'],
        bids: [{
          bidder: 'bidder0',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }]
      }, {
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        adUnitCode: '/19968336/header-bid-tag-1',
        slotId: '',
        mediaTypes: ['banner'],
        sizes: ['728x90', '970x250'],
        bids: [{
          bidder: 'bidder0',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }]
      }, {
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        adUnitCode: '/17118521/header-bid-tag-2',
        slotId: '',
        mediaTypes: ['banner'],
        sizes: ['300x250'],
        bids: [{
          bidder: '33across',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder1',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder2',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder3',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder4',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder6',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder0',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder0Ast',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder8',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder5',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder9',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder10',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder7',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder11',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'bidder12',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'rubicon',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }, {
          bidder: 'pulsepoint',
          bidResponse: {
            cpm: 0,
            cur: '',
            cpmOrig: 0,
            cpmFloor: 0,
            mediaType: '',
            size: ''
          }
        }]
      }],
      auctionId: 'auction-000',
      userIds: {}
    }],
    bidsWon: [{
      bidder: 'bidder0',
      source: 'client',
      status: 'rendered',
      transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
      bidResponse: {
        cpm: 0,
        cur: '',
        cpmOrig: 0,
        cpmFloor: 0,
        mediaType: '',
        size: ''
      }
    }, {
      bidder: 'bidder0',
      source: 'client',
      status: 'rendered',
      transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
      bidResponse: {
        cpm: 0,
        cur: '',
        cpmOrig: 0,
        cpmFloor: 0,
        mediaType: '',
        size: ''
      }
    }, {
      bidder: 'bidder0',
      source: 'client',
      status: 'targetingSet',
      transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
      bidResponse: {
        cpm: 0,
        cur: '',
        cpmOrig: 0,
        cpmFloor: 0,
        mediaType: '',
        size: ''
      }
    }]
  };
}

function getMockEvents() {
  const ad = '<!-- Creative --><div>ad</div>';

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
        auctionId: 'auction-000',
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
            bidderCode: '33across',
            auctionId: 'auction-000',
            bidderRequestId: '15bef0b1fd2b2e',
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
                bidId: '278a991ca57141',
                bidderRequestId: '15bef0b1fd2b2e',
                auctionId: 'auction-000',
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
            start: 1680279732948,
          },
          {
            bidderCode: 'bidder0',
            auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
          },
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
      BID_WON: [{
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '123456789abcdef',
        requestId: '20661fc5fbb5d9b',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        auctionId: 'auction-000',
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
        auctionId: 'auction-000',
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
        requestId: '15bef0b1fd2b2e',
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        auctionId: 'auction-000',
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
        auctionId: 'auction-000',
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
                bidder: 'bidder1',
                params: {
                  placement_id: '2b370ff1b325695fdfea',
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
                bidder: 'bidder2',
                params: {
                  networkId: '7314',
                  publisherSubId: 'NotTheBee.com',
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
                bidder: 'bidder3',
                params: {
                  tagid: '776781',
                },
                size: [300, 250],
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
                bidder: 'bidder4',
                params: {
                  pkey: 'APPvQEaPRAB8WaJrrW74hYib',
                },
                size: [300, 250],
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
                bidder: 'bidder6',
                params: {
                  unit: '542293636',
                  delDomain: 'adnimation-d.bidder6.net',
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
              {
                bidder: 'bidder0Ast',
                params: {
                  placementId: '23118001',
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
                bidder: 'bidder8',
                params: {
                  siteId: '584353',
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
                bidder: 'bidder5',
                params: {
                  publisherId: '160685',
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
                bidder: 'bidder9',
                params: {
                  tagId: 'YWRuaW1hdGlvbi5jb20',
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
                bidder: 'bidder10',
                params: {
                  bidfloor: '0.01',
                  appId: '923b830f-b48b-4ec2-8586-f190599c29d0',
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
                bidder: 'bidder7',
                params: {
                  unitName: 'cnsmbl-audio-320x50-slider',
                  unitId: '10116',
                  siteId: '2000033',
                  networkId: '9969',
                  zoneIds: [2005074],
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
                bidder: 'bidder11',
                params: {
                  cid: '8CUWWG7OK',
                  crid: '458063742',
                  size: '300x250',
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
                bidder: 'bidder12',
                params: {
                  placementId: '2889932524039905404',
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
                bidder: 'rubicon',
                params: {
                  accountId: '12556',
                  pchain: 'playwire.com:fcddfba7adc2d929',
                  secure: true,
                  siteId: 143146,
                  video: {
                    language: 'en',
                    playerWidth: '640',
                    playerHeight: '480',
                    size_id: '201',
                  },
                  zoneId: 1493791,
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
                bidder: 'pulsepoint',
                params: {
                  cf: '300x250',
                  cp: 12345,
                  ct: 12345,
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
            bidderCode: '33across',
            auctionId: 'auction-000',
            bidderRequestId: '15bef0b1fd2b2e',
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
                bidId: '278a991ca57141',
                bidderRequestId: '15bef0b1fd2b2e',
                auctionId: 'auction-000',
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
            start: 1680279732948,
          },
          {
            bidderCode: 'bidder5',
            auctionId: 'auction-000',
            bidderRequestId: '3291cb014b476f',
            bids: [
              {
                bidder: 'bidder5',
                params: {
                  publisherId: '160685',
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
                bidId: '4aa9cadf65349f',
                bidderRequestId: '3291cb014b476f',
                auctionId: 'auction-000',
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
            start: 1680279732951,
          },
          {
            bidderCode: 'bidder6',
            auctionId: 'auction-000',
            bidderRequestId: '5970694290d904',
            bids: [
              {
                bidder: 'bidder6',
                params: {
                  unit: '542293636',
                  delDomain: 'adnimation-d.bidder6.net',
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
                bidId: '679d8548884e77',
                bidderRequestId: '5970694290d904',
                auctionId: 'auction-000',
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
            start: 1680279732952,
          },
          {
            bidderCode: 'bidder7',
            auctionId: 'auction-000',
            bidderRequestId: '795a032f6fd0a4',
            bids: [
              {
                bidder: 'bidder7',
                params: {
                  unitName: 'cnsmbl-audio-320x50-slider',
                  unitId: '10116',
                  siteId: '2000033',
                  networkId: '9969',
                  zoneIds: [2005074],
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
                bidId: '85f09b966e352',
                bidderRequestId: '795a032f6fd0a4',
                auctionId: 'auction-000',
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
            start: 1680279732954,
          },
          {
            bidderCode: 'bidder0Ast',
            auctionId: 'auction-000',
            bidderRequestId: '943e8011283df8',
            bids: [
              {
                bidder: 'bidder0Ast',
                params: {
                  placement_id: '23118001',
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
                bidId: '10eff0b5e62207e',
                bidderRequestId: '943e8011283df8',
                auctionId: 'auction-000',
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
            start: 1680279732955,
          },
          {
            bidderCode: 'bidder1',
            auctionId: 'auction-000',
            bidderRequestId: '11ef9ba88706948',
            bids: [
              {
                bidder: 'bidder1',
                params: {
                  placement_id: '2b370ff1b325695fdfea',
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
                bidId: '120d003a1ad64ee',
                bidderRequestId: '11ef9ba88706948',
                auctionId: 'auction-000',
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
            start: 1680279732957,
          },
          {
            bidderCode: 'bidder3',
            auctionId: 'auction-000',
            bidderRequestId: '135e79fd79c43d5',
            bids: [
              {
                bidder: 'bidder3',
                params: {
                  tagid: '776781',
                },
                size: [300, 250],
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
                bidId: '14002adaa6a668d',
                bidderRequestId: '135e79fd79c43d5',
                auctionId: 'auction-000',
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
            start: 1680279732959,
          },
          {
            bidderCode: 'bidder8',
            auctionId: 'auction-000',
            bidderRequestId: '1530e004dd66185',
            bids: [
              {
                bidder: 'bidder8',
                params: {
                  siteId: '584353',
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
                bidId: '160595fa6abe78f',
                bidderRequestId: '1530e004dd66185',
                auctionId: 'auction-000',
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
            start: 1680279732960,
          },
          {
            bidderCode: 'bidder10',
            auctionId: 'auction-000',
            bidderRequestId: '1735cd680171181',
            bids: [
              {
                bidder: 'bidder10',
                params: {
                  bidfloor: '0.01',
                  appId: '923b830f-b48b-4ec2-8586-f190599c29d0',
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
                bidId: '18f09d45818b9f9',
                bidderRequestId: '1735cd680171181',
                auctionId: 'auction-000',
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
            start: 1680279732962,
          },
          {
            bidderCode: 'bidder0',
            auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
                auctionId: 'auction-000',
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
          },
          {
            bidderCode: 'bidder4',
            auctionId: 'auction-000',
            bidderRequestId: '236be693ac8aab1',
            bids: [
              {
                bidder: 'bidder4',
                params: {
                  pkey: 'APPvQEaPRAB8WaJrrW74hYib',
                },
                size: [300, 250],
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
                bidId: '24e4aa3b3f8ca51',
                bidderRequestId: '236be693ac8aab1',
                auctionId: 'auction-000',
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
            start: 1680279732965,
          },
          {
            bidderCode: 'bidder12',
            auctionId: 'auction-000',
            bidderRequestId: '25f69703c7839e2',
            bids: [
              {
                bidder: 'bidder12',
                params: {
                  placementId: '2889932524039905404',
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
                bidId: '265f29671f2228c',
                bidderRequestId: '25f69703c7839e2',
                auctionId: 'auction-000',
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
            start: 1680279732966,
          },
          {
            bidderCode: 'pulsepoint',
            auctionId: 'auction-000',
            bidderRequestId: '27676b839dab671',
            bids: [
              {
                bidder: 'pulsepoint',
                params: {
                  cf: '300x250',
                  cp: 12345,
                  ct: 12345,
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
                bidId: '28ee1841acb5722',
                bidderRequestId: '27676b839dab671',
                auctionId: 'auction-000',
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
            start: 1680279732967,
          },
          {
            bidderCode: 'bidder2',
            auctionId: 'auction-000',
            bidderRequestId: '29ecdfe8cb58dcf',
            bids: [
              {
                bidder: 'bidder2',
                params: {
                  networkId: '7314',
                  publisherSubId: 'NotTheBee.com',
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
                bidId: '30c770cd8b6ecb6',
                bidderRequestId: '29ecdfe8cb58dcf',
                auctionId: 'auction-000',
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
            start: 1680279732969,
          },
          {
            bidderCode: 'bidder9',
            auctionId: 'auction-000',
            bidderRequestId: '31885f8b47e177c',
            bids: [
              {
                bidder: 'bidder9',
                params: {
                  tagId: 'YWRuaW1hdGlvbi5jb20',
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
                bidId: '324820900e1fe2e',
                bidderRequestId: '31885f8b47e177c',
                auctionId: 'auction-000',
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
            start: 1680279732982,
          },
          {
            bidderCode: 'rubicon',
            auctionId: 'auction-000',
            bidderRequestId: '33b0897ae1ec03',
            bids: [
              {
                bidder: 'rubicon',
                params: {
                  accountId: 12556,
                  pchain: 'playwire.com:fcddfba7adc2d929',
                  secure: true,
                  siteId: 143146,
                  video: {
                    language: 'en',
                    playerWidth: '640',
                    playerHeight: '480',
                    size_id: '201',
                  },
                  zoneId: 1493791,
                  floor: null,
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
                bidId: '34872cacff0a74d',
                bidderRequestId: '33b0897ae1ec03',
                auctionId: 'auction-000',
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
                startTime: 1680279732984,
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
            start: 1680279732983,
          },
          {
            bidderCode: 'bidder11',
            auctionId: 'auction-000',
            bidderRequestId: '35411e18ed77aa',
            bids: [
              {
                bidder: 'bidder11',
                params: {
                  cid: '8CUWWG7OK',
                  crid: '458063742',
                  size: '300x250',
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
                bidId: '361b21bdba26d54',
                bidderRequestId: '35411e18ed77aa',
                auctionId: 'auction-000',
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
            start: 1680279732985,
          },
        ],
        noBids: [
          {
            bidder: 'bidder5',
            params: {
              publisherId: '160685',
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
            bidId: '4aa9cadf65349f',
            bidderRequestId: '3291cb014b476f',
            auctionId: 'auction-000',
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
            bidder: 'bidder4',
            params: {
              pkey: 'APPvQEaPRAB8WaJrrW74hYib',
            },
            size: [300, 250],
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
            bidId: '24e4aa3b3f8ca51',
            bidderRequestId: '236be693ac8aab1',
            auctionId: 'auction-000',
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
            bidder: 'bidder11',
            params: {
              cid: '8CUWWG7OK',
              crid: '458063742',
              size: '300x250',
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
            bidId: '361b21bdba26d54',
            bidderRequestId: '35411e18ed77aa',
            auctionId: 'auction-000',
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
            bidder: 'bidder6',
            params: {
              unit: '542293636',
              delDomain: 'adnimation-d.bidder6.net',
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
            bidId: '679d8548884e77',
            bidderRequestId: '5970694290d904',
            auctionId: 'auction-000',
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
            bidder: 'bidder2',
            params: {
              networkId: '7314',
              publisherSubId: 'NotTheBee.com',
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
            bidId: '30c770cd8b6ecb6',
            bidderRequestId: '29ecdfe8cb58dcf',
            auctionId: 'auction-000',
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
            bidder: 'bidder8',
            params: {
              siteId: '584353',
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
            bidId: '160595fa6abe78f',
            bidderRequestId: '1530e004dd66185',
            auctionId: 'auction-000',
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
            bidder: 'pulsepoint',
            params: {
              cf: '300x250',
              cp: 12345,
              ct: 12345,
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
            bidId: '28ee1841acb5722',
            bidderRequestId: '27676b839dab671',
            auctionId: 'auction-000',
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
            bidder: 'rubicon',
            params: {
              accountId: 12556,
              pchain: 'playwire.com:fcddfba7adc2d929',
              secure: true,
              siteId: 143146,
              video: {
                language: 'en',
                playerWidth: '640',
                playerHeight: '480',
                size_id: '201',
              },
              zoneId: 1493791,
              floor: null,
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
            bidId: '34872cacff0a74d',
            bidderRequestId: '33b0897ae1ec03',
            auctionId: 'auction-000',
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
            startTime: 1680279732984,
          },
          {
            bidder: 'bidder3',
            params: {
              tagid: '776781',
            },
            size: [300, 250],
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
            bidId: '14002adaa6a668d',
            bidderRequestId: '135e79fd79c43d5',
            auctionId: 'auction-000',
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
            bidder: 'bidder0Ast',
            params: {
              placement_id: '23118001',
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
            bidId: '10eff0b5e62207e',
            bidderRequestId: '943e8011283df8',
            auctionId: 'auction-000',
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
            auctionId: 'auction-000',
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
            bidder: 'bidder7',
            params: {
              unitName: 'cnsmbl-audio-320x50-slider',
              unitId: '10116',
              siteId: '2000033',
              networkId: '9969',
              zoneIds: [2005074],
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
            bidId: '85f09b966e352',
            bidderRequestId: '795a032f6fd0a4',
            auctionId: 'auction-000',
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
            bidder: 'bidder1',
            params: {
              placement_id: '2b370ff1b325695fdfea',
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
            bidId: '120d003a1ad64ee',
            bidderRequestId: '11ef9ba88706948',
            auctionId: 'auction-000',
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
            bidId: '278a991ca57141',
            bidderRequestId: '15bef0b1fd2b2e',
            auctionId: 'auction-000',
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
            bidder: 'bidder9',
            params: {
              tagId: 'YWRuaW1hdGlvbi5jb20',
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
            bidId: '324820900e1fe2e',
            bidderRequestId: '31885f8b47e177c',
            auctionId: 'auction-000',
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
            bidder: 'bidder10',
            params: {
              bidfloor: '0.01',
              appId: '923b830f-b48b-4ec2-8586-f190599c29d0',
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
            bidId: '18f09d45818b9f9',
            bidderRequestId: '1735cd680171181',
            auctionId: 'auction-000',
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
            bidder: 'bidder12',
            params: {
              placementId: '2889932524039905404',
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
            bidId: '265f29671f2228c',
            bidderRequestId: '25f69703c7839e2',
            auctionId: 'auction-000',
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
        bidsReceived: [
          {
            bidderCode: 'bidder0',
            width: 300,
            height: 250,
            statusMessage: 'Bid available',
            adId: '123456789abcdef',
            requestId: '20661fc5fbb5d9b',
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            auctionId: 'auction-000',
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
            auctionId: 'auction-000',
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
