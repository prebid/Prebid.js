import { expect } from 'chai';

import * as utils from 'src/utils.js';
import { config } from 'src/config.js';

import { spec } from 'modules/33acrossBidAdapter.js';

function validateBuiltServerRequest(builtReq, expectedReq) {
  expect(builtReq.url).to.equal(expectedReq.url);
  expect(builtReq.options).to.deep.equal(expectedReq.options);
  expect(JSON.parse(builtReq.data)).to.deep.equal(
    JSON.parse(expectedReq.data)
  )
}

describe('33acrossBidAdapter:', function () {
  const BIDDER_CODE = '33across';
  const SITE_ID = 'sample33xGUID123456789';
  const PRODUCT_ID = 'siab';
  const END_POINT = 'https://ssc.33across.com/api/v1/hb';

  let element, win;
  let bidRequests;
  let sandbox;

  function TtxRequestBuilder() {
    const ttxRequest = {
      imp: [{}],
      site: {
        id: SITE_ID
      },
      id: 'b1',
      regs: {
        ext: {
          gdpr: 0
        }
      },
      ext: {
        ttx: {
          prebidStartedAt: 1,
          caller: [{
            'name': 'prebidjs',
            'version': '$prebid.version$'
          }]
        }
      }
    };

    this.withBanner = () => {
      Object.assign(ttxRequest.imp[0], {
        banner: {
          format: [
            {
              w: 300,
              h: 250
            },
            {
              w: 728,
              h: 90
            }
          ],
          ext: {
            ttx: {
              viewability: {
                amount: 100
              }
            }
          }
        }
      });

      return this;
    };

    this.withBannerSizes = this.withSizes = sizes => {
      Object.assign(ttxRequest.imp[0].banner, { format: sizes });
      return this;
    };

    this.withVideo = (params = {}) => {
      Object.assign(ttxRequest.imp[0], {
        video: {
          w: 300,
          h: 250,
          placement: 2,
          ...params
        }
      });

      return this;
    };

    this.withViewability = (viewability, format = 'banner') => {
      Object.assign(ttxRequest.imp[0][format], {
        ext: {
          ttx: { viewability }
        }
      });
      return this;
    };

    this.withProduct = (prod = PRODUCT_ID) => {
      Object.assign(ttxRequest.imp[0], {
        ext: {
          ttx: {
            prod
          }
        }
      });

      return this;
    };

    this.withGdprConsent = (consent, gdpr) => {
      Object.assign(ttxRequest, {
        user: {
          ext: { consent }
        }
      });
      Object.assign(ttxRequest, {
        regs: {
          ext: Object.assign(
            {},
            ttxRequest.regs.ext,
            { gdpr }
          )
        }
      });
      return this;
    };

    this.withUspConsent = (consent) => {
      Object.assign(ttxRequest, {
        regs: {
          ext: Object.assign(
            {},
            ttxRequest.regs.ext,
            { us_privacy: consent }
          )
        }
      });

      return this;
    };

    this.withSite = site => {
      Object.assign(ttxRequest, { site });
      return this;
    };

    this.withPageUrl = pageUrl => {
      Object.assign(ttxRequest.site, {
        page: pageUrl
      });

      return this;
    };

    this.withSchain = schain => {
      Object.assign(ttxRequest, {
        source: {
          ext: {
            schain
          }
        }
      });

      return this;
    };

    this.withFloors = this.withFormatFloors = (mediaType, floors) => {
      switch (mediaType) {
        case 'banner':
          const format = ttxRequest.imp[0].banner.format.map((fm, i) => {
            return Object.assign(fm, {
              ext: {
                ttx: {
                  bidfloors: [ floors[i] ]
                }
              }
            })
          });

          ttxRequest.imp[0].banner.format = format;
          break;
        case 'video':
          Object.assign(ttxRequest.imp[0].video, {
            ext: {
              ttx: {
                bidfloors: floors
              }
            }
          });
          break;
      }

      return this;
    };

    this.withUserIds = (eids) => {
      Object.assign(ttxRequest, {
        user: {
          ext: {
            eids
          }
        }
      });

      return this;
    }

    this.build = () => ttxRequest;
  }

  function ServerRequestBuilder() {
    const serverRequest = {
      'method': 'POST',
      'url': `${END_POINT}?guid=${SITE_ID}`,
      'data': null,
      'options': {
        'contentType': 'text/plain',
        'withCredentials': true
      }
    };

    this.withData = data => {
      serverRequest['data'] = JSON.stringify(data);
      return this;
    };

    this.withUrl = url => {
      serverRequest['url'] = url;
      return this;
    };

    this.withOptions = options => {
      serverRequest['options'] = options;
      return this;
    };

    this.build = () => serverRequest;
  }

  function BidRequestsBuilder() {
    const bidRequests = [
      {
        bidId: 'b1',
        bidder: '33across',
        bidderRequestId: 'b1a',
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID
        },
        adUnitCode: 'div-id',
        auctionId: 'r1',
        mediaTypes: {},
        transactionId: 't1'
      }
    ];

    this.withBanner = () => {
      bidRequests[0].mediaTypes.banner = {
        sizes: [
          [300, 250],
          [728, 90]
        ]
      };

      return this;
    };

    this.withProduct = (prod) => {
      bidRequests[0].params.productId = prod;

      return this;
    };

    this.withVideo = (params) => {
      bidRequests[0].mediaTypes.video = {
        playerSize: [[300, 250]],
        context: 'outstream',
        ...params
      };

      return this;
    }

    this.withUserIds = (eids) => {
      bidRequests[0].userIdAsEids = eids;

      return this;
    };

    this.build = () => bidRequests;
  }

  beforeEach(function() {
    element = {
      x: 0,
      y: 0,

      width: 0,
      height: 0,

      getBoundingClientRect: () => {
        return {
          width: element.width,
          height: element.height,

          left: element.x,
          top: element.y,
          right: element.x + element.width,
          bottom: element.y + element.height
        };
      }
    };
    win = {
      document: {
        visibilityState: 'visible'
      },

      innerWidth: 800,
      innerHeight: 600
    };

    bidRequests = (
      new BidRequestsBuilder()
        .withBanner()
        .build()
    );

    sandbox = sinon.sandbox.create();
    sandbox.stub(Date, 'now').returns(1);
    sandbox.stub(document, 'getElementById').withArgs('div-id').returns(element);
    sandbox.stub(utils, 'getWindowTop').returns(win);
    sandbox.stub(utils, 'getWindowSelf').returns(win);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('isBidRequestValid:', function() {
    context('basic validation', function() {
      it('returns true for valid guid values', function() {
        // NOTE: We ignore whitespace at the start and end since
        // in our experience these are common typos
        const validGUIDs = [
          `${SITE_ID}`,
          `${SITE_ID} `,
          ` ${SITE_ID}`,
          ` ${SITE_ID} `
        ];

        validGUIDs.forEach((siteId) => {
          const bid = {
            bidder: '33across',
            params: {
              siteId
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.true;
        });
      });

      it('returns false for invalid guid values', function() {
        const invalidGUIDs = [
          undefined,
          'siab'
        ];

        invalidGUIDs.forEach((siteId) => {
          const bid = {
            bidder: '33across',
            params: {
              siteId
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.false;
        });
      });
    });

    context('banner validation', function() {
      it('returns true when banner mediaType does not exist', function() {
        const bid = {
          bidder: '33across',
          params: {
            siteId: 'cxBE0qjUir6iopaKkGJozW'
          }
        };

        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns true when banner sizes are defined', function() {
        const bid = {
          bidder: '33across',
          mediaTypes: {
            banner: {
              sizes: [[250, 300]]
            }
          },
          params: {
            siteId: 'cxBE0qjUir6iopaKkGJozW'
          }
        };

        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns false when banner sizes are invalid', function() {
        const invalidSizes = [
          undefined,
          '16:9',
          300,
          'foo'
        ];

        invalidSizes.forEach((sizes) => {
          const bid = {
            bidder: '33across',
            mediaTypes: {
              banner: {
                sizes
              }
            },
            params: {
              siteId: 'cxBE0qjUir6iopaKkGJozW'
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.false;
        });
      });
    });

    context('video validation', function() {
      beforeEach(function() {
        // Basic Valid BidRequest
        this.bid = {
          bidder: '33across',
          mediaTypes: {
            video: {
              playerSize: [[300, 50]],
              context: 'outstream',
              mimes: ['foo', 'bar'],
              protocols: [1, 2]
            }
          },
          params: {
            siteId: `${SITE_ID}`
          }
        };
      });

      it('returns true when video mediaType does not exist', function() {
        const bid = {
          bidder: '33across',
          params: {
            siteId: `${SITE_ID}`
          }
        };

        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns true when valid video mediaType is defined', function() {
        expect(spec.isBidRequestValid(this.bid)).to.be.true;
      });

      it('returns false when video context is not defined', function() {
        delete this.bid.mediaTypes.video.context;

        expect(spec.isBidRequestValid(this.bid)).to.be.false;
      });

      it('returns false when video playserSize is invalid', function() {
        const invalidSizes = [
          undefined,
          '16:9',
          300,
          'foo'
        ];

        invalidSizes.forEach((playerSize) => {
          this.bid.mediaTypes.video.playerSize = playerSize;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        });
      });

      it('returns false when video mimes is invalid', function() {
        const invalidMimes = [
          undefined,
          'foo',
          1,
          []
        ]

        invalidMimes.forEach((mimes) => {
          this.bid.mediaTypes.video.mimes = mimes;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        })
      });

      it('returns false when video protocols is invalid', function() {
        const invalidMimes = [
          undefined,
          'foo',
          1,
          []
        ]

        invalidMimes.forEach((protocols) => {
          this.bid.mediaTypes.video.protocols = protocols;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        })
      });

      it('returns false when video placement is invalid', function() {
        const invalidPlacement = [
          [],
          '1',
          {},
          'foo'
        ];

        invalidPlacement.forEach((placement) => {
          this.bid.mediaTypes.video.placement = placement;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        });
      });

      it('returns false when video startdelay is invalid for instream context', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'instream', protocols: [1, 2], mimes: ['foo', 'bar']})
            .build()
        );

        const invalidStartdelay = [
          [],
          '1',
          {},
          'foo'
        ];

        invalidStartdelay.forEach((startdelay) => {
          bidRequests[0].mediaTypes.video.startdelay = startdelay;
          expect(spec.isBidRequestValid(bidRequests[0])).to.be.false;
        });
      });

      it('returns true when video startdelay is invalid for outstream context', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'outstream', protocols: [1, 2], mimes: ['foo', 'bar']})
            .build()
        );

        const invalidStartdelay = [
          [],
          '1',
          {},
          'foo'
        ];

        invalidStartdelay.forEach((startdelay) => {
          bidRequests[0].mediaTypes.video.startdelay = startdelay;
          expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
        });
      });
    })
  });

  describe('buildRequests:', function() {
    context('when element is fully in view', function() {
      it('returns 100', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withViewability({amount: 100})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { width: 600, height: 400 });

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when element is out of view', function() {
      it('returns 0', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withViewability({amount: 0})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { x: -300, y: 0, width: 207, height: 320 });

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when element is partially in view', function() {
      it('returns percentage', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withViewability({amount: 75})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { width: 800, height: 800 });

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when width or height of the element is zero', function() {
      it('try to use alternative values', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withSizes([{ w: 800, h: 2400 }])
          .withViewability({amount: 25})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { width: 0, height: 0 });
        bidRequests[0].mediaTypes.banner.sizes = [[800, 2400]];

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when nested iframes', function() {
      it('returns \'nm\'', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withViewability({amount: spec.NON_MEASURABLE})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        utils.getWindowSelf.restore();
        sandbox.stub(utils, 'getWindowTop').returns({});
        sandbox.stub(utils, 'getWindowSelf').returns(win);

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when tab is inactive', function() {
      it('returns 0', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withViewability({amount: 0})
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        win.document.visibilityState = 'hidden';
        sandbox.stub(utils, 'getWindowTop').returns(win);

        const [ buildRequest ] = spec.buildRequests(bidRequests);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when gdpr consent data exists', function() {
      let bidderRequest;

      beforeEach(function() {
        bidderRequest = {
          gdprConsent: {
            consentString: 'foobarMyPreference',
            gdprApplies: true
          }
        }
      });

      it('returns corresponding server requests with gdpr consent data', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withGdprConsent('foobarMyPreference', 1)
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('returns corresponding test server requests with gdpr consent data', function() {
        sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withGdprConsent('foobarMyPreference', 1)
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .withUrl('https://foo.com/hb/')
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when gdpr consent data does not exist', function() {
      let bidderRequest;

      beforeEach(function() {
        bidderRequest = {};
      });

      it('returns corresponding server requests with default gdpr consent data', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('returns corresponding test server requests with default gdpr consent data', function() {
        sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .withUrl('https://foo.com/hb/')
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when us_privacy consent data exists', function() {
      let bidderRequest;

      beforeEach(function() {
        bidderRequest = {
          uspConsent: 'foo'
        }
      });

      it('returns corresponding server requests with us_privacy consent data', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withUspConsent('foo')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('returns corresponding test server requests with us_privacy consent data', function() {
        sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withUspConsent('foo')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .withUrl('https://foo.com/hb/')
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when us_privacy consent data does not exist', function() {
      let bidderRequest;

      beforeEach(function() {
        bidderRequest = {};
      });

      it('returns corresponding server requests with default us_privacy data', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('returns corresponding test server requests with default us_privacy consent data', function() {
        sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .withUrl('https://foo.com/hb/')
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when referer value is available', function() {
      it('returns corresponding server requests with site.page set', function() {
        const bidderRequest = {
          refererInfo: {
            referer: 'http://foo.com/bar'
          }
        };

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withPageUrl('http://foo.com/bar')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when referer value is not available', function() {
      it('returns corresponding server requests without site.page set', function() {
        const bidderRequest = {
          refererInfo: {}
        };

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when there is schain object in the bidRequest', function() {
      it('builds request with schain info in source', function() {
        const schainValues = [
          {
            'ver': '1.0',
            'complete': 1,
            'nodes': [
              {
                'asi': 'bidderA.com',
                'sid': '00001',
                'hp': 1
              }
            ]
          },
          {
            'ver': '1.0',
            'complete': 1,
          },
          {
            'ver': '1.0',
            'complete': 1,
            'nodes': []
          },
          {
            'ver': '1.0',
            'complete': '1',
            'nodes': [
              {
                'asi': 'bidderA.com',
                'sid': '00001',
                'hp': 1
              }
            ]
          }
        ];

        schainValues.forEach((schain) => {
          bidRequests[0].schain = schain;

          const ttxRequest = new TtxRequestBuilder()
            .withBanner()
            .withProduct()
            .withSchain(schain)
            .build();
          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

          validateBuiltServerRequest(builtServerRequest, serverRequest);
        });
      });
    });

    context('when there no schain object is passed', function() {
      it('does not set source field', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when price floor module is not enabled for banner in bidRequest', function() {
      it('does not set any bidfloors in ttxRequest', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when price floor module is enabled for banner in bidRequest', function() {
      it('does not set any bidfloors in ttxRequest if there is no floor', function() {
        bidRequests[0].getFloor = () => ({});

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('sets bidfloors in ttxRequest if there is a floor', function() {
        bidRequests[0].getFloor = ({size, currency, mediaType}) => {
          const floor = (size[0] === 300 && size[1] === 250) ? 1.0 : 0.10
          return (
            {
              floor,
              currency: 'USD'
            }
          );
        };

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withFormatFloors('banner', [ 1.0, 0.10 ])
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when mediaType has video only and context is instream', function() {
      it('builds instream request with default params', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'instream'})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withVideo()
          .withProduct('instream')
          .build();

        ttxRequest.imp[0].video.placement = 1;
        ttxRequest.imp[0].video.startdelay = 0;

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('builds instream request with params passed', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'instream', startdelay: -2})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withVideo({startdelay: -2, placement: 1})
          .withProduct('instream')
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
      });
    });

    context('when mediaType has video only and context is outstream', function() {
      it('builds siab request with video only with default params', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'outstream'})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withVideo()
          .withProduct('siab')
          .build();

        ttxRequest.imp[0].video.placement = 2;

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('builds siab request with video params passed', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'outstream', placement: 3, playbackmethod: [2]})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withVideo({placement: 3, playbackmethod: [2]})
          .withProduct('siab')
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when mediaType has banner only', function() {
      it('builds default siab request', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withBanner()
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct('siab')
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('builds default inview request when product is set as such', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withBanner()
            .withProduct('inview')
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct('inview')
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when mediaType has banner and video', function() {
      it('builds siab request with banner and outstream video', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withBanner()
            .withVideo({context: 'outstream'})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withVideo()
          .withProduct('siab')
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('builds siab request with banner and outstream video even when context is instream', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withBanner()
            .withVideo({context: 'instream'})
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withVideo()
          .withProduct('siab')
          .build();

        ttxRequest.imp[0].video.placement = 2;

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when price floor module is enabled for video in bidRequest', function() {
      it('does not set any bidfloors in video if there is no floor', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'outstream'})
            .build()
        );

        bidRequests[0].getFloor = () => ({});

        const ttxRequest = new TtxRequestBuilder()
          .withVideo()
          .withProduct()
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
      });

      it('sets bidfloors in video if there is a floor', function() {
        const bidRequests = (
          new BidRequestsBuilder()
            .withVideo({context: 'outstream'})
            .build()
        );

        bidRequests[0].getFloor = ({size, currency, mediaType}) => {
          const floor = (mediaType === 'video') ? 1.0 : 0.10
          return (
            {
              floor,
              currency: 'USD'
            }
          );
        };

        const ttxRequest = new TtxRequestBuilder()
          .withVideo()
          .withProduct()
          .withFloors('video', [ 1.0 ])
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
      });
    });

    context('when user ID data exists as userIdAsEids Array in bidRequest', function() {
      it('passes userIds in eids field in ORTB request', function() {
        const eids = [
          {
            'source': 'x-device-vendor-x.com',
            'uids': [
              {
                'id': 'yyy',
                'atype': 1
              },
              {
                'id': 'zzz',
                'atype': 1
              },
              {
                'id': 'DB700403-9A24-4A4B-A8D5-8A0B4BE777D2',
                'atype': 2
              }
            ],
            'ext': {
              'foo': 'bar'
            }
          }
        ];

        const bidRequests = (
          new BidRequestsBuilder()
            .withUserIds(eids)
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withUserIds(eids)
          .withProduct()
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
      });

      it('does not validate eids ORTB', function() {
        const eids = [1, 2, 3];

        const bidRequests = (
          new BidRequestsBuilder()
            .withUserIds(eids)
            .build()
        );

        const ttxRequest = new TtxRequestBuilder()
          .withUserIds(eids)
          .withProduct()
          .build();

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

        expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
      });
    });

    context('when user IDs do not exist under the userIdAsEids field in bidRequest as a non-empty Array', function() {
      it('does not pass user IDs in the bidRequest ORTB', function() {
        const eidsScenarios = [
          'foo',
          [],
          {foo: 1}
        ];

        eidsScenarios.forEach((eids) => {
          const bidRequests = (
            new BidRequestsBuilder()
              .withUserIds(eids)
              .build()
          );
          bidRequests.userId = {
            'vendorx': {
              'source': 'x-device-vendor-x.com',
              'uids': [
                {
                  'id': 'yyy',
                  'atype': 1
                },
                {
                  'id': 'zzz',
                  'atype': 1
                },
                {
                  'id': 'DB700403-9A24-4A4B-A8D5-8A0B4BE777D2',
                  'atype': 2
                }
              ],
              'ext': {
                'foo': 'bar'
              }
            }
          };

          const ttxRequest = new TtxRequestBuilder()
            .withProduct()
            .build();

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, {});

          expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
        });
      });
    });
  });

  describe('interpretResponse', function() {
    let ttxRequest, serverRequest;

    beforeEach(function() {
      ttxRequest = new TtxRequestBuilder()
        .withBanner()
        .withProduct()
        .withSite({
          id: SITE_ID,
          page: 'https://test-url.com'
        })
        .build();
      serverRequest = new ServerRequestBuilder()
        .withUrl('https://staging-ssc.33across.com/api/v1/hb')
        .withData(ttxRequest)
        .withOptions({
          contentType: 'text/plain',
          withCredentials: false
        })
        .build();
    });

    context('when exactly one bid is returned', function() {
      it('interprets and returns the single banner bid response', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [{
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0938
              }]
            }
          ]
        };
        const bidResponse = {
          requestId: 'b1',
          bidderCode: BIDDER_CODE,
          cpm: 0.0938,
          width: 300,
          height: 250,
          ad: '<html><h3>I am an ad</h3></html>',
          ttl: 60,
          creativeId: 1,
          mediaType: 'banner',
          currency: 'USD',
          netRevenue: true
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([bidResponse]);
      });

      it('interprets and returns the single video bid response', function() {
        const videoBid = '<VAST version="3.0"><Ad></Ad></VAST>';
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [{
                id: '1',
                adm: videoBid,
                ext: {
                  ttx: {
                    mediaType: 'video',
                    vastType: 'xml'
                  }
                },
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0938
              }]
            }
          ]
        };
        const bidResponse = {
          requestId: 'b1',
          bidderCode: BIDDER_CODE,
          cpm: 0.0938,
          width: 300,
          height: 250,
          ad: videoBid,
          ttl: 60,
          creativeId: 1,
          mediaType: 'video',
          currency: 'USD',
          netRevenue: true,
          vastXml: videoBid
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([bidResponse]);
      });
    });

    context('when no bids are returned', function() {
      it('interprets and returns empty array', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: []
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([]);
      });
    });

    context('when more than one bids are returned', function() {
      it('interprets and returns the the first bid of the first seatbid', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [{
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0940
              },
              {
                id: '2',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 2,
                h: 250,
                w: 300,
                price: 0.0938
              }
              ]
            },
            {
              bid: [{
                id: '3',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 3,
                h: 250,
                w: 300,
                price: 0.0938
              }]
            }
          ]
        };
        const bidResponse = {
          requestId: 'b1',
          bidderCode: BIDDER_CODE,
          cpm: 0.0940,
          width: 300,
          height: 250,
          ad: '<html><h3>I am an ad</h3></html>',
          ttl: 60,
          creativeId: 1,
          mediaType: 'banner',
          currency: 'USD',
          netRevenue: true
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([bidResponse]);
      });
    });
  });

  describe('getUserSyncs', function() {
    let syncs;

    beforeEach(function() {
      syncs = [
        {
          type: 'iframe',
          url: 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb&id=id1'
        },
        {
          type: 'iframe',
          url: 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb&id=id2'
        },
      ];
      bidRequests = [
        {
          bidId: 'b1',
          bidder: '33across',
          bidderRequestId: 'b1a',
          params: {
            siteId: 'id1',
            productId: 'foo'
          },
          adUnitCode: 'div-id',
          auctionId: 'r1',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          transactionId: 't1'
        },
        {
          bidId: 'b2',
          bidder: '33across',
          bidderRequestId: 'b2a',
          params: {
            siteId: 'id2',
            productId: 'foo'
          },
          adUnitCode: 'div-id',
          auctionId: 'r1',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          transactionId: 't2'
        }
      ];
    });

    context('when iframe is not enabled', function() {
      it('returns empty sync array', function() {
        const syncOptions = {};

        spec.buildRequests(bidRequests);

        expect(spec.getUserSyncs(syncOptions)).to.deep.equal([]);
      });
    });

    context('when iframe is enabled', function() {
      let syncOptions;
      beforeEach(function() {
        syncOptions = {
          iframeEnabled: true
        };
      });

      context('when there is no gdpr consent data', function() {
        it('returns sync urls with undefined consent string as param', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, undefined);
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined`
            }
          ]

          expect(syncResults).to.deep.equal(expectedSyncs);
        })
      });

      context('when gdpr applies but there is no consent string', function() {
        it('returns sync urls with undefined consent string as param and gdpr=1', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: true});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gdpr=1`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gdpr=1`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr applies and there is consent string', function() {
        it('returns sync urls with gdpr_consent=consent string as param and gdpr=1', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: true, consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined&gdpr=1`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined&gdpr=1`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr does not apply and there is no consent string', function() {
        it('returns sync urls with undefined consent string as param and gdpr=0', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: false});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gdpr=0`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gdpr=0`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr is unknown and there is consent string', function() {
        it('returns sync urls with only consent string as param', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr does not apply and there is consent string (yikes!)', function() {
        it('returns sync urls with consent string as param and gdpr=0', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: false, consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined&gdpr=0`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined&gdpr=0`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when there is no usPrivacy data', function() {
        it('returns sync urls with undefined consent string as param', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined`
            }
          ]

          expect(syncResults).to.deep.equal(expectedSyncs);
        })
      });

      context('when there is usPrivacy data', function() {
        it('returns sync urls with consent string as param', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {}, 'foo');
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=foo`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=foo`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when user sync is invoked without a bid request phase', function() {
        it('results in an empty syncs array', function() {
          const syncResults = spec.getUserSyncs(syncOptions, {}, {}, 'foo');

          expect(syncResults).to.deep.equal([]);
        });
      });
    });
  });
});
