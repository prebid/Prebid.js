import * as utils from 'src/utils';
import { config } from 'src/config';
import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { spec } from 'modules/ixBidAdapter';

describe('IndexexchangeAdapter', function () {
  const IX_ENDPOINT = 'http://as.casalemedia.com/cygnus';
  const BIDDER_VERSION = 7.2;

  const DEFAULT_BANNER_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd'
    }
  ];
  const DEFAULT_BANNER_BID_RESPONSE = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '<a target="_blank" href="http://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found for a banner ad', function () {
      expect(spec.isBidRequestValid(DEFAULT_BANNER_VALID_BID[0])).to.equal(true);
    });

    it('should return true when optional params found for a banner ad', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when siteID is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when siteID is missing', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when size is missing', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when size array is wrong length', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = [
        300,
        250,
        250
      ];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when size array is array of strings', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = ['300', '250'];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes is not banner', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          sizes: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.banner does not have sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes = {
        banner: {
          size: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is not banner', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'banne';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is video', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'video';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is native', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'native';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when mediaType is missing and has sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is banner', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'banner';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when there is only bidFloor', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when there is only bidFloorCur', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloor is string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = '50';
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloorCur is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 70;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequestsBanner', function () {
    const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID);
    const requestUrl = request.url;
    const requestMethod = request.method;
    const query = request.data;

    const bidWithoutMediaType = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    delete bidWithoutMediaType[0].mediaTypes;
    bidWithoutMediaType[0].sizes = [[300, 250], [300, 600]];
    const requestWithoutMediaType = spec.buildRequests(bidWithoutMediaType);
    const queryWithoutMediaType = requestWithoutMediaType.data;

    it('request should be made to IX endpoint with GET method', function () {
      expect(requestMethod).to.equal('GET');
      expect(requestUrl).to.equal(IX_ENDPOINT);
    });

    it('query object (version, siteID and request) should be correct', function () {
      expect(query.v).to.equal(BIDDER_VERSION);
      expect(query.s).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(query.r).to.exist;
      expect(query.ac).to.equal('j');
      expect(query.sd).to.equal(1);
    });

    it('payload should have correct format and value', function () {
      const payload = JSON.parse(query.r);

      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.site).to.exist;
      expect(payload.site.page).to.exist;
      expect(payload.site.page).to.contain('http');
      expect(payload.site.ref).to.exist;
      expect(payload.site.ref).to.be.a('string');
      expect(payload.ext).to.exist;
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.imp).to.exist;
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(1);
    });

    it('impression should have correct format and value', function () {
      const impression = JSON.parse(query.r).imp[0];
      const sidValue = `${DEFAULT_BANNER_VALID_BID[0].params.size[0].toString()}x${DEFAULT_BANNER_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('impression should have bidFloor and bidFloorCur if configured', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      const requestBidFloor = spec.buildRequests([bid]);
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.bidfloor).to.equal(bid.params.bidFloor);
      expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
    });

    it('payload without mediaType should have correct format and value', function () {
      const payload = JSON.parse(queryWithoutMediaType.r);

      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.site).to.exist;
      expect(payload.site.page).to.exist;
      expect(payload.site.page).to.contain('http');
      expect(payload.site.ref).to.exist;
      expect(payload.site.ref).to.be.a('string');
      expect(payload.ext).to.exist;
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.imp).to.exist;
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(1);
    });

    it('impression without mediaType should have correct format and value', function () {
      const impression = JSON.parse(queryWithoutMediaType.r).imp[0];
      const sidValue = `${DEFAULT_BANNER_VALID_BID[0].params.size[0].toString()}x${DEFAULT_BANNER_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('impression should have sid if id is configured as number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 50;
      const requestBidFloor = spec.buildRequests([bid]);
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal('50');
    });

    it('impression should have sid if id is configured as string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 'abc';
      const requestBidFloor = spec.buildRequests([bid]);
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal('abc');
    });

    it('should add first party data to page url in bid request if it exists in config', function () {
      config.setConfig({
        ix: {
          firstPartyData: {
            ab: 123,
            cd: '123#ab',
            'e/f': 456,
            'h?g': '456#cd'
          }
        }
      });

      const requestWithFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID);
      const pageUrl = JSON.parse(requestWithFirstPartyData.data.r).site.page;
      const expectedPageUrl = `${utils.getTopWindowUrl()}?ab=123&cd=123%23ab&e%2Ff=456&h%3Fg=456%23cd`;

      expect(pageUrl).to.equal(expectedPageUrl);
    });

    it('should not set first party data if it is not an object', function () {
      config.setConfig({
        ix: {
          firstPartyData: 500
        }
      });

      const requestFirstPartyDataNumber = spec.buildRequests(DEFAULT_BANNER_VALID_BID);
      const pageUrl = JSON.parse(requestFirstPartyDataNumber.data.r).site.page;

      expect(pageUrl).to.equal(utils.getTopWindowUrl());
    });

    it('should not set first party or timeout if it is not present', function () {
      config.setConfig({
        ix: {}
      });

      const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID);
      const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

      expect(pageUrl).to.equal(utils.getTopWindowUrl());
      expect(requestWithoutConfig.data.t).to.be.undefined;
    });

    it('should not set first party or timeout if it is setConfig is not called', function () {
      const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID);
      const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

      expect(pageUrl).to.equal(utils.getTopWindowUrl());
      expect(requestWithoutConfig.data.t).to.be.undefined;
    });

    it('should set timeout if publisher set it through setConfig', function () {
      config.setConfig({
        ix: {
          timeout: 500
        }
      });
      const requestWithTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID);

      expect(requestWithTimeout.data.t).to.equal(500);
    });

    it('should set timeout if timeout is a string', function () {
      config.setConfig({
        ix: {
          timeout: '500'
        }
      });
      const requestStringTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID);

      expect(requestStringTimeout.data.t).to.be.undefined;
    });
  });

  describe('interpretResponseBanner', function () {
    it('should get correct bid response', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          ad: '<a target="_blank" href="http://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 35,
          netRevenue: true,
          dealId: undefined
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set creativeId to default value if not provided', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      delete bidResponse.seatbid[0].bid[0].crid;
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '-',
          width: 300,
          height: 250,
          ad: '<a target="_blank" href="http://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 35,
          netRevenue: true,
          dealId: undefined
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set Japanese price correctly', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.cur = 'JPY';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 100,
          creativeId: '12345',
          width: 300,
          height: 250,
          ad: '<a target="_blank" href="http://www.indexexchange.com"></a>',
          currency: 'JPY',
          ttl: 35,
          netRevenue: true,
          dealId: undefined
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set dealId correctly', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'deal';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          ad: '<a target="_blank" href="http://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 35,
          netRevenue: true,
          dealId: 'deal'
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('bidrequest should have consent info if gdprApplies and consentString exist', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          consentString: '3huaa11=qu3198ae',
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent.data.r);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('bidrequest should not have consent field if consentString is undefined', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent.data.r);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user).to.be.undefined;
    });

    it('bidrequest should not have gdpr field if gdprApplies is undefined', function () {
      const options = {
        gdprConsent: {
          consentString: '3huaa11=qu3198ae',
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent.data.r);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('bidrequest should not have consent info if options.gdprConsent is undefined', function () {
      const options = {};
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent.data.r);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user).to.be.undefined;
    });
  });
});
