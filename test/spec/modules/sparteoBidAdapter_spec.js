import { expect } from 'chai';
import { deepClone } from 'src/utils';
import * as utils from 'src/utils';
import { spec as adapter } from 'modules/sparteoBidAdapter';
import { Renderer } from 'src/Renderer.js';

const CURRENCY = 'EUR';
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=dev.sparteo.com';
const USER_SYNC_URL_IFRAME = 'https://sync.sparteo.com/sync/iframe.html?from=prebidjs';

const VALID_BID_BANNER = {
  bidder: 'sparteo',
  bidId: '1a2b3c4d',
  adUnitCode: 'id-1234',
  params: {
    networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
    formats: ['corner']
  },
  mediaTypes: {
    banner: {
      sizes: [
        [1, 1]
      ]
    }
  }
};

const VALID_BID_VIDEO = {
  bidder: 'sparteo',
  bidId: '5e6f7g8h',
  adUnitCode: 'id-5678',
  params: {
    networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
  },
  mediaTypes: {
    video: {
      playerSize: [640, 360],
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      api: [1, 2],
      mimes: ['video/mp4'],
      skip: 1,
      startdelay: 0,
      placement: 1,
      linearity: 1,
      minduration: 5,
      maxduration: 30,
      context: 'instream'
    }
  },
  ortb2Imp: {
    ext: {
      pbadslot: 'video'
    }
  }
};

const VALID_REQUEST_BANNER = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      },
      'ext': {
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-1234',
            'formats': ['corner']
          }
        }
      }
    }],
    'site': {
      'domain': 'dev.sparteo.com',
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const VALID_REQUEST_VIDEO = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '5e6f7g8h',
      'video': {
        'w': 640,
        'h': 360,
        'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
        'api': [1, 2],
        'mimes': ['video/mp4'],
        'skip': 1,
        'startdelay': 0,
        'placement': 1,
        'linearity': 1,
        'minduration': 5,
        'maxduration': 30,
      },
      'ext': {
        'pbadslot': 'video',
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-5678'
          }
        }
      }
    }],
    'site': {
      'domain': 'dev.sparteo.com',
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const VALID_REQUEST = {
  method: HTTP_METHOD,
  url: REQUEST_URL,
  data: {
    'imp': [{
      'secure': 1,
      'id': '1a2b3c4d',
      'banner': {
        'format': [{
          'h': 1,
          'w': 1
        }],
        'topframe': 0
      },
      'ext': {
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-1234',
            'formats': ['corner']
          }
        }
      }
    }, {
      'secure': 1,
      'id': '5e6f7g8h',
      'video': {
        'w': 640,
        'h': 360,
        'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
        'api': [1, 2],
        'mimes': ['video/mp4'],
        'skip': 1,
        'startdelay': 0,
        'placement': 1,
        'linearity': 1,
        'minduration': 5,
        'maxduration': 30,
      },
      'ext': {
        'pbadslot': 'video',
        'sparteo': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'adUnitCode': 'id-5678'
          }
        }
      }
    }],
    'site': {
      'domain': 'dev.sparteo.com',
      'publisher': {
        'ext': {
          'params': {
            'networkId': '1234567a-eb1b-1fae-1d23-e1fbaef234cf',
            'pbjsVersion': '$prebid.version$'
          }
        }
      }
    },
    'test': 0
  }
};

const ORTB2_GLOBAL = {
  site: {
    domain: 'dev.sparteo.com'
  }
};

const BIDDER_REQUEST = {
  bids: [VALID_BID_BANNER, VALID_BID_VIDEO],
  ortb2: ORTB2_GLOBAL
};

const BIDDER_REQUEST_BANNER = {
  bids: [VALID_BID_BANNER],
  ortb2: ORTB2_GLOBAL
};

const BIDDER_REQUEST_VIDEO = {
  bids: [VALID_BID_VIDEO],
  ortb2: ORTB2_GLOBAL
};

