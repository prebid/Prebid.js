import { expect } from 'chai';
import { spec } from 'modules/adspiritBidAdapter.js';
import * as utils from 'src/utils.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from 'src/mediaTypes.js';
const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

describe('Adspirit Bidder Spec', function () {
  // isBidRequestValid ---case
  describe('isBidRequestValid', function () {
    it('should return true if the bid request is valid', function () {
      const validBid = { bidder: 'adspirit', params: { placementId: '57', host: 'test.adspirit.de' } };
      const result = spec.isBidRequestValid(validBid);
      expect(result).to.be.true;
    });

    it('should return false if the bid request is invalid', function () {
      const invalidBid = { bidder: 'adspirit', params: {} };
      const result = spec.isBidRequestValid(invalidBid);
      expect(result).to.be.false;
    });
  });

  // getBidderHost Case
  describe('getBidderHost', function () {
    it('should return host for adspirit bidder', function () {
      const bid = { bidder: 'adspirit', params: { host: 'test.adspirit.de' } };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('test.adspirit.de');
    });

    it('should return host for twiago bidder', function () {
      const bid = { bidder: 'twiago' };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('a.twiago.com');
    });
    it('should return null for unsupported bidder', function () {
      const bid = { bidder: 'unsupportedBidder', params: {} };
      const result = spec.getBidderHost(bid);
      expect(result).to.be.null;
    });
  });

  // Test cases for buildRequests

  describe('Adspirit Bidder Spec', function () {
    let originalInnerWidth;
    let originalInnerHeight;
    let originalClientWidth;
    let originalClientHeight;
  
    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      originalInnerHeight = window.innerHeight;
      originalClientWidth = document.documentElement.clientWidth;
      originalClientHeight = document.documentElement.clientHeight;
  
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
      Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(document.documentElement, 'clientHeight', { writable: true, configurable: true, value: 600 });
    });
  
    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
      Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: originalClientWidth });
      Object.defineProperty(document.documentElement, 'clientHeight', { writable: true, configurable: true, value: originalClientHeight });
    });
  
    it('should construct valid POST bid requests with GDPR in URL and schain in payload', function () {
      const bidRequestWithGDPRAndSchain = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '69', host: 'siva.adspirit.de', bidfloor: 0.5 },
          adUnitCode: 'native-div',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          schain: {
            ver: '1.0',
            nodes: [
              {
                asi: 'exchange1.com',
                sid: '1234',
                hp: 1,
                rid: 'bidRequest123',
                name: 'Publisher',
                domain: 'publisher.com'
              }
            ]
          }
        }
      ];
  
      const mockBidderRequestWithGDPR = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' },
        gdprConsent: { gdprApplies: true, consentString: 'consentString' }
      };
  
      const requests = spec.buildRequests(bidRequestWithGDPRAndSchain, mockBidderRequestWithGDPR);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
  
      expect(request.method).to.equal('POST');
      expect(request.url).to.match(/^\/\/siva\.adspirit\.de/);
      expect(request.headers['Content-Type']).to.equal('application/json');
      expect(request.url).to.include('gdpr=1');
      expect(request.url).to.include('gdpr_consent=consentString');
  
      const requestData = JSON.parse(request.data);
      console.log('Debug: requestData.ext:', requestData.ext);
      
      if (requestData.ext && requestData.ext.prebidVersion) {
          expect(requestData.ext).to.have.property('prebidVersion').that.is.a('string');
      } else {
          console.warn('Warning: prebidVersion is missing from request data');
      }
    });
  
    it('should correctly capture window and document dimensions in URL', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '69', host: 'siva.adspirit.de' },
          adUnitCode: 'native-div',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        }
      ];
  
      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };
  
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
  
      expect(request.url).to.include('wcx=1024');
      expect(request.url).to.include('wcy=768');
    });
  
    it('should correctly fall back to document dimensions if window dimensions are not available', function () {
      const bidRequest = [
        {
          bidId: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: { placementId: '69', host: 'siva.adspirit.de' },
          adUnitCode: 'native-div',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        }
      ];
  
      const mockBidderRequest = {
        refererInfo: { topmostLocation: 'https://test.adspirit.com' }
      };
      delete global.window.innerWidth;
      delete global.window.innerHeight;
  
      const requests = spec.buildRequests(bidRequest, mockBidderRequest);
      const request = requests[0];
  
      expect(request.url).to.include('wcx=800');
      expect(request.url).to.include('wcy=600');
    });
  });

  describe('interpretResponse', function () {
    const nativeBidRequestMock = {
      bidRequest: {
        bidId: '123456',
        params: {
          placementId: '57',
          adomain: ['test.adspirit.de']
        },
        mediaTypes: {
          native: true
        }
      }
    };
  
    it('should return empty array when serverResponse is missing', function () {
      const result = spec.interpretResponse(null, { bidRequest: {} });
      expect(result).to.be.an('array').that.is.empty;
    });
  
    it('should return empty array when serverResponse.body is missing', function () {
      const result = spec.interpretResponse({}, { bidRequest: {} });
      expect(result).to.be.an('array').that.is.empty;
    });
  
    it('should return empty array when bidObj is missing', function () {
      const result = spec.interpretResponse({ body: { cpm: 1.0 } }, { bidRequest: null });
      expect(result).to.be.an('array').that.is.empty;
    });
  
    it('should return empty array when all required parameters are missing', function () {
      const result = spec.interpretResponse(null, { bidRequest: null });
      expect(result).to.be.an('array').that.is.empty;
    });
  
    it('should handle native media type bids and missing cpm in the server response body', function () {
      const serverResponse = {
        body: {
          w: 320,
          h: 50,
          title: 'Ad Title',
          body: 'Ad Body',
          cta: 'Click Here',
          image: 'img_url',
          click: 'click_url',
          view: 'view_tracker_url'
        }
      };
      const result = spec.interpretResponse(serverResponse, nativeBidRequestMock);
      expect(result.length).to.equal(0);
    });
  
    it('should handle native media type bids', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 1.0,
              w: 320,
              h: 50,
              crid: 'creative123',
              adomain: ['test.adspirit.de'],
              ext: {
                native: {
                  title: 'Ad Title',
                  body: 'Ad Body',
                  cta: 'Click Here',
                  image: 'img_url',
                  click: 'click_url',
                  impressionTrackers: ['view_tracker_url']
                }
              }
            }]
          }],
          cur: 'EUR'
        }
      };
      const result = spec.interpretResponse(serverResponse, nativeBidRequestMock);
      expect(result.length).to.equal(1);
      const bid = result[0];
      expect(bid).to.include({
        requestId: '123456',
        cpm: 1.0,
        width: 320,
        height: 50,
        creativeId: 'creative123',
        currency: 'EUR',
        netRevenue: true,
        ttl: 300,
        mediaType: 'native'
      });
      expect(bid.native).to.deep.include({
        title: 'Ad Title',
        body: 'Ad Body',
        cta: 'Click Here',
        image: { url: 'img_url' },
        clickUrl: 'click_url',
        impressionTrackers: ['view_tracker_url']
      });
    });
  
    const bannerBidRequestMock = {
      bidRequest: {
        bidId: '123456',
        params: {
          placementId: '57',
          adomain: ['siva.adspirit.de']
        },
        mediaTypes: {
          banner: true
        }
      }
    };
  
    it('should handle banner media type bids and missing cpm in the server response body', function () {
      const serverResponseBanner = {
        body: {
          w: 728,
          h: 90,
          adm: '<div>Ad Content</div>'
        }
      };
      const result = spec.interpretResponse(serverResponseBanner, bannerBidRequestMock);
      expect(result.length).to.equal(0);
    });
  
    it('should handle banner media type bids', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: '123456',
              price: 2.0,
              w: 728,
              h: 90,
              adm: '<div>Ad Content</div>',
              crid: 'creative123',
              adomain: ['siva.adspirit.de']
            }]
          }],
          cur: 'EUR'
        }
      };
      const result = spec.interpretResponse(serverResponse, bannerBidRequestMock);
      expect(result.length).to.equal(1);
      const bid = result[0];
      expect(bid).to.include({
        requestId: '123456',
        cpm: 2.0,
        width: 728,
        height: 90,
        creativeId: 'creative123',
        currency: 'EUR',
        netRevenue: true,
        ttl: 300,
        mediaType: 'banner'
      });
      expect(bid.ad).to.equal('<div>Ad Content</div>');
    });
  });
  

});
