// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import {getStorageManager} from 'src/storageManager.js';
import {spec} from 'modules/defineMediaBidAdapter.js';

describe('Define Media Bid Adapter', function () {
  const mockValidBidParams = [
    {
      'bidder': 'defineMedia',
      'params': {
        'supplierDomainName': 'definemedia.de',
        'devMode': true
      }
    },
    {
      'bidder': 'defineMedia',
      'mediaTypes': ['banner'],
      'params': {
        'supplierDomainName': 'definemedia.de',
        'devMode': false
      }
    }
  ];

  const mockInvalidBidParams = [
    {
      'bidder': 'defineMedia',
      'params': {}
    }
  ];

  const mockBidRequests =  [{
    bidId: 'bidId',
    params: {
      'supplierDomainName': 'definemedia.de',
      'devMode': false
    },
    mediaType: {
      banner: {}
    }
  }];


  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      for (const bidRequest of mockValidBidParams) {
        assert.isTrue(spec.isBidRequestValid(bidRequest));
      }
    });

    it('should return false when supplierDomainName is not set', function () {
      for (const bidRequest of mockInvalidBidParams) {
        assert.isFalse(spec.isBidRequestValid(bidRequest));
      }
    });
  });


  describe('buildRequests', function () {
    const mockBidderRequest = {
      refererInfo: {
        referer: 'page'
      }
    }


    it('should send request with correct structure', function () {
      let requests = spec.buildRequests(mockBidRequests, mockBidderRequest);

      for (const request of requests) {
        assert.equal(request.method, 'POST');
        assert.ok(request.data);
      }
    });


    it('should have default request structure', function () {
      let keys = 'id,imp,source'.split(',');
      let requests = spec.buildRequests(mockBidRequests, mockBidderRequest);

      for (const request of requests) {
        let data = Object.keys(request.data);
        assert.includeDeepMembers(data, keys);
      }
    });

    it('Verify the site url', function () {
      let siteUrl = 'https://www.yourdomain.tld/your-directory/';
      let bidderRequest = JSON.parse(JSON.stringify(mockBidderRequest));
      let validBidRequests = JSON.parse(JSON.stringify(mockBidRequests));

      for (let req of validBidRequests) {
        req.params.url = siteUrl;
      }

      bidderRequest.refererInfo.referer = siteUrl;
      let requests = spec.buildRequests(validBidRequests, bidderRequest);

      for (const request of requests) {
        console.log(JSON.stringify(request.data, null, 2));
        assert.equal(request.data.site.page, siteUrl);
      }
    });
  });
});

/*describe('interpretResponse', function () {
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

  const badResponse = {
    body: {
      cur: 'EUR',
      id: 'bidid1',
      seatbid: []
    }
  };

  const bidBannerRequest = {
    data: {},
    bidRequests: [{bidId: '1', sizes: [300, 250]}]
  };

  it('should return null if body is missing or empty', function () {
    const result = spec.interpretResponse(badResponse, bidBannerRequest);
    assert.equal(result.length, 0);
  });
});

})
;


/*
describe('interpretResponse', function () {
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
});
})
;*/
