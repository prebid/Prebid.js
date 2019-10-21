import {expect} from 'chai';
import {spec} from '../../../modules/collectcentBidAdapter';

describe('Collectcent', function () {
  let bid = {
    bidId: '2dd581a2b6281d',
    bidder: 'collectcent',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placementId: 123,
      traffic: 'banner'
    },
    placementCode: 'placement_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    sizes: [[300, 250]],
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
  };

  describe('isBidRequestValid', function () {
    it('Should return true when placementId can be cast to a number', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when placementId is not a number', function () {
      bid.params.placementId = 'aaa';
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
      expect(serverRequest.url).to.equal('https://publishers.motionspots.com/?c=o&m=multi');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'secure', 'host', 'page', 'placements');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'bidId', 'traffic', 'sizes');
        expect(placement.placementId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.traffic).to.be.a('string');
        expect(placement.sizes).to.be.an('array');
      }
    });
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', function () {
    let resObject = {
      body: [ {
        requestId: '123',
        mediaType: 'banner',
        cpm: 0.3,
        width: 320,
        height: 50,
        ad: '<h1>Hello ad</h1>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD'
      } ]
    };
    let serverResponses = spec.interpretResponse(resObject);
    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
      }
      it('Returns an empty array if invalid response is passed', function () {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });

  describe('getUserSyncs', function () {
    let userSync = spec.getUserSyncs();
    it('Returns valid URL and `', function () {
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.exist;
      expect(userSync[0].url).to.exist;
      expect(userSync[0].type).to.be.equal('image');
      expect(userSync[0].url).to.be.equal('https://publishers.motionspots.com/?c=o&m=cookie');
    });
  });
});
