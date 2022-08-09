import { expect } from 'chai';
import { spec } from 'modules/videobyteBidAdapter.js';

describe('VideoByteBidAdapter', function () {
  let bidRequest;
  let bidderRequest = {
    'bidderCode': 'videobyte',
    'auctionId': 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    'bidderRequestId': '1e498b84fffc39',
    'bids': bidRequest,
    'auctionStart': 1520001292880,
    'timeout': 3000,
    'start': 1520001292884,
    'doneCbCallCount': 0,
    'refererInfo': {
      'numIframes': 1,
      'reachedTop': true,
      'referer': 'test.com'
    }
  };
  let mockConfig;

  beforeEach(function () {
    bidRequest = {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
        }
      },
      bidder: 'videobyte',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          sid: 134,
          rewarded: 1,
          placement: 1,
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://test.com',
          referrer: 'http://test.com'
        },
        pubId: 'vb12345'
      }
    };
  });

  describe('spec.isBidRequestValid', function () {
    it('should return false when mediaTypes is empty', function () {
      bidRequest.mediaTypes = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return true (skip validations) when e2etest = true', function () {
      bidRequest.params.video = {
        e2etest: true
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when mediaTypes.video has all mandatory params', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4', 'application/javascript'],
      }
      bidRequest.params.video = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when params.video has all override params instead of mediaTypes.video', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream'
      };
      bidRequest.params.video = {
        playerSize: [[640, 480]],
        mimes: ['video/mp4', 'application/javascript']
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when mimes is passed in params.video', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream',
        playerSize: [[640, 480]]
      };
      bidRequest.video = {
        mimes: ['video/mp4', 'application/javascript']
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when both mediaTypes.video and params.video Objects are missing', function () {
      bidRequest.mediaTypes = {};
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when both mediaTypes.video and params.video are missing mimes and player size', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'instream'
        }
      };
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "pubId" param is missing', function () {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
    it('should return false when the "pubId" param is missing', function () {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', function () {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('spec.buildRequests', function () {
    it('should create a POST request for every bid', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(spec.ENDPOINT + '?pid=' + bidRequest.params.pubId);
    });

    it('should attach request data', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      const [width, height] = bidRequest.sizes;
      const VERSION = '1.0.0';
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.ext.prebidver).to.equal('$prebid.version$');
      expect(data.ext.adapterver).to.equal(spec.VERSION);
    });

    it('should set pubId to e2etest when bid.params.video.e2etest = true', function () {
      bidRequest.params.video.e2etest = true;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(spec.ENDPOINT + '?pid=e2etest');
    });

    it('should attach End 2 End test data', function () {
      bidRequest.params.video.e2etest = true;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).to.not.exist;
      expect(data.imp[0].video.w).to.equal(640);
      expect(data.imp[0].video.h).to.equal(480);
    });

    it('should send Global schain', function () {
      bidRequest.params.video.sid = null;
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'some-platform.com',
          sid: '111111',
          rid: bidRequest.id,
          hp: 1
        }]
      };
      bidRequest.schain = globalSchain;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      const schain = data.source.ext.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain).to.deep.equal(globalSchain);
    });

    describe('content object validations', function () {
      it('should not accept content object if value is Undefined ', function () {
        bidRequest.params.video.content = null;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is is Array ', function () {
        bidRequest.params.video.content = [];
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is Number ', function () {
        bidRequest.params.video.content = 123456;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is String ', function () {
        bidRequest.params.video.content = 'keyValuePairs';
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is Boolean ', function () {
        bidRequest.params.video.content = true;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.undefined;
      });
      it('should accept content object if value is Object ', function () {
        bidRequest.params.video.content = {};
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.a('object');
      });

      it('should not append unsupported content object keys', function () {
        bidRequest.params.video.content = {
          fake: 'news',
          unreal: 'param',
          counterfit: 'data'
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.empty;
      });

      it('should not append content string parameters if value is not string ', function () {
        bidRequest.params.video.content = {
          id: 1234,
          title: ['Title'],
          series: ['Series'],
          season: ['Season'],
          genre: ['Genre'],
          contentrating: {1: 'C-Rating'},
          language: {1: 'EN'}
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content Number parameters if value is not Number ', function () {
        bidRequest.params.video.content = {
          episode: '1',
          context: 'context',
          livestream: {0: 'stream'},
          len: [360],
          prodq: [1],
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content Array parameters if value is not Array ', function () {
        bidRequest.params.video.content = {
          cat: 'categories',
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content ext if value is not Object ', function () {
        bidRequest.params.video.content = {
          ext: 'content.ext',
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should append supported parameters if value match validations ', function () {
        bidRequest.params.video.content = {
          id: '1234',
          title: 'Title',
          series: 'Series',
          season: 'Season',
          cat: [
            'IAB1'
          ],
          genre: 'Genre',
          contentrating: 'C-Rating',
          language: 'EN',
          episode: 1,
          prodq: 1,
          context: 1,
          livestream: 0,
          len: 360,
          ext: {}
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = JSON.parse(requests[0].data);
        expect(data.site.content).to.deep.equal(bidRequest.params.video.content);
      });
    });
  });
  describe('price floor module validations', function () {
    beforeEach(function () {
      bidRequest.getFloor = (floorObj) => {
        return {
          floor: bidRequest.floors.values[floorObj.mediaType + '|640x480'],
          currency: floorObj.currency,
          mediaType: floorObj.mediaType
        }
      }
    });

    it('should get bidfloor from getFloor method', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'video|640x480': 5.55
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(5.55);
    });
    it('should get bidfloor from params method', function () {
      bidRequest.params.bidfloor = 4.0;
      bidRequest.params.currency = 'EUR';
      bidRequest.getFloor = null;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(4.0);
      expect(data.imp[0].bidfloorcur).to.equal('EUR');
    });

    it('should use adUnit/module currency & floor instead of bid.params.bidfloor', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.params.bidfloor = 3.33;
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'video|640x480': 5.55
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(5.55);
    });

    it('should load video floor when multi-format adUnit is present', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.mediaTypes.banner = {
        sizes: [
          [640, 480]
        ]
      };
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'banner|640x480': 2.22,
          'video|640x480': 9.99
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(9.99);
    })
  })

  describe('spec.interpretResponse', function () {
    it('should return no bids if the response is not valid', function () {
      const bidResponse = spec.interpretResponse({
        body: null
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "nurl" and "adm" are missing', function () {
      const serverResponse = {
        seatbid: [{
          bid: [{
            price: 6.01
          }]
        }]
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "price" is missing', function () {
      const serverResponse = {
        seatbid: [{
          bid: [{
            adm: '<VAST></VAST>'
          }]
        }]
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid video bid response with just "adm"', function () {
      const serverResponse = {
        id: '123',
        seatbid: [{
          bid: [{
            id: 1,
            adid: 123,
            crid: 2,
            price: 6.01,
            adm: '<VAST></VAST>',
            adomain: [
              'videobyte.com'
            ],
            w: 640,
            h: 480
          }]
        }],
        cur: 'USD'
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      let o = {
        requestId: serverResponse.id,
        bidderCode: spec.code,
        cpm: serverResponse.seatbid[0].bid[0].price,
        creativeId: serverResponse.seatbid[0].bid[0].crid,
        vastXml: serverResponse.seatbid[0].bid[0].adm,
        width: 640,
        height: 480,
        mediaType: 'video',
        currency: 'USD',
        ttl: 300,
        netRevenue: true,
        meta: {
          advertiserDomains: ['videobyte.com']
        }
      };
      expect(bidResponse[0]).to.deep.equal(o);
    });

    it('should default ttl to 300', function () {
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse[0].ttl).to.equal(300);
    });
    it('should not allow ttl above 3601, default to 300', function () {
      bidRequest.params.video.ttl = 3601;
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse[0].ttl).to.equal(300);
    });
    it('should not allow ttl below 1, default to 300', function () {
      bidRequest.params.video.ttl = 0;
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse[0].ttl).to.equal(300);
    });
  });

  describe('when GDPR and uspConsent applies', function () {
    beforeEach(function () {
      bidderRequest = {
        'gdprConsent': {
          'consentString': 'test-gdpr-consent-string',
          'gdprApplies': true
        },
        'uspConsent': '1YN-',
        'bidderCode': 'videobyte',
        'auctionId': 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
        'bidderRequestId': '1e498b84fffc39',
        'bids': bidRequest,
        'auctionStart': 1520001292880,
        'timeout': 3000,
        'start': 1520001292884,
        'doneCbCallCount': 0,
        'refererInfo': {
          'numIframes': 1,
          'reachedTop': true,
          'referer': 'test.com'
        }
      };

      mockConfig = {
        consentManagement: {
          gdpr: {
            cmpApi: 'iab',
            timeout: 3000,
            allowAuctionWithoutConsent: 'cancel'
          },
          usp: {
            cmpApi: 'iab',
            timeout: 1000,
            allowAuctionWithoutConsent: 'cancel'
          }
        }
      };
    });

    it('should send a signal to specify that GDPR applies to this request', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(request[0].data);
      expect(data.regs.ext.gdpr).to.equal(1);
    });

    it('should send the consent string', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(request[0].data);
      expect(data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should send the uspConsent string', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(request[0].data);
      expect(data.regs.ext.us_privacy).to.equal(bidderRequest.uspConsent);
    });

    it('should send the uspConsent and GDPR ', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(request[0].data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal(bidderRequest.uspConsent);
    });
  });

  describe('getUserSyncs', function () {
    const ortbResponse = {
      'body': {
        'ext': {
          'usersync': {
            'sovrn': {
              'status': 'none',
              'syncs': [
                {
                  'url': 'urlsovrn',
                  'type': 'iframe'
                }
              ]
            },
            'appnexus': {
              'status': 'none',
              'syncs': [
                {
                  'url': 'urlappnexus',
                  'type': 'pixel'
                }
              ]
            }
          }
        }
      }
    };
    it('handles no parameters', function () {
      let opts = spec.getUserSyncs({});
      expect(opts).to.be.an('array').that.is.empty;
    });
    it('returns non if sync is not allowed', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false});

      expect(opts).to.be.an('array').that.is.empty;
    });

    it('iframe sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [ortbResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('iframe');
      expect(opts[0].url).to.equal(ortbResponse.body.ext.usersync['sovrn'].syncs[0].url);
    });

    it('pixel sync enabled should return results', function () {
      let opts = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [ortbResponse]);

      expect(opts.length).to.equal(1);
      expect(opts[0].type).to.equal('image');
      expect(opts[0].url).to.equal(ortbResponse.body.ext.usersync['appnexus'].syncs[0].url);
    });

    it('all sync enabled should return only iframe result', function () {
      let opts = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [ortbResponse]);

      expect(opts.length).to.equal(1);
    });
  });
});
