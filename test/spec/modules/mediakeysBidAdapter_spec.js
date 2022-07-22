import { expect } from 'chai';
import {find} from 'src/polyfill.js';
import { spec } from 'modules/mediakeysBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';
import { OUTSTREAM } from '../../../src/video.js';

describe('mediakeysBidAdapter', function () {
  const adapter = newBidder(spec);
  let utilsMock;
  let sandbox;

  const bid = {
    bidder: 'mediakeys',
    params: {},
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: '47789656-9e5c-4250-b7e0-2ce4cbe71a55',
    sizes: [
      [300, 250],
      [300, 600],
    ],
    bidId: '299320f4de980d',
    bidderRequestId: '1c1b642f803242',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2Imp: {
      ext: { data: { something: 'test' } }
    }
  };

  const bidNative = {
    bidder: 'mediakeys',
    params: {},
    mediaTypes: {
      native: {
        body: {
          required: true
        },
        title: {
          required: true,
          len: 800
        },
        sponsoredBy: {
          required: true
        },
        body2: {
          required: true
        },
        image: {
          required: true,
          sizes: [[300, 250], [300, 600], [100, 150]],
        },
        icon: {
          required: true,
          sizes: [50, 50],
        },
      },
    },
    nativeParams: {
      body: {
        required: true
      },
      title: {
        required: true,
        len: 800
      },
      sponsoredBy: {
        required: true
      },
      body2: {
        required: true
      },
      image: {
        required: true,
        sizes: [[300, 250], [300, 600], [100, 150]],
      },
      icon: {
        required: true,
        sizes: [50, 50],
      },
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: '47789656-9e5c-4250-b7e0-2ce4cbe71a55',
    bidId: '299320f4de980d',
    bidderRequestId: '1c1b642f803242',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2Imp: {
      ext: { data: { something: 'test' } }
    }
  };

  const bidVideo = {
    bidder: 'mediakeys',
    params: {},
    mediaTypes: {
      video: {
        context: OUTSTREAM,
        playerSize: [480, 320]
      }
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: '47789656-9e5c-4250-b7e0-2ce4cbe71a55',
    bidId: '299320f4de980d',
    bidderRequestId: '1c1b642f803242',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2Imp: {
      ext: { data: { something: 'test' } }
    }
  };

  const bidderRequest = {
    bidderCode: 'mediakeys',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    bidderRequestId: '1c1b642f803242',
    bids: [
      bid
    ],
    auctionStart: 1620973766319,
    timeout: 1000,
    refererInfo: {
      referer:
        'https://local.url/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: [
        'https://local.url/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      ],
      canonicalUrl: null,
    },
    start: 1620973766325,
  };

  beforeEach(function () {
    utilsMock = sinon.mock(utils);
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    utilsMock.restore();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should returns true when bid is provided even with empty params', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should returns false when bid is falsy or empty', function () {
      const emptyBid = {};
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid(false)).to.equal(false);
      expect(spec.isBidRequestValid(emptyBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should create imp for supported mediaType only', function() {
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestCopy = utils.deepClone(bidderRequest);
      bidderRequestCopy.bids = bidRequests;

      bidRequests[0].mediaTypes.video = {
        playerSize: [300, 250],
        context: OUTSTREAM
      }

      bidRequests[0].mediaTypes.native = bidNative.mediaTypes.native;
      bidRequests[0].nativeParams = bidNative.mediaTypes.native;

      bidderRequestCopy.bids = bidRequests[0];

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = request.data;

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].video).to.exist;
      expect(data.imp[0].native).to.exist;
    });

    it('should get expected properties with default values (no params set)', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = request.data;

      // openRTB 2.5
      expect(data.at).to.equal(1);
      expect(data.cur[0]).to.equal('USD'); // default currency
      expect(data.source.tid).to.equal(bidderRequest.auctionId);

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
      expect(data.imp[0].banner.w).to.equal(300);
      expect(data.imp[0].banner.h).to.equal(250);
      expect(data.imp[0].banner.format[0].w).to.equal(300);
      expect(data.imp[0].banner.format[0].h).to.equal(250);
      expect(data.imp[0].banner.format[1].w).to.equal(300);
      expect(data.imp[0].banner.format[1].h).to.equal(600);
      expect(data.imp[0].banner.topframe).to.equal(0);
      expect(data.imp[0].banner.pos).to.equal(0);

      // Ortb2Imp ext
      expect(data.imp[0].ext).to.exist;
      expect(data.imp[0].ext.data.something).to.equal('test');
    });

    describe('native imp', function() {
      it('should get a native object in request', function() {
        const bidRequests = [utils.deepClone(bidNative)];
        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native.request.ver).to.equal('1.2');
        expect(data.imp[0].native.request.context).to.equal(1);
        expect(data.imp[0].native.request.plcmttype).to.equal(1);
        expect(data.imp[0].native.request.assets.length).to.equal(6);
        // find the asset body
        const bodyAsset = find(data.imp[0].native.request.assets, asset => asset.id === 6);
        expect(bodyAsset.data.type).to.equal(2);
      });

      it('should get a native object in request with properties filled with params values', function() {
        const bidRequests = [utils.deepClone(bidNative)];
        bidRequests[0].params = {
          native: {
            context: 3,
            plcmttype: 3,
          }
        }
        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native.request.ver).to.equal('1.2');
        expect(data.imp[0].native.request.context).to.equal(3);
        expect(data.imp[0].native.request.plcmttype).to.equal(3);
        expect(data.imp[0].native.request.assets.length).to.equal(6);
      });

      it('should get a native object in request when native type ,image" has been set', function() {
        const bidRequests = [utils.deepClone(bidNative)];
        bidRequests[0].mediaTypes.native = { type: 'image' };
        bidRequests[0].nativeParams = {
          image: { required: true },
          title: { required: true },
          sponsoredBy: { required: true },
          clickUrl: { required: true }, // [1] Will be ignored as it is used in response validation only
          body: { required: false },
          icon: { required: false },
        };

        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native.request.ver).to.equal('1.2');
        expect(data.imp[0].native.request.context).to.equal(1);
        expect(data.imp[0].native.request.plcmttype).to.equal(1);
        expect(data.imp[0].native.request.assets.length).to.equal(5); // [1] clickUrl ignored
      });

      it('should log errors and ignore misformated assets', function() {
        const bidRequests = [utils.deepClone(bidNative)];
        delete bidRequests[0].nativeParams.title.len;
        bidRequests[0].nativeParams.unregistred = {required: true};

        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        utilsMock.expects('logWarn').twice();

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native.request.assets.length).to.equal(5);
      });
    });

    describe('video imp', function() {
      it('should get a video object in request', function() {
        const bidRequests = [utils.deepClone(bidVideo)];
        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].banner).to.not.exist;
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].video.w).to.equal(480);
        expect(data.imp[0].video.h).to.equal(320);
      });

      it('should ignore and warn misformated ORTB video properties', function() {
        const bidRequests = [utils.deepClone(bidVideo)];
        bidRequests[0].mediaTypes.video.unknown = 'foo';
        bidRequests[0].mediaTypes.video.placement = 10;
        bidRequests[0].mediaTypes.video.skipmin = 5;
        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].banner).to.not.exist;
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].video.w).to.equal(480);
        expect(data.imp[0].video.h).to.equal(320);
        expect(data.imp[0].video.skipmin).to.equal(5);
        expect(data.imp[0].video.placement).to.not.exist;
        expect(data.imp[0].video.unknown).to.not.exist;
      });

      it('should merge adUnit mediaTypes level and bidder level params properties ', function() {
        const bidRequests = [utils.deepClone(bidVideo)];
        bidRequests[0].mediaTypes.video.placement = 1;
        bidRequests[0].mediaTypes.video.mimes = ['video/mpeg4'];
        bidRequests[0].mediaTypes.video.protocols = [1];
        bidRequests[0].mediaTypes.video.minduration = 10;
        bidRequests[0].mediaTypes.video.maxduration = 45;
        bidRequests[0].mediaTypes.video.skipmin = 5;
        bidRequests[0].mediaTypes.video.sequence = 3;
        bidRequests[0].mediaTypes.video.linearity = 1;
        bidRequests[0].mediaTypes.video.battr = [12];
        bidRequests[0].mediaTypes.video.maxextended = 10;
        bidRequests[0].mediaTypes.video.minbitrate = 720;
        bidRequests[0].mediaTypes.video.maxbitrate = 720;
        bidRequests[0].mediaTypes.video.boxingallowed = 1;
        bidRequests[0].mediaTypes.video.playbackmethod = [1];
        bidRequests[0].mediaTypes.video.playbackend = 2;
        bidRequests[0].mediaTypes.video.delivery = 2;
        bidRequests[0].mediaTypes.video.pos = 0;
        bidRequests[0].mediaTypes.video.companionad = [{ w: 360, h: 80 }]
        bidRequests[0].mediaTypes.video.api = [1];
        bidRequests[0].mediaTypes.video.companiontype = [1];

        // bidder level
        bidRequests[0].params.video = {
          pos: 2, // override
          skip: 1,
          skipafter: 10,
          startdelay: 3
        };

        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        utilsMock.expects('logWarn').never();

        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        expect(data.imp.length).to.equal(1);
        expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
        expect(data.imp[0].banner).to.not.exist;
        expect(data.imp[0].video).to.exist;

        expect(Object.keys(data.imp[0].video).length).to.equal(23); // 21 ortb params (2 skipped) + computed width/height.
        expect(data.imp[0].video.w).to.equal(480);
        expect(data.imp[0].video.h).to.equal(320);
        expect(data.imp[0].video.mimes[0]).to.equal('video/mpeg4');
        expect(data.imp[0].video.pos).to.equal(2);
        expect(data.imp[0].video.skip).to.equal(1);
        expect(data.imp[0].video.skipafter).to.equal(10);
        expect(data.imp[0].video.startdelay).to.equal(3);
        expect(data.imp[0].video.companionad).to.not.exist;
        expect(data.imp[0].video.companiontype).to.not.exist;
      });

      it('should log warn message when OpenRTB validation fails ', function() {
        const bidRequests = [utils.deepClone(bidVideo)];
        bidRequests[0].mediaTypes.video.placement = 'string';
        bidRequests[0].mediaTypes.video.api = 1;
        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        utilsMock.expects('logWarn').twice();

        spec.buildRequests(bidRequests, bidderRequestCopy);
      });
    });

    it('should get expected properties with values from params', function () {
      const bidRequests = [utils.deepClone(bid)];
      bidRequests[0].params = {
        pos: 2,
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = request.data;
      expect(data.imp[0].banner.pos).to.equal(2);
    });

    it('should get expected properties with schain', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'ssp.test',
            sid: '00001',
            hp: 1,
          },
        ],
      };
      const bidRequests = [utils.deepClone(bid)];
      bidRequests[0].schain = schain;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = request.data;
      expect(data.source.ext.schain).to.equal(schain);
    });

    it('should get expected properties with coppa', function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);

      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = request.data;
      expect(data.regs.coppa).to.equal(1);

      config.getConfig.restore();
    });

    it('should get expected properties with US privacy', function () {
      const consent = 'Y11N';
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestWithUsPrivcay = utils.deepClone(bidderRequest);
      bidderRequestWithUsPrivcay.uspConsent = consent;
      const request = spec.buildRequests(
        bidRequests,
        bidderRequestWithUsPrivcay
      );
      const data = request.data;
      expect(data.regs.ext.us_privacy).to.equal(consent);
    });

    it('should get expected properties with GDPR', function () {
      const consent = {
        consentString: 'kjfdniwjnifwenrif3',
        gdprApplies: true,
      };
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestWithGDPR = utils.deepClone(bidderRequest);
      bidderRequestWithGDPR.gdprConsent = consent;
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      const data = request.data;
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal(consent.consentString);
    });

    describe('PriceFloors module support', function() {
      const getFloorTest = (options) => {
        switch (options.mediaType) {
          case BANNER:
            return { floor: 1, currency: 'USD' }
          case VIDEO:
            return { floor: 5, currency: 'USD' }
          case NATIVE:
            return { floor: 3, currency: 'USD' }
          default:
            return false
        }
      };

      it('should not set `imp[]bidfloor` property when priceFloors module is not available', function () {
        const bidRequests = [bid];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = request.data;
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.not.exist
      });

      it('should not set `imp[]bidfloor` property when priceFloors module returns false', function () {
        const bidWithPriceFloors = utils.deepClone(bid);

        bidWithPriceFloors.getFloor = () => {
          return false;
        };

        const bidRequests = [bidWithPriceFloors];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = request.data;

        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.not.exist;
      });

      it('should get the highest floorPrice found when bid have several mediaTypes', function() {
        const bidWithPriceFloors = utils.deepClone(bid);

        bidWithPriceFloors.mediaTypes.video = {
          playerSize: [600, 480]
        };

        bidWithPriceFloors.mediaTypes.native = {
          body: {
            required: true
          }
        };

        bidWithPriceFloors.nativeParams = {
          body: {
            required: true
          }
        };

        bidWithPriceFloors.getFloor = getFloorTest;

        const bidRequests = [bidWithPriceFloors];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = request.data;

        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].bidfloor).to.equal(5);
      });

      it('should set properties at payload level from FPD', function() {
        const ortb2 = {
          site: {
            domain: 'domain.example',
            cat: ['IAB12'],
            ext: {
              data: {
                category: 'sport',
              }
            }
          },
          user: {
            yob: 1985,
            gender: 'm',
            geo: {
              country: 'FR',
              city: 'Marseille'
            },
            ext: {
              data: {
                registered: true
              }
            }
          }
        };

        const bidRequests = [utils.deepClone(bid)];
        const request = spec.buildRequests(bidRequests, {...bidderRequest, ortb2});
        const data = request.data;
        expect(data.site.domain).to.equal('domain.example');
        expect(data.site.cat[0]).to.equal('IAB12');
        expect(data.site.ext.data.category).to.equal('sport');
        expect(data.user.yob).to.equal(1985);
        expect(data.user.gender).to.equal('m');
        expect(data.user.geo.country).to.equal('FR');
        expect(data.user.geo.city).to.equal('Marseille');
        expect(data.user.ext.data.registered).to.be.true;
      });
    });

    describe('should support userId modules', function() {
      const userId = {
        pubcid: '01EAJWWNEPN3CYMM5N8M5VXY22',
        unsuported: '666'
      };

      it('should send "user.eids" in the request for Prebid.js supported modules only', function() {
        const bidCopy = utils.deepClone(bid);
        bidCopy.userId = userId;

        const bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids[0].userId = userId;

        const bidRequests = [utils.deepClone(bidCopy)];
        const request = spec.buildRequests(bidRequests, bidderRequestCopy);
        const data = request.data;

        const expected = [{
          source: 'pubcid.org',
          uids: [
            {
              atype: 1,
              id: '01EAJWWNEPN3CYMM5N8M5VXY22'
            }
          ]
        }];
        expect(data.user.ext).to.exist;
        expect(data.user.ext.eids).to.have.lengthOf(1);
        expect(data.user.ext.eids).to.deep.equal(expected);
      });
    });
  });

  describe('intrepretResponse', function () {
    const rawServerResponse = {
      body: {
        id: '60839f99-d5f2-3ab3-b6ac-736b4fe9d0ae',
        seatbid: [
          {
            bid: [
              {
                id: '60839f99-d5f2-3ab3-b6ac-736b4fe9d0ae_0_0',
                impid: '1',
                price: 0.4319,
                nurl: 'https://local.url/notif?index=ab-cd-ef&price=${AUCTION_PRICE}',
                burl: 'https://local.url/notif?index=ab-cd-ef&price=${AUCTION_PRICE}',
                adm: '<iframe src="https://local.url"></iframe>',
                adomain: ['domain.io'],
                iurl: 'https://local.url',
                cid: 'string-id',
                crid: 'string-id',
                cat: ['IAB2'],
                attr: [],
                w: 300,
                h: 250,
                ext: {
                  advertiser_name: 'Advertiser',
                  agency_name: 'mediakeys',
                  prebid: {
                    type: 'B'
                  }
                },
              },
            ],
            seat: '337',
          },
        ],
        cur: 'USD',
        ext: { protocol: '5.3' },
      }
    }

    it('Returns empty array if no bid', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const response01 = spec.interpretResponse({ body: { seatbid: [{ bid: [] }] } }, request);
      const response02 = spec.interpretResponse({ body: { seatbid: [] } }, request);
      const response03 = spec.interpretResponse({ body: { seatbid: null } }, request);
      const response04 = spec.interpretResponse({ body: { seatbid: null } }, request);
      const response05 = spec.interpretResponse({ body: {} }, request);
      const response06 = spec.interpretResponse({}, request);

      expect(response01.length).to.equal(0);
      expect(response02.length).to.equal(0);
      expect(response03.length).to.equal(0);
      expect(response04.length).to.equal(0);
      expect(response05.length).to.equal(0);
      expect(response06.length).to.equal(0);
    });

    it('Log an error', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      sinon.stub(utils, 'isArray').throws();
      utilsMock.expects('logError').once();
      spec.interpretResponse(rawServerResponse, request);
      utils.isArray.restore();
    });

    it('Meta Primary category handling', function() {
      const rawServerResponseCopy = utils.deepClone(rawServerResponse);
      const rawServerResponseCopy2 = utils.deepClone(rawServerResponse);
      const rawServerResponseCopy3 = utils.deepClone(rawServerResponse);
      const rawServerResponseCopy4 = utils.deepClone(rawServerResponse);
      const rawServerResponseCopy5 = utils.deepClone(rawServerResponse);
      const rawServerResponseCopy6 = utils.deepClone(rawServerResponse);
      rawServerResponseCopy.body.seatbid[0].bid[0].cat = 'IAB12-1';
      rawServerResponseCopy2.body.seatbid[0].bid[0].cat = ['IAB12', 'IAB12-1'];
      rawServerResponseCopy3.body.seatbid[0].bid[0].cat = '';
      rawServerResponseCopy4.body.seatbid[0].bid[0].cat = [];
      rawServerResponseCopy5.body.seatbid[0].bid[0].cat = 123;
      delete rawServerResponseCopy6.body.seatbid[0].bid[0].cat;

      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const response = spec.interpretResponse(rawServerResponseCopy, request);
      const response2 = spec.interpretResponse(rawServerResponseCopy2, request);
      const response3 = spec.interpretResponse(rawServerResponseCopy3, request);
      const response4 = spec.interpretResponse(rawServerResponseCopy4, request);
      const response5 = spec.interpretResponse(rawServerResponseCopy5, request);
      const response6 = spec.interpretResponse(rawServerResponseCopy6, request);
      expect(response[0].meta.primaryCatId).to.equal('IAB12-1');
      expect(response2[0].meta.primaryCatId).to.equal('IAB12');
      expect(response3[0].meta.primaryCatId).to.not.exist;
      expect(response4[0].meta.primaryCatId).to.not.exist;
      expect(response5[0].meta.primaryCatId).to.not.exist;
      expect(response6[0].meta.primaryCatId).to.not.exist;
    });

    it('Build banner response', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const response = spec.interpretResponse(rawServerResponse, request);

      expect(response.length).to.equal(1);
      expect(response[0].requestId).to.equal(rawServerResponse.body.seatbid[0].bid[0].impid);
      expect(response[0].cpm).to.equal(rawServerResponse.body.seatbid[0].bid[0].price);
      expect(response[0].width).to.equal(rawServerResponse.body.seatbid[0].bid[0].w);
      expect(response[0].height).to.equal(rawServerResponse.body.seatbid[0].bid[0].h);
      expect(response[0].creativeId).to.equal(rawServerResponse.body.seatbid[0].bid[0].crid);
      expect(response[0].dealId).to.equal(null);
      expect(response[0].currency).to.equal(rawServerResponse.body.cur);
      expect(response[0].netRevenue).to.equal(true);
      expect(response[0].ttl).to.equal(360);
      expect(response[0].referrer).to.equal('');
      expect(response[0].ad).to.equal(rawServerResponse.body.seatbid[0].bid[0].adm);
      expect(response[0].mediaType).to.equal('banner');
      expect(response[0].burl).to.equal(rawServerResponse.body.seatbid[0].bid[0].burl);
      expect(response[0].meta).to.deep.equal({
        advertiserDomains: rawServerResponse.body.seatbid[0].bid[0].adomain,
        advertiserName: 'Advertiser',
        agencyName: 'mediakeys',
        primaryCatId: 'IAB2',
        mediaType: 'banner'
      });
    });

    it('interprets video bid response', function () {
      const vastUrl = 'https://url.local?req=content';
      const bidRequests = [utils.deepClone(bidVideo)];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      const rawServerResponseVideo = utils.deepClone(rawServerResponse);
      rawServerResponseVideo.body.seatbid[0].bid[0].ext.prebid.type = 'V';
      rawServerResponseVideo.body.seatbid[0].bid[0].ext.vast_url = vastUrl;

      const response = spec.interpretResponse(rawServerResponseVideo, request);

      expect(response.length).to.equal(1);
      expect(response[0].mediaType).to.equal('video');
      expect(response[0].meta.mediaType).to.equal('video');
      expect(response[0].vastXml).to.not.exist;
      expect(response[0].vastUrl).to.equal(vastUrl + '&no_cache');
      expect(response[0].videoCacheKey).to.equal('no_cache');
    });

    describe('Native response', function () {
      let bidRequests;
      let bidderRequestCopy;
      let request;
      let rawServerResponseNative;
      let nativeObject;

      beforeEach(function() {
        bidRequests = [utils.deepClone(bidNative)];
        bidderRequestCopy = utils.deepClone(bidderRequest);
        bidderRequestCopy.bids = bidRequests;

        request = spec.buildRequests(bidRequests, bidderRequestCopy);

        nativeObject = {
          ver: '1.2',
          privacy: 'https://privacy.me',
          assets: [
            { id: 5, data: { type: 1, value: 'Sponsor Brand' } },
            { id: 6, data: { type: 2, value: 'Brand Body' } },
            { id: 14, data: { type: 10, value: 'Brand Body 2' } },
            { id: 1, title: { text: 'Brand Title' } },
            { id: 2, img: { type: 3, url: 'https://url.com/img.jpg', w: 300, h: 250 } },
            { id: 3, img: { type: 1, url: 'https://url.com/ico.png', w: 50, h: 50 } },
          ],
          link: {
            url: 'https://brand.me',
            clicktrackers: [
              'https://click.me'
            ]
          },
          eventtrackers: [
            { event: 1, method: 1, url: 'https://click.me' },
            { event: 1, method: 2, url: 'https://click-script.me' }
          ]
        };

        rawServerResponseNative = utils.deepClone(rawServerResponse);
        rawServerResponseNative.body.seatbid[0].bid[0].ext.prebid.type = 'N';
        rawServerResponseNative.body.seatbid[0].bid[0].adm = JSON.stringify(nativeObject)
      });

      it('should ignore invalid native response', function() {
        const nativeObjectCopy = utils.deepClone(nativeObject);
        nativeObjectCopy.assets = [];
        const rawServerResponseNativeCopy = utils.deepClone(rawServerResponseNative);
        rawServerResponseNativeCopy.body.seatbid[0].bid[0].adm = JSON.stringify(nativeObjectCopy)
        const response = spec.interpretResponse(rawServerResponseNativeCopy, request);
        expect(response.length).to.equal(1);
        expect(response[0].native).to.not.exist;
      });

      it('should build a classic Prebid.js native object for response', function() {
        const rawServerResponseNativeCopy = utils.deepClone(rawServerResponseNative);
        const response = spec.interpretResponse(rawServerResponseNativeCopy, request);
        expect(response.length).to.equal(1);
        expect(response[0].mediaType).to.equal('native');
        expect(response[0].meta.mediaType).to.equal('native');
        expect(response[0].native).to.exist;
        expect(response[0].native.body).to.exist;
        expect(response[0].native.privacyLink).to.exist;
        expect(response[0].native.body2).to.exist;
        expect(response[0].native.sponsoredBy).to.exist;
        expect(response[0].native.image).to.exist;
        expect(response[0].native.icon).to.exist;
        expect(response[0].native.title).to.exist;
        expect(response[0].native.clickUrl).to.exist;
        expect(response[0].native.clickTrackers).to.exist;
        expect(response[0].native.clickTrackers.length).to.equal(1);
        expect(response[0].native.javascriptTrackers).to.equal('<script src="https://click-script.me"></script>');
        expect(response[0].native.impressionTrackers).to.exist;
        expect(response[0].native.impressionTrackers.length).to.equal(1);
      });

      it('should ignore eventtrackers with a unsupported type', function() {
        const rawServerResponseNativeCopy = utils.deepClone(rawServerResponseNative);
        const nativeObjectCopy = utils.deepClone(nativeObject);
        nativeObjectCopy.eventtrackers[0].event = 2;
        rawServerResponseNativeCopy.body.seatbid[0].bid[0].adm = JSON.stringify(nativeObjectCopy);
        const response = spec.interpretResponse(rawServerResponseNativeCopy, request);
        expect(response[0].native.impressionTrackers).to.exist;
        expect(response[0].native.impressionTrackers.length).to.equal(0);
      })
    });
  });

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain burl', function() {
      const result = spec.onBidWon({});
      expect(result).to.be.undefined;
      expect(utils.triggerPixel.callCount).to.equal(0);
    })

    it('Should trigger pixel if bid.burl exists', function() {
      const result = spec.onBidWon({
        cpm: 4.2,
        burl: 'https://example.com/p=${AUCTION_PRICE}&foo=bar'
      });

      expect(utils.triggerPixel.callCount).to.equal(1)
      expect(utils.triggerPixel.firstCall.args[0]).to.be.equal(
        'https://example.com/p=4.2&foo=bar'
      );
    })
  })
});
