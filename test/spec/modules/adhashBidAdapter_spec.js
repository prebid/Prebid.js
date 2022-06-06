import { expect } from 'chai';
import { spec } from 'modules/adhashBidAdapter.js';

describe('adhashBidAdapter', function () {
  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'adhash',
      params: {
        publisherId: '0xc3b09b27e9c6ef73957901aa729b9e69e5bbfbfb',
        platformURL: 'https://adhash.com/p/struma/'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      adUnitCode: 'adunit-code',
      sizes: [[300, 250]],
      bidId: '12345678901234',
      bidderRequestId: '98765432109876',
      auctionId: '01234567891234',
    };

    it('should return true when all mandatory parameters are there', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when there are no params', function () {
      const bid = { ...validBid };
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when unsupported media type is requested', function () {
      const bid = { ...validBid };
      bid.mediaTypes = { native: { sizes: [[300, 250]] } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisherId is not a string', function () {
      const bid = { ...validBid };
      bid.params.publisherId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisherId is not valid', function () {
      const bid = { ...validBid };
      bid.params.publisherId = 'short string';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisherId is not a string', function () {
      const bid = { ...validBid };
      bid.params.platformURL = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisherId is not valid', function () {
      const bid = { ...validBid };
      bid.params.platformURL = 'https://';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequest = {
      params: {
        publisherId: '0xc3b09b27e9c6ef73957901aa729b9e69e5bbfbfb'
      },
      sizes: [[300, 250]],
      adUnitCode: 'adUnitCode'
    };
    it('should build the request correctly', function () {
      const result = spec.buildRequests(
        [ bidRequest ],
        { gdprConsent: { gdprApplies: true, consentString: 'example' }, refererInfo: { referer: 'http://example.com/' } }
      );
      expect(result.length).to.equal(1);
      expect(result[0].method).to.equal('POST');
      expect(result[0].url).to.equal('https://bidder.adhash.com/rtb?version=1.0&prebid=true&publisher=0xc3b09b27e9c6ef73957901aa729b9e69e5bbfbfb');
      expect(result[0].bidRequest).to.equal(bidRequest);
      expect(result[0].data).to.have.property('timezone');
      expect(result[0].data).to.have.property('location');
      expect(result[0].data).to.have.property('publisherId');
      expect(result[0].data).to.have.property('size');
      expect(result[0].data).to.have.property('navigator');
      expect(result[0].data).to.have.property('creatives');
      expect(result[0].data).to.have.property('blockedCreatives');
      expect(result[0].data).to.have.property('currentTimestamp');
      expect(result[0].data).to.have.property('recentAds');
    });
    it('should build the request correctly without referer', function () {
      const result = spec.buildRequests([ bidRequest ], { gdprConsent: { gdprApplies: true, consentString: 'example' } });
      expect(result.length).to.equal(1);
      expect(result[0].method).to.equal('POST');
      expect(result[0].url).to.equal('https://bidder.adhash.com/rtb?version=1.0&prebid=true&publisher=0xc3b09b27e9c6ef73957901aa729b9e69e5bbfbfb');
      expect(result[0].bidRequest).to.equal(bidRequest);
      expect(result[0].data).to.have.property('timezone');
      expect(result[0].data).to.have.property('location');
      expect(result[0].data).to.have.property('publisherId');
      expect(result[0].data).to.have.property('size');
      expect(result[0].data).to.have.property('navigator');
      expect(result[0].data).to.have.property('creatives');
      expect(result[0].data).to.have.property('blockedCreatives');
      expect(result[0].data).to.have.property('currentTimestamp');
      expect(result[0].data).to.have.property('recentAds');
    });
  });

  describe('interpretResponse', function () {
    const request = {
      data: { some: 'data' },
      bidRequest: {
        bidId: '12345678901234',
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        params: {
          platformURL: 'https://adhash.com/p/struma/'
        }
      }
    };

    let bodyStub;

    const serverResponse = {
      body: {
        creatives: [{ costEUR: 1.234 }],
        advertiserDomains: 'adhash.com',
        badWords: [
          ['onqjbeq1', 'full', 1],
          ['onqjbeq2', 'partial', 1],
          ['tbbqjbeq', 'full', -1],
        ],
        maxScore: 2
      }
    };

    afterEach(function() {
      bodyStub && bodyStub.restore();
    });

    it('should interpret the response correctly', function () {
      const result = spec.interpretResponse(serverResponse, request);
      expect(result.length).to.equal(1);
      expect(result[0].requestId).to.equal('12345678901234');
      expect(result[0].cpm).to.equal(1.234);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal('adunit-code');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].ttl).to.equal(60);
      expect(result[0].meta.advertiserDomains).to.eql(['adhash.com']);
    });

    it('should return empty array when there are bad words (full)', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text badWord1 badWord1 example badWord1 text' + ' word'.repeat(493);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(0);
    });

    it('should return empty array when there are bad words (partial)', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text partialBadWord2 badword2 example BadWord2text' + ' word'.repeat(494);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(0);
    });

    it('should return non-empty array when there are not enough bad words (full)', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text badWord1 badWord1 example text' + ' word'.repeat(494);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(1);
    });

    it('should return non-empty array when there are not enough bad words (partial)', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text partialBadWord2 example' + ' word'.repeat(496);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(1);
    });

    it('should return non-empty array when there are no-bad word matches', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text partialBadWord1 example text' + ' word'.repeat(495);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(1);
    });

    it('should return non-empty array when there are bad words and good words', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return 'example text badWord1 badWord1 example badWord1 goodWord goodWord ' + ' word'.repeat(492);
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(1);
    });

    it('should return non-empty array when there is a problem with the brand-safety', function () {
      bodyStub = sinon.stub(window.top.document.body, 'innerText').get(function() {
        return null;
      });
      expect(spec.interpretResponse(serverResponse, request).length).to.equal(1);
    });

    it('should return empty array when there are no creatives returned', function () {
      expect(spec.interpretResponse({body: {creatives: []}}, request).length).to.equal(0);
    });

    it('should return empty array when there is no creatives key in the response', function () {
      expect(spec.interpretResponse({body: {}}, request).length).to.equal(0);
    });

    it('should return empty array when something is not right', function () {
      expect(spec.interpretResponse(null, request).length).to.equal(0);
    });
  });
});
