import { expect } from 'chai';
import { spec } from 'modules/connectadBidAdapter.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import 'modules/priceFloors.js';

describe('ConnectAd Adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'connectad',
        params: {
          siteId: 123456,
          networkId: 123456,
          bidfloor: 0.50
        },
        adUnitCode: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bidId: '2f95c00074b931',
        auctionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df'
      }
    ];

    bidderRequest = {
      timeout: 3000
    };
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for valid bid request', function () {
      const isValid = spec.isBidRequestValid(bidRequests[0]);
      expect(isValid).to.equal(true);
    });

    it('should return false if missing siteId', function () {
      const bid = Object.assign({}, bidRequests[0]);
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if missing networkId', function () {
      const bid = Object.assign({}, bidRequests[0]);
      delete bid.params.networkId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should create an OpenRTB request with siteId and networkId in imp.ext', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://i.connectad.io/api/v3');

      const data = request.data;
      expect(data.imp).to.be.an('array').that.is.not.empty;
      expect(data.imp[0].ext.siteId).to.equal(123456);
      expect(data.imp[0].ext.networkId).to.equal(123456);
    });

    it('should set bidfloor and bidfloorcur when params are provided without floor module', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = request.data;
      expect(data.imp[0].bidfloor).to.equal(0.50);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should not overwrite bidfloor if floor module provides one', function () {
      const bidWithFloor = Object.assign({}, bidRequests[0]);
      bidWithFloor.getFloor = () => ({ currency: 'EUR', floor: 1.23 });

      const request = spec.buildRequests([bidWithFloor], bidderRequest);
      const data = request.data;
      expect(data.imp[0].bidfloor).to.equal(1.23);
      expect(data.imp[0].bidfloorcur).to.equal('EUR');
    });

    it('should map standard GDPR Consent parameters', function () {
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'test-consent-string'
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('test-consent-string');
    });

    it('should map standard GPP and CCPA parameters', function () {
      bidderRequest.uspConsent = '1YYN';
      bidderRequest.gppConsent = {
        gppString: 'test-gpp-string',
        applicableSections: [2, 6]
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs.ext.us_privacy).to.equal('1YYN');
      expect(request.data.regs.gpp).to.equal('test-gpp-string');
      expect(request.data.regs.gpp_sid).to.deep.equal([2, 6]);
    });

    it('should copy first bid userIdAsEids into user.ext.eids', function () {
      bidRequests[0].userIdAsEids = [{
        source: 'id5-sync.com',
        uids: [{ id: 'user-123', atype: 1 }]
      }];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user.ext.eids).to.deep.equal(bidRequests[0].userIdAsEids);
    });

    it('should not overwrite existing user.ext.eids from ortb2', function () {
      bidRequests[0].userIdAsEids = [{
        source: 'id5-sync.com',
        uids: [{ id: 'user-123', atype: 1 }]
      }];
      bidderRequest.ortb2 = {
        user: {
          ext: {
            eids: [{
              source: 'publisher-fpd',
              uids: [{ id: 'fpd-456', atype: 3 }]
            }]
          }
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user.ext.eids).to.deep.equal(bidderRequest.ortb2.user.ext.eids);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        id: '1c56ad30b9b8ca8',
        seatbid: [
          {
            bid: [
              {
                id: 'response-id-1',
                impid: '2f95c00074b931',
                price: 2.50,
                adm: '<html>Ad Markup</html>',
                crid: 'creative-1',
                w: 300,
                h: 250,
                ext: {
                  dsa: { dsarequired: 1 }
                },
                cat: ['IAB1-1']
              }
            ],
            seat: 'connectad'
          }
        ],
        cur: 'USD'
      }
    };

    it('should parse standard OpenRTB responses correctly', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].requestId).to.equal('2f95c00074b931');
      expect(bids[0].cpm).to.equal(2.50);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<html>Ad Markup</html>');
      expect(bids[0].creativeId).to.equal('creative-1');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(360);
    });

    it('should map dsa and cat to meta', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids[0].meta.dsa).to.deep.equal({ dsarequired: 1 });
      expect(bids[0].meta.primaryCatId).to.equal('IAB1-1');
    });

    it('should parse audio responses correctly', function () {
      const globalFeatures = window.FEATURES || {};
      if (!globalFeatures.AUDIO) {
        this.skip();
      }

      const audioBidRequests = [
        {
          bidder: 'connectad',
          params: {
            siteId: 123456,
            networkId: 123456
          },
          adUnitCode: '/19968336/audio-bid-tag',
          mediaTypes: {
            audio: {
              context: 'instream'
            }
          },
          bidId: '3g95c00074b932',
          auctionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df',
          bidderRequestId: '1c56ad30b9b8ca8',
          transactionId: 'e76cbb58-f3e1-4ad9-9f4c-718c1919d0df'
        }
      ];
      const audioServerResponse = {
        body: {
          id: '1c56ad30b9b8ca8',
          seatbid: [
            {
              bid: [
                {
                  id: 'response-id-2',
                  impid: '3g95c00074b932',
                  price: 3.50,
                  adm: '<VAST>Audio VAST XML</VAST>',
                  crid: 'creative-2',
                  ext: {
                    dsa: { dsarequired: 1 }
                  }
                }
              ],
              seat: 'connectad'
            }
          ],
          cur: 'USD'
        }
      };

      const request = spec.buildRequests(audioBidRequests, bidderRequest);
      const bids = spec.interpretResponse(audioServerResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].requestId).to.equal('3g95c00074b932');
      expect(bids[0].cpm).to.equal(3.50);
      expect(bids[0].mediaType).to.equal('audio');
      expect(bids[0].vastXml).to.equal('<VAST>Audio VAST XML</VAST>');
    });

    it('should fallback to adid or id for creativeId if crid is missing', function () {
      const responseWithAdid = {
        body: {
          id: '1c56ad30b9b8ca8',
          seatbid: [
            {
              bid: [
                {
                  id: 'response-id-3',
                  impid: '2f95c00074b931',
                  price: 2.50,
                  adm: '<html>Ad Markup</html>',
                  adid: 'creative-adid-3',
                  w: 300,
                  h: 250
                }
              ],
              seat: 'connectad'
            }
          ],
          cur: 'USD'
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(responseWithAdid, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].creativeId).to.equal('creative-adid-3');
    });

    it('should split/expand bids when impid is returned as an array of IDs', function () {
      const multiBidRequests = [
        {
          bidder: 'connectad',
          params: { siteId: 123456, networkId: 123456 },
          adUnitCode: 'slot-A',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          bidId: 'imp-A'
        },
        {
          bidder: 'connectad',
          params: { siteId: 123456, networkId: 123456 },
          adUnitCode: 'slot-B',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          bidId: 'imp-B'
        }
      ];

      const responseWithArrayImpid = {
        body: {
          id: '1c56ad30b9b8ca8',
          seatbid: [
            {
              bid: [
                {
                  id: 'response-id-multi',
                  impid: ['imp-A', 'imp-B'],
                  price: 2.50,
                  adm: '<html>Ad Markup</html>',
                  crid: 'creative-multi',
                  w: 300,
                  h: 250
                }
              ],
              seat: 'connectad'
            }
          ],
          cur: 'USD'
        }
      };

      const request = spec.buildRequests(multiBidRequests, bidderRequest);
      const bids = spec.interpretResponse(responseWithArrayImpid, request);

      expect(bids).to.be.an('array').with.lengthOf(2);
      expect(bids[0].requestId).to.equal('imp-A');
      expect(bids[0].creativeId).to.equal('creative-multi');
      expect(bids[1].requestId).to.equal('imp-B');
      expect(bids[1].creativeId).to.equal('creative-multi');
    });

    it('should handle empty responses gracefully', function () {
      const bids = spec.interpretResponse({}, {});
      expect(bids).to.be.an('array').that.is.empty;

      const bids2 = spec.interpretResponse({ body: { seatbid: [] } }, {});
      expect(bids2).to.be.an('array').that.is.empty;
    });

    it('should parse flat array responses correctly', function () {
      const flatServerResponse = {
        body: [
          {
            id: 'response-id-flat',
            impid: '2f95c00074b931',
            price: 2.50,
            adm: '<html>Ad Markup</html>',
            crid: 'creative-flat',
            w: 300,
            h: 250
          }
        ]
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(flatServerResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].requestId).to.equal('2f95c00074b931');
      expect(bids[0].cpm).to.equal(2.50);
      expect(bids[0].ad).to.equal('<html>Ad Markup</html>');
    });

    it('should install an outstream renderer for video bids with outstream context', function () {
      const videoBidRequests = [{
        bidder: 'connectad',
        params: { siteId: 123456, networkId: 123456 },
        adUnitCode: 'video-slot',
        mediaTypes: { video: { context: 'outstream', playerSize: [640, 480] } },
        bidId: 'video-imp'
      }];
      const videoServerResponse = {
        body: {
          id: 'video-auction',
          seatbid: [{
            bid: [{
              id: 'bid-video',
              impid: 'video-imp',
              price: 7.65,
              adm: '<VAST></VAST>',
              crid: 'creative-video',
              mtype: 2
            }]
          }]
        }
      };
      const request = spec.buildRequests(videoBidRequests, bidderRequest);
      const bids = spec.interpretResponse(videoServerResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].renderer).to.exist;
    });

    it('should parse native responses correctly, unwrapping "native" property and aligning asset IDs', function () {
      const nativeBidRequests = [{
        bidder: 'connectad',
        params: { siteId: 123456, networkId: 123456 },
        adUnitCode: 'native-slot',
        mediaTypes: {
          native: {
            title: { required: true, len: 80 },
            image: { required: true, sizes: [150, 50] }
          }
        },
        bidId: 'native-imp',
        nativeOrtbRequest: {
          assets: [
            { id: 10, title: { len: 80 } },
            { id: 11, img: { type: 3, w: 150, h: 50 } }
          ]
        }
      }];

      const nativeServerResponse = {
        body: {
          id: 'native-auction',
          seatbid: [{
            bid: [{
              id: 'bid-native',
              impid: 'native-imp',
              price: 5.50,
              adm: JSON.stringify({
                native: {
                  assets: [
                    { id: 0, title: { text: 'Test Native Ad' } },
                    { id: 1, img: { url: 'https://example.com/img.jpg', type: 3 } }
                  ],
                  link: { url: 'https://example.com/click' }
                }
              }),
              crid: 'creative-native',
              mtype: 4
            }]
          }]
        }
      };

      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      const bids = spec.interpretResponse(nativeServerResponse, request);

      // Verify unwrapping and alignment on the raw response object
      const parsedAdm = JSON.parse(nativeServerResponse.body.seatbid[0].bid[0].adm);
      expect(parsedAdm.assets).to.exist;
      expect(parsedAdm.assets[0].id).to.equal(10);
      expect(parsedAdm.assets[1].id).to.equal(11);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].mediaType).to.equal('native');
      expect(bids[0].cpm).to.equal(5.50);

      // Only check bids[0].native if NATIVE feature is enabled in this test chunk
      const globalFeatures = window.FEATURES || {};
      if (globalFeatures.NATIVE) {
        expect(bids[0].native).to.exist;
        expect(bids[0].native.ortb).to.exist;
      }
    });
  });

  describe('getUserSyncs', () => {
    const testParams = [
      {
        name: 'iframe/no gdpr or ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?']
        }
      },
      {
        name: 'iframe/gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, { gdprApplies: true, consentString: '234234' }],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?gdpr=1&gdpr_consent=234234&']
        }
      },
      {
        name: 'iframe/ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?us_privacy=YN12&']
        }
      },
      {
        name: 'iframe/ccpa & gdpr',
        arguments: [{ iframeEnabled: true, pixelEnabled: false }, {}, { gdprApplies: true, consentString: '234234' }, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?gdpr=1&gdpr_consent=234234&us_privacy=YN12&']
        }
      },
      {
        name: 'image/ccpa & gdpr',
        arguments: [{ iframeEnabled: false, pixelEnabled: true }, {}, { gdprApplies: true, consentString: '234234' }, 'YN12'],
        expect: {
          type: 'image',
          pixels: ['https://sync.connectad.io/ImageSyncer?gdpr=1&gdpr_consent=234234&us_privacy=YN12&']
        }
      },
      {
        name: 'image/gdpr',
        arguments: [{ iframeEnabled: false, pixelEnabled: true }, {}, { gdprApplies: true, consentString: '234234' }],
        expect: {
          type: 'image',
          pixels: ['https://sync.connectad.io/ImageSyncer?gdpr=1&gdpr_consent=234234&']
        }
      },
      {
        name: 'should prioritize iframe over image for user sync',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://sync.connectad.io/iFrameSyncer?']
        }
      }
    ];

    for (let i = 0; i < testParams.length; i++) {
      const currParams = testParams[i];
      it(currParams.name, function () {
        const result = spec.getUserSyncs.apply(this, currParams.arguments);
        expect(result).to.have.lengthOf(currParams.expect.pixels.length);
        for (let ix = 0; ix < currParams.expect.pixels.length; ix++) {
          expect(result[ix].url).to.equal(currParams.expect.pixels[ix]);
          expect(result[ix].type).to.equal(currParams.expect.type);
        }
      });
    }
  });

  describe('nurl / billing is server-side only', function () {
    // ConnectAd bakes the billing pixel (nurl) into the creative (adm) on the server.
    // The client adapter must therefore NOT do any custom nurl handling.
    it('should not register an onBidWon handler (no client-side win pixel)', function () {
      expect(spec.onBidWon).to.equal(undefined);
    });

    it('should render the server creative verbatim and never set bidResponse.nurl (banner)', function () {
      // Mirrors the real ConnectAd server: the nurl/billing pixel is baked into the
      // banner adm; there is NO separate bid.nurl field for banner.
      const admWithBakedNurl =
        '<div>Ad</div><img src="https://i.connectad.io/nurls/abc?p=${AUCTION_PRICE}" style="display:none">';
      const serverResponse = {
        body: {
          id: '1c56ad30b9b8ca8',
          seatbid: [{
            bid: [{
              id: 'response-id-nurl',
              impid: '2f95c00074b931',
              price: 2.50,
              adm: admWithBakedNurl,
              crid: 'creative-nurl',
              w: 300,
              h: 250,
              mtype: 1
            }],
            seat: 'connectad'
          }],
          cur: 'USD'
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      // Creative is passed through untouched: the baked-in nurl pixel survives and the
      // ${AUCTION_PRICE} macro is NOT resolved client-side by the adapter.
      expect(bids[0].ad).to.equal(admWithBakedNurl);
      // Adapter must not expose a separate nurl on the prebid bid response.
      expect(bids[0].nurl).to.equal(undefined);
    });
  });
});
