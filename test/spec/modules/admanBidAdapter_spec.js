import {expect} from 'chai';
import {spec} from '../../../modules/admanBidAdapter.js';
import {deepClone} from '../../../src/utils'

describe('AdmanAdapter', function () {
  let bidBanner = {
    bidId: '2dd581a2b6281d',
    bidder: 'adman',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placementId: 0
    },
    placementCode: 'placementid_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'example.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid',
          // name: 'alladsallthetime',
          domain: 'example.com'
        }
      ]
    }
  };

  let bidVideo = deepClone({
    ...bidBanner,
    params: {
      placementId: 0,
      traffic: 'video'
    },
    mediaTypes: {
      video: {
        playerSize: [300, 250]
      }
    }
  });

  let bidderRequest = {
    bidderCode: 'adman',
    auctionId: 'fffffff-ffff-ffff-ffff-ffffffffffff',
    bidderRequestId: 'ffffffffffffff',
    start: 1472239426002,
    auctionStart: 1472239426000,
    timeout: 5000,
    uspConsent: '1YN-',
    gdprConsent: 'gdprConsent',
    refererInfo: {
      referer: 'http://www.example.com',
      reachedTop: true,
    },
    bids: [bidBanner, bidVideo]
  }

  describe('isBidRequestValid', function () {
    it('Should return true when placementId can be cast to a number', function () {
      expect(spec.isBidRequestValid(bidBanner)).to.be.true;
    });
    it('Should return false when placementId is not a number', function () {
      bidBanner.params.placementId = 'aaa';
      expect(spec.isBidRequestValid(bidBanner)).to.be.false;
      bidBanner.params.placementId = 0;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bidBanner], bidderRequest);
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
      expect(serverRequest.url).to.equal('https://pub.admanmedia.com/?c=o&m=multi');
    });
    it('Should contain ccpa', function() {
      expect(serverRequest.data.ccpa).to.be.an('string')
    })

    it('Returns valid BANNER data if array of bids is valid', function () {
      serverRequest = spec.buildRequests([bidBanner], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements', 'ccpa', 'gdpr');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'eids', 'bidId', 'traffic', 'sizes', 'schain', 'bidFloor');
        expect(placement.schain).to.be.an('object')
        expect(placement.placementId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.traffic).to.be.a('string');
        expect(placement.sizes).to.be.an('array');
        expect(placement.bidFloor).to.be.an('number');
      }
    });

    it('Returns valid VIDEO data if array of bids is valid', function () {
      serverRequest = spec.buildRequests([bidVideo], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements', 'ccpa', 'gdpr');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'eids', 'bidId', 'traffic', 'sizes', 'schain', 'bidFloor',
          'playerSize', 'minduration', 'maxduration', 'mimes', 'protocols', 'startdelay', 'placement', 'skip',
          'skipafter', 'minbitrate', 'maxbitrate', 'delivery', 'playbackmethod', 'api', 'linearity');
        expect(placement.schain).to.be.an('object')
        expect(placement.placementId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.traffic).to.be.a('string');
        expect(placement.sizes).to.be.an('array');
        expect(placement.bidFloor).to.be.an('number');
      }
    });

    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });

  describe('buildRequests with user ids', function () {
    bidBanner.userId = {}
    bidBanner.userId.uid2 = { id: 'uid2id123' };
    let serverRequest = spec.buildRequests([bidBanner], bidderRequest);
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      let placements = data['placements'];
      expect(data).to.be.an('object');
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.property('eids')
        expect(placement.eids).to.be.an('array')
        expect(placement.eids.length).to.be.equal(1)
        for (let index in placement.eids) {
          let v = placement.eids[index];
          expect(v).to.have.all.keys('source', 'uids')
          expect(v.source).to.be.oneOf(['uidapi.com'])
          expect(v.uids).to.be.an('array');
          expect(v.uids.length).to.be.equal(1)
          expect(v.uids[0]).to.have.property('id')
        }
      }
    });
  });

  describe('interpretResponse', function () {
    it('(BANNER) Returns an array of valid server responses if response object is valid', function () {
      const resBannerObject = {
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
          currency: 'USD',
          adomain: ['example.com'],
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
        } ]
      };

      const serverResponses = spec.interpretResponse(resBannerObject);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'meta', 'adomain');
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
        expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      }
    });

    it('(VIDEO) Returns an array of valid server responses if response object is valid', function () {
      const resVideoObject = {
        body: [ {
          requestId: '123',
          mediaType: 'video',
          cpm: 0.3,
          width: 320,
          height: 50,
          vastUrl: 'https://',
          ttl: 1000,
          creativeId: '123asd',
          netRevenue: true,
          currency: 'USD',
          adomain: ['example.com'],
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
        } ]
      };

      const serverResponses = spec.interpretResponse(resVideoObject);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastUrl', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'meta', 'adomain');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.vastUrl).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
        expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      }
    });

    it('(NATIVE) Returns an array of valid server responses if response object is valid', function () {
      const resNativeObject = {
        body: [ {
          requestId: '123',
          mediaType: 'native',
          cpm: 0.3,
          width: 320,
          height: 50,
          native: {
            title: 'title',
            image: 'image',
            impressionTrackers: [ 'https://' ]
          },
          ttl: 1000,
          creativeId: '123asd',
          netRevenue: true,
          currency: 'USD',
          adomain: ['example.com'],
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
        } ]
      };

      const serverResponses = spec.interpretResponse(resNativeObject);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'native', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'meta', 'adomain');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.native).to.be.an('object');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
        expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      }
    });

    it('Invalid mediaType in response', function () {
      const resBadObject = {
        body: [ {
          mediaType: 'other',
          requestId: '123',
          cpm: 0.3,
          ttl: 1000,
          creativeId: '123asd',
          currency: 'USD'
        } ]
      };

      const serverResponses = spec.interpretResponse(resBadObject);

      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    const gdprConsent = { consentString: 'consentString', gdprApplies: 1 };
    const consentString = { consentString: 'consentString' }
    let userSync = spec.getUserSyncs({}, {}, gdprConsent, consentString);
    it('Returns valid URL and type', function () {
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.exist;
      expect(userSync[0].url).to.exist;
      expect(userSync[0].type).to.be.equal('image');
      expect(userSync[0].url).to.be.equal('https://sync.admanmedia.com/image?pbjs=1&gdpr=0&gdpr_consent=consentString&ccpa_consent=consentString&coppa=0');
    });
  });
});
