import { assert, expect } from 'chai';
import { spec, NATIVE_ASSETS } from 'modules/yandexBidAdapter.js';
import { parseUrl } from 'src/utils.js';
import { BANNER, NATIVE } from '../../../src/mediaTypes';
import {OPENRTB} from '../../../modules/rtbhouseBidAdapter';

describe('Yandex adapter', function () {
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
    const bidderRequest = {
      refererInfo: {
        domain: 'ya.ru',
        ref: 'https://ya.ru/',
        page: 'https://ya.ru/',
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

      const parsedRequestUrl = parseUrl(url);
      const { search: query } = parsedRequestUrl

      expect(parsedRequestUrl.hostname).to.equal('bs.yandex.ru');
      expect(parsedRequestUrl.pathname).to.equal('/prebid/123');

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
    })
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
              w: 300,
              h: 250,
              adomain: [
                'example.com'
              ],
              adid: 'yabs.123=',
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
      expect(rtbBid.cpm).to.be.within(0.1, 0.5);
      expect(rtbBid.ad).to.equal('<!-- HTML/JS -->');
      expect(rtbBid.currency).to.equal('USD');
      expect(rtbBid.netRevenue).to.equal(true);
      expect(rtbBid.ttl).to.equal(180);

      expect(rtbBid.meta.advertiserDomains).to.deep.equal(['example.com']);
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
    adUnitCode: 'adUnit-123',
    ...extra,
  };
}
