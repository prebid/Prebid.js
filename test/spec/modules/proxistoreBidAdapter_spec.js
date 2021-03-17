import { expect } from 'chai';
let { spec } = require('modules/proxistoreBidAdapter');
const BIDDER_CODE = 'proxistore';
describe('ProxistoreBidAdapter', function () {
  const bidderRequest = {
    bidderCode: BIDDER_CODE,
    auctionId: '1025ba77-5463-4877-b0eb-14b205cb9304',
    bidderRequestId: '10edf38ec1a719',
    gdprConsent: {
      gdprApplies: true,
      consentString: 'CONSENT_STRING',
      vendorData: {
        vendorConsents: {
          418: true,
        },
      },
    },
  };
  let bid = {
    sizes: [[300, 600]],
    params: {
      website: 'example.fr',
      language: 'fr',
    },
    auctionId: 442133079,
    bidId: 464646969,
    transactionId: 511916005,
  };
  describe('isBidRequestValid', function () {
    it('it should be true if required params are presents and there is no info in the local storage', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('it should be false if the value in the localstorage is less than 5minutes of the actual time', function () {
      const date = new Date();
      date.setMinutes(date.getMinutes() - 1);
      localStorage.setItem(`PX_NoAds_${bid.params.website}`, date);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('it should be true if the value in the localstorage is more than 5minutes of the actual time', function () {
      const date = new Date();
      date.setMinutes(date.getMinutes() - 10);
      localStorage.setItem(`PX_NoAds_${bid.params.website}`, date);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    const url = {
      cookieBase: 'https://abs.proxistore.com/fr/v3/rtb/prebid/multi',
      cookieLess: 'https://cookieless-proxistore.com/fr/cookieless',
    };
    let request = spec.buildRequests([bid], bidderRequest);
    it('should return a valid object', function () {
      expect(request).to.be.an('object');
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });
    it('request method should be POST', function () {
      expect(request.method).to.equal('POST');
    });
    it('should have the value consentGiven to true bc we have 418 in the vendor list', function () {
      const data = JSON.parse(request.data);
      expect(data.gdpr.consentString).equal(
        bidderRequest.gdprConsent.consentString
      );
      expect(data.gdpr.applies).to.be.true;
      expect(data.gdpr.consentGiven).to.be.true;
    });
    it('should contain a valid url', function () {
      // has gdpr consent
      expect(request.url).equal(url.cookieBase);
      // doens't have gpdr consent
      bidderRequest.gdprConsent.vendorData = null;
      request = spec.buildRequests([bid], bidderRequest);
      expect(request.url).equal(url.cookieLess);
    });
    it('should have a property a length of bids equal to one if there is only one bid', function () {
      const data = JSON.parse(request.data);
      expect(data.hasOwnProperty('bids')).to.be.true;
      expect(data.bids).to.be.an('array');
      expect(data.bids.length).equal(1);
      expect(data.bids[0].hasOwnProperty('id')).to.be.true;
      expect(data.bids[0].sizes).to.be.an('array');
    });
    it('should correctly set bidfloor on imp when getfloor in scope', function () {
      let data = JSON.parse(request.data);
      expect(data.bids[0].floor).to.be.null;

      // make it respond with a non USD floor should not send it
      bid.getFloor = function () {
        return { currency: 'EUR', floor: 1.0 };
      };
      let req = spec.buildRequests([bid], bidderRequest);
      data = JSON.parse(req.data);
      expect(data.bids[0].floor).equal(1);
      bid.getFloor = function () {
        return { currency: 'USD', floor: 1.0 };
      };
      req = spec.buildRequests([bid], bidderRequest);
      data = JSON.parse(req.data);
      expect(data.bids[0].floor).to.be.null;
    });
  });
});
