import { expect } from 'chai';
import { spec } from 'modules/mediakeysBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

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

  const bidderRequest = {
    bidderCode: 'mediakeys',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    bidderRequestId: '1c1b642f803242',
    bids: [
      {
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
      },
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

      bidRequests[0].mediaTypes.video = {
        playerSize: [300, 250],
        context: 'outstream'
      }

      bidRequests[0].mediaTypes.native = {
        type: 'image'
      }

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = request.data;

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].video).to.not.exist;
      expect(data.imp[0].native).to.not.exist;
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

      it('should get and set floor by mediatype', function() {
        const bidWithPriceFloors = utils.deepClone(bid);

        bidWithPriceFloors.mediaTypes.video = {
          playerSize: [600, 480]
        };

        bidWithPriceFloors.getFloor = getFloorTest;

        const bidRequests = [bidWithPriceFloors];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = request.data;

        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.equal(1);

        // expect(data.imp[1].video).to.exist;
        // expect(data.imp[1].bidfloor).to.equal(5);
      });

      it('should set properties at payload level from FPD', function() {
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            ortb2: {
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
                gender: 'm'
              },
              device: {
                geo: {
                  country: 'FR',
                  city: 'Marseille'
                }
              }
            }
          };
          return utils.deepAccess(config, key);
        });

        const bidRequests = [utils.deepClone(bid)];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = request.data;
        expect(data.site.domain).to.equal('domain.example');
        expect(data.site.cat[0]).to.equal('IAB12');
        expect(data.site.ext.data.category).to.equal('sport');
        expect(data.user.yob).to.equal(1985);
        expect(data.user.gender).to.equal('m');
        expect(data.device.geo.country).to.equal('FR');
        expect(data.device.geo.city).to.equal('Marseille');
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
      spec.interpretResponse(rawServerResponse, request);
      utilsMock.expects('logError').once();
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

    it('Build video response', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const rawServerResponseVideo = utils.deepClone(rawServerResponse);
      rawServerResponseVideo.body.seatbid[0].bid[0].ext.prebid.type = 'V';
      const response = spec.interpretResponse(rawServerResponseVideo, request);

      expect(response.length).to.equal(1);
      expect(response[0].mediaType).to.equal('video');
      expect(response[0].meta.mediaType).to.equal('video');
    });

    it('Build native response', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const rawServerResponseVideo = utils.deepClone(rawServerResponse);
      rawServerResponseVideo.body.seatbid[0].bid[0].ext.prebid.type = 'N';
      const response = spec.interpretResponse(rawServerResponseVideo, request);

      expect(response.length).to.equal(1);
      expect(response[0].mediaType).to.equal('native');
      expect(response[0].meta.mediaType).to.equal('native');
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
