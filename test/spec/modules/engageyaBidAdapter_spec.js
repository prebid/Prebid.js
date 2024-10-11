import { expect } from 'chai';
import { spec } from 'modules/engageyaBidAdapter.js';
import * as utils from 'src/utils.js';

const ENDPOINT_URL = 'https://recs.engageya.com/rec-api/getrecs.json';

describe('Engageya adapter', function () {
  let bidRequests;
  let nativeBidRequests;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        }
      }
    ]

    nativeBidRequests = [
      {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        },
        nativeParams: {
          title: {
            required: true,
            len: 80
          },
          image: {
            required: true,
            sizes: [150, 50]
          },
          sponsoredBy: {
            required: true
          }
        }
      }
    ]
  })

  describe('isValidSize', function () {
    const bid = {
      bidder: 'engageya',
      params: {
        widgetId: 85610,
        websiteId: 91140,
        pageUrl: '[PAGE_URL]'
      }
    };
    it('Exact match, 236X202', function () {
      bid.sizes = [[236, 202]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Exact match, 300X200', function () {
      bid.sizes = [[300, 200]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Exact match, 600X500', function () {
      bid.sizes = [[600, 500]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('Ratio max limit, 236X212', function () {
      bid.sizes = [[236, 212]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio max limit, 300X209', function () {
      bid.sizes = [[300, 209]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio max limit, 600X524', function () {
      bid.sizes = [[600, 524]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('Ratio & width max limit, 248X222', function () {
      bid.sizes = [[248, 222]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio & width max limit, 315X220', function () {
      bid.sizes = [[315, 220]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio & width max limit, 631X551', function () {
      bid.sizes = [[631, 551]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('Width too big, 320X285', function () {
      bid.sizes = [[320, 285]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });
    it('Width too big, 316X220', function () {
      bid.sizes = [[316, 220]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });
    it('Width too big, 632X551', function () {
      bid.sizes = [[632, 551]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });

    it('Ratio too big, 600X525', function () {
      bid.sizes = [[600, 525]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });

    it('Ratio min limit, 236X192', function () {
      bid.sizes = [[236, 192]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio min limit, 300X190', function () {
      bid.sizes = [[300, 190]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });
    it('Ratio min limit, 600X475', function () {
      bid.sizes = [[600, 475]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.true;
    });

    it('Ratio too small, 600X474', function () {
      bid.sizes = [[600, 474]];
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.be.false;
    });
  })

  describe('isBidRequestValid', function () {
    it('Valid bid case', function () {
      let validBid = {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        },
        sizes: [[300, 250]]
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.be.true;
    });

    it('Invalid bid case: widgetId and websiteId is not passed', function () {
      let validBid = {
        bidder: 'engageya',
        params: {}
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.be.false;
    })

    it('Invalid bid case: widget id must be number', function () {
      let invalidBid = {
        bidder: 'engageya',
        params: {
          widgetId: '157746a',
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        },
        sizes: [[300, 250]]
      }
      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    })

    it('Invalid bid case: unsupported sizes', function () {
      let invalidBid = {
        bidder: 'engageya',
        params: {
          widgetId: '157746a',
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        },
        sizes: [[250, 250]]
      }
      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    })
  })

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.include(ENDPOINT_URL);
      expect(request.method).to.equal('GET');
    });

    it('buildRequests function should not modify original bidRequests object', function () {
      let originalBidRequests = utils.deepClone(bidRequests);
      let request = spec.buildRequests(bidRequests);
      expect(bidRequests).to.deep.equal(originalBidRequests);
    });

    it('buildRequests function should not modify original nativeBidRequests object', function () {
      let originalBidRequests = utils.deepClone(nativeBidRequests);
      let request = spec.buildRequests(nativeBidRequests);
      expect(nativeBidRequests).to.deep.equal(originalBidRequests);
    });

    it('Request params check', function () {
      let request = spec.buildRequests(bidRequests)[0];
      const urlParams = new URL(request.url).searchParams;
      expect(parseInt(urlParams.get('wid'))).to.exist.and.to.equal(bidRequests[0].params.widgetId);
      expect(parseInt(urlParams.get('webid'))).to.exist.and.to.equal(bidRequests[0].params.websiteId);
    });

    it('Request pageUrl - use param', function () {
      const pageUrl = 'https://url.test';
      bidRequests[0].params.pageUrl = pageUrl;
      const request = spec.buildRequests(bidRequests)[0];
      const urlParams = new URL(request.url).searchParams;
      expect(urlParams.get('url')).to.exist.and.to.equal(pageUrl);
    });
  })

  describe('interpretResponse', function () {
    let nativeResponse;
    let bannerResponse;

    beforeEach(() => {
      const recsResponse = {
        recs: [
          {
            ecpm: 9.20,
            pecpm: 0.0520,
            postId: '<!-- CREATIVE ID -->',
            thumbnail_path: 'https://engageya.live/wp-content/uploads/2019/05/images.png',
            domain: 'domain.test',
            title: 'Test title',
            clickUrl: '//click.test',
            url: '//url.test',
            displayName: 'Test displayName',
            trackers: {
              impressionPixels: ['//impression.test'],
              viewPixels: ['//view.test'],
            }
          }
        ],
        imageWidth: 300,
        imageHeight: 250,
        ireqId: '1d236f7890b',
        viewPxl: '//view.pixel',
      };

      nativeResponse = {
        ...recsResponse,
        pbtypeId: 1,
      }

      bannerResponse = {
        ...recsResponse,
        pbtypeId: 2,
        widget: {
          additionalData: '{"css":".eng_tag_ttl{display:block!important}"}'
        },
      }
    })

    it('should return empty array if no response', function () {
      const result = spec.interpretResponse({}, [])
      expect(result).to.be.an('array').that.is.empty
    });

    it('should return empty array if no valid bids', function () {
      let response = {
        recs: [],
        imageWidth: 300,
        imageHeight: 250,
        ireqId: '1d236f7890b',
        pbtypeId: 2,
        viewPxl: '//view.pixel',
      };
      let request = spec.buildRequests(bidRequests)[0];
      const result = spec.interpretResponse({ body: response }, request)
      expect(result).to.be.an('array').that.is.empty
    });

    it('should interpret native response', function () {
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          native: {
            title: 'Test title',
            body: '',
            image: {
              url: 'https://engageya.live/wp-content/uploads/2019/05/images.png',
              width: 300,
              height: 250
            },
            privacyLink: '',
            clickUrl: '//click.test',
            displayUrl: '//url.test',
            cta: '',
            sponsoredBy: 'Test displayName',
            impressionTrackers: ['//impression.test', '//view.test', '//view.pixel'],
          },
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: nativeResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret native response - without pecpm', function () {
      delete nativeResponse.recs[0].pecpm;
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0920,
          width: 300,
          height: 250,
          netRevenue: false,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          native: {
            title: 'Test title',
            body: '',
            image: {
              url: 'https://engageya.live/wp-content/uploads/2019/05/images.png',
              width: 300,
              height: 250
            },
            privacyLink: '',
            clickUrl: '//click.test',
            displayUrl: '//url.test',
            cta: '',
            sponsoredBy: 'Test displayName',
            impressionTrackers: ['//impression.test', '//view.test', '//view.pixel'],
          },
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: nativeResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret native response - without trackers', function () {
      delete nativeResponse.recs[0].trackers;
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          native: {
            title: 'Test title',
            body: '',
            image: {
              url: 'https://engageya.live/wp-content/uploads/2019/05/images.png',
              width: 300,
              height: 250
            },
            privacyLink: '',
            clickUrl: '//click.test',
            displayUrl: '//url.test',
            cta: '',
            sponsoredBy: 'Test displayName',
            impressionTrackers: ['//view.pixel'],
          },
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: nativeResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret display response', function () {
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          ad: `<html><body><style>.eng_tag_ttl{display:block!important}</style><div id="ENG_TAG"><a href="//click.test" target=_blank><img class="eng_tag_img" src="https://engageya.live/wp-content/uploads/2019/05/images.png" style="width:300px;height:250px;" alt="Test title"/><div class="eng_tag_brnd" style="display: none">Test displayName</div><div class="eng_tag_ttl" style="display: none">Test title</div></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//impression.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: bannerResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret display response - without pecpm', function () {
      delete bannerResponse.recs[0].pecpm;
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0920,
          width: 300,
          height: 250,
          netRevenue: false,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          ad: `<html><body><style>.eng_tag_ttl{display:block!important}</style><div id="ENG_TAG"><a href="//click.test" target=_blank><img class="eng_tag_img" src="https://engageya.live/wp-content/uploads/2019/05/images.png" style="width:300px;height:250px;" alt="Test title"/><div class="eng_tag_brnd" style="display: none">Test displayName</div><div class="eng_tag_ttl" style="display: none">Test title</div></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//impression.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: bannerResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret display response - without title', function () {
      bannerResponse.recs[0].title = ' ';
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          ad: `<html><body><style>.eng_tag_ttl{display:block!important}</style><div id="ENG_TAG"><a href="//click.test" target=_blank><img class="eng_tag_img" src="https://engageya.live/wp-content/uploads/2019/05/images.png" style="width:300px;height:250px;" alt=" "/></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//impression.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: bannerResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret display response - without widget additional data', function () {
      bannerResponse.widget.additionalData = null;
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          ad: `<html><body><div id="ENG_TAG"><a href="//click.test" target=_blank><img class="eng_tag_img" src="https://engageya.live/wp-content/uploads/2019/05/images.png" style="width:300px;height:250px;" alt="Test title"/><div class="eng_tag_brnd" style="display: none">Test displayName</div><div class="eng_tag_ttl" style="display: none">Test title</div></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//impression.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.test"></div><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: bannerResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });

    it('should interpret display response - without trackers', function () {
      bannerResponse.recs[0].trackers = null;
      let expectedResult = [
        {
          requestId: '1d236f7890b',
          cpm: 0.0520,
          width: 300,
          height: 250,
          netRevenue: true,
          currency: 'USD',
          creativeId: '<!-- CREATIVE ID -->',
          ttl: 360,
          meta: {
            advertiserDomains: ['domain.test']
          },
          ad: `<html><body><style>.eng_tag_ttl{display:block!important}</style><div id="ENG_TAG"><a href="//click.test" target=_blank><img class="eng_tag_img" src="https://engageya.live/wp-content/uploads/2019/05/images.png" style="width:300px;height:250px;" alt="Test title"/><div class="eng_tag_brnd" style="display: none">Test displayName</div><div class="eng_tag_ttl" style="display: none">Test title</div></a><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="//view.pixel"></div></div></body></html>`,
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({ body: bannerResponse }, request);
      expect(result).to.deep.equal(expectedResult);
    });
  })
})
