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
  const END_POINT = 'https://ssc.33across.com/api/v1/hb';

  let element, win;
  let bidRequests;
  let sandbox;

  function TtxRequestBuilder(siteId = SITE_ID) {
    const ttxRequest = {
      imp: [{
        id: 'b1'
      }],
      site: {
        id: siteId
      },
      device: {
        ext: {
          ttx: {
            w: 1024,
            h: 728,
            pxr: 2,
            vp: {
              w: 800,
              h: 600
            },
            ah: 500,
            mtp: 0
          }
        },
        sua: {
          browsers: [{
            brand: 'Google Chrome',
            version: ['104', '0', '5112', '79']
          }],
          platform: {
            brand: 'macOS',
            version: ['11', '6', '8']
          },
          model: '',
          mobile: 0
        }
      },
      id: 'r1',
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

    this.addImp = (id = 'b2') => {
      ttxRequest.imp.push({ id });

      return this;
    }

    this.withBanner = () => {
      ttxRequest.imp.forEach((imp) => {
        Object.assign(imp, {
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
      });
      return this;
    };

    this.withBannerSizes = this.withSizes = sizes => {
      ttxRequest.imp.forEach((imp) => {
        Object.assign(imp.banner, { format: sizes });
      });

      return this;
    };

    this.withVideo = (params = {}) => {
      ttxRequest.imp.forEach((imp) => {
        Object.assign(imp, {
          video: {
            w: 300,
            h: 250,
            plcmt: 2,
            ...params
          }
        });
      });

      return this;
    };

    this.withViewability = (viewability, format = 'banner') => {
      ttxRequest.imp.forEach((imp) => {
        Object.assign(imp[format], {
          ext: {
            ttx: { viewability }
          }
        });
      });

      return this;
    };

    this.withProduct = (prod = 'siab') => {
      ttxRequest.imp.forEach((imp) => {
        utils.mergeDeep(imp, {
          ext: {
            ttx: {
              prod
            }
          }
        });
      });

      return this;
    };

    this.withGpid = (gpid) => {
      ttxRequest.imp.forEach((imp) => {
        utils.mergeDeep(imp, {
          ext: {
            gpid
          }
        });
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

    this.withCoppa = coppaValue => {
      Object.assign(ttxRequest.regs, {
        coppa: coppaValue
      });

      return this;
    };

    this.withGppConsent = (consentString, applicableSections) => {
      Object.assign(ttxRequest, {
        regs: {
          gpp: consentString,
          gpp_sid: applicableSections,
          ext: Object.assign(
            {},
            ttxRequest.regs.ext
          )
        }
      });

      return this;
    };

    this.withSite = site => {
      Object.assign(ttxRequest, { site });
      return this;
    };

    this.withDevice = (device) => {
      utils.mergeDeep(ttxRequest, { device });

      return this;
    };

    this.withPageUrl = pageUrl => {
      Object.assign(ttxRequest.site, {
        page: pageUrl
      });

      return this;
    };

    this.withReferer = referer => {
      Object.assign(ttxRequest.site, {
        ref: referer
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
          productId: 'siab'
        },
        adUnitCode: 'div-id',
        auctionId: 'r1',
        mediaTypes: {},
        transactionId: 't1',
        ortb2: {
          device: {
            sua: {
              browsers: [{
                brand: 'Google Chrome',
                version: ['104', '0', '5112', '79']
              }],
              platform: {
                brand: 'macOS',
                version: ['11', '6', '8']
              },
              model: '',
              mobile: 0
            }
          }
        }
      }
    ];

    this.addBid = (bidParams = {}) => {
      bidRequests.push({
        bidId: 'b2',
        bidder: '33across',
        bidderRequestId: 'b1b',
        params: {
          siteId: SITE_ID,
          productId: 'siab'
        },
        adUnitCode: 'div-id',
        auctionId: 'r1',
        mediaTypes: {},
        transactionId: 't2',
        ortb2: {
          device: {
            sua: {
              browsers: [{
                brand: 'Google Chrome',
                version: ['104', '0', '5112', '79']
              }],
              platform: {
                brand: 'macOS',
                version: ['11', '6', '8']
              },
              model: '',
              mobile: 0
            }
          }
        },
        ...bidParams
      });

      return this;
    };

    this.withBanner = () => {
      bidRequests.forEach((bid) => {
        bid.mediaTypes.banner = {
          sizes: [
            [300, 250],
            [728, 90]
          ]
        };
      });

      return this;
    };

    this.withProduct = (prod) => {
      bidRequests.forEach((bid) => {
        bid.params.productId = prod;
      });
      return this;
    };

    this.withVideo = (params) => {
      bidRequests.forEach((bid) => {
        bid.mediaTypes.video = {
          playerSize: [[300, 250]],
          context: 'outstream',
          ...params
        };
      });

      return this;
    }

    this.withUserIds = (eids) => {
      bidRequests.forEach((bid) => {
        bid.userIdAsEids = eids;
      });

      return this;
    };

    this.build = () => bidRequests;
  }

  let bidderRequest;

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
      parent: null,
      devicePixelRatio: 2,
      screen: {
        width: 1024,
        height: 728,
        availHeight: 500
      },
      navigator: {
        maxTouchPoints: 0
      },
      document: {
        visibilityState: 'visible',
        documentElement: {
          clientWidth: 800,
          clientHeight: 600
        }
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
    sandbox.stub(document, 'getElementById').returns(element);
    sandbox.stub(utils, 'getWindowTop').returns(win);
    sandbox.stub(utils, 'getWindowSelf').returns(win);
    bidderRequest = {bidderRequestId: 'r1'};
  });

  afterEach(function() {
    sandbox.restore();
  });
  describe('isBidRequestValid:', function() {
    context('basic validation', function() {
      it('returns true for valid bidder name values', function() {
        const validBidderName = [
          '33across',
          '33across_mgni'
        ];

        validBidderName.forEach((bidderName) => {
          const bid = {
            bidder: bidderName,
            params: {
              siteId: 'sample33xGUID123456789'
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.true;
        });
      });

      it('returns false for invalid bidder name values', function() {
        const invalidBidderName = [
          undefined,
          '33',
          '33x',
          'thirtythree',
          ''
        ];

        invalidBidderName.forEach((bidderName) => {
          const bid = {
            bidder: bidderName,
            params: {
              siteId: 'sample33xGUID123456789'
            }
          };

          expect(spec.isBidRequestValid(bid)).to.be.false;
        });
      });

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
          this.bid.mediaTypes.video.plcmt = placement;
          expect(spec.isBidRequestValid(this.bid)).to.be.false;
        });

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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });

      context('when all the wrapping windows are accessible', function() {
        it('returns the viewport dimensions of the top most accessible window', function() {
          const ttxRequest = new TtxRequestBuilder()
            .withBanner()
            .withDevice({
              ext: {
                ttx: {
                  vp: {
                    w: 6789,
                    h: 2345
                  }
                }
              }
            })
            .withProduct()
            .build();
          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();

          sandbox.stub(win, 'parent').value({
            document: {
              documentElement: {
                clientWidth: 1234,
                clientHeight: 4567
              }
            },
            parent: {
              document: {
                documentElement: {
                  clientWidth: 6789,
                  clientHeight: 2345
                }
              },
            }
          });

          const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
          validateBuiltServerRequest(buildRequest, serverRequest);
        });
      });

      context('when one of the wrapping windows cannot be accessed', function() {
        it('returns the viewport dimensions of the top most accessible window', function() {
          const ttxRequest = new TtxRequestBuilder()
            .withBanner()
            .withDevice({
              ext: {
                ttx: {
                  vp: {
                    w: 9876,
                    h: 5432
                  }
                }
              }
            })
            .withProduct()
            .build();
          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();
          const notAccessibleParentWindow = {};

          Object.defineProperty(notAccessibleParentWindow, 'document', {
            get() { throw new Error('fakeError'); }
          });

          sandbox.stub(win, 'parent').value({
            document: {
              documentElement: {
                clientWidth: 1234,
                clientHeight: 4567
              }
            },
            parent: {
              parent: notAccessibleParentWindow,
              document: {
                documentElement: {
                  clientWidth: 9876,
                  clientHeight: 5432
                }
              },
            }
          });

          const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
          validateBuiltServerRequest(buildRequest, serverRequest);
        });
      });
    });

    it('returns the screen dimensions', function() {
      const ttxRequest = new TtxRequestBuilder()
        .withBanner()
        .withDevice({
          ext: {
            ttx: {
              w: 1024,
              h: 728
            }
          }
        })
        .withProduct()
        .build();
      const serverRequest = new ServerRequestBuilder()
        .withData(ttxRequest)
        .build();

      win.screen.width = 1024;
      win.screen.height = 728;

      const [ buildRequest ] = spec.buildRequests(bidRequests, {bidderRequestId: 'r1'});

      validateBuiltServerRequest(buildRequest, serverRequest);
    });

    context('when the window height is greater than the width', function() {
      it('returns the smaller screen dimension as the width', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withDevice({
            ext: {
              ttx: {
                w: 728,
                h: 1024
              }
            }
          })
          .withProduct()
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        win.screen.width = 1024;
        win.screen.height = 728;

        win.innerHeight = 728;
        win.innerWidth = 727;

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ buildRequest ] = spec.buildRequests(bidRequests, bidderRequest);
        validateBuiltServerRequest(buildRequest, serverRequest);
      });
    });

    context('when gdpr consent data exists', function() {
      beforeEach(function() {
        bidderRequest = {
          ...bidderRequest,
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
        sandbox.stub(config, 'getConfig')
          .withArgs('ttxSettings')
          .returns({
            'url': 'https://foo.com/hb/'
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
        sandbox.stub(config, 'getConfig')
          .withArgs('ttxSettings')
          .returns({
            'url': 'https://foo.com/hb/'
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
      beforeEach(function() {
        bidderRequest = {
          ...bidderRequest,
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
        sandbox.stub(config, 'getConfig')
          .withArgs('ttxSettings')
          .returns({
            'url': 'https://foo.com/hb/'
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
        sandbox.stub(config, 'getConfig')
          .withArgs('ttxSettings')
          .returns({
            'url': 'https://foo.com/hb/'
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

    context('when coppa has been enabled', function() {
      beforeEach(function() {
        sandbox.stub(config, 'getConfig').withArgs('coppa').returns(true);
      });

      it('returns corresponding server requests with coppa: 1', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withCoppa(1)
          .build();

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when coppa has been disabled', function() {
      beforeEach(function() {
        sandbox.stub(config, 'getConfig').withArgs('coppa').returns(false);
      });

      it('returns corresponding server requests with coppa: 0', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withCoppa(0)
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when GPP consent data exists', function() {
      beforeEach(function() {
        bidderRequest = {
          ...bidderRequest,
          gppConsent: {
            gppString: 'foo',
            applicableSections: '123'
          }
        }
      });

      it('returns corresponding server requests with GPP consent data', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withGppConsent('foo', '123')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });

      it('returns corresponding test server requests with GPP consent data', function() {
        sandbox.stub(config, 'getConfig').withArgs('ttxSettings')
          .returns({
            'url': 'https://foo.com/hb/'
          });

        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withGppConsent('foo', '123')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .withUrl('https://foo.com/hb/')
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when refererInfo values are available', function() {
      context('when refererInfo.page is defined', function() {
        it('returns corresponding server requests with site.page set', function() {
          bidderRequest = {
            ...bidderRequest,
            refererInfo: {
              page: 'http://foo.com/bar'
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

      context('when refererInfo.ref is defined', function() {
        it('returns corresponding server requests with site.ref set', function() {
          bidderRequest = {
            ...bidderRequest,
            refererInfo: {
              ref: 'google.com'
            }
          };

          const ttxRequest = new TtxRequestBuilder()
            .withBanner()
            .withProduct()
            .withReferer('google.com')
            .build();
          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          validateBuiltServerRequest(builtServerRequest, serverRequest);
        });
      });
    });

    context('when Global Placement ID (gpid) is defined', function() {
      it('passes the Global Placement ID (gpid) in the request', function() {
        const ttxRequest = new TtxRequestBuilder()
          .withBanner()
          .withProduct()
          .withGpid('fakeGPID0')
          .build();
        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();

        let copyBidRequest = utils.deepClone(bidRequests);
        const bidRequestsWithGpid = copyBidRequest.map(function(bidRequest, index) {
          return {
            ...bidRequest,
            ortb2Imp: {
              ext: {
                gpid: 'fakeGPID' + index
              }
            }
          };
        });

        const [ builtServerRequest ] = spec.buildRequests(bidRequestsWithGpid, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when referer value is not available', function() {
      it('returns corresponding server requests without site.page and site.ref set', function() {
        bidderRequest.refererInfo = {};

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

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

        validateBuiltServerRequest(builtServerRequest, serverRequest);
      });
    });

    context('when mediaType has video only', function() {
      context('and context is instream', function() {
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

          ttxRequest.imp[0].video.plcmt = 1;
          ttxRequest.imp[0].video.startdelay = 0;

          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();
          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          validateBuiltServerRequest(builtServerRequest, serverRequest);
        });

        it('builds instream request with params passed', function() {
          const bidRequests = (
            new BidRequestsBuilder()
              .withVideo({context: 'instream', startdelay: -2})
              .build()
          );

          const ttxRequest = new TtxRequestBuilder()
            .withVideo({startdelay: -2, plcmt: 1})
            .withProduct('instream')
            .build();

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
        });

        it('overrides the placement value', function() {
          const bidRequests = (
            new BidRequestsBuilder()
              .withVideo({
                plcmt: 2, // Incorrect placement value for an instream video
                placement: 2, // Placement specified in the DEPRECATED field.
                context: 'instream'
              })
              .build()
          );

          const ttxRequest = new TtxRequestBuilder()
            .withVideo()
            .withProduct('instream')
            .build();

          ttxRequest.imp[0].video.plcmt = 1;
          ttxRequest.imp[0].video.placement = 1;
          ttxRequest.imp[0].video.startdelay = 0;

          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();
          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
        });

        context('when the placement is still specified in the DEPRECATED `placement` field', function() {
          it('overwrites its value and sets it in the recent `plcmt` field as well', function() {
            const bidRequests = (
              new BidRequestsBuilder()
                .withVideo({
                  placement: 2, // Incorrect placement for an instream video
                  context: 'instream'
                })
                .build()
            );

            const ttxRequest = new TtxRequestBuilder()
              .withVideo()
              .withProduct('instream')
              .build();

            ttxRequest.imp[0].video.plcmt = 1;
            ttxRequest.imp[0].video.placement = 1;
            ttxRequest.imp[0].video.startdelay = 0;

            const serverRequest = new ServerRequestBuilder()
              .withData(ttxRequest)
              .build();
            const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

            expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
          });
        });
      });

      context('and context is outstream', function() {
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

          // No placement specified, final value should default to 2.
          ttxRequest.imp[0].video.plcmt = 2;

          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();
          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          validateBuiltServerRequest(builtServerRequest, serverRequest);
        });

        it('builds siab request with video params passed', function() {
          const bidRequests = (
            new BidRequestsBuilder()
              .withVideo({context: 'outstream', plcmt: 3, playbackmethod: [2]})
              .build()
          );

          const ttxRequest = new TtxRequestBuilder()
            .withVideo({plcmt: 3, playbackmethod: [2]})
            .withProduct('siab')
            .build();

          const serverRequest = new ServerRequestBuilder()
            .withData(ttxRequest)
            .build();
          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          validateBuiltServerRequest(builtServerRequest, serverRequest);
        });

        context('and the placement is specified in the DEPRECATED `placement` field', function() {
          it('sets the recent `plcmt` field', function() {
            const bidRequests = (
              new BidRequestsBuilder()
                .withVideo({context: 'outstream', placement: 3, playbackmethod: [2]})
                .build()
            );

            const ttxRequest = new TtxRequestBuilder()
              .withVideo({plcmt: 3, placement: 3, playbackmethod: [2]})
              .withProduct('siab')
              .build();

            const serverRequest = new ServerRequestBuilder()
              .withData(ttxRequest)
              .build();
            const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

            validateBuiltServerRequest(builtServerRequest, serverRequest);
          });
        });
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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        ttxRequest.imp[0].video.plcmt = 2;

        const serverRequest = new ServerRequestBuilder()
          .withData(ttxRequest)
          .build();
        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

        const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

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

          const [ builtServerRequest ] = spec.buildRequests(bidRequests, bidderRequest);

          expect(JSON.parse(builtServerRequest.data)).to.deep.equal(ttxRequest);
        });
      });
    });

    context('when SRA mode is enabled', function() {
      it('builds a single request with multiple imps corresponding to each group {siteId, productId}', function() {
        sandbox.stub(config, 'getConfig')
          .withArgs('ttxSettings')
          .returns({
            enableSRAMode: true
          });

        const bidRequests = new BidRequestsBuilder()
          .addBid()
          .addBid({
            bidId: 'b3',
            adUnitCode: 'div-id',
            params: {
              siteId: 'sample33xGUID123456780',
              productId: 'siab'
            }
          })
          .addBid({
            bidId: 'b4',
            adUnitCode: 'div-id',
            params: {
              siteId: 'sample33xGUID123456780',
              productId: 'inview'
            }
          })
          .withBanner()
          .withVideo({context: 'outstream'})
          .build();

        const req1 = new TtxRequestBuilder()
          .addImp()
          .withProduct('siab')
          .withBanner()
          .withVideo()
          .build();

        const req2 = new TtxRequestBuilder('sample33xGUID123456780')
          .withProduct('siab')
          .withBanner()
          .withVideo()
          .build();

        req2.imp[0].id = 'b3';

        const req3 = new TtxRequestBuilder('sample33xGUID123456780')
          .withProduct('inview')
          .withBanner()
          .withVideo()
          .build();

        req3.imp[0].id = 'b4';

        const serverReq1 = new ServerRequestBuilder()
          .withData(req1)
          .build();

        const serverReq2 = new ServerRequestBuilder()
          .withData(req2)
          .withUrl('https://ssc.33across.com/api/v1/hb?guid=sample33xGUID123456780')
          .build();

        const serverReq3 = new ServerRequestBuilder()
          .withData(req3)
          .withUrl('https://ssc.33across.com/api/v1/hb?guid=sample33xGUID123456780')
          .build();

        const builtServerRequests = spec.buildRequests(bidRequests, bidderRequest);

        expect(builtServerRequests).to.deep.equal([serverReq1, serverReq2, serverReq3]);
      });
    });

    context('when SRA mode is not enabled', function() {
      it('builds multiple requests, one corresponding to each Ad Unit', function() {
        const bidRequests = new BidRequestsBuilder()
          .addBid()
          .addBid({
            bidId: 'b3',
            adUnitCode: 'div-id',
            params: {
              siteId: 'sample33xGUID123456780',
              productId: 'siab'
            }
          })
          .withBanner()
          .withVideo({context: 'outstream'})
          .build();

        const req1 = new TtxRequestBuilder()
          .withProduct('siab')
          .withBanner()
          .withVideo()
          .build();

        const req2 = new TtxRequestBuilder()
          .withProduct('siab')
          .withBanner()
          .withVideo()
          .build();

        req2.imp[0].id = 'b2';

        const req3 = new TtxRequestBuilder('sample33xGUID123456780')
          .withProduct('siab')
          .withBanner()
          .withVideo()
          .build();

        req3.imp[0].id = 'b3';

        const serverReq1 = new ServerRequestBuilder()
          .withData(req1)
          .build();

        const serverReq2 = new ServerRequestBuilder()
          .withData(req2)
          .build();

        const serverReq3 = new ServerRequestBuilder()
          .withData(req3)
          .withUrl('https://ssc.33across.com/api/v1/hb?guid=sample33xGUID123456780')
          .build();

        const builtServerRequests = spec.buildRequests(bidRequests, bidderRequest);

        expect(builtServerRequests)
          .to.deep.equal([
            serverReq1,
            serverReq2,
            serverReq3
          ]);
      });
    });
  });

  describe('interpretResponse', function() {
    let ttxRequest, serverRequest;
    const videoBid = '<VAST version="3.0"><Ad></Ad></VAST>';

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
          id: 'r1',
          seatbid: [
            {
              bid: [{
                id: '1',
                impid: 'b1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0938,
                adomain: ['advertiserdomain.com']
              }]
            }
          ]
        };
        const bidResponse = {
          requestId: 'b1',
          cpm: 0.0938,
          width: 300,
          height: 250,
          ad: '<html><h3>I am an ad</h3></html>',
          ttl: 60,
          creativeId: 1,
          mediaType: 'banner',
          currency: 'USD',
          netRevenue: true,
          meta: {
            advertiserDomains: ['advertiserdomain.com']
          }
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([bidResponse]);
      });

      it('interprets and returns the single video bid response', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'r1',
          seatbid: [
            {
              bid: [{
                id: '1',
                impid: 'b1',
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
                price: 0.0938,
                adomain: ['advertiserdomain.com']
              }]
            }
          ]
        };
        const bidResponse = {
          requestId: 'b1',
          cpm: 0.0938,
          width: 300,
          height: 250,
          ad: videoBid,
          ttl: 60,
          creativeId: 1,
          mediaType: 'video',
          currency: 'USD',
          netRevenue: true,
          vastXml: videoBid,
          meta: {
            advertiserDomains: ['advertiserdomain.com']
          }
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([bidResponse]);
      });

      context('when the list of advertiser domains for block list checking is empty', function() {
        it('doesn\'t include the empty list in the interpreted response', function() {
          const serverResponse = {
            cur: 'USD',
            ext: {},
            id: 'b1',
            seatbid: [
              {
                bid: [{
                  id: '1',
                  impid: 'b1',
                  adm: '<html><h3>I am an ad</h3></html>',
                  crid: 1,
                  h: 250,
                  w: 300,
                  price: 0.0938,
                  adomain: [] // Empty list
                }]
              }
            ]
          };

          // Bid response below doesn't contain meta.advertiserDomains
          const bidResponse = {
            requestId: 'b1',
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
      });
    });

    context('when no bids are returned', function() {
      it('interprets and returns empty array', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'r1',
          seatbid: []
        };

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal([]);
      });
    });

    context('when more than one bids are returned', function() {
      it('interprets and returns all bids', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'r1',
          seatbid: [
            {
              bid: [{
                id: '1',
                impid: 'b1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0940
              },
              {
                id: '2',
                impid: 'b2',
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
                impid: 'b3',
                adm: videoBid,
                ext: {
                  ttx: {
                    mediaType: 'video',
                    vastType: 'xml'
                  }
                },
                crid: 3,
                h: 250,
                w: 300,
                price: 0.0938
              }]
            }
          ]
        };
        const bidResponse = [
          {
            requestId: 'b1',
            cpm: 0.0940,
            width: 300,
            height: 250,
            ad: '<html><h3>I am an ad</h3></html>',
            ttl: 60,
            creativeId: 1,
            mediaType: 'banner',
            currency: 'USD',
            netRevenue: true
          },
          {
            requestId: 'b2',
            cpm: 0.0938,
            width: 300,
            height: 250,
            ad: '<html><h3>I am an ad</h3></html>',
            ttl: 60,
            creativeId: 2,
            mediaType: 'banner',
            currency: 'USD',
            netRevenue: true
          },
          {
            requestId: 'b3',
            cpm: 0.0938,
            width: 300,
            height: 250,
            ad: videoBid,
            vastXml: '<VAST version=\"3.0\"><Ad></Ad></VAST>',
            ttl: 60,
            creativeId: 3,
            mediaType: 'video',
            currency: 'USD',
            netRevenue: true
          }
        ];

        expect(spec.interpretResponse({ body: serverResponse }, serverRequest)).to.deep.equal(bidResponse);
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
    }, bidderRequest);

    context('when iframe is enabled', function() {
      let syncOptions;
      beforeEach(function() {
        syncOptions = {
          iframeEnabled: true
        };
      });

      context('when there is no gdpr consent data', function() {
        it('returns sync urls with undefined consent string as param', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, undefined);
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            }
          ]

          expect(syncResults).to.deep.equal(expectedSyncs);
        })
      });

      context('when gdpr applies but there is no consent string', function() {
        it('returns sync urls with undefined consent string as param and gdpr=1', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: true});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=&gdpr=1`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=&gdpr=1`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr applies and there is consent string', function() {
        it('returns sync urls with gdpr_consent=consent string as param and gdpr=1', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: true, consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=&gdpr=1`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=&gdpr=1`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr does not apply and there is no consent string', function() {
        it('returns sync urls with undefined consent string as param and gdpr=0', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: false});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=&gdpr=0`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=&gdpr=0`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr is unknown and there is consent string', function() {
        it('returns sync urls with only consent string as param', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when gdpr does not apply and there is consent string (yikes!)', function() {
        it('returns sync urls with consent string as param and gdpr=0', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {gdprApplies: false, consentString: 'consent123A'});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=&gdpr=0`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=consent123A&us_privacy=undefined&gpp=&gpp_sid=&gdpr=0`
            }
          ];
          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when there is no usPrivacy data', function() {
        it('returns sync urls with undefined consent string as param', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            }
          ]

          expect(syncResults).to.deep.equal(expectedSyncs);
        })
      });

      context('when there is usPrivacy data', function() {
        it('returns sync urls with consent string as param', function() {
          spec.buildRequests(bidRequests, bidderRequest);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {}, 'foo');
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=foo&gpp=&gpp_sid=`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=foo&gpp=&gpp_sid=`
            }
          ];

          expect(syncResults).to.deep.equal(expectedSyncs);
        });
      });

      context('when there is no GPP data', function() {
        it('returns sync urls with empty GPP params', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {});
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=&gpp_sid=`
            }
          ]

          expect(syncResults).to.deep.equal(expectedSyncs);
        })
      });

      context('when there is GPP data', function() {
        it('returns sync urls with GPP consent string & GPP Section ID as params', function() {
          spec.buildRequests(bidRequests);

          const syncResults = spec.getUserSyncs(syncOptions, {}, {}, undefined, {
            gppString: 'foo',
            applicableSections: ['123', '456']
          });
          const expectedSyncs = [
            {
              type: 'iframe',
              url: `${syncs[0].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=foo&gpp_sid=123%2C456`
            },
            {
              type: 'iframe',
              url: `${syncs[1].url}&gdpr_consent=undefined&us_privacy=undefined&gpp=foo&gpp_sid=123%2C456`
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
