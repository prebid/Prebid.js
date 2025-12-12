import {expect} from 'chai';
import {spec} from 'modules/koblerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {getRefererInfo} from 'src/refererDetection.js';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

function createBidderRequest(auctionId, timeout, pageUrl, gdprVendorData = {}, pageViewId) {
  const gdprConsent = {
    consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
    apiVersion: 2,
    vendorData: gdprVendorData,
    gdprApplies: true
  };
  return {
    bidderRequestId: 'mock-uuid',
    auctionId: auctionId || 'c1243d83-0bed-4fdb-8c76-42b456be17d0',
    timeout: timeout || 2000,
    refererInfo: {
      page: pageUrl || 'example.com'
    },
    gdprConsent: gdprConsent,
    pageViewId
  };
}

function createValidBidRequest(params, bidId, sizes) {
  const validBidRequest = {
    adUnitCode: 'adunit-code',
    bidId: bidId || '22c4871113f461',
    bidder: 'kobler',
    bidderRequestId: '15246a574e859f',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    mediaTypes: {
      banner: {
        sizes: sizes || [[300, 250], [320, 100]]
      }
    },
    transactionTd: '04314114-15bd-4638-8664-bdb8bdc60bff'
  };
  if (params) {
    validBidRequest.params = params;
  }
  return validBidRequest;
}

