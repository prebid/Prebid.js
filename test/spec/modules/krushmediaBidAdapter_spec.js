import { expect } from 'chai';
import { spec } from '../../../modules/krushmediaBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from '../../../src/mediaTypes.js';
import { getUniqueIdentifierStr } from '../../../src/utils.js';

const bidder = 'krushmedia';

describe('KrushmediabBidAdapter', function () {
  const userIdAsEids = [{
    source: 'test.org',
    uids: [{
      id: '01**********',
      atype: 1,
      ext: {
        third: '01***********'
      }
    }]
  }];
  const bids = [
    {
      bidId: getUniqueIdentifierStr(),
      bidder: bidder,
      mediaTypes: {
        [BANNER]: {
          sizes: [[300, 250]]
        }
      },
      params: {
        key: 783
      },
      userIdAsEids
    },
    {
      bidId: getUniqueIdentifierStr(),
      bidder: bidder,
      mediaTypes: {
        [VIDEO]: {
          playerSize: [[300, 300]],
          minduration: 5,
          maxduration: 60
        }
      },
      params: {
        key: 783
      },
      userIdAsEids
    },
    {
      bidId: getUniqueIdentifierStr(),
      bidder: bidder,
      mediaTypes: {
        [NATIVE]: {
          native: {
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
          }
        }
      },
      params: {
        key: 783
      },
      userIdAsEids
    }
  ];

  const invalidBid = {
    bidId: getUniqueIdentifierStr(),
    bidder: bidder,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {

    }
  }

  const bidderRequest = {
    uspConsent: '1---',
    gdprConsent: {
      consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
      vendorData: {}
    },
    refererInfo: {
      referer: 'https://test.com',
      page: 'https://test.com'
    },
    ortb2: {
      device: {
        w: 1512,
        h: 982,
        language: 'en-UK'
      }
    },
    timeout: 500
  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are bidId, params and key parameters present', function () {
      expect(spec.isBidRequestValid(bids[0])).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests(bids, bidderRequest);

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
      expect(serverRequest.url).to.equal('https://ads4.krushmedia.com/?c=rtb&m=hb');
    });

    it('Returns general data valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth',
        'deviceHeight',
        'device',
        'language',
        'secure',
        'host',
        'page',
        'placements',
        'coppa',
        'ccpa',
        'gdpr',
        'tmax'
      );
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      expect(data.coppa).to.be.a('number');
      expect(data.gdpr).to.be.a('object');
      expect(data.ccpa).to.be.a('string');
      expect(data.tmax).to.be.a('number');
      expect(data.placements).to.have.lengthOf(3);
    });

    it('Returns valid placements', function () {
      const { placements } = serverRequest.data;

      for (let i = 0, len = placements.length; i < len; i++) {
        const placement = placements[i];
        expect(placement.key).to.be.equal(783);
        expect(placement.traffic).to.be.oneOf([BANNER, VIDEO, NATIVE]);
        expect(placement.bidId).to.be.a('string');
        expect(placement.schain).to.be.an('object');
        expect(placement.bidfloor).to.exist.and.to.equal(0);
        expect(placement.eids).to.exist.and.to.be.deep.equal(userIdAsEids);

        if (placement.traffic === BANNER) {
          expect(placement.sizes).to.be.an('array');
        }
        switch (placement.traffic) {
          case BANNER:
            expect(placement.sizes).to.be.an('array');
            break;
          case VIDEO:
            expect(placement.wPlayer).to.be.an('number');
            expect(placement.hPlayer).to.be.an('number');
            expect(placement.minduration).to.be.an('number');
            expect(placement.maxduration).to.be.an('number');
            break;
          case NATIVE:
            expect(placement.native).to.be.an('object');
            break;
        }
      }
    });

    it('Returns valid endpoints', function () {
      const bids = [
        {
          bidId: getUniqueIdentifierStr(),
          bidder: bidder,
          mediaTypes: {
            [BANNER]: {
              sizes: [[300, 250]]
            }
          },
          params: {
            endpointId: 'testBanner',
          },
          userIdAsEids
        }
      ];

      let serverRequest = spec.buildRequests(bids, bidderRequest);

      const { placements } = serverRequest.data;
      for (let i = 0, len = placements.length; i < len; i++) {
        const placement = placements[i];
        expect(placement.endpointId).to.be.oneOf(['testBanner', 'testVideo', 'testNative']);
        expect(placement.traffic).to.be.oneOf([BANNER, VIDEO, NATIVE]);
        expect(placement.bidId).to.be.a('string');
        expect(placement.schain).to.be.an('object');
        expect(placement.bidfloor).to.exist.and.to.equal(0);
        expect(placement.type).to.exist.and.to.equal('network');
        expect(placement.eids).to.exist.and.to.be.deep.equal(userIdAsEids);

        if (placement.traffic === BANNER) {
          expect(placement.sizes).to.be.an('array');
        }
        switch (placement.traffic) {
          case BANNER:
            expect(placement.sizes).to.be.an('array');
            break;
          case VIDEO:
            expect(placement.wPlayer).to.be.an('number');
            expect(placement.hPlayer).to.be.an('number');
            expect(placement.minduration).to.be.an('number');
            expect(placement.maxduration).to.be.an('number');
            break;
          case NATIVE:
            expect(placement.native).to.be.an('object');
            break;
        }
      }
    });

    it('Returns data with gdprConsent and without uspConsent', function () {
      delete bidderRequest.uspConsent;
      serverRequest = spec.buildRequests(bids, bidderRequest);
      let data = serverRequest.data;
      expect(data.gdpr).to.exist;
      expect(data.gdpr).to.be.a('object');
      expect(data.gdpr).to.have.property('consentString');
      expect(data.gdpr).to.not.have.property('vendorData');
      expect(data.gdpr.consentString).to.equal(bidderRequest.gdprConsent.consentString);
      expect(data.ccpa).to.not.exist;
      delete bidderRequest.gdprConsent;
    });

    it('Returns data with uspConsent and without gdprConsent', function () {
      bidderRequest.uspConsent = '1---';
      delete bidderRequest.gdprConsent;
      serverRequest = spec.buildRequests(bids, bidderRequest);
      let data = serverRequest.data;
      expect(data.ccpa).to.exist;
      expect(data.ccpa).to.be.a('string');
      expect(data.ccpa).to.equal(bidderRequest.uspConsent);
      expect(data.gdpr).to.not.exist;
    });
  });

  describe('gpp consent', function () {
    it('bidderRequest.gppConsent', () => {
      bidderRequest.gppConsent = {
        gppString: 'abc123',
        applicableSections: [8]
      };

      let serverRequest = spec.buildRequests(bids, bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.property('gpp');
      expect(data).to.have.property('gpp_sid');

      delete bidderRequest.gppConsent;
    })

    it('bidderRequest.ortb2.regs.gpp', () => {
      bidderRequest.ortb2 = bidderRequest.ortb2 || {};
      bidderRequest.ortb2.regs = bidderRequest.ortb2.regs || {};
      bidderRequest.ortb2.regs.gpp = 'abc123';
      bidderRequest.ortb2.regs.gpp_sid = [8];

      let serverRequest = spec.buildRequests(bids, bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.property('gpp');
      expect(data).to.have.property('gpp_sid');

      bidderRequest.ortb2;
    })
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
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
        }]
      };
      let bannerResponses = spec.interpretResponse(banner);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal(banner.body[0].requestId);
      expect(dataItem.cpm).to.equal(banner.body[0].cpm);
      expect(dataItem.width).to.equal(banner.body[0].width);
      expect(dataItem.height).to.equal(banner.body[0].height);
      expect(dataItem.ad).to.equal(banner.body[0].ad);
      expect(dataItem.ttl).to.equal(banner.body[0].ttl);
      expect(dataItem.creativeId).to.equal(banner.body[0].creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(banner.body[0].currency);
      expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
    });
    it('Should interpret video response', function () {
      const video = {
        body: [{
          vastUrl: 'test.com',
          mediaType: 'video',
          cpm: 0.5,
          requestId: '23fhj33i987f',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1',
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
        }]
      };
      let videoResponses = spec.interpretResponse(video);
      expect(videoResponses).to.be.an('array').that.is.not.empty;

      let dataItem = videoResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'vastUrl', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal('23fhj33i987f');
      expect(dataItem.cpm).to.equal(0.5);
      expect(dataItem.vastUrl).to.equal('test.com');
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
          meta: {
            advertiserDomains: ['google.com'],
            advertiserId: 1234
          }
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
      expect(syncData[0].url).to.equal('https://cs.krushmedia.com/image?pbjs=1&gdpr=1&gdpr_consent=ALL&coppa=0')
    });
    it('Should return array of objects with proper sync config , include CCPA', function() {
      const syncData = spec.getUserSyncs({}, {}, {}, {
        consentString: '1---'
      });
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
      expect(syncData[0].url).to.be.a('string')
      expect(syncData[0].url).to.equal('https://cs.krushmedia.com/image?pbjs=1&ccpa_consent=1---&coppa=0')
    });
    it('Should return array of objects with proper sync config , include GPP', function() {
      const syncData = spec.getUserSyncs({}, {}, {}, {}, {
        gppString: 'abc123',
        applicableSections: [8]
      });
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
      expect(syncData[0].url).to.be.a('string')
      expect(syncData[0].url).to.equal('https://cs.krushmedia.com/image?pbjs=1&gpp=abc123&gpp_sid=8&coppa=0')
    });
  });
});
