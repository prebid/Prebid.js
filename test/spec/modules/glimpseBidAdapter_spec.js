import { expect } from 'chai';
import { spec } from 'modules/glimpseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

/**
 * Test Helpers
 */

const API = 'https://api.glimpseprotocol.io/cloud/v1/vault/prebid';

const templateBidRequest = {
  bidder: 'glimpse',
  params: {
    placementId: 'glimpse-demo-300x250',
  },
  adUnitCode: 'banner-div-a',
  sizes: [[300, 250]],
  bidId: '26a80b71cfd671',
  bidderRequestId: '133baeded6ac94',
  auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
};

const templateBidderRequest = {
  bidderCode: 'glimpse',
  auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
  bidderRequestId: '133baeded6ac94',
  timeout: 3000,
  gdprConsent: {
    apiVersion: 2,
    consentString:
      'COzP517OzP517AcABBENAlCsAP_AAAAAAAwIF8NX-T5eL2vju2Zdt7JEaYwfZxyigOgThgQIsW8NwIeFbBoGP2EgHBG4JCQAGBAkkgCBAQMsHGBcCQAAgIgRiRKMYE2MjzNKBJJAigkbc0FACDVunsHS2ZCY70-8O__bPAviADAvUC-AAAAA.YAAAAAAAAAAA',
    gdprApplies: true,
    vendorData: {},
  },
  refererInfo: {
    referer: 'https://demo.glimpseprotocol.io/prebid/desktop',
    reachedTop: true,
    numIframes: 0,
    stack: ['https://demo.glimpseprotocol.io/prebid/desktop'],
  },
};

const templateBidResponse = {
  ad: '<div>HelloWorld</div>',
  adUnitCode: 'banner-div-a',
  bidder: 'glimpse',
  cpm: 1.04,
  creativeId: 'glimpse-demo-300x250',
  currency: 'GBP',
  height: 250,
  mediaType: 'banner',
  netRevenue: true,
  pbAg: '1.04',
  pbDg: '1.04',
  pbHg: '1.04',
  pbLg: '1.00',
  pbMg: '1.05',
  requestId: '133baeded6ac94',
  ttl: 60,
  width: 300,
};

const copyBidResponse = () => ({ ...templateBidResponse });
const copyBidderRequest = () => ({ ...templateBidderRequest, bids: copyBidRequests() });
const copyBidRequest = () => ({ ...templateBidRequest });

const copyBidRequests = () => [copyBidRequest()];
const copyBidResponses = () => ({
  body: [copyBidResponse()],
});

/**
 * Tests
 */

describe('GlimpseProtocolAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
      expect(adapter.getSpec).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when params.placementId is valid', function () {
      expect(spec.isBidRequestValid(templateBidRequest)).to.equal(true);
    });

    it('should return false when params.placementId is invalid', function () {
      let bid = copyBidRequest();
      delete bid.params;
      bid.params = {
        placementId: 0,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params is not passed', function () {
      let bid = copyBidRequest();
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params.placementId is not passed', function () {
      let bid = copyBidRequest();
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequest = copyBidRequest();
    const bidRequests = [bidRequest];

    it('should add version and source information', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.sdk).to.exist;
      expect(payload.sdk).to.deep.equal({
        source: 'pbjs',
        version: '$prebid.version$',
      });
    });

    it('should send request to API via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(API);
      expect(request.method).to.equal('POST');
    });

    it('should add GDPR consent', function () {
      const bidderRequest = copyBidderRequest();
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      const { gdprConsent } = payload;
      expect(gdprConsent.gdprApplies).to.be.true;
      expect(gdprConsent.consentString).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should add referer info', function () {
      const bidderRequest = copyBidderRequest();
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.refererInfo.referer).to.equal(templateBidderRequest.refererInfo.referer);
    });
  });

  describe('interpretResponse', function () {
    it('should handle valid bid responses', function () {
      const response = copyBidResponses();

      const bids = spec.interpretResponse(response);
      expect(bids).to.have.length(1);
      expect(bids[0].adUnitCode).to.equal(templateBidRequest.adUnitCode);
    });

    it('should handle no bid responses', function () {
      const response = copyBidResponses();
      response.body = [];

      const bids = spec.interpretResponse(response);
      expect(bids).to.have.length(0);
    });

    it('should return no bid on an invalid response', function () {
      const response = copyBidResponses();
      delete response.body;

      const bids = spec.interpretResponse(response);
      expect(bids).to.have.length(0);
    });
  });
});
