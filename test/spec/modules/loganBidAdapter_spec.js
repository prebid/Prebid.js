import {expect} from 'chai';
import {spec} from '../../../modules/loganBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from '../../../src/mediaTypes.js';

describe('LoganBidAdapter', function () {
  const bid = {
    bidId: '23fhj33i987f',
    bidder: 'logan',
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {
      placementId: 783,
    }
  };

  const bidderRequest = {
    refererInfo: {
      referer: 'test.com'
    }
  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are bidId, params and key parameters present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid], bidderRequest);
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
      expect(serverRequest.url).to.equal('https://USeast2.logan.ai/pbjs');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      expect(data.gdpr).to.not.exist;
      expect(data.ccpa).to.not.exist;
      let placement = data['placements'][0];
      expect(placement).to.have.keys('placementId', 'bidId', 'adFormat', 'sizes', 'schain', 'bidfloor');
      expect(placement.placementId).to.equal(783);
      expect(placement.bidId).to.equal('23fhj33i987f');
      expect(placement.adFormat).to.equal(BANNER);
      expect(placement.schain).to.be.an('object');
      expect(placement.sizes).to.be.an('array');
      expect(placement.bidfloor).to.exist.and.to.equal(0);
    });

    it('Returns valid data for mediatype video', function () {
      const playerSize = [300, 300];
      bid.mediaTypes = {};
      bid.mediaTypes[VIDEO] = {
        playerSize
      };
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      let placement = data['placements'][0];
      expect(placement).to.be.an('object');
      expect(placement).to.have.keys('placementId', 'bidId', 'adFormat', 'wPlayer', 'hPlayer', 'schain', 'minduration', 'maxduration', 'mimes', 'protocols', 'startdelay', 'placement', 'skip', 'skipafter', 'minbitrate', 'maxbitrate', 'delivery', 'playbackmethod', 'api', 'linearity', 'bidfloor');
      expect(placement.adFormat).to.equal(VIDEO);
      expect(placement.wPlayer).to.equal(playerSize[0]);
      expect(placement.hPlayer).to.equal(playerSize[1]);
      expect(placement.bidfloor).to.exist.and.to.equal(0);
    });

    it('Returns valid data for mediatype native', function () {
      const native = {
        title: {
          required: true
        },
        body: {
          required: true
        },
        icon: {
          required: true,
          size: [64, 64]
        }
      };

      bid.mediaTypes = {};
      bid.mediaTypes[NATIVE] = native;
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      let placement = data['placements'][0];
      expect(placement).to.be.an('object');
      expect(placement).to.have.keys('placementId', 'bidId', 'adFormat', 'native', 'schain', 'bidfloor');
      expect(placement.adFormat).to.equal(NATIVE);
      expect(placement.native).to.equal(native);
      expect(placement.bidfloor).to.exist.and.to.equal(0);
    });

    it('Returns data with gdprConsent and without uspConsent', function () {
      bidderRequest.gdprConsent = 'test';
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data.gdpr).to.exist;
      expect(data.gdpr).to.be.a('string');
      expect(data.gdpr).to.equal(bidderRequest.gdprConsent);
      expect(data.ccpa).to.not.exist;
      delete bidderRequest.gdprConsent;
    });

    it('Returns data with uspConsent and without gdprConsent', function () {
      bidderRequest.uspConsent = 'test';
      serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data.ccpa).to.exist;
      expect(data.ccpa).to.be.a('string');
      expect(data.ccpa).to.equal(bidderRequest.uspConsent);
      expect(data.gdpr).to.not.exist;
    });

    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const banner = {
        body: [{
          mediaType: 'banner',
          width: 300,
          height: 250,
          cpm: 0.4,
          ad: 'Test',
          requestId: '23fhj33i987f',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1',
          meta: {}
        }]
      };
      let bannerResponses = spec.interpretResponse(banner);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal('23fhj33i987f');
      expect(dataItem.cpm).to.equal(0.4);
      expect(dataItem.width).to.equal(300);
      expect(dataItem.height).to.equal(250);
      expect(dataItem.ad).to.equal('Test');
      expect(dataItem.ttl).to.equal(120);
      expect(dataItem.creativeId).to.equal('2');
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
    });
    it('Should interpret video response', function () {
      const video = {
        body: [{
          vastUrl: 'test.com',
          vastXml: '<VAST>',
          mediaType: 'video',
          cpm: 0.5,
          requestId: '23fhj33i987f',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1',
          meta: {}
        }]
      };
      let videoResponses = spec.interpretResponse(video);
      expect(videoResponses).to.be.an('array').that.is.not.empty;

      let dataItem = videoResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'vastUrl', 'vastXml', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal('23fhj33i987f');
      expect(dataItem.cpm).to.equal(0.5);
      expect(dataItem.vastUrl).to.equal('test.com');
      expect(dataItem.vastXml).to.equal('<VAST>');
      expect(dataItem.ttl).to.equal(120);
      expect(dataItem.creativeId).to.equal('2');
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
    });
    it('Should interpret native response', function () {
      const native = {
        body: [{
          mediaType: 'native',
          native: {
            clickUrl: 'test.com',
            title: 'Test',
            image: 'test.com',
            impressionTrackers: ['test.com'],
          },
          ttl: 120,
          cpm: 0.4,
          requestId: '23fhj33i987f',
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          meta: {}
        }]
      };
      let nativeResponses = spec.interpretResponse(native);
      expect(nativeResponses).to.be.an('array').that.is.not.empty;

      let dataItem = nativeResponses[0];
      expect(dataItem).to.have.keys('requestId', 'cpm', 'ttl', 'creativeId', 'netRevenue', 'currency', 'mediaType', 'native', 'meta');
      expect(dataItem.native).to.have.keys('clickUrl', 'impressionTrackers', 'title', 'image')
      expect(dataItem.requestId).to.equal('23fhj33i987f');
      expect(dataItem.cpm).to.equal(0.4);
      expect(dataItem.native.clickUrl).to.equal('test.com');
      expect(dataItem.native.title).to.equal('Test');
      expect(dataItem.native.image).to.equal('test.com');
      expect(dataItem.native.impressionTrackers).to.be.an('array').that.is.not.empty;
      expect(dataItem.native.impressionTrackers[0]).to.equal('test.com');
      expect(dataItem.ttl).to.equal(120);
      expect(dataItem.creativeId).to.equal('2');
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
    });
    it('Should return an empty array if invalid banner response is passed', function () {
      const invBanner = {
        body: [{
          width: 300,
          cpm: 0.4,
          ad: 'Test',
          requestId: '23fhj33i987f',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      };

      let serverResponses = spec.interpretResponse(invBanner);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array if invalid video response is passed', function () {
      const invVideo = {
        body: [{
          mediaType: 'video',
          cpm: 0.5,
          requestId: '23fhj33i987f',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      };
      let serverResponses = spec.interpretResponse(invVideo);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array if invalid native response is passed', function () {
      const invNative = {
        body: [{
          mediaType: 'native',
          clickUrl: 'test.com',
          title: 'Test',
          impressionTrackers: ['test.com'],
          ttl: 120,
          requestId: '23fhj33i987f',
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
        }]
      };
      let serverResponses = spec.interpretResponse(invNative);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array if invalid response is passed', function () {
      const invalid = {
        body: [{
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      };
      let serverResponses = spec.interpretResponse(invalid);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });
  describe('getUserSyncs', function() {
    it('Should return array of objects with proper sync config , include GDPR', function() {
      const syncData = spec.getUserSyncs({}, {}, {
        consentString: 'ALL',
        gdprApplies: true,
      }, {});
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
      expect(syncData[0].url).to.be.a('string')
      expect(syncData[0].url).to.equal('https://ssp-cookie.logan.ai/image?pbjs=1&gdpr=1&gdpr_consent=ALL&coppa=0')
    });
    it('Should return array of objects with proper sync config , include CCPA', function() {
      const syncData = spec.getUserSyncs({}, {}, {}, {
        consentString: '1NNN'
      });
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
      expect(syncData[0].url).to.be.a('string')
      expect(syncData[0].url).to.equal('https://ssp-cookie.logan.ai/image?pbjs=1&ccpa_consent=1NNN&coppa=0')
    });
  });
});
