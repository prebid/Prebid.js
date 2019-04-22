import { expect } from 'chai';
import { spec } from '../../../modules/loopmeBidAdapter';
import * as utils from 'src/utils';

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
  }];

  describe('isBidRequestValid', function () {
    it('should return true if the ak parameter is present', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
    });

    it('should return false if the ak parameter is not present', function () {
      let bidRequest = utils.deepClone(bidRequests[0]);
      delete bidRequest.params.ak;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });

    it('should return false if the params object is not present', function () {
      let bidRequest = utils.deepClone(bidRequests);
      delete bidRequest[0].params;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single GET request for multiple bid requests', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal('https://loopme.me/api/hb');
      expect(request.bidId).to.equal('2652ca954bce9');
      expect(request.data).to.exist;

      const requestData = request.data;
      expect(requestData).to.contain('ak=b510d5bcda');
      expect(requestData).to.contain('sizes=300x250');
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

    it('should return valid response when passed valid server response', function () {
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
  });
});
