// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import {getStorageManager} from 'src/storageManager.js';
import {spec} from 'modules/defineMediaBidAdapter.js';

describe('Define Media Bid Adapter', function () {
  let serverResponse, bidRequest, bidResponses;
  let bid = {
    'bidder': 'defineMedia',
    'params': {
      'rtbPublisherId': '08159',
      'supplierDomainName': 'definemedia.de',
      'devMode': true
    }
  };

  let validBidRequests = [{
    bidId: 'bidId',
    params: {},
    mediaType: {
      banner: {}
    }
  }];

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when rtbPublisherId is not set', function () {
      delete bid.params.rtbPublisherId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false when supplierDomainName is not set', function () {
      delete bid.params.supplierDomainName;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      let request = spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}});

      assert.equal(request.method, 'POST');
      assert.ok(request.data);
    });

    it('should have default request structure', function () {
      let keys = 'site,cur,imp,regs'.split(',');
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);
      let data = Object.keys(request);

      assert.includeDeepMembers(data, keys);
    });

    it('Verify the site url', function () {
      let siteUrl = 'https://www.yourdomain.tld/your-directory/';
      validBidRequests[0].params.url = siteUrl;
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

      assert.equal(request.site.page, siteUrl);
    });
  });

  /* describe('interpretResponse', function () {
    const goodBannerResponse = {
      body: {
        cur: 'EUR',
        id: 'bidid1',
        seatbid: [
          {
          	seat: 'seedingAlliance',
          	bid: [{
              adm: '<iframe src="https://domain.tld/cds/delivery?wp=0.90"></iframe>',
              impid: 1,
              price: 0.90,
              h: 250,
              w: 300
            }]
          }
        ]
      }
    };

    const badResponse = { body: {
      cur: 'EUR',
      id: 'bidid1',
      seatbid: []
    }};

    const bidBannerRequest = {
      data: {},
      bidRequests: [{bidId: '1', sizes: [300, 250]}]
    };

    it('should return null if body is missing or empty', function () {
      const result = spec.interpretResponse(badResponse, bidBannerRequest);
      assert.equal(result.length, 0);
    });

    it('should return the correct params', function () {
      const resultBanner = spec.interpretResponse(goodBannerResponse, bidBannerRequest);

      assert.deepEqual(resultBanner[0].mediaType, 'banner');
      assert.deepEqual(resultBanner[0].width, bidBannerRequest.bidRequests[0].sizes[0]);
      assert.deepEqual(resultBanner[0].height, bidBannerRequest.bidRequests[0].sizes[1]);
    });

    it('should return the correct banner content', function () {
      const result = spec.interpretResponse(goodBannerResponse, bidBannerRequest);
      const bid = goodBannerResponse.body.seatbid[0].bid[0];
      const regExpContent = new RegExp('<iframe.+?' + bid.price + '.+?</iframe>');

      assert.ok(result[0].ad.search(regExpContent) > -1);
    });
  }); */
});
