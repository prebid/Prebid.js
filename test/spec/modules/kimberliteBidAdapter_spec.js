import { spec } from 'modules/kimberliteBidAdapter.js';
import { assert } from 'chai';
import { BANNER } from '../../../src/mediaTypes.js';

const BIDDER_CODE = 'kimberlite';

describe('kimberliteBidAdapter', function () {
  const sizes = [[640, 480]];

  describe('isBidRequestValid', function () {
    let bidRequest;

    beforeEach(function () {
      bidRequest = {
        mediaTypes: {
          [BANNER]: {
            sizes: [[320, 240]]
          }
        },
        params: {
          placementId: 'test-placement'
        }
      };
    });

    it('pass on valid bidRequest', function () {
      assert.isTrue(spec.isBidRequestValid(bidRequest));
    });

    it('fails on missed placementId', function () {
      delete bidRequest.params.placementId;
      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('fails on empty banner', function () {
      delete bidRequest.mediaTypes.banner;
      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('fails on empty banner.sizes', function () {
      delete bidRequest.mediaTypes.banner.sizes;
      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('fails on empty request', function () {
      assert.isFalse(spec.isBidRequestValid());
    });
  });

  describe('buildRequests', function () {
    let bidRequests, bidderRequest;

    beforeEach(function () {
      bidRequests = [{
        mediaTypes: {
          [BANNER]: {sizes: sizes}
        },
        params: {
          placementId: 'test-placement'
        }
      }];

      bidderRequest = {
        refererInfo: {
          domain: 'example.com',
          page: 'https://www.example.com/test.html',
        },
        bids: [{
          mediaTypes: {
            [BANNER]: {sizes: sizes}
          }
        }]
      };
    });

    it('valid bid request', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      assert.equal(bidRequest.method, 'POST');
      assert.ok(bidRequest.data);

      const requestData = bidRequest.data;
      expect(requestData.site.page).to.equal(bidderRequest.refererInfo.page);
      expect(requestData.site.publisher.domain).to.equal(bidderRequest.refererInfo.domain);

      expect(requestData.imp).to.be.an('array').and.is.not.empty;

      expect(requestData.ext).to.be.an('Object').and.have.all.keys('prebid');
      expect(requestData.ext.prebid).to.be.an('Object').and.have.all.keys('ver', 'adapterVer');

      const impData = requestData.imp[0];
      expect(impData.banner).is.to.be.an('Object').and.have.all.keys(['format', 'topframe']);

      const bannerData = impData.banner;
      expect(bannerData.format).to.be.an('array').and.is.not.empty;

      const formatData = bannerData.format[0];
      expect(formatData).to.be.an('Object').and.have.all.keys('w', 'h');

      assert.equal(formatData.w, sizes[0][0]);
      assert.equal(formatData.h, sizes[0][1]);
    });
  });

  describe('interpretResponse', function () {
    let bidderResponse, bidderRequest, bidRequest, expectedBid;

    const requestId = '07fba8b0-8812-4dc6-b91e-4a525d81729c';
    const bidId = '222209853178';
    const impId = 'imp-id';
    const crId = 'creative-id';
    const adm = '<a href="http://test.landing.com">landing</a>';

    beforeEach(function () {
      bidderResponse = {
        body: {
          id: requestId,
          seatbid: [{
            bid: [{
              crid: crId,
              id: bidId,
              impid: impId,
              price: 1,
              adm: adm
            }]
          }]
        }
      };

      bidderRequest = {
        refererInfo: {
          domain: 'example.com',
          page: 'https://www.example.com/test.html',
        },
        bids: [{
          bidId: impId,
          mediaTypes: {
            [BANNER]: {sizes: sizes}
          },
          params: {
            placementId: 'test-placement'
          }
        }]
      };

      expectedBid = {
        mediaType: 'banner',
        requestId: 'imp-id',
        seatBidId: '222209853178',
        cpm: 1,
        creative_id: 'creative-id',
        creativeId: 'creative-id',
        ttl: 300,
        netRevenue: true,
        ad: adm,
        meta: {}
      };

      bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
    });

    it('pass on valid request', function () {
      const bids = spec.interpretResponse(bidderResponse, bidRequest);
      assert.deepEqual(bids[0], expectedBid);
    });

    it('fails on empty response', function () {
      const bids = spec.interpretResponse({body: ''}, bidRequest);
      assert.empty(bids);
    });
  });
});
