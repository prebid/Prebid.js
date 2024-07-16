import {expect} from 'chai';
import {config} from 'src/config.js';
import {spec, getBidFloor} from 'modules/driftpixelBidAdapter.js';
import {deepClone} from 'src/utils';

const ENDPOINT = 'https://pbjs.driftpixel.live';

const defaultRequest = {
  adUnitCode: 'test',
  bidId: '1',
  requestId: 'qwerty',
  ortb2: {
    source: {
      tid: 'auctionId'
    }
  },
  ortb2Imp: {
    ext: {
      tid: 'tr1',
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 200]
      ]
    }
  },
  bidder: 'driftpixel',
  params: {
    env: 'driftpixel',
    pid: '40',
    ext: {}
  },
  bidRequestsCount: 1
};

const defaultRequestVideo = deepClone(defaultRequest);
defaultRequestVideo.mediaTypes = {
  video: {
    playerSize: [640, 480],
    context: 'instream',
    skipppable: true
  }
};

const videoBidderRequest = {
  bidderCode: 'driftpixel',
  bids: [{mediaTypes: {video: {}}, bidId: 'qwerty'}]
};

const displayBidderRequest = {
  bidderCode: 'driftpixel',
  bids: [{bidId: 'qwerty'}]
};

describe('driftpixelBidAdapter', () => {
  describe('isBidRequestValid', function () {
    it('should return false when request params is missing', function () {
      const invalidRequest = deepClone(defaultRequest);
      delete invalidRequest.params;
      expect(spec.isBidRequestValid(invalidRequest)).to.equal(false);
    });

    it('should return false when required env param is missing', function () {
      const invalidRequest = deepClone(defaultRequest);
      delete invalidRequest.params.env;
      expect(spec.isBidRequestValid(invalidRequest)).to.equal(false);
    });

    it('should return false when required pid param is missing', function () {
      const invalidRequest = deepClone(defaultRequest);
      delete invalidRequest.params.pid;
      expect(spec.isBidRequestValid(invalidRequest)).to.equal(false);
    });

    it('should return false when video.playerSize is missing', function () {
      const invalidRequest = deepClone(defaultRequestVideo);
      delete invalidRequest.mediaTypes.video.playerSize;
      expect(spec.isBidRequestValid(invalidRequest)).to.equal(false);
    });

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(defaultRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
    });

    it('should send request with correct structure', function () {
      const request = spec.buildRequests([defaultRequest], {});
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT + '/bid');
      expect(request.options).to.have.property('contentType').and.to.equal('application/json');
      expect(request).to.have.property('data');
    });

    it('should build basic request structure', function () {
      const request = JSON.parse(spec.buildRequests([defaultRequest], {}).data)[0];
      expect(request).to.have.property('bidId').and.to.equal(defaultRequest.bidId);
      expect(request).to.have.property('auctionId').and.to.equal(defaultRequest.ortb2.source.tid);
      expect(request).to.have.property('transactionId').and.to.equal(defaultRequest.ortb2Imp.ext.tid);
      expect(request).to.have.property('tz').and.to.equal(new Date().getTimezoneOffset());
      expect(request).to.have.property('bc').and.to.equal(1);
      expect(request).to.have.property('floor').and.to.equal(null);
      expect(request).to.have.property('banner').and.to.deep.equal({sizes: [[300, 250], [300, 200]]});
      expect(request).to.have.property('gdprApplies').and.to.equal(0);
      expect(request).to.have.property('consentString').and.to.equal('');
      expect(request).to.have.property('userEids').and.to.deep.equal([]);
      expect(request).to.have.property('usPrivacy').and.to.equal('');
      expect(request).to.have.property('coppa').and.to.equal(0);
      expect(request).to.have.property('sizes').and.to.deep.equal(['300x250', '300x200']);
      expect(request).to.have.property('ext').and.to.deep.equal({});
      expect(request).to.have.property('env').and.to.deep.equal({
        env: 'driftpixel',
        pid: '40'
      });
      expect(request).to.have.property('device').and.to.deep.equal({
        ua: navigator.userAgent,
        lang: navigator.language
      });
    });

    it('should build request with schain', function () {
      const schainRequest = deepClone(defaultRequest);
      schainRequest.schain = {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      };
      const request = JSON.parse(spec.buildRequests([schainRequest], {}).data)[0];
      expect(request).to.have.property('schain').and.to.deep.equal({
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    it('should build request with location', function () {
      const bidderRequest = {
        refererInfo: {
          page: 'page',
          location: 'location',
          domain: 'domain',
          ref: 'ref',
          isAmp: false
        }
      };
      const request = JSON.parse(spec.buildRequests([defaultRequest], bidderRequest).data)[0];
      expect(request).to.have.property('location');
      const location = request.location;
      expect(location).to.have.property('page').and.to.equal('page');
      expect(location).to.have.property('location').and.to.equal('location');
      expect(location).to.have.property('domain').and.to.equal('domain');
      expect(location).to.have.property('ref').and.to.equal('ref');
      expect(location).to.have.property('isAmp').and.to.equal(false);
    });

    it('should build request with ortb2 info', function () {
      const ortb2Request = deepClone(defaultRequest);
      ortb2Request.ortb2 = {
        site: {
          name: 'name'
        }
      };
      const request = JSON.parse(spec.buildRequests([ortb2Request], {}).data)[0];
      expect(request).to.have.property('ortb2').and.to.deep.equal({
        site: {
          name: 'name'
        }
      });
    });

    it('should build request with ortb2Imp info', function () {
      const ortb2ImpRequest = deepClone(defaultRequest);
      ortb2ImpRequest.ortb2Imp = {
        ext: {
          data: {
            pbadslot: 'home1',
            adUnitSpecificAttribute: '1'
          }
        }
      };
      const request = JSON.parse(spec.buildRequests([ortb2ImpRequest], {}).data)[0];
      expect(request).to.have.property('ortb2Imp').and.to.deep.equal({
        ext: {
          data: {
            pbadslot: 'home1',
            adUnitSpecificAttribute: '1'
          }
        }
      });
    });

    it('should build request with valid bidfloor', function () {
      const bfRequest = deepClone(defaultRequest);
      bfRequest.getFloor = () => ({floor: 5, currency: 'USD'});
      const request = JSON.parse(spec.buildRequests([bfRequest], {}).data)[0];
      expect(request).to.have.property('floor').and.to.equal(5);
    });

    it('should build request with gdpr consent data if applies', function () {
      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'qwerty'
        }
      };
      const request = JSON.parse(spec.buildRequests([defaultRequest], bidderRequest).data)[0];
      expect(request).to.have.property('gdprApplies').and.equals(1);
      expect(request).to.have.property('consentString').and.equals('qwerty');
    });

    it('should build request with usp consent data if applies', function () {
      const bidderRequest = {
        uspConsent: '1YA-'
      };
      const request = JSON.parse(spec.buildRequests([defaultRequest], bidderRequest).data)[0];
      expect(request).to.have.property('usPrivacy').and.equals('1YA-');
    });

    it('should build request with coppa 1', function () {
      config.setConfig({
        coppa: true
      });
      const request = JSON.parse(spec.buildRequests([defaultRequest], {}).data)[0];
      expect(request).to.have.property('coppa').and.equals(1);
    });

    it('should build request with extended ids', function () {
      const idRequest = deepClone(defaultRequest);
      idRequest.userIdAsEids = [
        {source: 'adserver.org', uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]},
        {source: 'pubcid.org', uids: [{id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1}]}
      ];
      const request = JSON.parse(spec.buildRequests([idRequest], {}).data)[0];
      expect(request).to.have.property('userEids').and.deep.equal(idRequest.userIdAsEids);
    });

    it('should build request with video', function () {
      const request = JSON.parse(spec.buildRequests([defaultRequestVideo], {}).data)[0];
      expect(request).to.have.property('video').and.to.deep.equal({
        playerSize: [640, 480],
        context: 'instream',
        skipppable: true
      });
      expect(request).to.have.property('sizes').and.to.deep.equal(['640x480']);
    });
  });

  describe('interpretResponse', function () {
    it('should return empty bids', function () {
      const serverResponse = {
        body: {
          data: null
        }
      };

      const invalidResponse = spec.interpretResponse(serverResponse, {});
      expect(invalidResponse).to.be.an('array').that.is.empty;
    });

    it('should interpret valid response', function () {
      const serverResponse = {
        body: {
          data: [{
            requestId: 'qwerty',
            cpm: 1,
            currency: 'USD',
            width: 300,
            height: 250,
            ttl: 600,
            meta: {
              advertiserDomains: ['driftpixel']
            },
            ext: {
              pixels: [
                ['iframe', 'surl1'],
                ['image', 'surl2'],
              ]
            }
          }]
        }
      };

      const validResponse = spec.interpretResponse(serverResponse, {bidderRequest: displayBidderRequest});
      const bid = validResponse[0];
      expect(validResponse).to.be.an('array').that.is.not.empty;
      expect(bid.requestId).to.equal('qwerty');
      expect(bid.cpm).to.equal(1);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ttl).to.equal(600);
      expect(bid.meta).to.deep.equal({advertiserDomains: ['driftpixel']});
    });

    it('should interpret valid banner response', function () {
      const serverResponse = {
        body: {
          data: [{
            requestId: 'qwerty',
            cpm: 1,
            currency: 'USD',
            width: 300,
            height: 250,
            ttl: 600,
            mediaType: 'banner',
            creativeId: 'xe-demo-banner',
            ad: 'ad',
            meta: {}
          }]
        }
      };

      const validResponseBanner = spec.interpretResponse(serverResponse, {bidderRequest: displayBidderRequest});
      const bid = validResponseBanner[0];
      expect(validResponseBanner).to.be.an('array').that.is.not.empty;
      expect(bid.mediaType).to.equal('banner');
      expect(bid.creativeId).to.equal('xe-demo-banner');
      expect(bid.ad).to.equal('ad');
    });

    it('should interpret valid video response', function () {
      const serverResponse = {
        body: {
          data: [{
            requestId: 'qwerty',
            cpm: 1,
            currency: 'USD',
            width: 600,
            height: 480,
            ttl: 600,
            mediaType: 'video',
            creativeId: 'xe-demo-video',
            ad: 'vast-xml',
            meta: {}
          }]
        }
      };

      const validResponseBanner = spec.interpretResponse(serverResponse, {bidderRequest: videoBidderRequest});
      const bid = validResponseBanner[0];
      expect(validResponseBanner).to.be.an('array').that.is.not.empty;
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('xe-demo-video');
      expect(bid.ad).to.equal('vast-xml');
    });
  });

  describe('getUserSyncs', function () {
    it('shoukd handle no params', function () {
      const opts = spec.getUserSyncs({}, []);
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('should return empty if sync is not allowed', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});
      expect(opts).to.be.an('array').that.is.empty;
    });

    it('should allow iframe sync', function () {
      const opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [{
        body: {
          data: [{
            requestId: 'qwerty',
            ext: {
              pixels: [
                ['iframe', 'surl1?a=b'],
                ['image', 'surl2?a=b'],
              ]
            }
          }]
        }
      }]);
      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal('surl1?a=b&us_privacy=&gdpr=0&gdpr_consent=');
    });

    it('should allow pixel sync', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [{
        body: {
          data: [{
            requestId: 'qwerty',
            ext: {
              pixels: [
                ['iframe', 'surl1?a=b'],
                ['image', 'surl2?a=b'],
              ]
            }
          }]
        }
      }]);
      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal('surl2?a=b&us_privacy=&gdpr=0&gdpr_consent=');
    });

    it('should allow pixel sync and parse consent params', function () {
      const opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [{
        body: {
          data: [{
            requestId: 'qwerty',
            ext: {
              pixels: [
                ['iframe', 'surl1?a=b'],
                ['image', 'surl2?a=b'],
              ]
            }
          }]
        }
      }], {
        gdprApplies: 1,
        consentString: '1YA-'
      });
      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal('surl2?a=b&us_privacy=&gdpr=1&gdpr_consent=1YA-');
    });
  });

  describe('getBidFloor', function () {
    it('should return null when getFloor is not a function', () => {
      const bid = {getFloor: 2};
      const result = getBidFloor(bid);
      expect(result).to.be.null;
    });

    it('should return null when getFloor doesnt return an object', () => {
      const bid = {getFloor: () => 2};
      const result = getBidFloor(bid);
      expect(result).to.be.null;
    });

    it('should return null when floor is not a number', () => {
      const bid = {
        getFloor: () => ({floor: 'string', currency: 'USD'})
      };
      const result = getBidFloor(bid);
      expect(result).to.be.null;
    });

    it('should return null when currency is not USD', () => {
      const bid = {
        getFloor: () => ({floor: 5, currency: 'EUR'})
      };
      const result = getBidFloor(bid);
      expect(result).to.be.null;
    });

    it('should return floor value when everything is correct', () => {
      const bid = {
        getFloor: () => ({floor: 5, currency: 'USD'})
      };
      const result = getBidFloor(bid);
      expect(result).to.equal(5);
    });
  });
})
