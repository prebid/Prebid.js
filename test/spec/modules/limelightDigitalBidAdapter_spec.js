import { expect } from 'chai';
import { spec } from '../../../modules/limelightDigitalBidAdapter.js';
import { deepAccess } from '../../../src/utils.js';

describe('limelightDigitalAdapter', function () {
  const bid1 = {
    bidId: '2dd581a2b6281d',
    bidder: 'limelightDigital',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: 123,
      adUnitType: 'banner',
      publisherId: 'perfectPublisher',
      custom1: 'custom1',
      custom2: 'custom2',
      custom3: 'custom3',
      custom4: 'custom4',
      custom5: 'custom5'
    },
    placementCode: 'placement_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '/1111/homepage#300x250',
        tid: '738d5915-6651-43b9-9b6b-d50517350917',
        data: {
          'pbadslot': '/1111/homepage#300x250'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test1.org',
        uids: [
          {
            id: '123',
          }
        ]
      }
    ]
  };

  const bid2 = {
    bidId: '58ee9870c3164a',
    bidder: 'limelightDigital',
    bidderRequestId: '209fdaf1c81649',
    params: {
      host: 'ads.project-limelight.com',
      adUnitId: 456,
      adUnitType: 'banner',
      custom1: 'custom1',
      custom2: 'custom2',
      custom3: 'custom3',
      custom4: 'custom4',
      custom5: 'custom5'
    },
    placementCode: 'placement_1',
    auctionId: '482f88de-29ab-45c8-981a-d25e39454a34',
    mediaTypes: {
      banner: {
        sizes: [[350, 200]]
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '/1111/homepage#350x200',
        tid: '738d5915-6651-43b9-9b6b-d50517350917',
        data: {
          'pbadslot': '/1111/homepage#350x200'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test2.org',
        uids: [
          {
            id: '234',
          }
        ]
      }
    ]
  };

  const bid3 = {
    bidId: '019645c7d69460',
    bidder: 'limelightDigital',
    bidderRequestId: 'f2b15f89e77ba6',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: 789,
      adUnitType: 'video',
      publisherId: 'secondPerfectPublisher',
      custom1: 'custom1',
      custom2: 'custom2',
      custom3: 'custom3',
      custom4: 'custom4',
      custom5: 'custom5'
    },
    placementCode: 'placement_2',
    auctionId: 'e4771143-6aa7-41ec-8824-ced4342c96c8',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[800, 600]],
        mimes: ['video/mp4', 'application/javascript'],
        protocols: [2, 3, 5, 6],
        maxduration: 60,
        minduration: 3,
        api: [2],
        playbackmethod: [1]
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '/1111/homepage#800x600',
        tid: '738d5915-6651-43b9-9b6b-d50517350917',
        data: {
          'pbadslot': '/1111/homepage#800x600'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test3.org',
        uids: [
          {
            id: '345',
          }
        ]
      }
    ]
  };

  describe('isBidRequestValid', function() {
    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid1)).to.equal(true);
      expect(spec.isBidRequestValid(bid2)).to.equal(true);
      expect(spec.isBidRequestValid(bid3)).to.equal(true);
    });

    it('should return true when adUnitId is zero', function() {
      const bidWithZeroId = { ...bid1, params: { ...bid1.params, adUnitId: 0 } };
      expect(spec.isBidRequestValid(bidWithZeroId)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      const bidFailed = {
        bidder: 'limelightDigital',
        bidderRequestId: '145e1d6a7837c9',
        params: {
          adUnitId: 123,
          adUnitType: 'banner'
        },
        placementCode: 'placement_0',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2'
      };
      expect(spec.isBidRequestValid(bidFailed)).to.equal(false);
    });

    it('should return false when host is missing', function() {
      const bidWithoutHost = { ...bid1, params: { ...bid1.params } };
      delete bidWithoutHost.params.host;
      expect(spec.isBidRequestValid(bidWithoutHost)).to.equal(false);
    });

    it('should return false when adUnitType is missing', function() {
      const bidWithoutType = { ...bid1, params: { ...bid1.params } };
      delete bidWithoutType.params.adUnitType;
      expect(spec.isBidRequestValid(bidWithoutType)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      ortb2: {
        device: {
          sua: {
            browsers: [],
            platform: [],
            mobile: 1,
            architecture: 'arm'
          }
        },
        site: {
          page: 'https://example.com/page'
        }
      },
      refererInfo: {
        page: 'https://example.com/page'
      }
    };

    it('should create two server requests for different hosts', function() {
      const serverRequests = spec.buildRequests([bid1, bid2, bid3], bidderRequest);
      expect(serverRequests).to.exist;
      expect(serverRequests).to.have.lengthOf(2);
    });

    it('should create ServerRequest objects with method, URL and data', function () {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      serverRequests.forEach(serverRequest => {
        expect(serverRequest).to.exist;
        expect(serverRequest.method).to.exist;
        expect(serverRequest.url).to.exist;
        expect(serverRequest.data).to.exist;
      });
    });

    it('should return POST method', function () {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      serverRequests.forEach(serverRequest => {
        expect(serverRequest.method).to.equal('POST');
      });
    });

    it('should return valid OpenRTB request structure', function () {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const data = serverRequests[0].data;

      expect(data).to.be.an('object');
      expect(data).to.have.property('imp');
      expect(data).to.have.property('site');
      expect(data).to.have.property('device');
      expect(data).to.have.property('id');
      expect(data.imp).to.be.an('array');
    });

    it('should include custom fields in imp.ext', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const imp = serverRequests[0].data.imp[0];

      expect(deepAccess(imp, 'ext.c1')).to.equal('custom1');
      expect(deepAccess(imp, 'ext.c2')).to.equal('custom2');
      expect(deepAccess(imp, 'ext.c3')).to.equal('custom3');
      expect(deepAccess(imp, 'ext.c4')).to.equal('custom4');
      expect(deepAccess(imp, 'ext.c5')).to.equal('custom5');
    });

    it('should include adUnitId in imp.ext', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const imp = serverRequests[0].data.imp[0];

      expect(deepAccess(imp, 'ext.adUnitId')).to.equal(123);
    });

    it('should return valid URLs for different hosts', function () {
      const serverRequests = spec.buildRequests([bid1, bid2, bid3], bidderRequest);

      const exchangeRequest = serverRequests.find(req => req.url.includes('exchange.ortb.net'));
      const adsRequest = serverRequests.find(req => req.url.includes('ads.project-limelight.com'));

      expect(exchangeRequest.url).to.equal('https://exchange.ortb.net/ortbhb');
      expect(adsRequest.url).to.equal('https://ads.project-limelight.com/ortbhb');
    });

    it('should group bids by host correctly', function() {
      const serverRequests = spec.buildRequests([bid1, bid2, bid3], bidderRequest);

      const exchangeRequest = serverRequests.find(req => req.url.includes('exchange.ortb.net'));
      const adsRequest = serverRequests.find(req => req.url.includes('ads.project-limelight.com'));

      expect(exchangeRequest.data.imp).to.have.lengthOf(2);
      expect(adsRequest.data.imp).to.have.lengthOf(1);
    });

    it('should return empty array if no valid requests are passed', function () {
      const serverRequests = spec.buildRequests([], bidderRequest);
      expect(serverRequests).to.be.an('array').that.is.empty;
    });

    it('should include banner format in OpenRTB request', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const imp = serverRequests[0].data.imp[0];

      expect(imp.banner).to.exist;
      expect(imp.banner.format).to.be.an('array');
      expect(imp.banner.format[0]).to.have.property('w', 300);
      expect(imp.banner.format[0]).to.have.property('h', 250);
    });

    it('should include video object in OpenRTB request for video bid', function() {
      const serverRequests = spec.buildRequests([bid3], bidderRequest);
      const imp = serverRequests[0].data.imp[0];
      if (FEATURES.VIDEO) {
        expect(imp.video).to.exist;
        expect(imp.video).to.be.an('object');
        expect(imp.video.w).to.equal(800);
        expect(imp.video.h).to.equal(600);
      }
      expect(deepAccess(imp, 'ext.adUnitId')).to.equal(789);
    });

    it('should skip custom fields if they are undefined', function() {
      const bidWithoutCustom = { ...bid1, params: { ...bid1.params } };
      delete bidWithoutCustom.params.custom1;
      delete bidWithoutCustom.params.custom2;

      const serverRequests = spec.buildRequests([bidWithoutCustom], bidderRequest);
      const imp = serverRequests[0].data.imp[0];

      expect(deepAccess(imp, 'ext.c1')).to.be.undefined;
      expect(deepAccess(imp, 'ext.c2')).to.be.undefined;
      expect(deepAccess(imp, 'ext.c3')).to.equal('custom3');
    });

    it('should handle various refererInfo scenarios', function () {
      const baseRequest = [{
        bidder: 'limelightDigital',
        params: { host: 'exchange.example.com', adUnitId: 'test' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        bidId: 'test-bid-id'
      }];

      let requests = spec.buildRequests(baseRequest, {
        refererInfo: { page: 'https://test.com' },
        ortb2: {}
      });
      expect(requests[0].data.site.page).to.equal('https://test.com');

      requests = spec.buildRequests(baseRequest, {
        refererInfo: { page: 'https://referer.com' },
        ortb2: { site: { page: 'https://ortb2.com' } }
      });
      expect(requests[0].data.site.page).to.equal('https://ortb2.com');

      requests = spec.buildRequests(baseRequest, { ortb2: {} });
      expect(requests[0].data.site.page).to.be.undefined;
    });

    describe('buildRequests - size handling', function () {
      it('should handle mediaTypes.banner.sizes', function () {
        const bidRequests = [{
          bidder: 'limelightDigital',
          params: {
            host: 'exchange.example.com',
            adUnitId: 'test',
            adUnitType: 'banner'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          adUnitCode: 'test-ad-unit',
          bidId: 'test-bid-id'
        }];

        const bidderRequest = {
          refererInfo: { page: 'https://test.com' },
          ortb2: { site: { domain: 'test.com' } }
        };

        const requests = spec.buildRequests(bidRequests, bidderRequest);

        expect(requests[0].data.imp[0].banner.format).to.deep.equal([
          { w: 300, h: 250 },
          { w: 728, h: 90 }
        ]);
      });

      it('should handle legacy sizes without mediaTypes', function () {
        const bidRequests = [{
          bidder: 'limelightDigital',
          params: {
            host: 'exchange.example.com',
            adUnitId: 'test',
            adUnitType: 'banner'
          },
          sizes: [[300, 250], [728, 90]],
          adUnitCode: 'test-ad-unit',
          bidId: 'test-bid-id'
        }];

        const bidderRequest = {
          refererInfo: { page: 'https://test.com' },
          ortb2: { site: { domain: 'test.com' } }
        };

        const requests = spec.buildRequests(bidRequests, bidderRequest);

        expect(requests[0].data.imp[0].banner.format).to.deep.equal([
          { w: 300, h: 250 },
          { w: 728, h: 90 }
        ]);
      });

      it('should merge mediaTypes sizes with bidRequest.sizes', function () {
        const bidRequests = [{
          bidder: 'limelightDigital',
          params: {
            host: 'exchange.example.com',
            adUnitId: 'test',
            adUnitType: 'banner'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          },
          sizes: [[728, 90]],
          adUnitCode: 'test-ad-unit',
          bidId: 'test-bid-id'
        }];

        const bidderRequest = {
          refererInfo: { page: 'https://test.com' },
          ortb2: { site: { domain: 'test.com' } }
        };

        const requests = spec.buildRequests(bidRequests, bidderRequest);

        const formats = requests[0].data.imp[0].banner.format;
        expect(formats).to.have.lengthOf(2);
        expect(formats).to.deep.include({ w: 300, h: 250 });
        expect(formats).to.deep.include({ w: 728, h: 90 });
      });

      it('should handle video with playerSize', function () {
        const bidRequests = [{
          bidder: 'limelightDigital',
          params: {
            host: 'exchange.example.com',
            adUnitId: 'test',
            adUnitType: 'video'
          },
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          },
          adUnitCode: 'test-ad-unit',
          bidId: 'test-bid-id'
        }];

        const bidderRequest = {
          refererInfo: { page: 'https://test.com' },
          ortb2: { site: { domain: 'test.com' } }
        };

        const requests = spec.buildRequests(bidRequests, bidderRequest);
        if (FEATURES.VIDEO) {
          expect(requests[0].data.imp[0].video).to.exist;
          expect(requests[0].data.imp[0].video.w).to.equal(640);
          expect(requests[0].data.imp[0].video.h).to.equal(480);
        }
      });
    });
  });

  describe('interpretResponse - Banner', function () {
    const bidderRequest = {
      ortb2: {
        site: {
          page: 'https://example.com/page'
        }
      }
    };

    it('should return array of valid bid responses', function () {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const ortbResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid123',
              impid: request.data.imp[0].id,
              price: 0.3,
              w: 300,
              h: 250,
              adm: '<h1>Hello ad</h1>',
              crid: '123asd',
              mtype: 1,
              adomain: ['example.com'],
              exp: 1000
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(ortbResponse, request);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      expect(serverResponses).to.have.lengthOf(1);

      const bidResponse = serverResponses[0];
      expect(bidResponse.requestId).to.be.a('string');
      expect(bidResponse.cpm).to.equal(0.3);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad).to.be.a('string');
      expect(bidResponse.ttl).to.be.a('number');
      expect(bidResponse.creativeId).to.be.a('string');
      expect(bidResponse.netRevenue).to.be.a('boolean');
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.mediaType).to.equal('banner');
    });

    it('should return empty array for invalid response', function () {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const serverResponses = spec.interpretResponse({ body: null }, request);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });

    it('should return empty array when response body is missing', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const serverResponses = spec.interpretResponse({}, request);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });

    it('should filter out invalid bids', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const invalidResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid123',
              impid: request.data.imp[0].id,
              price: 0.3,
              crid: '123asd',
              mtype: 1,
              adomain: ['example.com']
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(invalidResponse, request);
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('interpretResponse - Video', function () {
    const bidderRequest = {
      ortb2: {
        site: {
          page: 'https://example.com/page'
        }
      }
    };

    it('should return array of valid video bid responses with mtype', function () {
      const serverRequests = spec.buildRequests([bid3], bidderRequest);
      const request = serverRequests[0];

      const ortbResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid456',
              impid: request.data.imp[0].id,
              price: 0.5,
              w: 800,
              h: 600,
              adm: '<VAST version="3.0"><Ad><InLine><Creatives><Creative><Linear></Linear></Creative></Creatives></InLine></Ad></VAST>',
              crid: '456def',
              mtype: 2,
              adomain: ['example.com']
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(ortbResponse, request);

      expect(serverResponses).to.be.an('array');
      if (serverResponses.length > 0) {
        const bidResponse = serverResponses[0];
        expect(bidResponse.mediaType).to.equal('video');
        expect(bidResponse.vastXml).to.be.a('string');
      }
    });

    it('should return array of valid video bid responses with ext.mediaType fallback', function () {
      const serverRequests = spec.buildRequests([bid3], bidderRequest);
      const request = serverRequests[0];

      const ortbResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid456',
              impid: request.data.imp[0].id,
              price: 0.5,
              w: 800,
              h: 600,
              adm: '<VAST version="3.0"><Ad><InLine><Creatives><Creative><Linear></Linear></Creative></Creatives></InLine></Ad></VAST>',
              crid: '456def',
              ext: {
                mediaType: 'video'
              },
              adomain: ['example.com']
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(ortbResponse, request);

      expect(serverResponses).to.be.an('array');
      if (serverResponses.length > 0) {
        const bidResponse = serverResponses[0];
        expect(bidResponse.mediaType).to.equal('video');
        expect(bidResponse.vastXml).to.be.a('string');
      }
    });
  });

  describe('interpretResponse - mediaType fallback', function() {
    const bidderRequest = {
      ortb2: {
        site: {
          page: 'https://example.com/page'
        }
      }
    };

    it('should infer mediaType from imp.banner when mtype is missing', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const responseWithoutMtype = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid123',
              impid: request.data.imp[0].id,
              price: 0.3,
              w: 300,
              h: 250,
              adm: '<h1>Hello ad</h1>',
              crid: '123asd',
              adomain: ['example.com'],
              exp: 1000
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(responseWithoutMtype, request);

      expect(serverResponses).to.have.lengthOf(1);
      expect(serverResponses[0].mediaType).to.equal('banner');
    });

    it('should use ext.mediaType when available', function() {
      const serverRequests = spec.buildRequests([bid1], bidderRequest);
      const request = serverRequests[0];

      const responseWithExtMediaType = {
        body: {
          seatbid: [{
            bid: [{
              id: 'bid123',
              impid: request.data.imp[0].id,
              price: 0.3,
              w: 300,
              h: 250,
              adm: '<h1>Hello ad</h1>',
              crid: '123asd',
              ext: {
                mediaType: 'banner'
              },
              adomain: ['example.com'],
              exp: 1000
            }]
          }],
          cur: 'USD'
        }
      };

      const serverResponses = spec.interpretResponse(responseWithExtMediaType, request);

      expect(serverResponses).to.have.lengthOf(1);
      expect(serverResponses[0].mediaType).to.equal('banner');
    });
  });

  describe('onBidWon', function() {
    it('should replace auction price macro in nurl', function() {
      const bid = {
        pbMg: 1.23,
        nurl: 'https://example.com/win?price=${AUCTION_PRICE}'
      };

      expect(() => spec.onBidWon(bid)).to.not.throw();
    });

    it('should handle empty nurl', function() {
      const bid = {
        pbMg: 1.23,
        nurl: ''
      };

      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  describe('getUserSyncs', function () {
    it('should return iframe sync when available and enabled', function () {
      const serverResponses = [{
        headers: {
          get: function (header) {
            if (header === 'x-pll-usersync-iframe') {
              return 'https://tracker-lm.ortb.net/sync.html';
            }
            if (header === 'x-pll-usersync-image') {
              return 'https://tracker-lm.ortb.net/sync';
            }
          }
        },
        body: {}
      }];

      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://tracker-lm.ortb.net/sync.html'
      }]);
    });

    it('should return image sync when iframe not available', function () {
      const serverResponses = [{
        headers: {
          get: function (header) {
            if (header === 'x-pll-usersync-image') {
              return 'https://tracker-lm.ortb.net/sync';
            }
          }
        },
        body: {}
      }];

      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'image',
        url: 'https://tracker-lm.ortb.net/sync'
      }]);
    });

    it('should return empty array when all sync types disabled', function () {
      const serverResponses = [{
        headers: {
          get: function (header) {
            return 'https://tracker.ortb.net/sync';
          }
        },
        body: {}
      }];

      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should deduplicate sync URLs', function() {
      const serverResponses = [
        {
          headers: {
            get: function (header) {
              if (header === 'x-pll-usersync-image') {
                return 'https://tracker.ortb.net/sync';
              }
            }
          },
          body: {}
        },
        {
          headers: {
            get: function (header) {
              if (header === 'x-pll-usersync-image') {
                return 'https://tracker.ortb.net/sync';
              }
            }
          },
          body: {}
        }
      ];

      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.have.lengthOf(1);
    });
  });
});
