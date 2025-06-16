import { expect } from 'chai';
import { bidderSpec as adapterSpec } from 'modules/condorxBidAdapter.js';
import * as utils from 'src/utils.js';

describe('CondorX Bid Adapter Tests', function () {
  let basicBidRequests;
  let nativeBidData;
  let ortbBidRequests;
  const defaultRequestParams = {
    widget: 274572,
    website: 195491,
    url: 'current url'
  };

  beforeEach(function () {
    basicBidRequests = [
      {
        bidder: 'condorx',
        params: defaultRequestParams,
        bidId: 'test-bid-id-1',
        sizes: [[300, 250]]
      }
    ];

    nativeBidData = [
      {
        bidder: 'condorx',
        params: defaultRequestParams,
        bidId: 'test-bid-id-2',
        sizes: [[100, 100]],
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

    ortbBidRequests = [
      {
        bidder: 'condorx',
        params: {
          ...defaultRequestParams,
          useOpenRTB: true
        },
        bidId: 'test-bid-id-3',
        sizes: [[300, 250]]
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

    it('should accept any valid size', function () {
      bid.sizes = [[728, 90]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('should reject invalid size', function () {
      bid.sizes = [[0, 0]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });

    it('should reject negative size', function () {
      bid.sizes = [[-1, -1]];
      const isValid = adapterSpec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
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

    it('should validate a correct OpenRTB bid request', function () {
      const validOrtbBid = {
        bidder: 'condorx',
        params: {
          ...defaultRequestParams,
          useOpenRTB: true
        },
        sizes: [[300, 250]]
      };
      const isValid = adapterSpec.isBidRequestValid(validOrtbBid);
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
          widget: '55765a',
          website: 195491,
          url: 'current url'
        },
        sizes: [[300, 250]]
      };
      const isValid = adapterSpec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    });
  });

  describe('OpenRTB Format Support', function () {
    let bidderRequest;

    beforeEach(function () {
      bidderRequest = {
        auctionId: 'test-auction-id',
        bids: ortbBidRequests,
        ortb2: {
          site: {
            page: 'https://condorx.io'
          }
        },
        refererInfo: {
          page: 'https://condorx.io'
        }
      };
    });

    it('should build OpenRTB request when useOpenRTB is true', function () {
      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.include('/openrtb.json');
      expect(request.data).to.be.an('object');
    });

    it('should build correct OpenRTB endpoint URL', function () {
      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const expectedBase64 = btoa('195491_274572');
      expect(request.url).to.equal(`https://api.condorx.io/cxb/${expectedBase64}/openrtb.json`);
    });

    it('should include ortbRequest in request object', function () {
      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      expect(request.ortbRequest).to.exist;
      expect(request.ortbRequest).to.be.an('object');
    });

    it('should parse JSON data in OpenRTB request', function () {
      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;
      expect(ortbData).to.have.property('id');
      expect(ortbData).to.have.property('imp');
      expect(ortbData.imp).to.be.an('array');
      expect(ortbData.imp[0]).to.have.property('ext');
      expect(ortbData.imp[0].ext).to.have.property('widget', 274572);
      expect(ortbData.imp[0].ext).to.have.property('website', 195491);
    });

    it('should use legacy format when useOpenRTB is false', function () {
      const request = adapterSpec.buildRequests(basicBidRequests, bidderRequest)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.include('https://api.condorx.io/cxb/get.json');
      expect(request.data).to.equal('');
    });

    it('should return OpenRTB request format when useOpenRTB is true', function () {
      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.include('/openrtb.json');
      expect(request.data).to.be.an('object');
      expect(request.ortbRequest).to.exist;
    });
  });

  describe('First Party Data (ORTB2)', function () {
    let bidderRequest;

    beforeEach(function () {
      bidderRequest = {
        auctionId: 'test-auction-id',
        bids: ortbBidRequests,
        ortb2: {
          site: {
            page: 'https://condorx.io'
          }
        },
        refererInfo: {
          page: 'https://condorx.io'
        }
      };
    });

    it('should pass user data in OpenRTB request', function () {
      bidderRequest.ortb2.user = {
        id: 'user123',
        buyeruid: 'buyer456',
        yob: 1990
      };

      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;

      expect(ortbData.user.id).to.equal('user123');
      expect(ortbData.user.buyeruid).to.equal('buyer456');
      expect(ortbData.user.yob).to.equal(1990);
    });

    it('should pass device data in OpenRTB request', function () {
      bidderRequest.ortb2.device = {
        ua: 'Mozilla/5.0 Test Browser',
        language: 'en-US',
        devicetype: 1,
        make: 'Apple',
        model: 'iPhone'
      };

      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;

      expect(ortbData.device.ua).to.equal('Mozilla/5.0 Test Browser');
      expect(ortbData.device.language).to.equal('en-US');
      expect(ortbData.device.devicetype).to.equal(1);
      expect(ortbData.device.make).to.equal('Apple');
      expect(ortbData.device.model).to.equal('iPhone');
    });

    it('should pass site data in OpenRTB request', function () {
      bidderRequest.ortb2.site = {
        page: 'https://condorx.io/test-page',
        domain: 'condorx.io',
        cat: ['IAB1'],
        keywords: 'test,keywords'
      };

      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;

      expect(ortbData.site.page).to.equal('https://condorx.io/test-page');
      expect(ortbData.site.domain).to.equal('condorx.io');
      expect(ortbData.site.cat).to.deep.equal(['IAB1']);
      expect(ortbData.site.keywords).to.equal('test,keywords');
    });

    it('should pass custom extensions in OpenRTB request', function () {
      bidderRequest.ortb2.ext = {
        pageType: 'article',
        customData: 'test-value'
      };

      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;

      expect(ortbData.ext.pageType).to.equal('article');
      expect(ortbData.ext.customData).to.equal('test-value');
    });

    it('should pass blocked categories and domains', function () {
      bidderRequest.ortb2.bcat = ['IAB25', 'IAB26'];
      bidderRequest.ortb2.badv = ['blocked-advertiser.com'];

      const request = adapterSpec.buildRequests(ortbBidRequests, bidderRequest)[0];
      const ortbData = request.data;

      expect(ortbData.bcat).to.deep.equal(['IAB25', 'IAB26']);
      expect(ortbData.badv).to.deep.equal(['blocked-advertiser.com']);
    });
  });

  describe('Bid Floor Support', function () {
    it('should include bid floor in request URL when provided in params', function () {
      const bidWithFloor = {
        bidder: 'condorx',
        params: {
          ...defaultRequestParams,
          bidfloor: 0.75
        },
        sizes: [[300, 250]]
      };
      const request = adapterSpec.buildRequests([bidWithFloor])[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('bf')).to.equal('0.75');
    });

    it('should include -1 bid floor when no floor is provided', function () {
      const bidWithoutFloor = {
        bidder: 'condorx',
        params: defaultRequestParams,
        sizes: [[300, 250]]
      };
      const request = adapterSpec.buildRequests([bidWithoutFloor])[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('bf')).to.equal('-1');
    });

    it('should prioritize params.bidfloor over getFloor function', function () {
      const bidWithBothFloors = {
        bidder: 'condorx',
        params: {
          ...defaultRequestParams,
          bidfloor: 0.5
        },
        sizes: [[300, 250]],
        getFloor: function() {
          return { floor: 1.25 };
        }
      };
      const request = adapterSpec.buildRequests([bidWithBothFloors])[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('bf')).to.equal('0.5');
    });

    it('should handle getFloor function errors gracefully', function () {
      const bidWithErrorFloor = {
        bidder: 'condorx',
        params: defaultRequestParams,
        sizes: [[300, 250]],
        getFloor: function() {
          throw new Error('Floor error');
        }
      };
      const request = adapterSpec.buildRequests([bidWithErrorFloor])[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('bf')).to.equal('-1');
    });

    it('should handle invalid bidfloor params', function () {
      const bidWithInvalidFloor = {
        bidder: 'condorx',
        params: {
          ...defaultRequestParams,
          bidfloor: 'invalid'
        },
        sizes: [[300, 250]]
      };
      const request = adapterSpec.buildRequests([bidWithInvalidFloor])[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('bf')).to.equal('-1');
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
      const customUrl = 'https://condorx.io/custom-page';
      basicBidRequests[0].params.url = customUrl;
      const request = adapterSpec.buildRequests(basicBidRequests)[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('u')).to.exist.and.to.equal(customUrl);
    });
  });

  describe('Response Validation', function () {
    let nativeResponseData;
    let bannerResponseData;
    let ortbResponseData;

    beforeEach(() => {
      const baseResponse = {
        tiles: [
          {
            postId: '12345',
            imageUrl: 'https://cdn.condorx.io/img/condorx_logo_500.jpg',
            domain: 'condorx.test',
            title: 'Test title',
            clickUrl: '//click.test',
            pcpm: 0.5,
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

      ortbResponseData = {
        id: 'response-123',
        seatbid: [{
          bid: [{
            id: 'bid-123',
            impid: 'condorx121212',
            price: 0.5,
            adm: '<div>Test Banner Ad</div>',
            w: 300,
            h: 250,
            crid: '12345',
            adomain: ['condorx.test']
          }]
        }],
        cur: 'USD'
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
