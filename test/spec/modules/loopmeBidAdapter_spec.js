import { expect } from 'chai';
import { spec } from '../../../modules/loopmeBidAdapter.js';
import * as utils from 'src/utils.js';

describe('LoopMeAdapter', function () {
  const bidRequests = [{
    bidder: 'loopme',
    params: {
      ak: 'b510d5bcda'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: 'ad-1',
    bidId: '2652ca954bce9'
  }, {
    bidder: 'loopme',
    params: {
      ak: 'b510d5bcda'
    },
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'outstream'
      }
    },
    adUnitCode: 'ad-1',
    bidId: '2652ca954bce9'
  }
  ];

  describe('isBidRequestValid', function () {
    it('should return true if the ak parameter is present', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
      expect(spec.isBidRequestValid(bidRequests[1])).to.be.true;
    });

    it('should return false if the ak parameter is not present', function () {
      let bannerBidRequest = utils.deepClone(bidRequests[0]);
      delete bannerBidRequest.params.ak;
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;

      let videoBidRequest = utils.deepClone(bidRequests[1]);
      delete videoBidRequest.params.ak;
      expect(spec.isBidRequestValid(videoBidRequest)).to.be.false;
    });

    it('should return false if the params object is not present', function () {
      let bannerBidRequest = utils.deepClone(bidRequests)[0];
      delete bannerBidRequest.params;
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;

      let videoBidRequest = utils.deepClone(bidRequests)[1];
      delete videoBidRequest.params;
      expect(spec.isBidRequestValid(videoBidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single GET request for multiple bid requests', function () {
      const bannerRequest = spec.buildRequests(bidRequests)[0];
      expect(bannerRequest.method).to.equal('GET');
      expect(bannerRequest.url).to.equal('https://loopme.me/api/hb');
      expect(bannerRequest.bidId).to.equal('2652ca954bce9');
      expect(bannerRequest.data).to.exist;

      const bannerRequestData = bannerRequest.data;
      expect(bannerRequestData).to.contain('ak=b510d5bcda');
      expect(bannerRequestData).to.contain('sizes=300x250');

      const videoRequest = spec.buildRequests(bidRequests)[1];
      expect(videoRequest.method).to.equal('GET');
      expect(videoRequest.url).to.equal('https://loopme.me/api/hb');
      expect(videoRequest.bidId).to.equal('2652ca954bce9');
      expect(videoRequest.data).to.exist;

      const videoRquestData = videoRequest.data;
      expect(videoRquestData).to.contain('ak=b510d5bcda');
      expect(videoRquestData).to.contain('sizes=640x480');
      expect(videoRquestData).to.contain('media_type=video');
    });

    it('should add GDPR data to request if available', function () {
      const bidderRequest = {
        gdprConsent: {
          consentString: 'AAABBB'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const requestData = request.data;

      expect(requestData).to.contain('user_consent=AAABBB');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      const interpretedResponse = spec.interpretResponse({});
      expect(interpretedResponse).to.be.an('array').that.is.empty;
    });

    xit('should return valid response when passed valid server response', function () {
      const serverResponse = {
        body: {
          'requestId': '2652ca954bce9',
          'cpm': 1,
          'width': 480,
          'height': 320,
          'creativeId': '20154',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
          'ad': `<div>Hello</div>`
        }
      };

      const request = spec.buildRequests(bidRequests)[0];
      const interpretedResponse = spec.interpretResponse(serverResponse, request);

      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.requestId);
      expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.cpm);
      expect(interpretedResponse[0].width).to.equal(serverResponse.body.width);
      expect(interpretedResponse[0].height).to.equal(serverResponse.body.height);
      expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.creativeId);
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.netRevenue);
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.ad);
      expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.ttl);
    });

    it('should return valid VAST response when passed valid server response', function () {
      const serverResponse = {
        body: {
          'requestId': '2652ca954bce9',
          'cpm': 1,
          'width': 640,
          'height': 480,
          'creativeId': '20154',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
          'vastUrl': 'https://loopme.me/ads/vast?ak=cc885e3acc'
        }
      };

      const request = spec.buildRequests(bidRequests)[1];
      const interpretedResponse = spec.interpretResponse(serverResponse, request);

      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.requestId);
      expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.cpm);
      expect(interpretedResponse[0].width).to.equal(serverResponse.body.width);
      expect(interpretedResponse[0].height).to.equal(serverResponse.body.height);
      expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.creativeId);
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.netRevenue);
      expect(interpretedResponse[0].vastUrl).to.equal(serverResponse.body.vastUrl);
      expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.ttl);
      expect(interpretedResponse[0].renderer).to.have.property('render');
    });
  });
});
