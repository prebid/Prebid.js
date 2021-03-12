import {expect} from 'chai';
import {spec} from 'modules/koblerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';

function createBidderRequest(auctionId, timeout, pageUrl) {
  return {
    auctionId: auctionId || 'c1243d83-0bed-4fdb-8c76-42b456be17d0',
    timeout: timeout || 2000,
    refererInfo: {
      referer: pageUrl || 'example.com'
    }
  };
}

function createValidBidRequest(params, bidId, sizes) {
  return {
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
    params: params || {
      placementId: 'tpw58278'
    },
    transactionTd: '04314114-15bd-4638-8664-bdb8bdc60bff'
  };
}

describe('KoblerAdapter', function () {
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    it('should not accept a request without bidId as valid', function() {
      const bid = {
        params: {
          someParam: 'abc'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without params as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589'
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without placementId as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        params: {
          someParam: 'abc'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should accept a request with bidId and placementId as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        params: {
          someParam: 'abc',
          placementId: '8bde0923-1409-4253-9594-495b58d931ba'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });
  });

  describe('buildRequests', function() {
    it('should read data from bidder request', function() {
      const testUrl = 'kobler.no';
      const auctionId = '8319af54-9795-4642-ba3a-6f57d6ff9100';
      const timeout = 5000;
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest = createBidderRequest(auctionId, timeout, testUrl);

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.tmax).to.be.equal(timeout);
      expect(openRtbRequest.id).to.be.equal(auctionId);
      expect(openRtbRequest.site.page).to.be.equal(testUrl);
    });

    it('should read data from valid bid requests', function() {
      const firstSize = [400, 800];
      const secondSize = [450, 950];
      const sizes = [firstSize, secondSize];
      const placementId = 'tsjs86325';
      const bidId = '3a56a019-4835-4f75-811c-76fac6853a2c';
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: placementId
          },
          bidId,
          sizes
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].id).to.be.equal(bidId);
      expect(openRtbRequest.imp[0].tagid).to.be.equal(placementId);
      expect(openRtbRequest.imp[0].banner.w).to.be.equal(firstSize[0]);
      expect(openRtbRequest.imp[0].banner.h).to.be.equal(firstSize[1]);
      expect(openRtbRequest.imp[0].banner.format.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].banner.format[0].w).to.be.equal(firstSize[0]);
      expect(openRtbRequest.imp[0].banner.format[0].h).to.be.equal(firstSize[1]);
      expect(openRtbRequest.imp[0].banner.format[1].w).to.be.equal(secondSize[0]);
      expect(openRtbRequest.imp[0].banner.format[1].h).to.be.equal(secondSize[1]);
    });

    it('should use 0x0 as default size', function() {
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

    it('should use 0 as default position', function() {
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].banner.pos).to.be.equal(0);
    });

    it('should read zip from valid bid requests', function() {
      const zip = '700 02';
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'nmah8324234',
            zip: zip
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.device.geo.zip).to.be.equal(zip);
    });

    it('should read test from valid bid requests', function() {
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'zwop842799',
            test: true
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.test).to.be.equal(1);
    });

    it('should read bidfloor from valid bid requests', function() {
      const floorPrice = 4.343;
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'oqr3224234',
            bidfloor: floorPrice
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].bidfloor).to.be.equal(floorPrice);
    });

    it('should read floorprice from valid bid requests', function() {
      const floorPrice = 3.914;
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'pwe824381',
            floorprice: floorPrice
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].bidfloor).to.be.equal(floorPrice);
    });

    it('should read position from valid bid requests', function() {
      const placementId = 'yzksf234592';
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: placementId,
            position: 1
          }
        ),
        createValidBidRequest(
          {
            placementId: placementId,
            position: 2
          }
        ),
        createValidBidRequest(
          {
            placementId: placementId,
            position: 3
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(3);
      expect(openRtbRequest.imp[0].banner.pos).to.be.equal(1);
      expect(openRtbRequest.imp[0].tagid).to.be.equal(placementId);
      expect(openRtbRequest.imp[1].banner.pos).to.be.equal(2);
      expect(openRtbRequest.imp[1].tagid).to.be.equal(placementId);
      expect(openRtbRequest.imp[2].banner.pos).to.be.equal(3);
      expect(openRtbRequest.imp[2].tagid).to.be.equal(placementId);
    });

    it('should read pos from valid bid requests', function() {
      const placementId = 'pwsc92365429';
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: placementId,
            pos: 4
          }
        ),
        createValidBidRequest(
          {
            placementId: placementId,
            pos: 5
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].banner.pos).to.be.equal(4);
      expect(openRtbRequest.imp[0].tagid).to.be.equal(placementId);
      expect(openRtbRequest.imp[1].banner.pos).to.be.equal(5);
      expect(openRtbRequest.imp[1].tagid).to.be.equal(placementId);
    });

    it('should read dealId from valid bid requests', function() {
      const dealId1 = '78214682234823';
      const dealId2 = '89913861235234';
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'rsl1239823',
            dealId: dealId1
          }
        ),
        createValidBidRequest(
          {
            placementId: 'pqw234232',
            dealId: dealId2
          }
        )
      ];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.imp.length).to.be.equal(2);
      expect(openRtbRequest.imp[0].pmp.deals.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].pmp.deals[0].id).to.be.equal(dealId1);
      expect(openRtbRequest.imp[1].pmp.deals.length).to.be.equal(1);
      expect(openRtbRequest.imp[1].pmp.deals[0].id).to.be.equal(dealId2);
    });

    it('should read timeout from config', function() {
      const timeout = 4000;
      const validBidRequests = [createValidBidRequest()];
      // No timeout field
      const bidderRequest = {
        auctionId: 'c1243d83-0bed-4fdb-8c76-42b456be17d0',
        refererInfo: {
          referer: 'example.com'
        }
      };
      config.setConfig({
        bidderTimeout: timeout
      });

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.tmax).to.be.equal(timeout);
    });

    it('should read currency from config', function() {
      const currency = 'NOK';
      config.setConfig({
        currency: {
          adServerCurrency: currency
        }
      });
      const validBidRequests = [createValidBidRequest()];
      const bidderRequest = createBidderRequest();

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      expect(openRtbRequest.cur.length).to.be.equal(1);
      expect(openRtbRequest.cur[0]).to.be.equal(currency);
      expect(openRtbRequest.imp.length).to.be.equal(1);
      expect(openRtbRequest.imp[0].bidfloorcur).to.be.equal(currency);
    });

    // TODO: test for reading debug from config

    it('should read floor price using floors module', function() {
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

    it('should create whole OpenRTB request', function() {
      config.setConfig({
        currency: {
          adServerCurrency: 'SEK'
        }
      });
      const validBidRequests = [
        createValidBidRequest(
          {
            placementId: 'pcha322364',
            zip: '0015',
            bidfloor: 5.6234,
            position: 1,
            dealId: '623472534328234'
          },
          '953ee65d-d18a-484f-a840-d3056185a060',
          [[400, 600]]
        ),
        createValidBidRequest(
          {
            placementId: 'sdfgoi32y4',
            floorprice: 3.2543,
            pos: 2,
            dealId: '92368234753283'
          },
          '8320bf79-9d90-4a17-87c6-5d505706a921',
          [[400, 500], [200, 250], [300, 350]]
        ),
        createValidBidRequest(
          {
            placementId: 'gwms2738647',
            pos: 3
          },
          'd0de713b-32e3-4191-a2df-a007f08ffe72',
          [[800, 900]]
        )
      ];
      const bidderRequest = createBidderRequest(
        '9ff580cf-e10e-4b66-add7-40ac0c804e21',
        4500,
        'bid.kobler.no'
      );

      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const openRtbRequest = JSON.parse(result.data);

      const expectedOpenRtbRequest = {
        id: '9ff580cf-e10e-4b66-add7-40ac0c804e21',
        at: 1,
        tmax: 4500,
        cur: ['SEK'],
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
              h: 600,
              pos: 1
            },
            tagid: 'pcha322364',
            bidfloor: 5.6234,
            bidfloorcur: 'SEK',
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
              h: 500,
              pos: 2
            },
            tagid: 'sdfgoi32y4',
            bidfloor: 3.2543,
            bidfloorcur: 'SEK',
            pmp: {
              deals: [
                {
                  id: '92368234753283'
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
              h: 900,
              pos: 3
            },
            tagid: 'gwms2738647',
            bidfloor: 0,
            bidfloorcur: 'SEK',
            pmp: {}
          }
        ],
        device: {
          devicetype: 2,
          geo: {
            zip: '0015'
          }
        },
        site: {
          page: 'bid.kobler.no'
        },
        test: 0
      };

      expect(openRtbRequest).to.deep.equal(expectedOpenRtbRequest);
    });
  });
});
