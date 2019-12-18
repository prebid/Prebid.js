import {expect} from 'chai';
import {spec} from '../../../modules/projectLimeLightBidAdapter';

describe('ProjectLimeLightAdapter', function () {
  let bid = {
    bidId: '2dd581a2b6281d',
    bidder: 'project-limelight',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      adUnitId: 123,
      adUnitType: 'banner'
    },
    placementCode: 'placement_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    sizes: [[300, 250]],
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
  };

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
      expect(serverRequest.url).to.equal('https://ads.project-limelight.com/hb');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'secure', 'adUnits');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.secure).to.be.a('boolean');
      let adUnits = data['adUnits'];
      for (let i = 0; i < adUnits.length; i++) {
        let adUnit = adUnits[i];
        expect(adUnit).to.have.all.keys('id', 'bidId', 'type', 'sizes', 'transactionId');
        expect(adUnit.id).to.be.a('number');
        expect(adUnit.bidId).to.be.a('string');
        expect(adUnit.type).to.be.a('string');
        expect(adUnit.transactionId).to.be.a('string');
        expect(adUnit.sizes).to.be.an('array');
      }
    });
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.adUnits).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretBannerResponse', function () {
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
  describe('interpretVideoResponse', function () {
    let resObject = {
      body: [ {
        requestId: '123',
        mediaType: 'video',
        cpm: 0.3,
        width: 320,
        height: 50,
        vastXml: '<VAST></VAST>',
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
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastXml', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.vastXml).to.be.a('string');
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
  describe('isBidRequestValid', function() {
    let bid = {
      bidId: '2dd581a2b6281d',
      bidder: 'project-limelight',
      bidderRequestId: '145e1d6a7837c9',
      params: {
        adUnitId: 123,
        adUnitType: 'banner'
      },
      placementCode: 'placement_0',
      auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
      sizes: [[300, 250]],
      transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bidFailed = {
        bidder: 'project-limelight',
        bidderRequestId: '145e1d6a7837c9',
        params: {
          adUnitId: 123,
          adUnitType: 'banner'
        },
        placementCode: 'placement_0',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
        sizes: [[300, 250]],
        transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
      };
      expect(spec.isBidRequestValid(bidFailed)).to.equal(false);
    });
  });
});
