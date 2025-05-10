/* globals describe, beforeEach, afterEach, sinon */
import { expect } from 'chai';
import { getGptSlotInfoForAdUnitCode } from 'libraries/gptUtils/gptUtils.js';
import { getDeviceType, getBrowser, getOS } from 'libraries/userAgentUtils';
import pubxaiAnalyticsAdapter, {
  auctionCache,
} from 'modules/pubxaiAnalyticsAdapter.js';
import { EVENTS } from 'src/constants.js';
import adapterManager from 'src/adapterManager.js';
import { getWindowLocation } from 'src/utils.js';
import { getGlobal } from 'src/prebidGlobal.js';
import * as events from 'src/events.js'
import 'modules/userId/index.js'

const readBlobSafariCompat = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

describe('pubxai analytics adapter', () => {
  beforeEach(() => {
    sinon.stub(events, 'getEvents').returns([]);
    getGlobal().refreshUserIds?.()
  });

  afterEach(() => {
    events.getEvents.restore();
  });

  describe('track', () => {
    const pubxId = '6c415fc0-8b0e-4cf5-be73-01526a4db625';
    let initOptions = {
      samplingRate: '1',
      pubxId: pubxId,
    };

    let originalVS;

    let location = getWindowLocation();

    const replaceProperty = (obj, params) => {
      let strObj = JSON.stringify(obj);
      params.forEach(({ field, updated, replaced }) => {
        strObj = strObj.replace(
          new RegExp('"' + field + '":' + replaced, 'g'),
          '"' + field + '":' + updated
        );
      });
      return JSON.parse(strObj);
    };

    let prebidEvent = {
      auctionInit: {
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        timestamp: 1603865707180,
        auctionStatus: 'inProgress',
        adUnits: [
          {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            bids: [
              {
                bidder: 'appnexus',
                params: {
                  placementId: 13144370,
                },
                auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
                floorData: {
                  skipped: false,
                  skipRate: 0,
                  modelVersion: 'test model 1.0',
                  location: 'fetch',
                  floorProvider: 'PubXFloorProvider',
                  fetchStatus: 'success',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
          },
        ],
        adUnitCodes: ['/19968336/header-bid-tag-1'],
        bidderRequests: [
          {
            bidderCode: 'appnexus',
            auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            bidderRequestId: '184cbc05bb90ba',
            bids: [
              {
                bidder: 'appnexus',
                params: {
                  placementId: 13144370,
                },
                auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
                floorData: {
                  skipped: false,
                  skipRate: 0,
                  modelVersion: 'test model 1.0',
                  location: 'fetch',
                  floorProvider: 'PubXFloorProvider',
                  fetchStatus: 'success',
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
                sizes: [[300, 250]],
                bidId: '248f9a4489835e',
                bidderRequestId: '184cbc05bb90ba',
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
              },
            ],
            ortb2: {
              device: {
                ext: {
                  cdep: true,
                },
              },
            },
            auctionStart: 1603865707180,
            timeout: 1000,
            refererInfo: {
              referer: 'http://local-pnh.net:8080/stream/',
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['http://local-pnh.net:8080/stream/'],
              canonicalUrl: null,
            },
            start: 1603865707182,
          },
        ],
        noBids: [],
        bidsReceived: [],
        winningBids: [],
        timeout: 1000,
        config: {
          samplingRate: '1',
          pubxId: pubxId,
        },
      },
      bidRequested: {
        bidderCode: 'appnexus',
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        bidderRequestId: '184cbc05bb90ba',
        bids: [
          {
            bidder: 'appnexus',
            params: {
              placementId: 13144370,
            },
            auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            floorData: {
              skipped: false,
              skipRate: 0,
              modelVersion: 'test model 1.0',
              location: 'fetch',
              floorProvider: 'PubXFloorProvider',
              fetchStatus: 'success',
            },
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            adUnitCode: '/19968336/header-bid-tag-1',
            transactionId: '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
            sizes: [[300, 250]],
            bidId: '248f9a4489835e',
            bidderRequestId: '184cbc05bb90ba',
            src: 'client',
            bidRequestsCount: 1,
            bidderRequestsCount: 1,
            bidderWinsCount: 0,
          },
        ],
        ortb2: {
          device: {
            ext: {
              cdep: true,
            },
          },
        },
        auctionStart: 1603865707180,
        timeout: 1000,
        refererInfo: {
          referer: 'http://local-pnh.net:8080/stream/',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['http://local-pnh.net:8080/stream/'],
          canonicalUrl: null,
        },
        start: 1603865707182,
      },
      bidTimeout: [],
      bidResponse: {
        bidderCode: 'appnexus',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '32780c4bc382cb',
        requestId: '248f9a4489835e',
        mediaType: 'banner',
        source: 'client',
        cpm: 0.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        appnexus: {
          buyerMemberId: 9325,
        },
        meta: {
          advertiserId: 2529885,
        },
        ad: '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        originalCpm: 0.5,
        originalCurrency: 'USD',
        floorData: {
          fetchStatus: 'success',
          floorProvider: 'PubXFloorProvider',
          location: 'fetch',
          modelVersion: 'test model 1.0',
          skipRate: 0,
          skipped: false,
          floorValue: 0.4,
          floorRule: '/19968336/header-bid-tag-1|banner',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 0.5,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: true,
            bidAdjustment: true,
          },
          matchedFields: {
            gptSlot: '/19968336/header-bid-tag-1',
            mediaType: 'banner',
          },
        },
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        responseTimestamp: 1616654313071,
        requestTimestamp: 1616654312804,
        bidder: 'appnexus',
        timeToRespond: 267,
        pbLg: '0.50',
        pbMg: '0.50',
        pbHg: '0.50',
        pbAg: '0.50',
        pbDg: '0.50',
        pbCg: '0.50',
        size: '300x250',
        adserverTargeting: {
          hb_bidder: 'appnexus',
          hb_adid: '32780c4bc382cb',
          hb_pb: '0.50',
          hb_size: '300x250',
          hb_source: 'client',
          hb_format: 'banner',
        },
      },
      auctionEnd: {
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        timestamp: 1616654312804,
        auctionEnd: 1616654313090,
        auctionStatus: 'completed',
        adUnits: [
          {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            bids: [
              {
                bidder: 'appnexus',
                params: {
                  placementId: 13144370,
                },
                auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
                floorData: {
                  skipped: false,
                  skipRate: 0,
                  modelVersion: 'test model 1.0',
                  location: 'fetch',
                  floorProvider: 'PubXFloorProvider',
                  fetchStatus: 'success',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
          },
        ],
        adUnitCodes: ['/19968336/header-bid-tag-1'],
        bidderRequests: [
          {
            bidderCode: 'appnexus',
            auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            bidderRequestId: '184cbc05bb90ba',
            bids: [
              {
                bidder: 'appnexus',
                params: {
                  placementId: 13144370,
                },
                auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
                floorData: {
                  skipped: false,
                  skipRate: 0,
                  modelVersion: 'test model 1.0',
                  location: 'fetch',
                  floorProvider: 'PubXFloorProvider',
                  fetchStatus: 'success',
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
                sizes: [[300, 250]],
                bidId: '248f9a4489835e',
                bidderRequestId: '184cbc05bb90ba',
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
              },
            ],
            ortb2: {
              device: {
                ext: {
                  cdep: true,
                },
              },
            },
            auctionStart: 1603865707180,
            timeout: 1000,
            refererInfo: {
              referer: 'http://local-pnh.net:8080/stream/',
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['http://local-pnh.net:8080/stream/'],
              canonicalUrl: null,
            },
            start: 1603865707182,
          },
        ],
        noBids: [],
        bidsReceived: [
          {
            bidderCode: 'appnexus',
            width: 300,
            height: 250,
            statusMessage: 'Bid available',
            adId: '32780c4bc382cb',
            requestId: '248f9a4489835e',
            mediaType: 'banner',
            source: 'client',
            cpm: 0.5,
            creativeId: 96846035,
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            adUnitCode: '/19968336/header-bid-tag-1',
            appnexus: {
              buyerMemberId: 9325,
            },
            meta: {
              advertiserId: 2529885,
            },
            ad: '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
            originalCpm: 0.5,
            originalCurrency: 'USD',
            floorData: {
              fetchStatus: 'success',
              floorProvider: 'PubXFloorProvider',
              location: 'fetch',
              modelVersion: 'test model 1.0',
              skipRate: 0,
              skipped: false,
              floorValue: 0.4,
              floorRule: '/19968336/header-bid-tag-1|banner',
              floorCurrency: 'USD',
              cpmAfterAdjustments: 0.5,
              enforcements: {
                enforceJS: true,
                enforcePBS: false,
                floorDeals: true,
                bidAdjustment: true,
              },
              matchedFields: {
                gptSlot: '/19968336/header-bid-tag-1',
                mediaType: 'banner',
              },
            },
            auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            responseTimestamp: 1616654313071,
            requestTimestamp: 1616654312804,
            bidder: 'appnexus',
            timeToRespond: 267,
            pbLg: '0.50',
            pbMg: '0.50',
            pbHg: '0.50',
            pbAg: '0.50',
            pbDg: '0.50',
            pbCg: '0.50',
            size: '300x250',
            adserverTargeting: {
              hb_bidder: 'appnexus',
              hb_adid: '32780c4bc382cb',
              hb_pb: '0.50',
              hb_size: '300x250',
              hb_source: 'client',
              hb_format: 'banner',
            },
            status: 'rendered',
            params: [
              {
                placementId: 13144370,
              },
            ],
          },
        ],
        winningBids: [],
        timeout: 1000,
      },
      bidWon: {
        bidderCode: 'appnexus',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '32780c4bc382cb',
        requestId: '248f9a4489835e',
        mediaType: 'banner',
        source: 'client',
        cpm: 0.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        appnexus: {
          buyerMemberId: 9325,
        },
        meta: {
          advertiserId: 2529885,
        },
        ad: '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        originalCpm: 0.5,
        originalCurrency: 'USD',
        floorData: {
          fetchStatus: 'success',
          floorProvider: 'PubXFloorProvider',
          location: 'fetch',
          modelVersion: 'test model 1.0',
          skipRate: 0,
          skipped: false,
          floorValue: 0.4,
          floorRule: '/19968336/header-bid-tag-1|banner',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 0.5,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: true,
            bidAdjustment: true,
          },
          matchedFields: {
            gptSlot: '/19968336/header-bid-tag-1',
            mediaType: 'banner',
          },
        },
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        responseTimestamp: 1616654313071,
        requestTimestamp: 1616654312804,
        bidder: 'appnexus',
        timeToRespond: 267,
        pbLg: '0.50',
        pbMg: '0.50',
        pbHg: '0.50',
        pbAg: '0.50',
        pbDg: '0.50',
        pbCg: '0.50',
        size: '300x250',
        adserverTargeting: {
          hb_bidder: 'appnexus',
          hb_adid: '32780c4bc382cb',
          hb_pb: '0.50',
          hb_size: '300x250',
          hb_source: 'client',
          hb_format: 'banner',
        },
        status: 'rendered',
        params: [
          {
            placementId: 13144370,
          },
        ],
      },
    };

    let expectedAfterBid = {
      bids: [
        {
          bidderCode: 'appnexus',
          bidId: '248f9a4489835e',
          adUnitCode: '/19968336/header-bid-tag-1',
          gptSlotCode:
            getGptSlotInfoForAdUnitCode('/19968336/header-bid-tag-1').gptSlot ||
            null,
          auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
          sizes: '300x250',
          bidType: 2,
          requestTimestamp: 1616654312804,
          creativeId: 96846035,
          currency: 'USD',
          cpm: 0.5,
          netRevenue: true,
          mediaType: 'banner',
          statusMessage: 'Bid available',
          floorData: {
            fetchStatus: 'success',
            floorProvider: 'PubXFloorProvider',
            location: 'fetch',
            modelVersion: 'test model 1.0',
            skipRate: 0,
            skipped: false,
            floorValue: 0.4,
            floorRule: '/19968336/header-bid-tag-1|banner',
            floorCurrency: 'USD',
            cpmAfterAdjustments: 0.5,
            enforcements: {
              enforceJS: true,
              enforcePBS: false,
              floorDeals: true,
              bidAdjustment: true,
            },
            matchedFields: {
              gptSlot: '/19968336/header-bid-tag-1',
              mediaType: 'banner',
            },
          },
          placementId: null,
          timeToRespond: 267,
          source: 'client',
          responseTimestamp: 1616654313071,
        },
      ],
      auctionDetail: {
        adUnitCodes: ['/19968336/header-bid-tag-1'],
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        refreshRank: 0,
        timestamp: 1616654312804,
      },
      pageDetail: {
        host: location.host,
        path: location.pathname,
        search: location.search,
      },
      floorDetail: {
        fetchStatus: 'success',
        floorProvider: 'PubXFloorProvider',
        location: 'fetch',
        modelVersion: 'test model 1.0',
        skipRate: 0,
        skipped: false,
      },
      deviceDetail: {
        platform: navigator.platform,
        deviceType: getDeviceType(),
        deviceOS: getOS(),
        browser: getBrowser(),
        cdep: true,
      },
      userDetail: {
        userIdTypes: Object.keys(getGlobal().getUserIds?.() || {}),
      },
      consentDetail: {
        consentTypes: Object.keys(getGlobal().getConsentMetadata?.() || {}),
      },
      pmacDetail: {},
      extraData: {},
      initOptions: {
        ...initOptions,
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
      },
    };

    let expectedAfterBidWon = {
      winningBid: {
        adUnitCode: '/19968336/header-bid-tag-1',
        gptSlotCode:
          getGptSlotInfoForAdUnitCode('/19968336/header-bid-tag-1').gptSlot ||
          null,
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        bidderCode: 'appnexus',
        bidId: '248f9a4489835e',
        cpm: 0.5,
        creativeId: 96846035,
        currency: 'USD',
        floorData: {
          fetchStatus: 'success',
          floorProvider: 'PubXFloorProvider',
          location: 'fetch',
          modelVersion: 'test model 1.0',
          skipRate: 0,
          skipped: false,
          floorValue: 0.4,
          floorRule: '/19968336/header-bid-tag-1|banner',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 0.5,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: true,
            bidAdjustment: true,
          },
          matchedFields: {
            gptSlot: '/19968336/header-bid-tag-1',
            mediaType: 'banner',
          },
        },
        adServerData: {},
        floorProvider: 'PubXFloorProvider',
        floorFetchStatus: 'success',
        floorLocation: 'fetch',
        floorModelVersion: 'test model 1.0',
        floorSkipRate: 0,
        isFloorSkipped: false,
        isWinningBid: true,
        mediaType: 'banner',
        netRevenue: true,
        placementId: 13144370,
        renderedSize: '300x250',
        sizes: '300x250',
        bidType: 4,
        responseTimestamp: 1616654313071,
        requestTimestamp: 1616654312804,
        status: 'rendered',
        statusMessage: 'Bid available',
        timeToRespond: 267,
        source: 'client',
      },
      auctionDetail: {
        adUnitCodes: ['/19968336/header-bid-tag-1'],
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        refreshRank: 0,
        timestamp: 1616654312804,
      },
      pageDetail: {
        host: location.host,
        path: location.pathname,
        search: location.search,
      },
      floorDetail: {
        fetchStatus: 'success',
        floorProvider: 'PubXFloorProvider',
        location: 'fetch',
        modelVersion: 'test model 1.0',
        skipRate: 0,
        skipped: false,
      },
      deviceDetail: {
        platform: navigator.platform,
        deviceType: getDeviceType(),
        deviceOS: getOS(),
        browser: getBrowser(),
        cdep: true,
      },
      userDetail: {
        userIdTypes: Object.keys(getGlobal().getUserIds?.() || {}),
      },
      consentDetail: {
        consentTypes: Object.keys(getGlobal().getConsentMetadata?.() || {}),
      },
      pmacDetail: {},
      extraData: {},
      initOptions: {
        ...initOptions,
        auctionId: 'bc3806e4-873e-453c-8ae5-204f35e923b4',
      },
    };

    adapterManager.registerAnalyticsAdapter({
      code: 'pubxai',
      adapter: pubxaiAnalyticsAdapter,
    });

    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'pubxai',
        options: initOptions,
      });
      sinon.stub(navigator, 'sendBeacon').returns(true);
      originalVS = document.visibilityState;
      document['__defineGetter__']('visibilityState', function () {
        return 'hidden';
      });
    });

    afterEach(() => {
      pubxaiAnalyticsAdapter.disableAnalytics();
      navigator.sendBeacon.restore();
      delete auctionCache['bc3806e4-873e-453c-8ae5-204f35e923b4'];
      delete auctionCache['auction2'];
      document['__defineGetter__']('visibilityState', function () {
        return originalVS;
      });
    });

    it('builds and sends auction data', async () => {
      // Step 1: Send auction init event
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send bid response event
      events.emit(EVENTS.BID_RESPONSE, prebidEvent['bidResponse']);

      // Step 4: Send bid time out event
      events.emit(EVENTS.BID_TIMEOUT, prebidEvent['bidTimeout']);

      // Step 5: Send auction end event
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Step 6: Send auction bid won event
      events.emit(EVENTS.BID_WON, prebidEvent['bidWon']);

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      expect(navigator.sendBeacon.callCount).to.equal(2);

      for (const [index, arg] of navigator.sendBeacon.args.entries()) {
        const [expectedUrl, expectedData] = arg;
        const parsedUrl = new URL(expectedUrl);
        expect(parsedUrl.pathname).to.equal(
          ['/analytics/bidwon', '/analytics/auction'][index]
        );
        expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
          auctionTimestamp: '1616654312804',
          pubxaiAnalyticsVersion: 'v2.1.0',
          prebidVersion: '$prebid.version$',
          pubxId: pubxId,
        });
        expect(expectedData.type).to.equal('text/json');
        expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
          [expectedAfterBidWon, expectedAfterBid][index],
        ]);
      }
    });

    it('auction data with only rejected bids', async () => {
      // Step 1: Send auction init event
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send bid rejected (afaict the only expected reason would be a bid being too low)
      events.emit(EVENTS.BID_REJECTED, prebidEvent['bidResponse']);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 4: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Step 5: Send auction end event
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 6: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(1);

      // Step 7: check the pathname of the calls is correct (sent only to the auction endpoint)
      const [expectedUrl, expectedData] = navigator.sendBeacon.args[0];
      const parsedUrl = new URL(expectedUrl);
      expect(parsedUrl.pathname).to.equal('/analytics/auction');

      // Step 8: check that the meta information in the call is correct
      expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
        auctionTimestamp: '1616654312804',
        pubxaiAnalyticsVersion: 'v2.1.0',
        prebidVersion: '$prebid.version$',
        pubxId: pubxId,
      });

      // Step 9: check that the data sent in the request is correct
      expect(expectedData.type).to.equal('text/json');
      expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
        {
          ...expectedAfterBid,
          bids: [{
            ...expectedAfterBid.bids[0],
            bidType: 1
          }]
        }
      ]);
    });

    it('auction data with only timed out bids', async () => {
      // Step 1: Send auction init event
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send bid rejected (afaict the only expected reason would be a bid being too low)
      events.emit(EVENTS.BID_TIMEOUT, [prebidEvent['bidResponse']]);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 4: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Step 5: Send auction end event
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 6: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(1);

      // Step 7: check the pathname of the calls is correct (sent only to the auction endpoint)
      const [expectedUrl, expectedData] = navigator.sendBeacon.args[0];
      const parsedUrl = new URL(expectedUrl);
      expect(parsedUrl.pathname).to.equal('/analytics/auction');

      // Step 8: check that the meta information in the call is correct
      expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
        auctionTimestamp: '1616654312804',
        pubxaiAnalyticsVersion: 'v2.1.0',
        prebidVersion: '$prebid.version$',
        pubxId: pubxId,
      });

      // Step 9: check that the data sent in the request is correct
      expect(expectedData.type).to.equal('text/json');
      expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
        {
          ...expectedAfterBid,
          bids: [{
            ...expectedAfterBid.bids[0],
            bidType: 3
          }]
        }
      ]);
    });

    it('auction with no bids', async () => {
      // Step 1: Send auction init event
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 3: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Step 4: Send auction end event
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 5: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(1);

      // Step 6: check the pathname of the calls is correct (sent only to the auction endpoint)
      const [expectedUrl, expectedData] = navigator.sendBeacon.args[0];
      const parsedUrl = new URL(expectedUrl);
      expect(parsedUrl.pathname).to.equal('/analytics/auction');

      // Step 7: check that the meta information in the call is correct
      expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
        auctionTimestamp: '1616654312804',
        pubxaiAnalyticsVersion: 'v2.1.0',
        prebidVersion: '$prebid.version$',
        pubxId: pubxId,
      });

      // Step 8: check that the data sent in the request is correct
      expect(expectedData.type).to.equal('text/json');
      expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
        {
          ...expectedAfterBid,
          bids: [],
        },
      ]);
    });

    it('2 concurrent auctions', async () => {
      // Step 1: Send auction init event for auction 1
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event for auction 1
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send auction init event for auction 2
      events.emit(
        EVENTS.AUCTION_INIT,
        replaceProperty(prebidEvent['auctionInit'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 4: Send bid requested event for auction 2
      events.emit(
        EVENTS.BID_REQUESTED,
        replaceProperty(prebidEvent['bidRequested'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 5: Send bid response event for auction 1
      events.emit(EVENTS.BID_RESPONSE, prebidEvent['bidResponse']);

      // Step 6: Send bid time out event for auction 1
      events.emit(EVENTS.BID_TIMEOUT, prebidEvent['bidTimeout']);

      // Step 7: Send bid response event for auction 2
      events.emit(
        EVENTS.BID_RESPONSE,
        replaceProperty(prebidEvent['bidResponse'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 8: Send auction end event for auction 1
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 9: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Step 10: Send auction bid won event for auction 1
      events.emit(EVENTS.BID_WON, prebidEvent['bidWon']);

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 11: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(2);

      // Step 12: Send auction end event for auction 2
      events.emit(
        EVENTS.AUCTION_END,
        replaceProperty(prebidEvent['auctionEnd'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Simulate "navigate away" behaviour
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 13: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(2);

      // Step 14: Send auction bid won event for auction 2
      events.emit(
        EVENTS.BID_WON,
        replaceProperty(prebidEvent['bidWon'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 15: check the calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(4);
      for (const [index, arg] of navigator.sendBeacon.args.entries()) {
        const [expectedUrl, expectedData] = arg;
        const parsedUrl = new URL(expectedUrl);
        const auctionIdMapFn = index < 2 ? (i, _) => i : replaceProperty;
        expect(parsedUrl.pathname).to.equal(
          ['/analytics/bidwon', '/analytics/auction'][index % 2]
        );
        expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
          auctionTimestamp: '1616654312804',
          pubxaiAnalyticsVersion: 'v2.1.0',
          prebidVersion: '$prebid.version$',
          pubxId: pubxId,
        });
        expect(expectedData.type).to.equal('text/json');
        expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
          auctionIdMapFn([expectedAfterBidWon, expectedAfterBid][index % 2], [
            {
              field: 'auctionId',
              updated: '"auction2"',
              replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
            },
            {
              field: 'refreshRank',
              updated: '1',
              replaced: '0',
            },
          ]),
        ]);
      }
    });

    it('2 concurrent auctions with batch sending', async () => {
      // Step 1: Send auction init event for auction 1
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event for auction 1
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send auction init event for auction 2
      events.emit(
        EVENTS.AUCTION_INIT,
        replaceProperty(prebidEvent['auctionInit'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 4: Send bid requested event for auction 2
      events.emit(
        EVENTS.BID_REQUESTED,
        replaceProperty(prebidEvent['bidRequested'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 5: Send bid response event for auction 1
      events.emit(EVENTS.BID_RESPONSE, prebidEvent['bidResponse']);

      // Step 6: Send bid time out event for auction 1
      events.emit(EVENTS.BID_TIMEOUT, prebidEvent['bidTimeout']);

      // Step 7: Send bid response event for auction 2
      events.emit(
        EVENTS.BID_RESPONSE,
        replaceProperty(prebidEvent['bidResponse'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 8: Send auction end event for auction 1
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      // Step 9: Send auction bid won event for auction 1
      events.emit(EVENTS.BID_WON, prebidEvent['bidWon']);

      // Step 10: Send auction end event for auction 2
      events.emit(
        EVENTS.AUCTION_END,
        replaceProperty(prebidEvent['auctionEnd'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 11: Send auction bid won event for auction 2
      events.emit(
        EVENTS.BID_WON,
        replaceProperty(prebidEvent['bidWon'], [
          {
            field: 'auctionId',
            updated: '"auction2"',
            replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
          },
        ])
      );

      // Step 12: check the number of calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(0);

      // Simulate end of session
      document.dispatchEvent(new Event('visibilitychange'));

      // Step 13: check the calls made to pubx.ai
      expect(navigator.sendBeacon.callCount).to.equal(2);
      for (const [index, arg] of navigator.sendBeacon.args.entries()) {
        const [expectedUrl, expectedData] = arg;
        const parsedUrl = new URL(expectedUrl);
        expect(parsedUrl.pathname).to.equal(
          ['/analytics/bidwon', '/analytics/auction'][index]
        );
        expect(Object.fromEntries(parsedUrl.searchParams)).to.deep.equal({
          auctionTimestamp: '1616654312804',
          pubxaiAnalyticsVersion: 'v2.1.0',
          prebidVersion: '$prebid.version$',
          pubxId: pubxId,
        });
        expect(expectedData.type).to.equal('text/json');
        expect(JSON.parse(await readBlobSafariCompat(expectedData))).to.deep.equal([
          [expectedAfterBidWon, expectedAfterBid][index],
          replaceProperty([expectedAfterBidWon, expectedAfterBid][index], [
            {
              field: 'auctionId',
              updated: '"auction2"',
              replaced: '"bc3806e4-873e-453c-8ae5-204f35e923b4"',
            },
            {
              field: 'refreshRank',
              updated: '1',
              replaced: '0',
            },
          ]),
        ]);
      }
    });
  });
});
