import { expect } from 'chai';
import { bidderSpec as adapterSpec } from 'modules/condorxBidAdapter.js';
import * as utils from 'src/utils.js';

describe('CondorX Bid Adapter Tests', function () {
  let basicBidRequests;
  let nativeBidData;
  const defaultRequestParams = {
    widget: 274572,
    website: 195491,
    url: 'current url'
  };

  beforeEach(function () {
    basicBidRequests = [
      {
        bidder: 'condorx',
        params: defaultRequestParams
      }
    ];

    nativeBidData = [
      {
        bidder: 'condorx',
        params: defaultRequestParams,
        nativeParams: {
          title: {
            required: true,
            len: 100
          },
          image: {
            required: true,
            sizes: [100, 100]
          },
          sponsoredBy: {
            required: true
          }
        }
      }
    ];
  });

  describe('Bid Size Validation', function () {
    const bid = {
      bidder: 'condorx',
      params: defaultRequestParams
    };

    it('should accept 300x250 size', function () {
      bid.sizes = [[300, 250]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('should accept 100x100 size', function () {
      bid.sizes = [[100, 100]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('should accept 600x600 size', function () {
      bid.sizes = [[600, 600]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
  });

  describe('Bid Request Validation', function () {
    it('should validate a correct bid request', function () {
      const validBid = {
        bidder: 'condorx',
        params: defaultRequestParams,
        sizes: [[300, 250]]
      };
      const isValid = adapterSpec.isBidRequestValid(validBid);
      expect(isValid).to.be.true;
    });

    it('should invalidate an empty params bid request', function () {
      const invalidBid = {
        bidder: 'condorx',
        params: {}
      };
      const isValid = adapterSpec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    });

    it('should invalidate a bid request with invalid parameters', function () {
      const invalidBid = {
        bidder: 'condorx',
        params: {
          widget: '55765a', // Invalid value for widget
          website: 195491,
          url: 'current url'
        },
        sizes: [[300, 250]]
      };
      const isValid = adapterSpec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    });
  });

  describe('Request Building and HTTP Calls', function () {
    it('should verify the API HTTP method', function () {
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      expect(request.url).to.include('https://api.condorx.io/cxb/get.json');
      expect(request.method).to.equal('GET');
    });

    it('should not mutate the original bid object', function () {
      const originalBidRequests = utils.deepClone(basicBidRequests);
      const request = adapterSpec.buildRequests(basicBidRequests);
      expect(basicBidRequests).to.deep.equal(originalBidRequests);
    });

    it('should maintain the integrity of the native bid object', function () {
      const originalBidRequests = utils.deepClone(nativeBidData);
      const request = adapterSpec.buildRequests(nativeBidData);
      expect(nativeBidData).to.deep.equal(originalBidRequests);
    });

    it('should correctly extract and validate request parameters', function () {
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const urlParams = new URL(request.url).searchParams;
      expect(parseInt(urlParams.get('wg'))).to.exist.and.to.equal(basicBidRequests[0].params.widget);
      expect(parseInt(urlParams.get('w'))).to.exist.and.to.equal(basicBidRequests[0].params.website);
    });

    it('should validate the custom URL parameter', function () {
      const customUrl = 'https://i.am.url';
      basicBidRequests[0].params.url = customUrl;
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('u')).to.exist.and.to.equal(customUrl);
    });
  });

  describe('Response Validation', function () {
    let nativeResponseData;
    let bannerResponseData;

    beforeEach(() => {
      const baseResponse = {
        tiles: [
          {
            postId: '12345',
            imageUrl: 'https://cdn.condorx.io/img/condorx_logo_500.jpg',
            domain: 'condorx.test',
            title: 'Test title',
            clickUrl: '//click.test',
            pecpm: 0.5,
            url: '//url.test',
            displayName: 'Test sponsoredBy',
            trackers: {
              impressionPixels: ['//impression.test'],
              viewPixels: ['//view.test'],
            }
          }
        ],
        imageWidth: 300,
        imageHeight: 250,
        ireqId: 'condorx121212',
        widgetViewPixel: '//view.pixel',
      };

      nativeResponseData = {
        ...baseResponse,
        pbtypeId: 1,
      };

      bannerResponseData = {
        ...baseResponse,
        pbtypeId: 2,
        widget: {
          config: '{"css":".__condorx_banner_title{display:block!important;}"}'
        },
      };
    });

    it('should return an empty array for missing response', function () {
      const result = adapterSpec.interpretResponse({}, []);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return an empty array for no bids', function () {
      const noBidsResponse = {
        tiles: [],
        imageWidth: 300,
        imageHeight: 250,
        ireqId: 'condorx121212',
        pbtypeId: 2,
        widgetViewPixel: '//view.pixel',
      };
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const result = adapterSpec.interpretResponse({ body: noBidsResponse }, request);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should correctly interpret a native response', function () {
      const expectedNativeResult = [
        {
          requestId: 'condorx121212',
          cpm: 0.5,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '12345',
          ttl: 360,
          meta: {
            advertiserDomains: ['condorx.test']
          },
          native: {
            title: 'Test title',
            body: '',
            image: {
              url: 'https://cdn.condorx.io/img/condorx_logo_500.jpg',
              width: 300,
              height: 250
            },
            privacyLink: '',
            clickUrl: '//click.test',
            displayUrl: '//url.test',
            cta: '',
            sponsoredBy: 'Test sponsoredBy',
            impressionTrackers: ['//impression.test', '//view.test', '//view.pixel'],
          },
        }
      ];
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const result = adapterSpec.interpretResponse({ body: nativeResponseData }, request);
      expect(result).to.deep.equal(expectedNativeResult);
    });

    it('should correctly interpret a banner response', function () {
      const expectedBannerResult = [
        {
          requestId: 'condorx121212',
          cpm: 0.5,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '12345',
          ttl: 360,
          meta: {
            advertiserDomains: ['condorx.test']
          },
          ad: `<html><body><style>.__condorx_banner_title{display:block!important;}</style><div id="__CONDORX__BANNER"><a href="//click.test" target=_blank><img class="__condorx_banner_image" src="https://cdn.condorx.io/img/condorx_logo_500.jpg" style="width:300px;height:250px;" alt="Test title"/><div class="__condorx_banner_branding" style="display: none">Test sponsoredBy</div><div class="__condorx_banner_title" style="display: none">Test title</div></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//impression.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const result = adapterSpec.interpretResponse({ body: bannerResponseData }, request);
      expect(result).to.deep.equal(expectedBannerResult);
    });
  });
});
