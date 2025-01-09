import { expect } from 'chai'
import { spec, getPageKeywords, parseUserAgent } from 'modules/eightPodBidAdapter'
import 'modules/priceFloors.js'
import { config } from 'src/config.js'
import { newBidder } from 'src/adapters/bidderFactory'
import * as utils from '../../../src/utils';
import sinon from 'sinon';

describe('eightPodBidAdapter', function () {
  const adapter = newBidder(spec)
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'eightPod',
      adUnitCode: '/adunit-code/test-path',
      bidId: 'test-bid-id-1',
      bidderRequestId: 'test-bid-request-1',
      auctionId: 'test-auction-1',
      transactionId: 'test-transactionId-1',
      params: {
        placementId: 'placementId1',
      },
    }
    const invalidBid = {
      bidder: 'eightPod',
      adUnitCode: '/adunit-code/test-path',
      bidId: 'test-bid-id-1',
      bidderRequestId: 'test-bid-request-1',
      auctionId: 'test-auction-1',
      transactionId: 'test-transactionId-1',
    }

    beforeEach(() => {
      config.resetConfig()
    })

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true)
    })

    it('should return false when required params found and invalid bid', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    let bidRequests, bidderRequest
    beforeEach(function () {
      bidRequests = [
        {
          bidder: 'eightPod',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600],
              ],
            },
          },
          adUnitCode: '/adunit-code/test-path',
          bidId: 'test-bid-id-1',
          bidderRequestId: 'test-bid-request-1',
          auctionId: 'test-auction-1',
          transactionId: 'test-transactionId-1',
          params: {
            placementId: 'placementId1',
          }
        }
      ]
      bidderRequest = {
        refererInfo: {},
        ortb2: {
          device: {
            ua: 'ua',
            language: 'en',
            dnt: 1,
            js: 1,
          }
        } }
    })

    it('should return an empty array when no bid requests', function () {
      const bidRequest = spec.buildRequests([], bidderRequest)
      expect(bidRequest).to.be.an('array')
      expect(bidRequest.length).to.equal(0)
    })

    it('should return a valid bid request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)

      expect(request).to.be.an('array')
      expect(request[0].data).to.be.an('object')
      expect(request[0].method).to.equal('POST')
      expect(request[0].url).to.not.equal('')
      expect(request[0].url).to.not.equal(undefined)
      expect(request[0].url).to.not.equal(null)
    })
  })

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain nurl', function() {
      spec.onBidWon({});
      expect(utils.triggerPixel.callCount).to.equal(0)
    })

    it('Should trigger pixel if bid nurl', function() {
      spec.onBidWon({
        burl: 'https://example.com/some-tracker'
      });
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })

  describe('getPageKeywords function', function() {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the top document keywords if available', function() {
      const keywordsContent = 'keyword1,keyword2,keyword3';
      const fakeTopDocument = {
        querySelector: sandbox.stub()
          .withArgs('meta[name="keywords"]').returns({ content: keywordsContent })
      };
      const fakeTopWindow = { document: fakeTopDocument };

      const result = getPageKeywords({ top: fakeTopWindow });
      expect(result).to.equal(keywordsContent);
    });

    it('should return the current document keywords if top document is not accessible', function() {
      const keywordsContent = 'keyword1,keyword2,keyword3';
      sandbox.stub(document, 'querySelector')
        .withArgs('meta[name="keywords"]').returns({ content: keywordsContent });

      const fakeWindow = {
        get top() {
          throw new Error('Access denied');
        }
      };

      const result = getPageKeywords(fakeWindow);
      expect(result).to.equal(keywordsContent);
    });

    it('should return an empty string if no keywords meta tag is found', function() {
      sandbox.stub(document, 'querySelector').withArgs('meta[name="keywords"]').returns(null);

      const result = getPageKeywords();
      expect(result).to.equal('');
    });
  });

  describe('parseUserAgent function', function() {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the platform and version IOS', function() {
      const uaStub = sandbox.stub(window.navigator, 'userAgent');
      uaStub.value('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');

      const result = parseUserAgent();
      expect(result.platform).to.equal('ios');
      expect(result.version).to.equal('iphone');
      expect(result.device).to.equal('16.6');
    });

    it('should return the platform and version android', function() {
      const uaStub = sandbox.stub(window.navigator, 'userAgent');
      uaStub.value('Mozilla/5.0 (Linux; Android 5.0.1; SM-G920V Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Mobile Safari/537.36');

      const result = parseUserAgent();
      expect(result.platform).to.equal('android');
      expect(result.version).to.equal('5.0');
      expect(result.device).to.equal('');
    })
  })
})
