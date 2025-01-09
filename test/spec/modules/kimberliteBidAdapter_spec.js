import { spec, ENDPOINT_URL, expandAuctionMacros } from 'modules/kimberliteBidAdapter.js';
import { assert } from 'chai';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';

const BIDDER_CODE = 'kimberlite';

describe('kimberliteBidAdapter', function () {
  const sizes = [[640, 480]];

  describe('isBidRequestValid', function () {
    let bidRequests;

    beforeEach(function () {
      bidRequests = [
        {
          mediaTypes: {
            [BANNER]: {
              sizes: [[320, 240]]
            }
          },
          params: {
            placementId: 'test-placement'
          }
        },
        {
          mediaTypes: {
            [VIDEO]: {
              mimes: ['video/mp4']
            }
          },
          params: {
            placementId: 'test-placement'
          }
        }
      ];
    });

    it('pass on valid banner bidRequest', function () {
      assert.isTrue(spec.isBidRequestValid(bidRequests[0]));
    });

    it('fails on missed placementId', function () {
      delete bidRequests[0].params.placementId;
      assert.isFalse(spec.isBidRequestValid(bidRequests[0]));
    });

    it('fails on empty banner', function () {
      delete bidRequests[0].mediaTypes.banner;
      assert.isFalse(spec.isBidRequestValid(bidRequests[0]));
    });

    it('fails on empty banner.sizes', function () {
      delete bidRequests[0].mediaTypes.banner.sizes;
      assert.isFalse(spec.isBidRequestValid(bidRequests[0]));
    });

    it('fails on empty request', function () {
      assert.isFalse(spec.isBidRequestValid());
    });

    it('pass on valid video bidRequest', function () {
      assert.isTrue(spec.isBidRequestValid(bidRequests[1]));
    });

    it('fails on missed video.mimes', function () {
      delete bidRequests[1].mediaTypes.video.mimes;
      assert.isFalse(spec.isBidRequestValid(bidRequests[1]));
    });
  });

  describe('buildRequests', function () {
    let bidRequests, bidderRequest;

    beforeEach(function () {
      bidRequests = [
        {
          mediaTypes: {
            [BANNER]: {sizes: sizes}
          },
          params: {
            placementId: 'test-placement'
          }
        },
        {
          mediaTypes: {
            [VIDEO]: {
              mimes: ['video/mp4'],
            }
          },
          params: {
            placementId: 'test-placement'
          }
        }
      ];

      bidderRequest = {
        refererInfo: {
          domain: 'example.com',
          page: 'https://www.example.com/test.html',
        }
      };
    });

    it('valid bid request', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);

      assert.equal(bidRequest.method, 'POST');
      assert.equal(bidRequest.url, ENDPOINT_URL);
      assert.ok(bidRequest.data);

      const requestData = bidRequest.data;
      expect(requestData.site.page).to.equal(bidderRequest.refererInfo.page);
      expect(requestData.site.publisher.domain).to.equal(bidderRequest.refererInfo.domain);

      expect(requestData.imp).to.be.an('array').and.is.not.empty;

      expect(requestData.ext).to.be.an('Object').and.have.all.keys('prebid');
      expect(requestData.ext.prebid).to.be.an('Object').and.have.all.keys('ver', 'adapterVer');

      const impBannerData = requestData.imp[0];
      expect(impBannerData.banner).is.to.be.an('Object').and.have.all.keys(['format', 'topframe']);

      const bannerData = impBannerData.banner;
      expect(bannerData.format).to.be.an('array').and.is.not.empty;

      const formatData = bannerData.format[0];
      expect(formatData).to.be.an('Object').and.have.all.keys('w', 'h');

      assert.equal(formatData.w, sizes[0][0]);
      assert.equal(formatData.h, sizes[0][1]);

      if (FEATURES.VIDEO) {
        const impVideoData = requestData.imp[1];
        expect(impVideoData.video).is.to.be.an('Object').and.have.all.keys(['mimes']);

        const videoData = impVideoData.video;
        expect(videoData.mimes).to.be.an('array').and.is.not.empty;
        expect(videoData.mimes[0]).to.be.a('string').that.equals('video/mp4');
      }
    });
  });

  describe('interpretResponse', function () {
    let bidderResponse, bidderRequest, bidRequest, expectedBids;

    const requestId = '07fba8b0-8812-4dc6-b91e-4a525d81729c';
    const bannerAdm = '<a href="http://test.landing.com?p=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}">landing</a>';
    const videoAdm = '<VAST version="3.0"><Impression>http://video-test.landing.com?p=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}</Impression>test vast</VAST>';
    const nurl = 'http://nurl.landing.com?p=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}';
    const nurlPixel = `<div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${nurl}"></div>`;

    const currencies = [
      undefined,
      'USD'
    ];

    currencies.forEach(function(currency) {
      beforeEach(function () {
        bidderResponse = {
          body: {
            id: requestId,
            seatbid: [{
              bid: [
                {
                  crid: 1,
                  impid: 1,
                  price: 1,
                  adm: bannerAdm,
                  nurl: nurl
                },
                {
                  crid: 2,
                  impid: 2,
                  price: 1,
                  adm: videoAdm
                }
              ]
            }]
          }
        };

        bidderRequest = {
          refererInfo: {
            domain: 'example.com',
            page: 'https://www.example.com/test.html',
          },
          bids: [
            {
              bidId: 1,
              mediaTypes: {
                banner: {sizes: sizes}
              },
              params: {
                placementId: 'test-placement'
              }
            },
            {
              bidId: 2,
              mediaTypes: {
                video: {
                  mimes: ['video/mp4']
                }
              },
              params: {
                placementId: 'test-placement'
              }
            }
          ]
        };

        expectedBids = [
          {
            mediaType: 'banner',
            requestId: 1,
            cpm: 1,
            creative_id: 1,
            creativeId: 1,
            ttl: 300,
            netRevenue: true,
            ad: bannerAdm + nurlPixel,
            meta: {}
          },
          {
            mediaType: 'video',
            requestId: 2,
            cpm: 1,
            creative_id: 2,
            creativeId: 2,
            ttl: 300,
            netRevenue: true,
            vastXml: videoAdm,
            meta: {}
          },
        ];

        if (currency) {
          expectedBids[0].currency = expectedBids[1].currency = bidderResponse.body.cur = currency;
        }

        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      });

      it('pass on valid request', function () {
        const bids = spec.interpretResponse(bidderResponse, bidRequest);
        expectedBids[0].ad = expandAuctionMacros(expectedBids[0].ad, expectedBids[0].cpm, bidderResponse.body.cur);
        assert.deepEqual(bids[0], expectedBids[0]);
        if (FEATURES.VIDEO) {
          expectedBids[1].vastXml =
            expandAuctionMacros(expectedBids[1].vastXml, expectedBids[1].cpm, bidderResponse.body.cur);
          assert.deepEqual(bids[1], expectedBids[1]);
        }
      });

      it('fails on empty response', function () {
        const bids = spec.interpretResponse({body: ''}, bidRequest);
        assert.empty(bids);
      });
    });
  });
});
