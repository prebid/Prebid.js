import {expect} from 'chai';
import {spec} from '../../../modules/vrtcalBidAdapter.js';

describe('Vrtcal Adapter', function () {
  let bid = {
    bidId: 'bidID0001',
    bidder: 'vrtcal',
    bidderRequestId: 'brID0001',
    auctionId: 'auID0001',
    sizes: [[300, 250]],
    transactionId: 'tid0001',
    adUnitCode: 'vrtcal-test-adunit'
  };

  describe('isBidRequestValid', function () {
    it('Should return true when base params as set', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when bid.bidId is blank', function () {
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false when bid.auctionId is blank', function () {
      bid.auctionId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequests = spec.buildRequests([bid]);

    let serverRequest = serverRequests[0];

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
      expect(serverRequest.url).to.equal('https://rtb.vrtcal.com/bidder_prebid.vap?ssp=1804');
    });

    it('Returns valid data if array of bids is valid', function () {
      let data = JSON.parse(serverRequest.data);
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('prebidJS', 'prebidAdUnitCode', 'id', 'imp', 'site', 'device');
      expect(data.prebidJS).to.not.equal('');
      expect(data.prebidAdUnitCode).to.not.equal('');
    });

    it('Sets width and height based on existence of bid.mediaTypes.banner', function () {
      let data = JSON.parse(serverRequest.data);
      if (typeof (bid.mediaTypes) !== 'undefined' && typeof (bid.mediaTypes.banner) !== 'undefined' && typeof (bid.mediaTypes.banner.sizes) !== 'undefined') {
	   expect(data.imp[0].banner.w).to.equal(bid.mediaTypes.banner.sizes[0][0]);
	   expect(data.imp[0].banner.h).to.equal(bid.mediaTypes.banner.sizes[0][1]);
      } else {
	   expect(data.imp[0].banner.w).to.equal(bid.sizes[0][0]);
	   expect(data.imp[0].banner.h).to.equal(bid.sizes[0][1]);
      }
    });

    it('Returns empty data if no valid requests are passed', function () {
      serverRequests = spec.buildRequests([]);
      expect(serverRequests).to.be.an('array').that.is.empty;
    });
  });

  describe('interpretResponse', function () {
    let bid = {
      bidId: 'bidID0001',
      bidder: 'vrtcal',
      bidderRequestId: 'brID0001',
      auctionId: 'auID0001',
      sizes: [[300, 250]],
      transactionId: 'tid0001',
      adUnitCode: 'vrtcal-test-adunit'
    };

    let serverRequests = spec.buildRequests([bid]);

    let resObject = {body: {id: 'vrtcal-test-id', width: 300, height: 250, seatbid: [{bid: [{price: 3.0, w: 300, h: 250, crid: 'testcrid', adm: 'testad', nurl: 'https://vrtcal.com/faketracker'}]}], currency: 'USD', netRevenue: true, ttl: 900}};

    let serverResponses = spec.interpretResponse(resObject, serverRequests);

    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'nurl');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.nurl).to.be.a('string');
      }

      it('Returns an empty array if invalid response is passed', function () {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });

  describe('onBidWon', function () {
    let bid = {
      bidId: '2dd581a2b6281d',
      bidder: 'vrtcal',
      bidderRequestId: '145e1d6a7837c9',
      auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
      sizes: [[300, 250]],
      transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
      adUnitCode: 'vrtcal-test-adunit'
    };

    let serverRequests = spec.buildRequests([bid]);
    let resObject = {body: {id: 'vrtcal-test-id', width: 300, height: 250, seatbid: [{bid: [{price: 3.0, w: 300, h: 250, crid: 'testcrid', adm: 'testad', nurl: 'https://vrtcal.com/faketracker'}]}], currency: 'USD', netRevenue: true, ttl: 900}};
    let serverResponses = spec.interpretResponse(resObject, serverRequests);
    let wonbid = serverResponses[0];

    it('Returns true is nurl is good/not blank', function () {
      expect(wonbid.nurl).to.not.equal('');
      expect(spec.onBidWon(wonbid)).to.be.true;
    });
  });
});
