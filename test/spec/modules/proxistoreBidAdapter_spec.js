import { expect } from 'chai';
let spec = require('modules/proxistoreBidAdapter');

const BIDDER_CODE = 'proxistore';
describe('ProxistoreBidAdapter', function () {
  const bidderRequest = {
    'bidderCode': BIDDER_CODE,
    'auctionId': '1025ba77-5463-4877-b0eb-14b205cb9304',
    'bidderRequestId': '10edf38ec1a719',
    'gdprConsent': {
      'gdprApplies': true,
      'consentString': 'CONSENT_STRING',
      'vendorData': {
        'vendorConsents': {
          '418': true
        }
      }
    }
  };
  let bid = {
    sizes: [[300, 600]],
    params: {
      website: 'example.fr',
      language: 'fr'
    },
    auctionId: 442133079,
    bidId: 464646969,
    transactionId: 511916005
  };
  describe('isBidRequestValid', function () {
    it('it should be true if required params are presents', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const url = 'https://abs.proxistore.com/fr/v3/rtb/prebid/multi';
    const request = spec.buildRequests([bid], bidderRequest);
    it('should return a valid object', function () {
      expect(request).to.be.an('object');
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });
    it('request method should be POST', function () {
      expect(request.method).to.equal('POST');
    });
    it('should contain a valid url', function () {
      expect(request.url).equal(url);
    });
    it('should have the value consentGiven to true bc we have 418 in the vendor list', function () {
      const data = JSON.parse(request.data);

      expect(data.gdpr.consentString).equal(bidderRequest.gdprConsent.consentString);
      expect(data.gdpr.applies).to.be.true;
      expect(data.gdpr.consentGiven).to.be.true;
    });
    it('should have a property a length of bids equal to one if there is only one bid', function () {
      const data = JSON.parse(request.data);
      expect(data.hasOwnProperty('bids')).to.be.true;
      expect(data.bids).to.be.an('array');
      expect(data.bids.length).equal(1);
      expect(data.bids[0].hasOwnProperty('id')).to.be.true;
      expect(data.bids[0].sizes).to.be.an('array');
    });
  });

  describe('interpretResponse', function () {
    const responses = {
      body:
        [{
          cpm: 6.25,
          creativeId: '48fd47c9-ce35-4fda-804b-17e16c8c36ac',
          currency: 'EUR',
          dealId: '2019-10_e3ecad8e-d07a-4c90-ad46-cd0f306c8960',
          height: 600,
          netRevenue: true,
          requestId: '923756713',
          ttl: 10,
          vastUrl: null,
          vastXml: null,
          width: 300,
        }]
    };
    const badResponse = { body: [] };
    const interpretedResponse = spec.interpretResponse(responses, bid)[0];
    it('should send an empty array if body is empty', function () {
      expect(spec.interpretResponse(badResponse, bid)).to.be.an('array');
      expect(spec.interpretResponse(badResponse, bid).length).equal(0);
    });
    it('should interpret the response correctly if it is valid', function () {
      expect(interpretedResponse.cpm).equal(6.25);
      expect(interpretedResponse.creativeId).equal('48fd47c9-ce35-4fda-804b-17e16c8c36ac');
      expect(interpretedResponse.currency).equal('EUR');
      expect(interpretedResponse.height).equal(600);
      expect(interpretedResponse.width).equal(300);
      expect(interpretedResponse.requestId).equal('923756713');
      expect(interpretedResponse.netRevenue).to.be.true;
      expect(interpretedResponse.netRevenue).to.be.true;
    })
  });

  describe('interpretResponse', function () {
    it('should aways return an empty array', function () {
      expect(spec.getUserSyncs()).to.be.an('array');
      expect(spec.getUserSyncs().length).equal(0);
    });
  });
});
