import {expect} from 'chai';
import {spec} from '../../../modules/huddledmassesBidAdapter';

describe('HuddledmassesAdapter', () => {
  let bid = {
    bidId: '2dd581a2b6281d',
    bidder: 'huddledmasses',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placement_id: 0
    },
    placementCode: 'placementid_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    sizes: [[300, 250]],
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
  };

  describe('isBidRequestValid', () => {
    it('Should return true when placement_id can be cast to a number, and when at least one of the sizes passed is allowed', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when placement_id is not a number', () => {
      bid.params.placement_id = 'aaa';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false when the sizes are not allowed', () => {
      bid.sizes = [[1, 1]];
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    let serverRequest = spec.buildRequests([bid]);
    it('Creates a ServerRequest object with method, URL and data', () => {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', () => {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', () => {
      expect(serverRequest.url).to.equal('//huddledmassessupply.com/?c=o&m=multi');
    });
    it('Returns valid data if array of bids is valid', () => {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'bidId', 'sizes');
        expect(placement.placementId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.sizes).to.be.an('array');
      }
    });
    it('Returns empty data if no valid requests are passed', () => {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', () => {
    let resObject = {
      body: [ {
        requestId: '123',
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
    it('Returns an array of valid server responses if response object is valid', () => {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
      }
      it('Returns an empty array if invalid response is passed', () => {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });

  describe('getUserSyncs', () => {
    let userSync = spec.getUserSyncs();
    it('Returns valid URL and type', () => {
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.exist;
      expect(userSync[0].url).to.exist;
      expect(userSync[0].type).to.be.equal('image');
      expect(userSync[0].url).to.be.equal('//huddledmassessupply.com/?c=o&m=cookie');
    });
  });
});
