import { expect } from 'chai';
import { spec } from '../../../modules/lockerdomeBidAdapter.js';
import * as utils from 'src/utils.js';

describe('LockerDomeAdapter', function () {
  const bidRequests = [{
    bidder: 'lockerdome',
    params: {
      adUnitId: 'LD10809467961050726'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: 'ad-1',
    transactionId: 'b55e97d7-792c-46be-95a5-3df40b115734',
    bidId: '2652ca954bce9',
    bidderRequestId: '14a54fade69854',
    auctionId: 'd4c83108-615d-4c2c-9384-dac9ffd4fd72',
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'indirectseller.com',
          sid: '00001',
          hp: 1
        }
      ]
    }
  }, {
    bidder: 'lockerdome',
    params: {
      adUnitId: 'LD9434769725128806'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 600]]
      }
    },
    adUnitCode: 'ad-2',
    transactionId: '73459f05-c482-4706-b2b7-72e6f6264ce6',
    bidId: '4510f2834773ce',
    bidderRequestId: '14a54fade69854',
    auctionId: 'd4c83108-615d-4c2c-9384-dac9ffd4fd72',
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'indirectseller.com',
          sid: '00001',
          hp: 1
        }
      ]
    }
  }];

  describe('isBidRequestValid', function () {
    it('should return true if the adUnitId parameter is present', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
      expect(spec.isBidRequestValid(bidRequests[1])).to.be.true;
    });
    it('should return false if the adUnitId parameter is not present', function () {
      let bidRequest = utils.deepClone(bidRequests[0]);
      delete bidRequest.params.adUnitId;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single POST request for multiple bid requests', function () {
      const bidderRequest = {
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          topmostLocation: 'https://example.com'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://lockerdome.com/ladbid/prebid');
      expect(request.data).to.exist;

      const requestData = JSON.parse(request.data);

      const bids = requestData.bidRequests;
      expect(bids).to.have.lengthOf(2);

      expect(requestData.url).to.equal(encodeURIComponent(bidderRequest.refererInfo.canonicalUrl));
      expect(requestData.referrer).to.equal(encodeURIComponent(bidderRequest.refererInfo.topmostLocation));

      expect(bids[0].requestId).to.equal('2652ca954bce9');
      expect(bids[0].adUnitCode).to.equal('ad-1');
      expect(bids[0].adUnitId).to.equal('LD10809467961050726');
      expect(bids[0].sizes).to.have.lengthOf(1);
      expect(bids[0].sizes[0][0]).to.equal(300);
      expect(bids[0].sizes[0][1]).to.equal(250);

      expect(bids[1].requestId).to.equal('4510f2834773ce');
      expect(bids[1].adUnitCode).to.equal('ad-2');
      expect(bids[1].adUnitId).to.equal('LD9434769725128806');
      expect(bids[1].sizes).to.have.lengthOf(1);
      expect(bids[1].sizes[0][0]).to.equal(300);
      expect(bids[1].sizes[0][1]).to.equal(600);
    });

    it('should add GDPR data to request if available', function () {
      const bidderRequest = {
        gdprConsent: {
          consentString: 'AAABBB',
          gdprApplies: true
        },
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          referer: 'https://example.com'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestData = JSON.parse(request.data);
      expect(requestData.gdpr).to.be.an('object');
      expect(requestData.gdpr).to.have.property('applies', true);
      expect(requestData.gdpr).to.have.property('consent', 'AAABBB');
    });

    it('should add US Privacy data to request if available', function () {
      const bidderRequest = {
        uspConsent: 'AAABBB',
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          referer: 'https://example.com'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestData = JSON.parse(request.data);
      expect(requestData.us_privacy).to.be.an('object');
      expect(requestData.us_privacy).to.have.property('consent', 'AAABBB');
    });

    it('should add schain to request if available', function () {
      const bidderRequest = {
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          referer: 'https://example.com'
        }
      };
      const schainExpected = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1
          }
        ]
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestData = JSON.parse(request.data);
      expect(requestData.schain).to.be.an('object');
      expect(requestData.schain).to.deep.equal(schainExpected);
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      const interpretedResponse = spec.interpretResponse({ body: {} });
      expect(interpretedResponse).to.be.an('array').that.is.empty;
    });

    it('should return valid response when passed valid server response', function () {
      const serverResponse = {
        body: {
          bids: [{
            requestId: '2652ca954bce9',
            cpm: 1.00,
            width: 300,
            height: 250,
            creativeId: '12345',
            currency: 'USD',
            netRevenue: true,
            ad: '<!-- AD 1 CREATIVE -->',
            ttl: 300,
            adomain: ['example.com']
          },
          {
            requestId: '4510f2834773ce',
            cpm: 1.10,
            width: 300,
            height: 600,
            creativeId: '45678',
            currency: 'USD',
            netRevenue: true,
            ad: '<!-- AD 2 CREATIVE -->',
            ttl: 300,
            adomain: ['example.com']
          }]
        }
      };

      const bidderRequest = {
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          referer: 'https://example.com'
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const interpretedResponse = spec.interpretResponse(serverResponse, request);

      expect(interpretedResponse).to.have.lengthOf(2);

      expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.bids[0].requestId);
      expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.bids[0].cpm);
      expect(interpretedResponse[0].width).to.equal(serverResponse.body.bids[0].width);
      expect(interpretedResponse[0].height).to.equal(serverResponse.body.bids[0].height);
      expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.bids[0].creativeId);
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.bids[0].currency);
      expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.bids[0].netRevenue);
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.bids[0].ad);
      expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.bids[0].ttl);
      expect(interpretedResponse[0]).to.have.property('meta');
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.deep.equal(serverResponse.body.bids[0].adomain);

      expect(interpretedResponse[1].requestId).to.equal(serverResponse.body.bids[1].requestId);
      expect(interpretedResponse[1].cpm).to.equal(serverResponse.body.bids[1].cpm);
      expect(interpretedResponse[1].width).to.equal(serverResponse.body.bids[1].width);
      expect(interpretedResponse[1].height).to.equal(serverResponse.body.bids[1].height);
      expect(interpretedResponse[1].creativeId).to.equal(serverResponse.body.bids[1].creativeId);
      expect(interpretedResponse[1].currency).to.equal(serverResponse.body.bids[1].currency);
      expect(interpretedResponse[1].netRevenue).to.equal(serverResponse.body.bids[1].netRevenue);
      expect(interpretedResponse[1].ad).to.equal(serverResponse.body.bids[1].ad);
      expect(interpretedResponse[1].ttl).to.equal(serverResponse.body.bids[1].ttl);
      expect(interpretedResponse[1]).to.have.property('meta');
      expect(interpretedResponse[1].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[1].meta.advertiserDomains).to.deep.equal(serverResponse.body.bids[1].adomain);
    });
  });
});
