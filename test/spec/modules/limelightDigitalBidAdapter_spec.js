import {expect} from 'chai';
import {spec} from '../../../modules/limelightDigitalBidAdapter.js';

describe('limelightDigitalAdapter', function () {
  const bid1 = {
    bidId: '2dd581a2b6281d',
    bidder: 'limelightDigital',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: 123,
      adUnitType: 'banner'
    },
    placementCode: 'placement_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
  }
  const bid2 = {
    bidId: '58ee9870c3164a',
    bidder: 'limelightDigital',
    bidderRequestId: '209fdaf1c81649',
    params: {
      host: 'ads.project-limelight.com',
      adUnitId: 456,
      adUnitType: 'banner'
    },
    placementCode: 'placement_1',
    auctionId: '482f88de-29ab-45c8-981a-d25e39454a34',
    sizes: [[350, 200]],
    transactionId: '068867d1-46ec-40bb-9fa0-e24611786fb4'
  }
  const bid3 = {
    bidId: '019645c7d69460',
    bidder: 'limelightDigital',
    bidderRequestId: 'f2b15f89e77ba6',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: 789,
      adUnitType: 'video'
    },
    placementCode: 'placement_2',
    auctionId: 'e4771143-6aa7-41ec-8824-ced4342c96c8',
    sizes: [[800, 600]],
    transactionId: '738d5915-6651-43b9-9b6b-d50517350917'
  }
  const bid4 = {
    bidId: '019645c7d69460',
    bidder: 'limelightDigital',
    bidderRequestId: 'f2b15f89e77ba6',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: 789,
      adUnitType: 'video'
    },
    placementCode: 'placement_2',
    auctionId: 'e4771143-6aa7-41ec-8824-ced4342c96c8',
    video: {
      playerSize: [800, 600]
    },
    transactionId: '738d5915-6651-43b9-9b6b-d50517350917'
  }

  describe('buildRequests', function () {
    const serverRequests = spec.buildRequests([bid1, bid2, bid3, bid4])
    it('Creates two ServerRequests', function() {
      expect(serverRequests).to.exist
      expect(serverRequests).to.have.lengthOf(2)
    })
    serverRequests.forEach(serverRequest => {
      it('Creates a ServerRequest object with method, URL and data', function () {
        expect(serverRequest).to.exist
        expect(serverRequest.method).to.exist
        expect(serverRequest.url).to.exist
        expect(serverRequest.data).to.exist
      })
      it('Returns POST method', function () {
        expect(serverRequest.method).to.equal('POST')
      })
      it('Returns valid data if array of bids is valid', function () {
        let data = serverRequest.data
        expect(data).to.be.an('object')
        expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'secure', 'adUnits')
        expect(data.deviceWidth).to.be.a('number')
        expect(data.deviceHeight).to.be.a('number')
        expect(data.secure).to.be.a('boolean')
        data.adUnits.forEach(adUnit => {
          expect(adUnit).to.have.all.keys('id', 'bidId', 'type', 'sizes', 'transactionId')
          expect(adUnit.id).to.be.a('number')
          expect(adUnit.bidId).to.be.a('string')
          expect(adUnit.type).to.be.a('string')
          expect(adUnit.transactionId).to.be.a('string')
          expect(adUnit.sizes).to.be.an('array')
        })
      })
    })
    it('Returns valid URL', function () {
      expect(serverRequests[0].url).to.equal('https://exchange.ortb.net/hb')
      expect(serverRequests[1].url).to.equal('https://ads.project-limelight.com/hb')
    })
    it('Returns valid adUnits', function () {
      validateAdUnit(serverRequests[0].data.adUnits[0], bid1)
      validateAdUnit(serverRequests[1].data.adUnits[0], bid2)
      validateAdUnit(serverRequests[0].data.adUnits[1], bid3)
    })
    it('Returns empty data if no valid requests are passed', function () {
      const serverRequests = spec.buildRequests([])
      expect(serverRequests).to.be.an('array').that.is.empty
    })
  })
  describe('interpretBannerResponse', function () {
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
        currency: 'USD',
        meta: {
          advertiserDomains: ['example.com'],
          mediaType: 'banner'
        }
      } ]
    };
    let serverResponses = spec.interpretResponse(resObject);
    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'meta');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.meta.advertiserDomains).to.be.an('array');
        expect(dataItem.meta.mediaType).to.be.a('string');
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
        cpm: 0.3,
        width: 320,
        height: 50,
        vastXml: '<VAST></VAST>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD',
        meta: {
          advertiserDomains: ['example.com'],
          mediaType: 'video'
        }
      } ]
    };
    let serverResponses = spec.interpretResponse(resObject);
    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastXml', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'meta');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.vastXml).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.meta.advertiserDomains).to.be.an('array');
        expect(dataItem.meta.mediaType).to.be.a('string');
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
      bidder: 'limelightDigital',
      bidderRequestId: '145e1d6a7837c9',
      params: {
        host: 'exchange.ortb.net',
        adUnitId: 123,
        adUnitType: 'banner'
      },
      placementCode: 'placement_0',
      auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
      sizes: [[300, 250]],
      transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62'
    };

    it('should return true when required params found', function() {
      [bid, bid1, bid2, bid3].forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    it('should return true when adUnitId is zero', function() {
      bid.params.adUnitId = 0;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bidFailed = {
        bidder: 'limelightDigital',
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
  describe('interpretResponse', function() {
    let resObject = {
      requestId: '123',
      cpm: 0.3,
      width: 320,
      height: 50,
      ad: '<h1>Hello ad</h1>',
      ttl: 1000,
      creativeId: '123asd',
      netRevenue: true,
      currency: 'USD',
      meta: {
        advertiserDomains: ['example.com'],
        mediaType: 'banner'
      }
    };
    it('should skip responses which do not contain required params', function() {
      let bidResponses = {
        body: [ {
          cpm: 0.3,
          ttl: 1000,
          currency: 'USD',
          meta: {
            advertiserDomains: ['example.com'],
            mediaType: 'banner'
          }
        }, resObject ]
      }
      expect(spec.interpretResponse(bidResponses)).to.deep.equal([ resObject ]);
    });
    it('should skip responses which do not contain advertiser domains', function() {
      let resObjectWithoutAdvertiserDomains = Object.assign({}, resObject);
      resObjectWithoutAdvertiserDomains.meta = Object.assign({}, resObject.meta);
      delete resObjectWithoutAdvertiserDomains.meta.advertiserDomains;
      let bidResponses = {
        body: [ resObjectWithoutAdvertiserDomains, resObject ]
      }
      expect(spec.interpretResponse(bidResponses)).to.deep.equal([ resObject ]);
    });
    it('should return responses which contain empty advertiser domains', function() {
      let resObjectWithEmptyAdvertiserDomains = Object.assign({}, resObject);
      resObjectWithEmptyAdvertiserDomains.meta = Object.assign({}, resObject.meta);
      resObjectWithEmptyAdvertiserDomains.meta.advertiserDomains = [];
      let bidResponses = {
        body: [ resObjectWithEmptyAdvertiserDomains, resObject ]
      }
      expect(spec.interpretResponse(bidResponses)).to.deep.equal([resObjectWithEmptyAdvertiserDomains, resObject]);
    });
    it('should skip responses which do not contain meta media type', function() {
      let resObjectWithoutMetaMediaType = Object.assign({}, resObject);
      resObjectWithoutMetaMediaType.meta = Object.assign({}, resObject.meta);
      delete resObjectWithoutMetaMediaType.meta.mediaType;
      let bidResponses = {
        body: [ resObjectWithoutMetaMediaType, resObject ]
      }
      expect(spec.interpretResponse(bidResponses)).to.deep.equal([ resObject ]);
    });
  });
});

function validateAdUnit(adUnit, bid) {
  expect(adUnit.id).to.equal(bid.params.adUnitId)
  expect(adUnit.bidId).to.equal(bid.bidId)
  expect(adUnit.type).to.equal(bid.params.adUnitType.toUpperCase())
  expect(adUnit.transactionId).to.equal(bid.transactionId)
  let bidSizes = [];
  if (bid.mediaTypes) {
    if (bid.mediaTypes.video && bid.mediaTypes.video.playerSize) {
      bidSizes = bidSizes.concat([bid.mediaTypes.video.playerSize]);
    }
    if (bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) {
      bidSizes = bidSizes.concat(bid.mediaTypes.banner.sizes);
    }
  }
  if (bid.sizes) {
    bidSizes = bidSizes.concat(bid.sizes || []);
  }
  expect(adUnit.sizes).to.deep.equal(bidSizes.map(size => {
    return {
      width: size[0],
      height: size[1]
    }
  }))
}
