import { expect } from 'chai';
import { spec } from 'modules/oguryBidAdapter';
import { deepClone } from 'src/utils.js';

const BID_HOST = 'https://webmobile.presage.io/api/header-bidding-request';

describe('OguryBidAdapter', function () {
  let bidRequests;
  let bidderRequest;

  bidRequests = [
    {
      adUnitCode: 'adUnitCode',
      auctionId: 'auctionId',
      bidId: 'bidId',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      getFloor: ({ size, currency, mediaType }) => {
        const floorResult = {
          currency: 'USD',
          floor: 0
        };

        if (mediaType === 'banner') {
          floorResult.floor = 4;
        } else {
          floorResult.floor = 1000;
        }

        return floorResult;
      },
      transactionId: 'transactionId'
    },
    {
      adUnitCode: 'adUnitCode2',
      auctionId: 'auctionId',
      bidId: 'bidId2',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId2'
      },
      mediaTypes: {
        banner: {
          sizes: [[600, 500]]
        }
      },
      transactionId: 'transactionId2'
    },
  ];

  bidderRequest = {
    auctionId: bidRequests[0].auctionId,
    gdprConsent: {consentString: 'myConsentString', vendorData: {}, gdprApplies: true},
  };

  describe('isBidRequestValid', function () {
    it('should validate correct bid', () => {
      let validBid = deepClone(bidRequests[0]);

      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('should not validate incorrect bid', () => {
      let invalidBid = deepClone(bidRequests[0]);
      delete invalidBid.sizes;
      delete invalidBid.mediaTypes;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should not validate bid if adunit is not present', () => {
      let invalidBid = deepClone(bidRequests[0]);
      delete invalidBid.params.adUnitId;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should not validate bid if assetKet is not present', () => {
      let invalidBid = deepClone(bidRequests[0]);
      delete invalidBid.params.assetKey;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should validate bid if getFloor is not present', () => {
      let invalidBid = deepClone(bidRequests[1]);
      delete invalidBid.getFloor;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const defaultTimeout = 1000;
    const expectedRequestObject = {
      id: bidRequests[0].auctionId,
      at: 2,
      tmax: defaultTimeout,
      imp: [{
        id: bidRequests[0].bidId,
        tagid: bidRequests[0].params.adUnitId,
        bidfloor: 4,
        banner: {
          format: [{
            w: 300,
            h: 250
          }]
        }
      }, {
        id: bidRequests[1].bidId,
        tagid: bidRequests[1].params.adUnitId,
        bidfloor: 0,
        banner: {
          format: [{
            w: 600,
            h: 500
          }]
        }
      }],
      regs: {
        ext: {
          gdpr: 1
        },
      },
      site: {
        id: bidRequests[0].params.assetKey,
        domain: window.location.hostname,
      },
      user: {
        ext: {
          consent: bidderRequest.gdprConsent.consentString
        },
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const validBidRequests = deepClone(bidRequests)

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.url).to.equal(BID_HOST);
      expect(request.method).to.equal('POST');
    });

    it('bid request object should be conform', function () {
      const validBidRequests = deepClone(bidRequests)

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestObject);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    it('should not add gdpr infos if not present', () => {
      const bidderRequestWithoutGdpr = {
        ...bidderRequest,
        gdprConsent: {},
      }
      const expectedRequestObjectWithoutGdpr = {
        ...expectedRequestObject,
        regs: {
          ext: {
            gdpr: 1
          },
        },
        user: {
          ext: {
            consent: ''
          },
        }
      };

      const validBidRequests = bidRequests

      const request = spec.buildRequests(validBidRequests, bidderRequestWithoutGdpr);
      expect(request.data).to.deep.equal(expectedRequestObjectWithoutGdpr);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    it('should handle bidFloor undefined', () => {
      const expectedRequestWithUndefinedFloor = {
        ...expectedRequestObject
      };

      const validBidRequests = deepClone(bidRequests);
      validBidRequests[1] = {
        ...validBidRequests[1],
        getFloor: undefined
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithUndefinedFloor);
    });

    it('should handle bidFloor when is not function', () => {
      const expectedRequestWithNotAFunctionFloor = {
        ...expectedRequestObject
      };

      let validBidRequests = deepClone(bidRequests);
      validBidRequests[1] = {
        ...validBidRequests[1],
        getFloor: 'getFloor'
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithNotAFunctionFloor);
    });

    it('should handle bidFloor when currency is not USD', () => {
      const expectedRequestWithUnsupportedFloorCurrency = deepClone(expectedRequestObject)
      expectedRequestWithUnsupportedFloorCurrency.imp[0].bidfloor = 0;
      let validBidRequests = deepClone(bidRequests);
      validBidRequests[0] = {
        ...validBidRequests[0],
        getFloor: ({ size, currency, mediaType }) => {
          return {
            currency: 'EUR',
            floor: 4
          }
        }
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithUnsupportedFloorCurrency);
    });
  });

  describe('interpretResponse', function () {
    let openRtbBidResponse = {
      body: {
        id: 'id_of_bid_response',
        seatbid: [{
          bid: [{
            id: 'advertId',
            impid: 'bidId',
            price: 100,
            nurl: 'url',
            adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
            adomain: ['renault.fr'],
            w: 300,
            h: 250
          }, {
            id: 'advertId2',
            impid: 'bidId2',
            price: 150,
            nurl: 'url2',
            adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 600px; height: 500px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
            adomain: ['peugeot.fr'],
            w: 600,
            h: 500
          }],
        }]
      }
    };

    it('should correctly interpret bidResponse', () => {
      let expectedInterpretedBidResponse = [{
        requestId: openRtbBidResponse.body.seatbid[0].bid[0].impid,
        cpm: openRtbBidResponse.body.seatbid[0].bid[0].price,
        currency: 'USD',
        width: openRtbBidResponse.body.seatbid[0].bid[0].w,
        height: openRtbBidResponse.body.seatbid[0].bid[0].h,
        ad: openRtbBidResponse.body.seatbid[0].bid[0].adm,
        ttl: 60,
        creativeId: openRtbBidResponse.body.seatbid[0].bid[0].id,
        netRevenue: true,
        meta: {
          advertiserDomains: openRtbBidResponse.body.seatbid[0].bid[0].adomain
        }
      }, {
        requestId: openRtbBidResponse.body.seatbid[0].bid[1].impid,
        cpm: openRtbBidResponse.body.seatbid[0].bid[1].price,
        currency: 'USD',
        width: openRtbBidResponse.body.seatbid[0].bid[1].w,
        height: openRtbBidResponse.body.seatbid[0].bid[1].h,
        ad: openRtbBidResponse.body.seatbid[0].bid[1].adm,
        ttl: 60,
        creativeId: openRtbBidResponse.body.seatbid[0].bid[1].id,
        netRevenue: true,
        meta: {
          advertiserDomains: openRtbBidResponse.body.seatbid[0].bid[1].adomain
        }
      }]

      let request = spec.buildRequests(bidRequests, bidderRequest);
      let result = spec.interpretResponse(openRtbBidResponse, request);

      expect(result).to.deep.equal(expectedInterpretedBidResponse)
    });

    it('should return empty array if error during parsing', () => {
      const wrongOpenRtbBidReponse = 'wrong data'
      let request = spec.buildRequests(bidRequests, bidderRequest);
      let result = spec.interpretResponse(wrongOpenRtbBidReponse, request);

      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(0)
    })
  });
});
