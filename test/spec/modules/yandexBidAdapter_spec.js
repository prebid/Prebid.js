import { assert, expect } from 'chai';
import { NATIVE_ASSETS, spec } from 'modules/yandexBidAdapter.js';
import * as utils from 'src/utils.js';
import * as ajax from 'src/ajax.js';
import { config } from 'src/config.js';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import { BANNER, NATIVE } from '../../../src/mediaTypes.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import * as webdriver from '../../../libraries/webdriver/webdriver.js';

const adUnitCode = 'adUnit-123';
let sandbox;

describe('Yandex adapter', function () {
  beforeEach(function () {
    sandbox = sinon.createSandbox();

    config.setConfig({
      yandex: {
        sampling: 1.0,
      },
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = getBidRequest();
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params not found', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false when required params.placementId are not passed', function () {
      const bid = getBidConfig();
      delete bid.params.placementId;

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when required params.placementId are not valid', function () {
      const bid = getBidConfig();
      bid.params.placementId = '123';

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true when passed deprecated placement config', function () {
      const bid = getBidConfig();
      delete bid.params.placementId;

      bid.params.pageId = 123;
      bid.params.impId = 1;

      expect(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    let mockBidRequests;
    let mockBidderRequest;

    beforeEach(function () {
      mockBidRequests = [getBidRequest()];
      mockBidderRequest = {
        ortb2: {
          device: {
            language: 'fr'
          },
          site: {
            ext: {
              data: {
                documentLang: 'en'
              }
            }
          }
        }
      };

      sandbox.stub(frameElement, 'getBoundingClientRect').returns({
        left: 123,
        top: 234,
      });
    });

    afterEach(function () {
      removeElement(adUnitCode);
    });

    it('should set site.content.language from document language if it is not set', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.site.content.language).to.equal('en');
    });

    it('should preserve existing site.content.language if it is set', function () {
      mockBidderRequest.ortb2.site.content = {language: 'es'};
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.site.content.language).to.equal('es');
    });

    it('should do nothing when document language does not exist', function () {
      delete mockBidderRequest.ortb2.site.ext.data.documentLang;
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.site?.content?.language).to.be.undefined;
    });

    it('should return displaymanager', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.imp[0].displaymanager).to.equal('Prebid.js');
      expect(requests[0].data.imp[0].displaymanagerver).to.not.be.undefined;
    });

    it('should return banner coordinates', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.imp[0].ext.coords.x).to.equal(123);
      expect(requests[0].data.imp[0].ext.coords.y).to.equal(234);
    });

    it('should return page scroll coordinates', function () {
      createElementVisible(adUnitCode);
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.device.ext.scroll.top).to.equal(0);
      expect(requests[0].data.device.ext.scroll.left).to.equal(0);
    });

    it('should return correct visible', function () {
      createElementVisible(adUnitCode);
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      expect(requests[0].data.imp[0].ext.isvisible).to.equal(true);
    });

    it('should return correct visible for hidden element', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      createElementHidden(adUnitCode);
      expect(requests[0].data.imp[0].ext.isvisible).to.equal(false);
    });

    it('should return correct visible for invisible element', function () {
      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);
      createElementInvisible(adUnitCode);
      expect(requests[0].data.imp[0].ext.isvisible).to.equal(false);
    });

    /** @type {import('../../../src/auction').BidderRequest} */
    const bidderRequest = {
      ortb2: {
        site: {
          domain: 'ya.ru',
          ref: 'https://ya.ru/',
          page: 'https://ya.ru/',
          publisher: {
            domain: 'ya.ru',
          },
        },
        device: {
          w: 1600,
          h: 900,
          dnt: 0,
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          language: 'en',
          sua: {
            source: 1,
            platform: {
              brand: 'macOS',
            },
            browsers: [
              {
                brand: 'Not_A Brand',
                version: ['8'],
              },
              {
                brand: 'Chromium',
                version: ['120'],
              },
              {
                brand: 'Google Chrome',
                version: ['120'],
              },
            ],
            mobile: 0,
          },
        },
      },
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'concent-string',
        apiVersion: 1,
      },
    };

    it('creates a valid banner request', function () {
      const bannerRequest = getBidRequest();
      bannerRequest.getFloor = () => ({
        currency: 'EUR',
        // floor: 0.5
      });

      const requests = spec.buildRequests([bannerRequest], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request).to.exist;
      const { method, url, data } = request;

      expect(method).to.equal('POST');

      const parsedRequestUrl = utils.parseUrl(url);
      const { search: query } = parsedRequestUrl

      expect(parsedRequestUrl.hostname).to.equal('yandex.ru');
      expect(parsedRequestUrl.pathname).to.equal('/ads/prebid/123');

      expect(query['imp-id']).to.equal('1');
      expect(query['target-ref']).to.equal('ya.ru');
      expect(query['ssp-id']).to.equal('10500');

      expect(query['gdpr']).to.equal('1');
      expect(query['tcf-consent']).to.equal('concent-string');

      expect(request.data).to.exist;
      expect(data.site).to.not.equal(null);
      expect(data.site.page).to.equal('https://ya.ru/');
      expect(data.site.ref).to.equal('https://ya.ru/');
    });

    it('should send currency if defined', function () {
      setCurrencyConfig({
        adServerCurrency: 'USD'
      });

      const bannerRequest = getBidRequest();

      return addFPDToBidderRequest(bidderRequest).then(res => {
        const requests = spec.buildRequests([bannerRequest], res);
        const { url } = requests[0];
        const parsedRequestUrl = utils.parseUrl(url);
        const { search: query } = parsedRequestUrl

        expect(query['ssp-cur']).to.equal('USD');
        setCurrencyConfig({});
      });
    });

    it('should send eids and ortb2 user data if defined', function() {
      const bidderRequestWithUserData = {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          user: {
            data: [
              {
                ext: { segtax: 600, segclass: '1' },
                name: 'example.com',
                segment: [{ id: '243' }],
              },
              {
                ext: { segtax: 600, segclass: '1' },
                name: 'ads.example.org',
                segment: [{ id: '243' }],
              },
            ],
          },
        }
      };
      const bidRequestExtra = {
        userIdAsEids: [{
          source: 'sharedid.org',
          uids: [{ id: '01', atype: 1 }],
        }],
      };

      const expected = {
        ext: {
          eids: bidRequestExtra.userIdAsEids,
        },
        data: bidderRequestWithUserData.ortb2.user.data,
      };

      const bannerRequest = getBidRequest(bidRequestExtra);
      const requests = spec.buildRequests([bannerRequest], bidderRequestWithUserData);

      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request.data).to.exist;
      const { data } = request;

      expect(data.user).to.exist;
      expect(data.user).to.deep.equal(expected);
    });

    it('should send site', function() {
      const expected = {
        site: bidderRequest.ortb2.site
      };

      const requests = spec.buildRequests([getBidRequest()], bidderRequest);

      expect(requests[0].data.site).to.deep.equal(expected.site);
    });

    it('should include webdriver flag when available', function () {
      sandbox.stub(webdriver, 'isWebdriverEnabled').returns(true);

      const requests = spec.buildRequests(mockBidRequests, mockBidderRequest);

      expect(requests[0].data.device.ext.webdriver).to.be.true;
    });

    describe('banner', () => {
      it('should create valid banner object', () => {
        const bannerRequest = getBidRequest({
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600]
              ],
            },
          }
        });

        const requests = spec.buildRequests([bannerRequest], bidderRequest);
        expect(requests[0].data.imp).to.have.lengthOf(1);

        const imp = requests[0].data.imp[0];
        expect(imp.banner).to.not.equal(null);
        expect(imp.banner.w).to.equal(300);
        expect(imp.banner.h).to.equal(250);

        expect(imp.banner.format).to.deep.equal([
          { w: 300, h: 250 },
          { w: 300, h: 600 },
        ]);
      });
    });

    describe('video', function() {
      function getVideoBidRequest(extra) {
        const bannerRequest = getBidRequest(extra);
        const requests = spec.buildRequests([bannerRequest], bidderRequest);

        return requests[0].data.imp[0].video;
      }

      it('should map basic video parameters', function() {
        const bidRequest = getVideoBidRequest({
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mp4'],
              minduration: 5,
              maxduration: 30,
              protocols: [2, 3],
              playbackmethod: [1],
              w: 640,
              h: 480,
              startdelay: 0,
              placement: 1,
              skip: 1,
              skipafter: 5,
              minbitrate: 300,
              maxbitrate: 1500,
              delivery: [2],
              api: [2],
              linearity: 1,
              battr: [1, 2, 3],
              sizes: [[640, 480], [800, 600]]
            }
          }
        });

        expect(bidRequest).to.deep.equal({
          context: 'instream',
          mimes: ['video/mp4'],
          minduration: 5,
          maxduration: 30,
          protocols: [2, 3],
          playbackmethod: [1],
          w: 640,
          h: 480,
          startdelay: 0,
          placement: 1,
          skip: 1,
          skipafter: 5,
          minbitrate: 300,
          maxbitrate: 1500,
          delivery: [2],
          api: [2],
          linearity: 1,
          battr: [1, 2, 3],
          format: [
            {w: 640, h: 480},
            {w: 800, h: 600}
          ]
        });
      });
    });

    describe('native', () => {
      function buildRequestAndGetNativeParams(extra) {
        const bannerRequest = getBidRequest(extra);
        const requests = spec.buildRequests([bannerRequest], bidderRequest);

        return JSON.parse(requests[0].data.imp[0].native.request);
      }

      it('should extract native params', () => {
        const nativeParams = buildRequestAndGetNativeParams({
          mediaTypes: {
            native: {
              title: {
                required: true,
                len: 100,
              },
              body: {
                len: 90
              },
              body2: {
                len: 90
              },
              sponsoredBy: {
                len: 25,
              },
              icon: {
                sizes: [32, 32],
              },
              image: {
                required: true,
                sizes: [300, 250],
              },
            },
          },
        });
        const sortedAssetsList = nativeParams.assets.sort((a, b) => a.id - b.id);

        expect(sortedAssetsList).to.deep.equal([
          {
            id: NATIVE_ASSETS.title[0],
            required: 1,
            title: {
              len: 100,
            }
          },
          {
            id: NATIVE_ASSETS.body[0],
            data: {
              type: NATIVE_ASSETS.body[1],
              len: 90,
            },
          },
          {
            id: NATIVE_ASSETS.body2[0],
            data: {
              type: NATIVE_ASSETS.body2[1],
              len: 90,
            },
          },
          {
            id: NATIVE_ASSETS.sponsoredBy[0],
            data: {
              type: NATIVE_ASSETS.sponsoredBy[1],
              len: 25,
            },
          },
          {
            id: NATIVE_ASSETS.icon[0],
            img: {
              type: NATIVE_ASSETS.icon[1],
              w: 32,
              h: 32,
            },
          },
          {
            id: NATIVE_ASSETS.image[0],
            required: 1,
            img: {
              type: NATIVE_ASSETS.image[1],
              w: 300,
              h: 250,
            },
          },
        ]);
      });

      it('should parse multiple image sizes', () => {
        const nativeParams = buildRequestAndGetNativeParams({
          mediaTypes: {
            native: {
              image: {
                sizes: [[300, 250], [100, 100]],
              },
            },
          },
        });

        expect(nativeParams.assets[0]).to.deep.equal({
          id: NATIVE_ASSETS.image[0],
          img: {
            type: NATIVE_ASSETS.image[1],
            w: 300,
            h: 250,
          },
        });
      });

      it('should parse aspect ratios with min_width', () => {
        const nativeParams = buildRequestAndGetNativeParams({
          mediaTypes: {
            native: {
              image: {
                aspect_ratios: [{
                  min_width: 320,
                  ratio_width: 4,
                  ratio_height: 3,
                }],
              },
            },
          },
        });

        expect(nativeParams.assets[0]).to.deep.equal({
          id: NATIVE_ASSETS.image[0],
          img: {
            type: NATIVE_ASSETS.image[1],
            wmin: 320,
            hmin: 240,
          },
        });
      });

      it('should parse aspect ratios without min_width', () => {
        const nativeParams = buildRequestAndGetNativeParams({
          mediaTypes: {
            native: {
              image: {
                aspect_ratios: [{
                  ratio_width: 4,
                  ratio_height: 3,
                }],
              },
            },
          },
        });

        expect(nativeParams.assets[0]).to.deep.equal({
          id: NATIVE_ASSETS.image[0],
          img: {
            type: NATIVE_ASSETS.image[1],
            wmin: 100,
            hmin: 75,
          },
        });
      });

      it('should include eventtrackers in the native request', () => {
        const nativeParams = buildRequestAndGetNativeParams({
          mediaTypes: {
            native: {
              title: { required: true },
            },
          },
        });

        expect(nativeParams.eventtrackers).to.deep.equal([{ event: 1, methods: [1] }]);
      });
    });
  });

  describe('interpretResponse', function () {
    const bannerRequest = getBidRequest();

    const bannerResponse = {
      body: {
        seatbid: [{
          bid: [
            {
              impid: '1',
              price: 0.3,
              crid: 321,
              adm: '<!-- HTML/JS -->',
              mtype: 1,
              w: 300,
              h: 250,
              adomain: [
                'example.com'
              ],
              adid: 'yabs.123=',
              nurl: 'https://example.com/nurl/?price=${AUCTION_PRICE}&cur=${AUCTION_CURRENCY}',
              lurl: 'https://example.com/nurl/?reason=${AUCTION_LOSS}',
            }
          ]
        }],
        cur: 'USD',
      },
    };

    it('handles banner responses', function () {
      bannerRequest.bidRequest = {
        mediaType: BANNER,
        bidId: 'bidid-1',
      };
      const result = spec.interpretResponse(bannerResponse, bannerRequest);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.exist;

      const rtbBid = result[0];
      expect(rtbBid.width).to.equal(300);
      expect(rtbBid.height).to.equal(250);
      expect(rtbBid.cpm).to.be.within(0.3, 0.3);
      expect(rtbBid.ad).to.equal('<!-- HTML/JS -->');
      expect(rtbBid.currency).to.equal('USD');
      expect(rtbBid.netRevenue).to.equal(true);
      expect(rtbBid.ttl).to.equal(180);
      expect(rtbBid.nurl).to.equal('https://example.com/nurl/?price=0.3&cur=USD');
      expect(rtbBid.lurl).to.exist;

      expect(rtbBid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    describe('video', function() {
      const videoBidRequest = {
        bidRequest: {
          mediaType: 'video',
          bidId: 'videoBid1',
          adUnitCode: 'videoAdUnit'
        }
      };

      const sampleVideoResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'videoBid1',
              price: 1.50,
              adm: '<VAST version="3.0"></VAST>',
              mtype: 2,
              w: 640,
              h: 480,
              adomain: ['advertiser.com'],
              cid: 'campaign123',
              crid: 'creative456',
              nurl: 'https://tracker.example.com/win?price=${AUCTION_PRICE}'
            }]
          }],
          cur: 'USD'
        }
      };

      it('should handle valid video response', function() {
        const result = spec.interpretResponse(sampleVideoResponse, videoBidRequest);

        expect(result).to.have.lengthOf(1);
        const bid = result[0];

        expect(bid).to.deep.include({
          requestId: 'videoBid1',
          cpm: 1.50,
          width: 640,
          height: 480,
          vastXml: '<VAST version="3.0"></VAST>',
          mediaType: 'video',
          currency: 'USD',
          ttl: 180,
          meta: {
            advertiserDomains: ['advertiser.com']
          }
        });

        expect(bid.nurl).to.equal('https://tracker.example.com/win?price=1.5');
      });
    });

    describe('native', () => {
      function getNativeAdmResponse() {
        return {
          native: {
            link: {
              url: 'https://example.com'
            },
            imptrackers: [
              'https://example.com/imptracker'
            ],
            assets: [
              {
                title: {
                  text: 'title text',
                },
                id: NATIVE_ASSETS.title[0],
              },
              {
                data: {
                  value: 'body text'
                },
                id: NATIVE_ASSETS.body[0],
              },
              {
                data: {
                  value: 'sponsoredBy text'
                },
                id: NATIVE_ASSETS.sponsoredBy[0],
              },
              {
                img: {
                  url: 'https://example.com/image',
                  w: 200,
                  h: 150,
                },
                id: NATIVE_ASSETS.image[0],
              },
              {
                img: {
                  url: 'https://example.com/icon',
                  h: 32,
                  w: 32
                },
                id: NATIVE_ASSETS.icon[0],
              },
            ]
          }
        };
      }

      it('handles native responses', function() {
        bannerRequest.bidRequest = {
          mediaType: NATIVE,
          bidId: 'bidid-1',
        };

        const nativeAdmResponce = getNativeAdmResponse();
        const bannerResponse = {
          body: {
            seatbid: [{
              bid: [
                {
                  impid: 1,
                  price: 0.3,
                  adomain: [
                    'example.com'
                  ],
                  adid: 'yabs.123=',
                  adm: JSON.stringify(nativeAdmResponce),
                  mtype: 4,
                },
              ],
            }],
          },
        };

        const result = spec.interpretResponse(bannerResponse, bannerRequest);

        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.exist;

        const bid = result[0];
        expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
        expect(bid.native).to.deep.equal({
          clickUrl: 'https://example.com',
          impressionTrackers: ['https://example.com/imptracker'],
          title: 'title text',
          body: 'body text',
          sponsoredBy: 'sponsoredBy text',
          image: {
            url: 'https://example.com/image',
            width: 200,
            height: 150,
          },
          icon: {
            url: 'https://example.com/icon',
            width: 32,
            height: 32,
          },
        });
      });

      it('should add eventtrackers urls to impressionTrackers', function () {
        bannerRequest.bidRequest = {
          mediaType: NATIVE,
          bidId: 'bidid-1',
        };

        const nativeAdmResponse = getNativeAdmResponse();
        nativeAdmResponse.native.eventtrackers = [
          {
            event: 1, // TRACKER_EVENTS.impression
            method: 1, // TRACKER_METHODS.img
            url: 'https://example.com/imp-event-tracker',
          },
          {
            event: 2,
            method: 2,
            url: 'https://example.com/skip-me',
          },
        ];

        const bannerResponse = {
          body: {
            seatbid: [
              {
                bid: [
                  {
                    impid: 1,
                    price: 0.3,
                    adm: JSON.stringify(nativeAdmResponse),
                    mtype: 4,
                  },
                ],
              },
            ],
          },
        };

        const result = spec.interpretResponse(bannerResponse, bannerRequest);
        const bid = result[0];

        expect(bid.native.impressionTrackers).to.include(
          'https://example.com/imptracker'
        );
        expect(bid.native.impressionTrackers).to.include(
          'https://example.com/imp-event-tracker'
        );
        expect(bid.native.impressionTrackers).to.not.include('https://example.com/skip-me');
      });

      it('should handle missing imptrackers', function () {
        bannerRequest.bidRequest = {
          mediaType: NATIVE,
          bidId: 'bidid-1',
        };

        const nativeAdmResponse = getNativeAdmResponse();
        delete nativeAdmResponse.native.imptrackers;
        nativeAdmResponse.native.eventtrackers = [{
          event: 1,
          method: 1,
          url: 'https://example.com/fallback-tracker'
        }];

        const bannerResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: 1,
                price: 0.3,
                adm: JSON.stringify(nativeAdmResponse),
                mtype: 4,
              }]
            }]
          }
        };

        const result = spec.interpretResponse(bannerResponse, bannerRequest);
        const bid = result[0];

        expect(bid.native.impressionTrackers)
          .to.deep.equal(['https://example.com/fallback-tracker']);
      });

      it('should handle missing eventtrackers', function () {
        bannerRequest.bidRequest = {
          mediaType: NATIVE,
          bidId: 'bidid-1',
        };

        const nativeAdmResponse = getNativeAdmResponse();

        const bannerResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: 1,
                price: 0.3,
                adm: JSON.stringify(nativeAdmResponse),
                mtype: 4,
              }]
            }]
          }
        };

        const result = spec.interpretResponse(bannerResponse, bannerRequest);
        const bid = result[0];

        expect(bid.native.impressionTrackers)
          .to.deep.equal(['https://example.com/imptracker']);
      });
    });
  });

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain nurl', function() {
      spec.onBidWon({});

      expect(utils.triggerPixel.callCount).to.equal(0)
    })

    it('Should trigger pixel if bid has nurl', function() {
      spec.onBidWon({
        nurl: 'https://example.com/some-tracker',
        timeToRespond: 378,
      });

      expect(utils.triggerPixel.callCount).to.equal(1)
      expect(utils.triggerPixel.getCall(0).args[0]).to.equal('https://example.com/some-tracker?rtt=378')
    })

    it('Should trigger pixel if bid has nurl with path & params', function() {
      spec.onBidWon({
        nurl: 'https://example.com/some-tracker/abcdxyz?param1=1&param2=2',
        timeToRespond: 378,
      });

      expect(utils.triggerPixel.callCount).to.equal(1)
      expect(utils.triggerPixel.getCall(0).args[0]).to.equal('https://example.com/some-tracker/abcdxyz?param1=1&param2=2&rtt=378')
    })

    it('Should trigger pixel if bid has nurl with path & params and rtt macros', function() {
      spec.onBidWon({
        nurl: 'https://example.com/some-tracker/abcdxyz?param1=1&param2=2&custom-rtt=${RTT}',
        timeToRespond: 378,
      });

      expect(utils.triggerPixel.callCount).to.equal(1)
      expect(utils.triggerPixel.getCall(0).args[0]).to.equal('https://example.com/some-tracker/abcdxyz?param1=1&param2=2&custom-rtt=378')
    })

    it('Should trigger pixel if bid has nurl and there is no timeToRespond param, but has rtt macros in nurl', function() {
      spec.onBidWon({
        nurl: 'https://example.com/some-tracker/abcdxyz?param1=1&param2=2&custom-rtt=${RTT}',
      });

      expect(utils.triggerPixel.callCount).to.equal(1)
      expect(utils.triggerPixel.getCall(0).args[0]).to.equal('https://example.com/some-tracker/abcdxyz?param1=1&param2=2&custom-rtt=-1')
    })
  });

  describe('onTimeout callback', () => {
    it('will always call server', () => {
      const ajaxStub = sandbox.stub(ajax, 'ajax');
      expect(spec.onTimeout({ forTest: true })).to.not.throw;
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('on onBidderError callback', () => {
    it('will always call server', () => {
      const ajaxStub = sandbox.stub(ajax, 'ajax');
      spec.onBidderError({ forTest: true });
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('on onBidBillable callback', () => {
    it('will always call server', () => {
      const ajaxStub = sandbox.stub(ajax, 'ajax');
      spec.onBidBillable({ forTest: true });
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('on onAdRenderSucceeded callback', () => {
    it('will always call server', () => {
      const ajaxStub = sandbox.stub(ajax, 'ajax');
      spec.onAdRenderSucceeded({ forTest: true });
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });
});

function getBidConfig() {
  return {
    bidder: 'yandex',
    params: {
      placementId: '123-1',
    },
  };
}

function getBidRequest(extra = {}) {
  return {
    ...getBidConfig(),
    bidId: 'bidid-1',
    adUnitCode,
    ...extra,
  };
}

/**
 * Creates a basic div element with specified ID and appends it to document body
 * @param {string} id - The ID to assign to the div element
 * @returns {HTMLDivElement} The created div element
 */
function createElement(id) {
  const div = document.createElement('div');
  div.id = id;
  div.style.width = '50px';
  div.style.height = '50px';
  div.style.background = 'black';

  // Adjust frame dimensions if running within an iframe
  if (frameElement) {
    frameElement.style.width = '100px';
    frameElement.style.height = '100px';
  }

  window.document.body.appendChild(div);

  return div;
}

/**
 * Creates a visible element with mocked bounding client rect for testing
 * @param {string} id - The ID to assign to the div element
 * @returns {HTMLDivElement} The created div with mocked geometry
 */
function createElementVisible(id) {
  const element = createElement(id);
  // Mock client rect to simulate visible position in viewport
  sandbox.stub(element, 'getBoundingClientRect').returns({
    x: 10,
    y: 10,
  });
  return element;
}

/**
 * Creates a completely hidden element (not rendered) using display: none
 * @param {string} id - The ID to assign to the div element
 * @returns {HTMLDivElement} The created hidden div element
 */
function createElementInvisible(id) {
  const element = document.createElement('div');
  element.id = id;
  element.style.display = 'none';

  window.document.body.appendChild(element);
  return element;
}

/**
 * Creates an invisible but space-reserved element using visibility: hidden
 * with mocked bounding client rect for testing
 * @param {string} id - The ID to assign to the div element
 * @returns {HTMLDivElement} The created hidden div with mocked geometry
 */
function createElementHidden(id) {
  const element = createElement(id);
  element.style.visibility = 'hidden';
  // Mock client rect to simulate hidden element's geometry
  sandbox.stub(element, 'getBoundingClientRect').returns({
    x: 100,
    y: 100,
  });
  return element;
}

/**
 * Removes an element from the DOM by its ID if it exists
 * @param {string} id - The ID of the element to remove
 */
function removeElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}