describe('SparteoAdapter', function () {
  describe('isBidRequestValid', function () {
    describe('Check method return', function () {
      it('should return true', function () {
        expect(adapter.isBidRequestValid(VALID_BID_BANNER)).to.equal(true);
        expect(adapter.isBidRequestValid(VALID_BID_VIDEO)).to.equal(true);
      });

      it('should return false because the networkId is missing', function () {
        const wrongBid = deepClone(VALID_BID_BANNER);
        delete wrongBid.params.networkId;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the banner size is missing', function () {
        const wrongBid = deepClone(VALID_BID_BANNER);

        wrongBid.mediaTypes.banner.sizes = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.banner.sizes;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the video player size paramater is missing', function () {
        const wrongBid = deepClone(VALID_BID_VIDEO);

        wrongBid.mediaTypes.video.playerSize = '123456';
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);

        delete wrongBid.mediaTypes.video.playerSize;
        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });

      it('should return false because the bid params are missing', function () {
        expect(adapter.isBidRequestValid({})).to.equal(false);
      });

      it('should return false because the placement is neither banner nor video', function () {
        const wrongBid = deepClone(VALID_BID_BANNER);
        delete wrongBid.mediaTypes.banner;

        expect(adapter.isBidRequestValid(wrongBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('Check method return', function () {
      it('should return the right formatted banner requests', function () {
        const request = adapter.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
        delete request.data.id;

        expect(request).to.deep.equal(VALID_REQUEST_BANNER);
      });
      if (FEATURES.VIDEO) {
        it('should return the right formatted requests', function () {
          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          delete request.data.id;

          expect(request).to.deep.equal(VALID_REQUEST);
        });

        it('should return the right formatted video requests', function () {
          const request = adapter.buildRequests([VALID_BID_VIDEO], BIDDER_REQUEST_VIDEO);
          delete request.data.id;

          expect(request).to.deep.equal(VALID_REQUEST_VIDEO);
        });

        it('should return the right formatted request with endpoint test', function () {
          const endpoint = 'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=dev.sparteo.com';

          const bids = deepClone([VALID_BID_BANNER, VALID_BID_VIDEO]);
          bids[0].params.endpoint = endpoint;

          const expectedRequest = deepClone(VALID_REQUEST);
          expectedRequest.url = endpoint;
          expectedRequest.data.imp[0].ext.sparteo.params.endpoint = endpoint;

          const request = adapter.buildRequests(bids, BIDDER_REQUEST);
          delete request.data.id;

          expect(request).to.deep.equal(expectedRequest);
        });
      }

      it('sets publisher.ext.params.publisherId under site root when params.publisherId is provided', function () {
        const bid = deepClone(VALID_BID_BANNER);
        bid.params.publisherId = 'pub-123';

        const request = adapter.buildRequests([bid], { bids: [bid], ortb2: ORTB2_GLOBAL });
        delete request.data.id;

        expect(request.data.site.publisher.ext.params.publisherId).to.equal('pub-123');
      });
    });
  });

  describe('interpretResponse', function () {
    describe('Check method return', function () {
      it('should return the right formatted response', function () {
        const response = {
          body: {
            'id': '63f4d300-6896-4bdc-8561-0932f73148b1',
            'cur': 'EUR',
            'seatbid': [
              {
                'seat': 'sparteo',
                'group': 0,
                'bid': [
                  {
                    'id': 'cdbb6982-a269-40c7-84e5-04797f11d87a',
                    'impid': '1a2b3c4d',
                    'price': 4.5,
                    'ext': {
                      'prebid': {
                        'type': 'banner'
                      }
                    },
                    'adm': 'script',
                    'crid': 'crid',
                    'w': 1,
                    'h': 1,
                    'nurl': 'https://t.bidder.sparteo.com/img'
                  }
                ]
              }
            ]
          }
        };

        if (FEATURES.VIDEO) {
          response.body.seatbid[0].bid.push({
            'id': 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            'impid': '5e6f7g8h',
            'price': 5,
            'ext': {
              'prebid': {
                'type': 'video',
                'cache': {
                  'vastXml': {
                    'url': 'https://pbs.tet.com/cache?uuid=1234'
                  }
                }
              }
            },
            'adm': 'tag',
            'crid': 'crid',
            'w': 640,
            'h': 480,
            'nurl': 'https://t.bidder.sparteo.com/img'
          });
        }

        const formattedReponse = [
          {
            requestId: '1a2b3c4d',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87a',
            cpm: 4.5,
            width: 1,
            height: 1,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'banner',
            meta: {},
            ad: '<div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://t.bidder.sparteo.com/img\"></div>script'
          }
        ];

        if (FEATURES.VIDEO) {
          formattedReponse.push({
            requestId: '5e6f7g8h',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            cpm: 5,
            width: 640,
            height: 480,
            playerWidth: 640,
            playerHeight: 360,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            nurl: 'https://t.bidder.sparteo.com/img',
            vastUrl: 'https://pbs.tet.com/cache?uuid=1234',
            vastXml: 'tag'
          });
        }

        if (FEATURES.VIDEO) {
          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          expect(adapter.interpretResponse(response, request)).to.deep.equal(formattedReponse);
        } else {
          const request = adapter.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
          expect(adapter.interpretResponse(response, request)).to.deep.equal(formattedReponse);
        }
      });

      if (FEATURES.VIDEO) {
        it('should not use nurl as vastUrl when no cache URL is present', function () {
          const response = {
            body: {
              'id': '63f4d300-6896-4bdc-8561-0932f73148b1',
              'cur': 'EUR',
              'seatbid': [
                {
                  'seat': 'sparteo',
                  'group': 0,
                  'bid': [
                    {
                      'id': 'cdbb6982-a269-40c7-84e5-04797f11d87b',
                      'impid': '5e6f7g8h',
                      'price': 5,
                      'ext': {
                        'prebid': {
                          'type': 'video'
                        }
                      },
                      'adm': 'tag',
                      'crid': 'crid',
                      'w': 640,
                      'h': 480,
                      'nurl': 'https://t.bidder.sparteo.com/vast'
                    }
                  ]
                }
              ]
            }
          };

          const request = adapter.buildRequests([VALID_BID_VIDEO], BIDDER_REQUEST_VIDEO);
          const bids = adapter.interpretResponse(response, request);

          expect(bids[0].vastUrl).to.equal(null);
          expect(bids[0].nurl).to.equal('https://t.bidder.sparteo.com/vast');
        });

        it('should interprete renderer config', function () {
          let response = {
            body: {
              'id': '63f4d300-6896-4bdc-8561-0932f73148b1',
              'cur': 'EUR',
              'seatbid': [
                {
                  'seat': 'sparteo',
                  'group': 0,
                  'bid': [
                    {
                      'id': 'cdbb6982-a269-40c7-84e5-04797f11d87b',
                      'impid': '5e6f7g8h',
                      'price': 5,
                      'ext': {
                        'prebid': {
                          'type': 'video',
                          'cache': {
                            'vastXml': {
                              'url': 'https://pbs.tet.com/cache?uuid=1234'
                            }
                          },
                          'renderer': {
                            'url': 'testVideoPlayer.js',
                            'options': {
                              'disableTopBar': true,
                              'showBigPlayButton': false,
                              'showProgressBar': 'bar',
                              'showVolume': false,
                              'showMute': true,
                              'allowFullscreen': true
                            }
                          }
                        }
                      },
                      'adm': 'tag',
                      'crid': 'crid',
                      'w': 640,
                      'h': 480,
                      'nurl': 'https://t.bidder.sparteo.com/img'
                    }
                  ]
                }
              ]
            }
          };

          const request = adapter.buildRequests([VALID_BID_BANNER, VALID_BID_VIDEO], BIDDER_REQUEST);
          let formattedReponse = adapter.interpretResponse(response, request);

          expect(formattedReponse[0].renderer.url).to.equal(response.body.seatbid[0].bid[0].ext.prebid.renderer.url);
          // config now carries a documentResolver callback (for iframe render support) in addition
          // to the server-provided renderer config, so assert the server config is included rather
          // than an exact match.
          expect(formattedReponse[0].renderer.config).to.deep.include(response.body.seatbid[0].bid[0].ext.prebid.renderer);
          expect(formattedReponse[0].renderer.config.documentResolver).to.be.a('function');
        });
      }
    });
  });

  if (FEATURES.VIDEO) {
    describe('outstream renderer', function () {
      const AD_UNIT_CODE = 'id-5678';
      const RENDERER_RESPONSE = {
        body: {
          id: '63f4d300-6896-4bdc-8561-0932f73148b1',
          cur: 'EUR',
          seatbid: [{
            seat: 'sparteo',
            group: 0,
            bid: [{
              id: 'cdbb6982-a269-40c7-84e5-04797f11d87b',
              impid: '5e6f7g8h',
              price: 5,
              ext: { prebid: { type: 'video', renderer: { url: 'testVideoPlayer.js', options: { showVolume: false } } } },
              adm: 'tag',
              crid: 'crid',
              w: 640,
              h: 480
            }]
          }]
        }
      };

      function freshRenderer() {
        const request = adapter.buildRequests([VALID_BID_VIDEO], BIDDER_REQUEST_VIDEO);
        return adapter.interpretResponse(RENDERER_RESPONSE, request)[0].renderer;
      }

      function renderBid(renderer) {
        return { adUnitCode: AD_UNIT_CODE, renderer, vastXml: '<VAST/>', width: 640, height: 480 };
      }

      // Minimal Document stand-in: getElementById resolves the slot only when hasSlot is true,
      // and defaultView is the window ANOutstreamVideo is looked up on.
      function fakeDoc(hasSlot, win, slotId = AD_UNIT_CODE) {
        return {
          getElementById: (id) => (hasSlot && id === AD_UNIT_CODE ? { id: slotId } : null),
          defaultView: win
        };
      }

      describe('documentResolver', function () {
        it('returns the render document when it holds the slot', function () {
          const resolver = freshRenderer().getConfig().documentResolver;
          const renderDoc = fakeDoc(true, {});
          const sourceDoc = fakeDoc(false, {});
          expect(resolver({ adUnitCode: AD_UNIT_CODE }, sourceDoc, renderDoc)).to.equal(renderDoc);
        });

        it('falls back to the source document when the render document lacks the slot', function () {
          const resolver = freshRenderer().getConfig().documentResolver;
          const renderDoc = fakeDoc(false, {});
          const sourceDoc = fakeDoc(true, {});
          expect(resolver({ adUnitCode: AD_UNIT_CODE }, sourceDoc, renderDoc)).to.equal(sourceDoc);
        });

        it('defaults to the render document when there is no source document', function () {
          const resolver = freshRenderer().getConfig().documentResolver;
          const renderDoc = fakeDoc(false, {});
          expect(resolver({ adUnitCode: AD_UNIT_CODE }, null, renderDoc)).to.equal(renderDoc);
        });
      });

      describe('render', function () {
        afterEach(function () {
          delete window.ANOutstreamVideo;
        });

        it('renders the outstream ad into the render document via ANOutstreamVideo', function () {
          const renderAd = sinon.stub();
          const doc = fakeDoc(true, { ANOutstreamVideo: { renderAd } });
          const renderer = freshRenderer();
          renderer.loaded = true;
          renderer._render(renderBid(renderer), doc);

          sinon.assert.calledOnce(renderAd);
          const args = renderAd.getCall(0).args[0];
          expect(args.targetId).to.equal(AD_UNIT_CODE);
          expect(args.sizes).to.deep.equal([640, 480]);
          expect(args.adResponse.ad.video.content).to.equal('<VAST/>');
        });

        it('does not render when the slot is absent from the render document', function () {
          const renderAd = sinon.stub();
          const doc = fakeDoc(false, { ANOutstreamVideo: { renderAd } });
          const renderer = freshRenderer();
          renderer.loaded = true;
          renderer._render(renderBid(renderer), doc);
          sinon.assert.notCalled(renderAd);
        });

        it('does not throw when ANOutstreamVideo is unavailable on the render window', function () {
          const doc = fakeDoc(true, {});
          const renderer = freshRenderer();
          renderer.loaded = true;
          expect(() => renderer._render(renderBid(renderer), doc)).to.not.throw();
        });

        it('swallows errors thrown by ANOutstreamVideo.renderAd', function () {
          const renderAd = sinon.stub().throws(new Error('boom'));
          const doc = fakeDoc(true, { ANOutstreamVideo: { renderAd } });
          const renderer = freshRenderer();
          renderer.loaded = true;
          expect(() => renderer._render(renderBid(renderer), doc)).to.not.throw();
          sinon.assert.calledOnce(renderAd);
        });

        it('falls back to the global document when no doc argument is provided', function () {
          const renderer = freshRenderer();
          renderer.loaded = true;

          // No `doc` passed: outstreamRender must fall back to the global `document`. The slot
          // won't be found there, so it just logs and returns - the point here is the fallback
          // itself doesn't throw.
          expect(() => renderer._render(renderBid(renderer))).to.not.throw();
        });

        it('falls back to window when the render document has no defaultView', function () {
          const renderAd = sinon.stub();
          window.ANOutstreamVideo = { renderAd };
          const doc = fakeDoc(true, undefined);
          const renderer = freshRenderer();
          renderer.loaded = true;

          renderer._render(renderBid(renderer), doc);

          sinon.assert.calledOnce(renderAd);
        });

        it('defaults rendererOptions to {} when the server config has no options', function () {
          const renderAd = sinon.stub();
          const doc = fakeDoc(true, { ANOutstreamVideo: { renderAd } });
          const renderer = freshRenderer();
          renderer.loaded = true;
          delete renderer.config.options;

          renderer._render(renderBid(renderer), doc);

          sinon.assert.calledOnce(renderAd);
          expect(renderAd.getCall(0).args[0].rendererOptions).to.deep.equal({});
        });

        it('defaults options when the renderer has no config', function () {
          const renderAd = sinon.stub();
          const doc = fakeDoc(true, { ANOutstreamVideo: { renderAd } });
          const renderer = freshRenderer();
          renderer.loaded = true;
          renderer.config = null;

          expect(() => renderer._render(renderBid(renderer), doc)).to.not.throw();

          sinon.assert.calledOnce(renderAd);
          expect(renderAd.getCall(0).args[0].rendererOptions).to.deep.equal({});
        });

        it('falls back to adUnitCode when the slot element has no id', function () {
          const renderAd = sinon.stub();
          const doc = fakeDoc(true, { ANOutstreamVideo: { renderAd } }, '');
          const renderer = freshRenderer();
          renderer.loaded = true;

          renderer._render(renderBid(renderer), doc);

          sinon.assert.calledOnce(renderAd);
          expect(renderAd.getCall(0).args[0].targetId).to.equal(AD_UNIT_CODE);
        });
      });

      describe('createRenderer error handling', function () {
        let setRenderStub;
        let logWarnStub;

        afterEach(function () {
          if (setRenderStub) { setRenderStub.restore(); setRenderStub = null; }
          if (logWarnStub) { logWarnStub.restore(); logWarnStub = null; }
        });

        it('logs a warning and does not throw when Renderer.prototype.setRender throws', function () {
          setRenderStub = sinon.stub(Renderer.prototype, 'setRender').throws(new Error('boom'));
          logWarnStub = sinon.stub(utils, 'logWarn');

          expect(() => freshRenderer()).to.not.throw();

          sinon.assert.calledOnce(logWarnStub);
        });
      });
    });
  }

  describe('onBidWon', function () {
    describe('Check methods succeed', function () {
      it('should not throw error', function () {
        const bids = [
          {
            requestId: '1a2b3c4d',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87a',
            cpm: 4.5,
            width: 1,
            height: 1,
            creativeId: 'crid',
            creative_id: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'banner',
            meta: {},
            ad: 'script<div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://t.bidder.sparteo.com/img\"></div>',
            nurl: [
              'win.domain.com'
            ]
          },
          {
            requestId: '2570',
            seatBidId: 'cdbb6982-a269-40c7-84e5-04797f11d87b',
            id: 'id-5678',
            cpm: 5,
            width: 640,
            height: 480,
            creativeId: 'crid',
            currency: CURRENCY,
            netRevenue: true,
            ttl: TTL,
            mediaType: 'video',
            meta: {},
            vastXml: 'vast xml',
            nurl: [
              'win.domain2.com'
            ]
          }
        ];

        bids.forEach(function (bid) {
          expect(adapter.onBidWon.bind(adapter, bid)).to.not.throw();
        });
      });
    });
  });

  describe('onTimeout', function () {
    it('should not throw', function () {
      expect(() => adapter.onTimeout({})).to.not.throw();
    });
  });

  describe('onSetTargeting', function () {
    it('should not throw', function () {
      expect(() => adapter.onSetTargeting({})).to.not.throw();
    });
  });

  describe('getUserSyncs', function () {
    beforeEach(function () {
      delete window.sparteoCrossfire;
    });

    describe('Check methods succeed', function () {
      // `isSynced` is a module-level flag that only ever flips false -> true, never back (it is
      // never reset between tests since the module is loaded once for the whole spec run). This
      // test must therefore run BEFORE the "fires" test below: it keeps iframeEnabled false so it
      // never trips the flag, leaving the gate open for the next test to exercise the full path.
      it('falls back to default empty values when GDPR/GPP consent sub-fields are missing', function () {
        const syncOptions = { iframeEnabled: false };
        const gdprConsent = { gdprApplies: false };
        const gppConsent = {};

        const result = adapter.getUserSyncs(syncOptions, null, gdprConsent, undefined, gppConsent);

        expect(result).to.be.undefined;
        expect(window.sparteoCrossfire).to.be.undefined;
      });

      it('should return the sync url with GDPR, USP and GPP consent params', function () {
        const syncOptions = {
          'iframeEnabled': true,
          'pixelEnabled': false
        };
        const gdprConsent = {
          gdprApplies: 1,
          consentString: 'tcfv2'
        };
        const uspConsent = '1Y---';
        const gppConsent = {
          gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [2, 6]
        };

        const syncUrls = [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + '&gdpr=1&gdpr_consent=tcfv2&usp_consent=1Y---&gpp=' + encodeURIComponent('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA') + '&gpp_sid=' + encodeURIComponent('2,6')
        }];

        expect(adapter.getUserSyncs(syncOptions, null, gdprConsent, uspConsent, gppConsent)).to.deep.equal(syncUrls);
      });
    });
  });

  describe('replaceMacros via buildRequests', function () {
    const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';

    it('replaces macros for site traffic (site_domain only)', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;
      bid.params.networkId = '1234567a-eb1b-1fae-1d23-e1fbaef234cf';

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: {
            domain: 'site.sparteo.com',
            publisher: { domain: 'dev.sparteo.com' }
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=site.sparteo.com'
      );
    });

    it('uses site.page hostname when site.domain is missing', function () {
      const ENDPOINT2 = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';

      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT2;
      bid.params.networkId = '1234567a-eb1b-1fae-1d23-e1fbaef234cf';

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: {
            page: 'https://www.dev.sparteo.com:3000/p/some?x=1'
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=dev.sparteo.com'
      );
    });

    it('omits domain query and leaves network_id empty when neither site nor app is present', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;
      bid.params.networkId = '1234567a-eb1b-1fae-1d23-e1fbaef234cf';

      const bidderReq = { bids: [bid], ortb2: {} };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id='
      );
    });

    it('sets site_domain=unknown when site.domain is null', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: {
            domain: null
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=unknown'
      );
    });

    it('replaces ${NETWORK_ID} with empty when undefined', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;
      delete bid.params.networkId;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: {
            domain: 'dev.sparteo.com'
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=&site_domain=dev.sparteo.com'
      );
    });

    it('replaces ${NETWORK_ID} with empty when null', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;
      bid.params.networkId = null;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: {
            domain: 'dev.sparteo.com'
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=&site_domain=dev.sparteo.com'
      );
    });

    it('appends &bundle=... and uses app_domain when app.bundle is present', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          app: {
            domain: 'dev.sparteo.com',
            bundle: 'com.sparteo.app'
          }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=dev.sparteo.com&bundle=com.sparteo.app'
      );
    });

    it('does not append &bundle when app is missing; uses site_domain when site exists', function () {
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: { domain: 'dev.sparteo.com' }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=dev.sparteo.com'
      );
    });

    it('prefers app over site when both are present (ortbConverter default)', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: {
          site: { domain: 'site.sparteo.com' },
          app: { domain: 'app.sparteo.com', bundle: 'com.sparteo.app' }
        }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=app.sparteo.com&bundle=com.sparteo.app'
      );
      expect(req.data.app?.publisher?.ext?.params?.networkId).to.equal('1234567a-eb1b-1fae-1d23-e1fbaef234cf');
      expect(req.data.site).to.be.undefined;
    });

    ['', '   ', 'null', 'NuLl'].forEach((val) => {
      it(`app bundle "${val}" produces &bundle=unknown`, function () {
        const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
        const bid = deepClone(VALID_BID_BANNER);
        bid.params.endpoint = ENDPOINT;

        const bidderReq = {
          bids: [bid],
          ortb2: { app: { domain: 'dev.sparteo.com', bundle: val } }
        };

        const req = adapter.buildRequests([bid], bidderReq);
        delete req.data.id;

        expect(req.url).to.equal(
          'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=dev.sparteo.com&bundle=unknown'
        );
      });
    });

    it('produces &bundle=unknown when the app.bundle field is entirely absent', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { app: { domain: 'dev.sparteo.com' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=dev.sparteo.com&bundle=unknown'
      );
    });

    it('app domain missing becomes app_domain=unknown while keeping bundle', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { app: { domain: '', bundle: 'com.sparteo.app' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=unknown&bundle=com.sparteo.app'
      );
    });

    it('uses network_id from app.publisher.ext for app-only traffic', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { app: { domain: 'dev.sparteo.com', bundle: 'com.sparteo.app' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.data.site).to.be.undefined;
      expect(req.data.app?.publisher?.ext?.params?.networkId).to.equal('1234567a-eb1b-1fae-1d23-e1fbaef234cf');
      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=dev.sparteo.com&bundle=com.sparteo.app'
      );
    });

    it('unparsable site.page yields site_domain=unknown', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { site: { page: 'not a url' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=unknown'
      );
    });

    it('literal "null" in site.page yields site_domain=unknown', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { site: { domain: '', page: 'null' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=unknown'
      );
    });

    it('does not create site on app-only request', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = {
        bids: [bid],
        ortb2: { app: { domain: 'dev.sparteo.com', bundle: 'com.sparteo.app' } }
      };

      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.data.site).to.be.undefined;
      expect(req.data.app).to.exist;
      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&app_domain=dev.sparteo.com&bundle=com.sparteo.app'
      );
    });

    it('propagates adUnitCode into imp.ext.sparteo.params.adUnitCode', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const req = adapter.buildRequests([bid], { bids: [bid], ortb2: { site: { domain: 'dev.sparteo.com' } } });
      delete req.data.id;

      expect(req.data.imp[0]?.ext?.sparteo?.params?.adUnitCode).to.equal(bid.adUnitCode);
      expect(bid.params.adUnitCode).to.be.undefined;
    });

    it('sets pbjsVersion and networkId under site root', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = { bids: [bid], ortb2: { site: { domain: 'dev.sparteo.com' } } };
      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      const params = req.data.site?.publisher?.ext?.params;
      expect(params?.pbjsVersion).to.equal('$prebid.version$');
      expect(params?.networkId).to.equal('1234567a-eb1b-1fae-1d23-e1fbaef234cf');
      expect(req.data.app?.publisher?.ext?.params?.pbjsVersion).to.be.undefined;
    });

    it('sets pbjsVersion and networkId under app root', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;

      const bidderReq = { bids: [bid], ortb2: { app: { domain: 'dev.sparteo.com', bundle: 'com.sparteo.app' } } };
      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      const params = req.data.app?.publisher?.ext?.params;
      expect(params?.pbjsVersion).to.equal('$prebid.version$');
      expect(params?.networkId).to.equal('1234567a-eb1b-1fae-1d23-e1fbaef234cf');
      expect(req.data.site).to.be.undefined;
    });

    it('app-only without networkId leaves network_id empty', function () {
      const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${APP_DOMAIN_QUERY}${BUNDLE_QUERY}';
      const bid = deepClone(VALID_BID_BANNER);
      bid.params.endpoint = ENDPOINT;
      delete bid.params.networkId;

      const bidderReq = { bids: [bid], ortb2: { app: { domain: 'dev.sparteo.com', bundle: 'com.sparteo.app' } } };
      const req = adapter.buildRequests([bid], bidderReq);
      delete req.data.id;

      expect(req.url).to.equal(
        'https://bid.sparteo.com/auction?network_id=&app_domain=dev.sparteo.com&bundle=com.sparteo.app'
      );
    });
  });

  describe('domain normalization (strip www., port, path, trim)', function () {
    const ENDPOINT = 'https://bid.sparteo.com/auction?network_id=${NETWORK_ID}${SITE_DOMAIN_QUERY}';

    const CASES = [
      {
        label: 'strips leading "www." from site.domain',
        site: { domain: 'www.dev.sparteo.com' },
        expected: 'dev.sparteo.com'
      },
      {
        label: 'trims whitespace and strips "www."',
        site: { domain: '   www.dev.sparteo.com   ' },
        expected: 'dev.sparteo.com'
      },
      {
        label: 'preserves non-"www" prefixes like "www2."',
        site: { domain: 'www2.dev.sparteo.com' },
        expected: 'www2.dev.sparteo.com'
      },
      {
        label: 'removes port from site.page',
        site: { page: 'https://dev.sparteo.com:8080/path?q=1' },
        expected: 'dev.sparteo.com'
      },
      {
        label: 'removes "www." and path from site.page',
        site: { page: 'http://www.dev.sparteo.com/p?q=1' },
        expected: 'dev.sparteo.com'
      },
      {
        label: 'removes port when it appears in site.domain',
        site: { domain: 'dev.sparteo.com:8443' },
        expected: 'dev.sparteo.com'
      },
      {
        label: 'removes accidental path in site.domain',
        site: { domain: 'dev.sparteo.com/some/path' },
        expected: 'dev.sparteo.com'
      }
    ];

    CASES.forEach(({ label, site, expected }) => {
      it(label, function () {
        const bid = deepClone(VALID_BID_BANNER);
        bid.params.endpoint = ENDPOINT;
        const bidderReq = { bids: [bid], ortb2: { site } };

        const req = adapter.buildRequests([bid], bidderReq);
        delete req.data.id;

        expect(req.url).to.equal(
          `https://bid.sparteo.com/auction?network_id=1234567a-eb1b-1fae-1d23-e1fbaef234cf&site_domain=${expected}`
        );
      });
    });
  });
});
