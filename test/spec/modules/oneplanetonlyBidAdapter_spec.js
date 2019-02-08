import {expect} from 'chai';
import {spec} from '../../../modules/oneplanetonlyBidAdapter';

describe('OnePlanetOnlyAdapter', function () {
  let bid = {
    bidId: '51ef8751f9aead',
    bidder: 'oneplanetonly',
    params: {
      siteId: '5',
      adUnitId: '5-4587544',
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
    sizes: [[300, 250], [300, 600]],
    bidderRequestId: '418b37f85e772c',
    auctionId: '18fd8b8b0bd757'
  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are params.siteId and params.adUnitId parameters present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      delete bid.params.adUnitId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid]);
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('//show.oneplanetonly.com/prebid?siteId=5');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('id', 'ver', 'prebidVer', 'transactionId', 'currency', 'timeout', 'siteId',
        'domain', 'page', 'referrer', 'adUnits');

      let adUnit = data.adUnits[0];
      expect(adUnit).to.have.keys('id', 'bidId', 'sizes');
      expect(adUnit.id).to.equal('5-4587544');
      expect(adUnit.bidId).to.equal('51ef8751f9aead');
      expect(adUnit.sizes).to.have.members(['300x250', '300x600']);
    });
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.adUnits).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const serverResponse = {
        body: {
          bids: [{
            requestId: '51ef8751f9aead',
            cpm: 0.4,
            width: 300,
            height: 250,
            creativeId: '2',
            currency: 'USD',
            ad: 'Test',
            ttl: 120,
          }]
        }
      };
      let bannerResponses = spec.interpretResponse(serverResponse);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let bidObject = bannerResponses[0];
      expect(bidObject).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency');
      expect(bidObject.requestId).to.equal('51ef8751f9aead');
      expect(bidObject.cpm).to.equal(0.4);
      expect(bidObject.width).to.equal(300);
      expect(bidObject.height).to.equal(250);
      expect(bidObject.ad).to.equal('Test');
      expect(bidObject.ttl).to.equal(120);
      expect(bidObject.creativeId).to.equal('2');
      expect(bidObject.netRevenue).to.be.true;
      expect(bidObject.currency).to.equal('USD');
    });
    it('Should return an empty array if invalid response is passed', function () {
      const invalid = {
        body: {}
      };
      let serverResponses = spec.interpretResponse(invalid);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });
});
