import { expect } from 'chai';
import { spec } from 'modules/adrinoBidAdapter.js';
import {config} from '../../../src/config.js';
import * as utils from '../../../src/utils';

describe('adrinoBidAdapter', function () {
  afterEach(() => {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'adrino',
      params: {
        hash: 'abcdef123456'
      },
      mediaTypes: {
        native: {
          title: {
            required: true
          },
          image: {
            required: true,
            sizes: [[300, 150], [300, 210]]
          }
        }
      },
      adUnitCode: 'adunit-code',
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
      bid.mediaTypes = { banner: { sizes: [[300, 250]] } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when hash is not a string', function () {
      const bid = { ...validBid };
      bid.params.hash = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequest = {
      bidder: 'adrino',
      params: {
        hash: 'abcdef123456'
      },
      mediaTypes: {
        native: {
          title: {
            required: true
          },
          image: {
            required: true,
            sizes: [[300, 150], [300, 210]]
          }
        }
      },
      adUnitCode: 'adunit-code',
      bidId: '12345678901234',
      bidderRequestId: '98765432109876',
      auctionId: '01234567891234',
    };

    it('should build the request correctly with custom domain', function () {
      config.setConfig({adrino: { host: 'https://stg-prebid-bidder.adrino.io' }});
      const result = spec.buildRequests(
        [ bidRequest ],
        { refererInfo: { page: 'http://example.com/' } }
      );
      expect(result.length).to.equal(1);
      expect(result[0].method).to.equal('POST');
      expect(result[0].url).to.equal('https://stg-prebid-bidder.adrino.io/bidder/bid/');
      expect(result[0].data.bidId).to.equal('12345678901234');
      expect(result[0].data.placementHash).to.equal('abcdef123456');
      expect(result[0].data.referer).to.equal('http://example.com/');
      expect(result[0].data.userAgent).to.equal(navigator.userAgent);
      expect(result[0].data).to.have.property('nativeParams');
      expect(result[0].data).not.to.have.property('gdprConsent');
    });

    it('should build the request correctly with gdpr', function () {
      const result = spec.buildRequests(
        [ bidRequest ],
        { gdprConsent: { gdprApplies: true, consentString: 'abc123' }, refererInfo: { page: 'http://example.com/' } }
      );
      expect(result.length).to.equal(1);
      expect(result[0].method).to.equal('POST');
      expect(result[0].url).to.equal('https://prd-prebid-bidder.adrino.io/bidder/bid/');
      expect(result[0].data.bidId).to.equal('12345678901234');
      expect(result[0].data.placementHash).to.equal('abcdef123456');
      expect(result[0].data.referer).to.equal('http://example.com/');
      expect(result[0].data.userAgent).to.equal(navigator.userAgent);
      expect(result[0].data).to.have.property('nativeParams');
      expect(result[0].data).to.have.property('gdprConsent');
    });

    it('should build the request correctly without gdpr', function () {
      const result = spec.buildRequests(
        [ bidRequest ],
        { refererInfo: { page: 'http://example.com/' } }
      );
      expect(result.length).to.equal(1);
      expect(result[0].method).to.equal('POST');
      expect(result[0].url).to.equal('https://prd-prebid-bidder.adrino.io/bidder/bid/');
      expect(result[0].data.bidId).to.equal('12345678901234');
      expect(result[0].data.placementHash).to.equal('abcdef123456');
      expect(result[0].data.referer).to.equal('http://example.com/');
      expect(result[0].data.userAgent).to.equal(navigator.userAgent);
      expect(result[0].data).to.have.property('nativeParams');
      expect(result[0].data).not.to.have.property('gdprConsent');
    });
  });

  describe('interpretResponse', function () {
    it('should interpret the response correctly', function () {
      const response = {
        requestId: '31662c69728811',
        mediaType: 'native',
        cpm: 0.53,
        currency: 'PLN',
        creativeId: '859115',
        netRevenue: true,
        ttl: 600,
        width: 1,
        height: 1,
        noAd: false,
        testAd: false,
        native: {
          title: 'Ad Title',
          body: 'Ad Body',
          image: {
            url: 'http://emisja.contentstream.pl/_/getImageII/?vid=17180728299&typ=cs_300_150&element=IMAGE&scale=1&prefix=adart&nc=1643878278955',
            height: 150,
            width: 300
          },
          clickUrl: 'http://emisja.contentstream.pl/_/ctr2/?u=https%3A%2F%2Fonline.efortuna.pl%2Fpage%3Fkey%3Dej0xMzUzMTM1NiZsPTE1Mjc1MzY1JnA9NTMyOTA%253D&e=znU3tABN8K4N391dmUxYfte5G9tBaDXELJVo1_-kvaTJH2XwWRw77fmfL2YjcEmrbqRQ3M0GcJ0vPWcLtZlsrf8dWrAEHNoZKAC6JMnZF_65IYhTPbQIJ-zn3ac9TU7gEZftFKksH1al7rMuieleVv9r6_DtrOk_oZcYAe4rMRQM-TiWvivJRPBchAAblE0cqyG7rCunJFpal43sxlYm4GvcBJaYHzErn5PXjEzNbd3xHjkdiap-xU9y6BbfkUZ1xIMS8QZLvwNrTXMFCSfSRN2tgVfEj7KyGdLCITHSaFtuIKT2iW2pxC7f2RtPHnzsEPXH0SgAfhA3OxZ5jkQjOZy0PsO7MiCv3sJai5ezUAOjFgayU91ZhI0Y9r2YpB1tTGIjnO23wot8PvRENlThHQ%3D%3D&ref=https%3A%2F%2Fbox.adrino.cloud%2Ftmielcarz%2Fadrino_prebid%2Ftest_page3.html%3Fpbjs_debug%3Dtrue',
          privacyLink: 'https://adrino.pl/wp-content/uploads/2021/01/POLITYKA-PRYWATNOS%CC%81CI-Adrino-Mobile.pdf',
          impressionTrackers: [
            'https://prd-impression-tracker-producer.adrino.io/impression/eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ7XCJpbXByZXNzaW9uSWRcIjpcIjMxNjYyYzY5NzI4ODExXCIsXCJkYXRlXCI6WzIwMjIsMiwzXSxcInBsYWNlbWVudEhhc2hcIjpcIjk0NTVjMDQxYzlkMTI1ZmIwNDE4MWVhMGVlZTJmMmFlXCIsXCJjYW1wYWlnbklkXCI6MTc5MjUsXCJhZHZlcnRpc2VtZW50SWRcIjo5MjA3OSxcInZpc3VhbGlzYXRpb25JZFwiOjg1OTExNSxcImNwbVwiOjUzLjB9IiwiZXhwIjoxNjQzOTE2MjUxLCJpYXQiOjE2NDM5MTU2NTF9.0Y_HvInGl6Xo5xP6rDLC8lzQRGvy-wKe0blk1o8ebWyVRFiUY1JGLUeE0k3sCsPNxgdHAv-o6EcbogpUuqlMJA'
          ]
        }
      };

      const serverResponse = {
        body: response
      };

      const result = spec.interpretResponse(serverResponse, {});
      expect(result.length).to.equal(1);
      expect(result[0]).to.equal(response);
    });

    it('should return empty array of responses', function () {
      const response = {
        requestId: '31662c69728811',
        noAd: true,
        testAd: false
      };

      const serverResponse = {
        body: response
      };

      const result = spec.interpretResponse(serverResponse, {});
      expect(result.length).to.equal(0);
    });
  });

  describe('onBidWon', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('should trigger pixel', function () {
      const response = {
        requestId: '31662c69728811',
        mediaType: 'native',
        cpm: 0.53,
        currency: 'PLN',
        creativeId: '859115',
        netRevenue: true,
        ttl: 600,
        width: 1,
        height: 1,
        noAd: false,
        testAd: false,
        native: {
          title: 'Ad Title',
          body: 'Ad Body',
          image: {
            url: 'http://emisja.contentstream.pl/_/getImageII/?vid=17180728299&typ=cs_300_150&element=IMAGE&scale=1&prefix=adart&nc=1643878278955',
            height: 150,
            width: 300
          },
          clickUrl: 'http://emisja.contentstream.pl/_/ctr2/?u=https%3A%2F%2Fonline.efortuna.pl%2Fpage%3Fkey%3Dej0xMzUzMTM1NiZsPTE1Mjc1MzY1JnA9NTMyOTA%253D&e=znU3tABN8K4N391dmUxYfte5G9tBaDXELJVo1_-kvaTJH2XwWRw77fmfL2YjcEmrbqRQ3M0GcJ0vPWcLtZlsrf8dWrAEHNoZKAC6JMnZF_65IYhTPbQIJ-zn3ac9TU7gEZftFKksH1al7rMuieleVv9r6_DtrOk_oZcYAe4rMRQM-TiWvivJRPBchAAblE0cqyG7rCunJFpal43sxlYm4GvcBJaYHzErn5PXjEzNbd3xHjkdiap-xU9y6BbfkUZ1xIMS8QZLvwNrTXMFCSfSRN2tgVfEj7KyGdLCITHSaFtuIKT2iW2pxC7f2RtPHnzsEPXH0SgAfhA3OxZ5jkQjOZy0PsO7MiCv3sJai5ezUAOjFgayU91ZhI0Y9r2YpB1tTGIjnO23wot8PvRENlThHQ%3D%3D&ref=https%3A%2F%2Fbox.adrino.cloud%2Ftmielcarz%2Fadrino_prebid%2Ftest_page3.html%3Fpbjs_debug%3Dtrue',
          privacyLink: 'https://adrino.pl/wp-content/uploads/2021/01/POLITYKA-PRYWATNOS%CC%81CI-Adrino-Mobile.pdf',
          impressionTrackers: [
            'https://prd-impression-tracker-producer.adrino.io/impression/eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ7XCJpbXByZXNzaW9uSWRcIjpcIjMxNjYyYzY5NzI4ODExXCIsXCJkYXRlXCI6WzIwMjIsMiwzXSxcInBsYWNlbWVudEhhc2hcIjpcIjk0NTVjMDQxYzlkMTI1ZmIwNDE4MWVhMGVlZTJmMmFlXCIsXCJjYW1wYWlnbklkXCI6MTc5MjUsXCJhZHZlcnRpc2VtZW50SWRcIjo5MjA3OSxcInZpc3VhbGlzYXRpb25JZFwiOjg1OTExNSxcImNwbVwiOjUzLjB9IiwiZXhwIjoxNjQzOTE2MjUxLCJpYXQiOjE2NDM5MTU2NTF9.0Y_HvInGl6Xo5xP6rDLC8lzQRGvy-wKe0blk1o8ebWyVRFiUY1JGLUeE0k3sCsPNxgdHAv-o6EcbogpUuqlMJA'
          ]
        }
      };

      spec.onBidWon(response);
      expect(utils.triggerPixel.callCount).to.equal(1)
    });
  });
});