describe('KoblerAdapter', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore()
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should not accept a request without bidId as valid', function () {
      const bid = {
        params: {
          someParam: 'abc'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without mediaTypes and sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589'
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without mediaTypes and string sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        sizes: 'string'
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without mediaTypes and empty sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        sizes: []
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without mediaTypes.banner and sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {}
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without mediaTypes.banner and empty sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        sizes: [],
        mediaTypes: {}
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without sizes and string mediaTypes.banner as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {
          banner: 'string'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without sizes and mediaTypes.banner.sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {
          banner: {}
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without sizes and string mediaTypes.banner.sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {
          banner: {
            sizes: 'string'
          }
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without sizes and empty mediaTypes.banner.sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {
          banner: {
            sizes: []
          }
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should accept a request with bidId and sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        sizes: [[5, 5]]
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });

    it('should accept a request with bidId and mediaTypes.banner.sizes as valid', function () {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        mediaTypes: {
          banner: {
            sizes: [[0, 0]]
          }
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });
  });

  describe('buildRequests', function () {
    it('should read data from bidder request', function () {
      const testUrl = 'kobler.no';
      const auctionId = '8319af54-9795-4642-ba3a-6f57d6ff9100';
      const timeout = 5000;
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest = createBidderRequest(auctionId, timeout, testUrl);

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.tmax).to.be.equal(timeout);
      expect(openRtbRequest.id).to.exist;
      expect(openRtbRequest.site.page).to.be.equal(testUrl);
    });

    it('should handle missing consent from bidder request', function () {
      const testUrl = 'kobler.no';
      const auctionId = 'f3d41a92-104a-4ff7-8164-29197cfbf4af';
      const timeout = 5000;
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest = createBidderRequest(auctionId, timeout, testUrl, {
        purpose: {
          consents: {
            1: false,
            2: false
          }
        }
      });

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.tmax).to.be.equal(timeout);
      expect(openRtbRequest.id).to.exist;
      expect(openRtbRequest.site.page).to.be.equal(testUrl);
      expect(openRtbRequest.ext.kobler.tcf_purpose_2_given).to.be.equal(false);
      expect(openRtbRequest.ext.kobler.tcf_purpose_3_given).to.be.equal(false);
    });

    it('should reuse the same page view ID on subsequent calls', function () {
      const testUrl = 'kobler.no';
      const auctionId1 = '8319af54-9795-4642-ba3a-6f57d6ff9100';
      const auctionId2 = 'e19f2d0c-602d-4969-96a1-69a22d483f47';
      const pageViewId1 = '2949ce3c-2c4d-4b96-9ce0-8bf5aa0bb416';
      const pageViewId2 = '6c449b7d-c9b0-461d-8cc7-ce0a8da58349';
      const timeout = 5000;
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest1 = createBidderRequest(auctionId1, timeout, testUrl, {}, pageViewId1);
      const bidderRequest2 = createBidderRequest(auctionId2, timeout, testUrl, {}, pageViewId2);

      const openRtbRequest1 = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest1).data);
      expect(openRtbRequest1.ext.kobler.page_view_id).to.be.equal(pageViewId1);
      const openRtbRequest2 = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest2).data);
      expect(openRtbRequest2.ext.kobler.page_view_id).to.be.equal(pageViewId2);
    });

    it('should read data from valid bid requests', function () {
      const firstSize = [400, 800];
      const secondSize = [450, 950];
      const sizes = [firstSize, secondSize];
      const bidId = '3a56a019-4835-4f75-811c-76fac6853a2c';
      const validBidRequests = [
        createValidBidRequest(
          undefined,
          bidId,
          sizes
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].id).to.be.equal(bidId);
      expect(openRtbRequest.imp[0].banner.w).to.be.equal(firstSize[0]);
      expect(openRtbRequest.imp[0].banner.h).to.be.equal(firstSize[1]);
      expect(openRtbRequest.imp[0].banner.format.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].banner.format[0].w).to.be.equal(firstSize[0]);
      expect(openRtbRequest.imp[0].banner.format[0].h).to.be.equal(firstSize[1]);
      expect(openRtbRequest.imp[0].banner.format[1].w).to.be.equal(secondSize[0]);
      expect(openRtbRequest.imp[0].banner.format[1].h).to.be.equal(secondSize[1]);
    });

    it('should use 0x0 as default size', function () {
      const validBidRequests = [
        createValidBidRequest(
          undefined,
          undefined,
          []
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].banner.w).to.be.equal(0);
      expect(openRtbRequest.imp[0].banner.h).to.be.equal(0);
      expect(openRtbRequest.imp[0].banner.format.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].banner.format[0].w).to.be.equal(0);
      expect(openRtbRequest.imp[0].banner.format[0].h).to.be.equal(0);
    });

    it('should read test from valid bid requests', function () {
      const validBidRequests = [
        createValidBidRequest(
          {
            test: true
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      expect(result.url).to.be.equal('https://bid-service.dev.essrtb.com/bid/prebid_rtb_call');

      const openRtbRequest = JSON.parse(result.data);
      expect(openRtbRequest.site.page).to.be.equal('example.com');
      expect(openRtbRequest.test).to.be.equal(1);
    });

    it('should not read pageUrl from config when not testing', function () {
      config.setConfig({
        pageUrl: 'https://testing-url.com'
      });
      const validBidRequests = [
        createValidBidRequest()
      ];
      const bidderRequest = createBidderRequest(
        'f85d61cc-ed11-4b6c-aefb-87943263cedb',
        2000,
        'https://non-testing-url.net'
      );

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      expect(result.url).to.be.equal('https://bid.essrtb.com/bid/prebid_rtb_call');

      const openRtbRequest = JSON.parse(result.data);
      expect(openRtbRequest.site.page).to.be.equal('https://non-testing-url.net');
      expect(openRtbRequest.test).to.be.equal(0);
    });

    it('should read floorPrice from valid bid requests', function () {
      const floorPrice = 4.343;
      const validBidRequests = [
        createValidBidRequest(
          {
            floorPrice: floorPrice
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].bidfloor).to.be.equal(floorPrice);
    });

    it('should read dealIds from valid bid requests', function () {
      const dealIds1 = ['78214682234823'];
      const dealIds2 = ['89913861235234', '27368423545328640'];
      const validBidRequests = [
        createValidBidRequest(
          {
            dealIds: dealIds1
          }
        ),
        createValidBidRequest(
          {
            dealIds: dealIds2
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].pmp.deals.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].pmp.deals[0].id).to.be.equal(dealIds1[0]);
      expect(openRtbRequest.imp[1].pmp.deals.length).to.be.equal(2);
      expect(openRtbRequest.imp[1].pmp.deals[0].id).to.be.equal(dealIds2[0]);
      expect(openRtbRequest.imp[1].pmp.deals[1].id).to.be.equal(dealIds2[1]);
    });

    it('should read floor price using floors module', function () {
      const floorPriceFor580x400 = 6.5148;
      const floorPriceForAnySize = 4.2343;
      const validBidRequests = [
        createValidBidRequest(undefined, '98efe127-f926-4dde-b988-db8e5dba5a76', [[580, 400]]),
        createValidBidRequest(undefined, 'c7698d4a-94f4-4a6b-a928-7e1facfbf752', [])
      ];
      validBidRequests.forEach(validBidRequest => {
        validBidRequest.getFloor = function (params) {
          let floorPrice;
          if (utils.isArray(params.size) && params.size[0] === 580 && params.size[1] === 400) {
            floorPrice = floorPriceFor580x400;
          } else if (params.size === '*') {
            floorPrice = floorPriceForAnySize
          } else {
            floorPrice = 0
          }
          return {
            currency: params.currency,
            floor: floorPrice
          }
        }
      })
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].id).to.be.equal('98efe127-f926-4dde-b988-db8e5dba5a76');
      expect(openRtbRequest.imp[0].bidfloor).to.be.equal(floorPriceFor580x400);
      expect(openRtbRequest.imp[1].id).to.be.equal('c7698d4a-94f4-4a6b-a928-7e1facfbf752');
      expect(openRtbRequest.imp[1].bidfloor).to.be.equal(floorPriceForAnySize);
    });

    it('should create whole OpenRTB request', function () {
      const pageViewId = 'aa9f0b20-a642-4d0e-acb5-e35805253ef7';
      const validBidRequests = [
        createValidBidRequest(
          {
            floorPrice: 5.6234,
            dealIds: ['623472534328234']
          },
          '953ee65d-d18a-484f-a840-d3056185a060',
          [[400, 600]]
        ),
        createValidBidRequest(
          {
            floorPrice: 3.2543,
            dealIds: ['92368234753283', '263845832942']
          },
          '8320bf79-9d90-4a17-87c6-5d505706a921',
          [[400, 500], [200, 250], [300, 350]]
        ),
        createValidBidRequest(
          undefined,
          'd0de713b-32e3-4191-a2df-a007f08ffe72',
          [[800, 900]]
        )
      ];
      const bidderRequest = createBidderRequest(
        '9ff580cf-e10e-4b66-add7-40ac0c804e21',
        4500,
        'bid.kobler.no',
        {
          purpose: {
            consents: {
              1: false,
              2: true,
              3: false
            }
          },
          publisher: {
            restrictions: {
              '2': {
                // require consent
                '11': 1
              }
            }
          }
        },
        pageViewId
      );

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      const expectedOpenRtbRequest = {
        id: 'mock-uuid',
        at: 1,
        tmax: 4500,
        cur: ['USD'],
        imp: [
          {
            id: '953ee65d-d18a-484f-a840-d3056185a060',
            banner: {
              format: [
                {
                  w: 400,
                  h: 600
                }
              ],
              w: 400,
              h: 600
            },
            bidfloor: 5.6234,
            bidfloorcur: 'USD',
            pmp: {
              deals: [
                {
                  id: '623472534328234'
                }
              ]
            }
          },
          {
            id: '8320bf79-9d90-4a17-87c6-5d505706a921',
            banner: {
              format: [
                {
                  w: 400,
                  h: 500
                },
                {
                  w: 200,
                  h: 250
                },
                {
                  w: 300,
                  h: 350
                }
              ],
              w: 400,
              h: 500
            },
            bidfloor: 3.2543,
            bidfloorcur: 'USD',
            pmp: {
              deals: [
                {
                  id: '92368234753283'
                },
                {
                  id: '263845832942'
                }
              ]
            }
          },
          {
            id: 'd0de713b-32e3-4191-a2df-a007f08ffe72',
            banner: {
              format: [
                {
                  w: 800,
                  h: 900
                }
              ],
              w: 800,
              h: 900
            },
            bidfloor: 0,
            bidfloorcur: 'USD',
            pmp: {}
          }
        ],
        device: {
          devicetype: 2,
          ua: navigator.userAgent
        },
        site: {
          page: 'bid.kobler.no'
        },
        test: 0,
        ext: {
          kobler: {
            tcf_purpose_2_given: true,
            tcf_purpose_3_given: false,
            page_view_id: pageViewId
          }
        }
      };

      expect(openRtbRequest).to.deep.equal(expectedOpenRtbRequest);
    });
  });

  describe('interpretResponse', function () {
    it('should handle empty body', function () {
      const responseWithEmptyBody = {
        body: undefined
      };
      const bids = spec.interpretResponse(responseWithEmptyBody)

      expect(bids.length).to.be.equal(0);
    });

    it('should generate bids from OpenRTB response', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'NOK'
        }
      });
      const responseWithTwoBids = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: '6194ddef-89a4-404f-9efd-6b718fc23308',
                  price: 7.981,
                  nurl: 'https://atag.essrtb.com/serve/prebid_win_notification?payload=sdhfusdaobfadslf234324&sp=${AUCTION_PRICE}&sp_cur=${AUCTION_PRICE_CURRENCY}&asp=${AD_SERVER_PRICE}&asp_cur=${AD_SERVER_PRICE_CURRENCY}',
                  crid: 'edea9b03-3a57-41aa-9c00-abd673e22006',
                  cid: '572',
                  dealid: '',
                  w: 320,
                  h: 250,
                  adm: '<script src="https://atag.essrtb.com/serve/prebid_ad_tag?payload=sdhfusdaobfadslf234324"></script>',
                  adomain: [
                    'https://kobler.no'
                  ]
                },
                {
                  impid: '2ec0b40f-d3ca-4ba5-8ce3-48290565690f',
                  price: 6.71234,
                  nurl: 'https://atag.essrtb.com/serve/prebid_win_notification?payload=nbashgufvishdafjk23432&sp=${AUCTION_PRICE}&sp_cur=${AUCTION_PRICE_CURRENCY}&asp=${AD_SERVER_PRICE}&asp_cur=${AD_SERVER_PRICE_CURRENCY}',
                  crid: 'fa2d5af7-2678-4204-9023-44c526160742',
                  dealid: '2783483223432342',
                  cid: '800',
                  w: 580,
                  h: 400,
                  adm: '<script src="https://atag.essrtb.com/serve/prebid_ad_tag?payload=nbashgufvishdafjk23432"></script>',
                  adomain: [
                    'https://bid.kobler.no'
                  ]
                }
              ]
            }
          ],
          cur: 'USD'
        }
      };
      const bids = spec.interpretResponse(responseWithTwoBids, {})

      const expectedBids = [
        {
          requestId: '6194ddef-89a4-404f-9efd-6b718fc23308',
          cpm: 7.981,
          currency: 'USD',
          width: 320,
          height: 250,
          creativeId: 'edea9b03-3a57-41aa-9c00-abd673e22006',
          dealId: '',
          netRevenue: true,
          ttl: 600,
          ad: '<script src="https://atag.essrtb.com/serve/prebid_ad_tag?payload=sdhfusdaobfadslf234324"></script>',
          nurl: 'https://atag.essrtb.com/serve/prebid_win_notification?payload=sdhfusdaobfadslf234324&sp=${AUCTION_PRICE}&sp_cur=${AUCTION_PRICE_CURRENCY}&asp=${AD_SERVER_PRICE}&asp_cur=${AD_SERVER_PRICE_CURRENCY}',
          cid: '572',
          meta: {
            advertiserDomains: [
              'https://kobler.no'
            ]
          }
        },
        {
          requestId: '2ec0b40f-d3ca-4ba5-8ce3-48290565690f',
          cpm: 6.71234,
          currency: 'USD',
          width: 580,
          height: 400,
          creativeId: 'fa2d5af7-2678-4204-9023-44c526160742',
          dealId: '2783483223432342',
          netRevenue: true,
          ttl: 600,
          ad: '<script src="https://atag.essrtb.com/serve/prebid_ad_tag?payload=nbashgufvishdafjk23432"></script>',
          nurl: 'https://atag.essrtb.com/serve/prebid_win_notification?payload=nbashgufvishdafjk23432&sp=${AUCTION_PRICE}&sp_cur=${AUCTION_PRICE_CURRENCY}&asp=${AD_SERVER_PRICE}&asp_cur=${AD_SERVER_PRICE_CURRENCY}',
          cid: '800',
          meta: {
            advertiserDomains: [
              'https://bid.kobler.no'
            ]
          }
        }
      ];
      expect(bids).to.deep.equal(expectedBids);
    });
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain nurl', function () {
      spec.onBidWon({});

      expect(utils.triggerPixel.called).to.be.false;
    });

    it('Should not trigger pixel if nurl is empty', function () {
      spec.onBidWon({
        nurl: ''
      });

      expect(utils.triggerPixel.called).to.be.false;
    });

    it('Should trigger pixel with replaced nurl if nurl is not empty', function () {
      setCurrencyConfig({ adServerCurrency: 'NOK' });
      const validBidRequests = [{ params: {} }];
      const refererInfo = { page: 'page' };
      const bidderRequest = { refererInfo };
      return addFPDToBidderRequest(bidderRequest).then(res => {
        JSON.parse(spec.buildRequests(validBidRequests, res).data);
        const bids = spec.interpretResponse({ body: { seatbid: [{ bid: [{
          originalCpm: 1.532,
          price: 8.341,
          currency: 'NOK',
          nurl: 'https://atag.essrtb.com/serve/prebid_win_notification?payload=sdhfusdaobfadslf234324&sp=${AUCTION_PRICE}&sp_cur=${AUCTION_PRICE_CURRENCY}&asp=${AD_SERVER_PRICE}&asp_cur=${AD_SERVER_PRICE_CURRENCY}',
        }]}]}}, { bidderRequest: res });
        const bidToWon = bids[0];
        bidToWon.adserverTargeting = {
          hb_pb: 8
        }
        spec.onBidWon(bidToWon);

        expect(utils.triggerPixel.callCount).to.be.equal(1);
        expect(utils.triggerPixel.firstCall.args[0]).to.be.equal(
          'https://atag.essrtb.com/serve/prebid_win_notification?payload=sdhfusdaobfadslf234324&sp=8.341&sp_cur=NOK&asp=8&asp_cur=NOK'
        );
        setCurrencyConfig({});
      });
    });
  });

  describe('onTimeout', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if timeout data is not array', function () {
      spec.onTimeout(null);

      expect(utils.triggerPixel.called).to.be.false;
    });

    it('Should not trigger pixel if timeout data is empty', function () {
      spec.onTimeout([]);

      expect(utils.triggerPixel.called).to.be.false;
    });

    it('Should trigger pixel with query parameters if timeout data not empty', function () {
      spec.onTimeout([
        {
          adUnitCode: 'adunit-code',
          bidId: 'ef236c6c-e934-406b-a877-d7be8e8a839a',
          timeout: 100,
          params: [],
        },
        {
          adUnitCode: 'adunit-code-2',
          bidId: 'ca4121c8-9a4a-46ba-a624-e9b64af206f2',
          timeout: 100,
          params: [],
        }
      ]);

      expect(utils.triggerPixel.callCount).to.be.equal(2);
      expect(utils.triggerPixel.getCall(0).args[0]).to.be.equal(
        'https://bid.essrtb.com/notify/prebid_timeout?ad_unit_code=adunit-code&' +
        'bid_id=ef236c6c-e934-406b-a877-d7be8e8a839a&timeout=100&page_url=' + encodeURIComponent(getRefererInfo().page)
      );
      expect(utils.triggerPixel.getCall(1).args[0]).to.be.equal(
        'https://bid.essrtb.com/notify/prebid_timeout?ad_unit_code=adunit-code-2&' +
        'bid_id=ca4121c8-9a4a-46ba-a624-e9b64af206f2&timeout=100&page_url=' + encodeURIComponent(getRefererInfo().page)
      );
    });
  });
});
