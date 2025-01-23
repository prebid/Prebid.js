import { expect } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/bmsBidAdapter.js';

const BIDDER_CODE = 'bms';
const ENDPOINT_URL =
  'https://api.prebid.int.us-east-1.bluems.com/v1/bid?exchangeId=prebid';
const GVLID = 1105;
const CURRENCY = 'USD';

describe('bmsBidAdapter:', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid:', function () {
    it('should return true for valid bid requests', function () {
      const validBid = {
        params: {
          placementId: '12345',
          publisherId: '67890',
        },
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false for invalid bid requests', function () {
      const invalidBid = {
        params: {
          placementId: '12345',
        },
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests:', function () {
    let validBidRequests;
    let bidderRequest;

    beforeEach(function () {
      validBidRequests = [
        {
          bidId: 'bid1',
          params: {
            placementId: '12345',
            publisherId: '67890',
          },
          getFloor: () => ({ currency: CURRENCY, floor: 1.5 }),
        },
      ];

      bidderRequest = {
        refererInfo: {
          page: 'https://example.com',
        },
      };

      sandbox.stub(storage, 'getDataFromLocalStorage').returns('testBuyerId');
    });

    it('should build a valid OpenRTB request', function () {
      const [request] = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.options.contentType).to.equal('application/json');

      const ortbRequest = request.data;
      expect(ortbRequest.ext.gvlid).to.equal(GVLID);
      expect(ortbRequest.imp[0].bidfloor).to.equal(1.5);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal(CURRENCY);
    });

    it('should omit bidfloor if getFloor is not implemented', function () {
      validBidRequests[0].getFloor = undefined;

      const [request] = spec.buildRequests(validBidRequests, bidderRequest);
      const ortbRequest = request.data;

      expect(ortbRequest.imp[0].bidfloor).to.be.undefined;
    });

    it('should convert from fromORTB', function () {
      const response = {
        id: 'f793abdc-c541-4cc8-8688-6c7bb883747d',
        cur: 'USD',
        bidid: '2rgRKcbHfDyX6ZU4zuPuf38hDB8',
        seatbid: [
          {
            bid: [
              {
                id: '2rgRKcbHfDyX6ZU4zuPuf38hDB8:0',
                impid: '3b948a96652621',
                price: 2,
                adomain: ['opencircle.com.br'],
                adid: '0',
                adm: '<iframe src="https://ads.bluemsusercontent.com/v1/ad-content?acc=306850905425&ad=2pMGbaJioMDwMIESvwlCUekrdNA&bid=2rgRKcbHfDyX6ZU4zuPuf38hDB8:0&bp=2&curr=USD&c=2Xzb0pyfcOibtp9A5XsUSkzj2IT&d=d3fef36u6k6muh.cloudfront.net&b=&e=prebid&gln=&glt=&gcn=&grg=&gct=&imp=3b948a96652621&p=13144370&tag=13144370&u=&t=2rgH24MVckzSou4IpTyUa5l3Ija&guids=gid:undefined&ect=&dldo=false" height="600" width="300" marginwidth="0" marginheight="0" align="top" scrolling="No" frameborder="0" hspace="0" vspace="0"></iframe>',
                iurl: 'https://ads.bluemsusercontent.com/v1/ad-container?acc=306850905425&ad=2pMGbaJioMDwMIESvwlCUekrdNA',
                h: 600,
                w: 300,
                nurl: 'https://bid-notice.rtb.bluems.com/v1/bid:won?winPrice=${AUCTION_PRICE}&accountId=306850905425&adId=2pMGbaJioMDwMIESvwlCUekrdNA&campaignId=2Xzb0pyfcOibtp9A5XsUSkzj2IT&exchangeId=prebid&tagId=13144370&impressionId=3b948a96652621&bidId=2rgRKcbHfDyX6ZU4zuPuf38hDB8%3A0&bidPrice=2&bidFloor=2&height=600&width=300&region=us-east-1&targetId=2rgH24MVckzSou4IpTyUa5l3Ija&currency=USD&campaignCurrency=USD&campaignCurrencyConversionFactor=1&publisherId=13144370&domain=d3fef36u6k6muh.cloudfront.net',
                lurl: 'https://bid-notice.rtb.bluems.com/v1/bid:lost?winPrice=${AUCTION_PRICE}&marketBidRatio=${AUCTION_MBR}&lossReasonCode=${AUCTION_LOSS}&accountId=306850905425&adId=2pMGbaJioMDwMIESvwlCUekrdNA&campaignId=2Xzb0pyfcOibtp9A5XsUSkzj2IT&exchangeId=prebid&tagId=13144370&impressionId=3b948a96652621&bidId=2rgRKcbHfDyX6ZU4zuPuf38hDB8%3A0&bidPrice=2&bidFloor=2&height=600&width=300&region=us-east-1&targetId=2rgH24MVckzSou4IpTyUa5l3Ija&currency=USD&campaignCurrency=USD&campaignCurrencyConversionFactor=1&publisherId=13144370&domain=d3fef36u6k6muh.cloudfront.net',
                burl: 'https://bid-notice.rtb.bluems.com/v1/bid:charged?winPrice=${AUCTION_PRICE}&accountId=306850905425&adId=2pMGbaJioMDwMIESvwlCUekrdNA&campaignId=2Xzb0pyfcOibtp9A5XsUSkzj2IT&exchangeId=prebid&tagId=13144370&impressionId=3b948a96652621&bidId=2rgRKcbHfDyX6ZU4zuPuf38hDB8%3A0&bidPrice=2&bidFloor=2&height=600&width=300&region=us-east-1&targetId=2rgH24MVckzSou4IpTyUa5l3Ija&currency=USD&campaignCurrency=USD&campaignCurrencyConversionFactor=1&publisherId=13144370&domain=d3fef36u6k6muh.cloudfront.net',
                exp: 60,
                ext: {
                  bms: {
                    accountId: '306850905425',
                    campaignId: '2Xzb0pyfcOibtp9A5XsUSkzj2IT',
                    adId: '2pMGbaJioMDwMIESvwlCUekrdNA',
                    region: 'us-east-1',
                    targetId: '2rgH24MVckzSou4IpTyUa5l3Ija',
                  },
                },
              },
            ],
            seat: '1',
          },
        ],
      };
      const request = {
        id: '10bb57ee-712f-43e9-9769-b26d03df8a39',
        bidder: BIDDER_CODE,
        params: {
          source: 886409,
        },
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        transactionId: '7d79850b-70aa-4c0f-af95-c1def0452825',
        sizes: [
          [300, 250],
          [300, 600],
        ],
        bidId: '2eb89f0f062afe',
        bidderRequestId: '1ae6c8e18f8462',
        auctionId: '1286637c-51bc-4fdd-8e35-2435ec11775a',
        ortb2: {},
      };

      const [ortbReq] = spec.buildRequests([request], {
        bids: [request],
      });

      const ortbResponse = spec.interpretResponse(
        { body: response },
        { data: ortbReq.data }
      );

      expect(ortbResponse.length).to.eq(1);
      expect(ortbResponse[0].mediaType).to.eq('banner');
    });
  });
});
