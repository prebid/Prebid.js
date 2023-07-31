import {assert} from 'chai';
import {spec} from 'modules/stroeerCoreBidAdapter.js';
import * as utils from 'src/utils.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';
import {find} from 'src/polyfill.js';
import sinon from 'sinon';

describe('stroeerCore bid adapter', function () {
  let sandbox;
  let fakeServer;
  let bidderRequest;
  let clock;

  beforeEach(() => {
    bidderRequest = buildBidderRequest();
    sandbox = sinon.sandbox.create();
    fakeServer = sandbox.useFakeServer();
    clock = sandbox.useFakeTimers();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function assertStandardFieldsBid(bidObject, bidId, width, height, cpm) {
    assert.propertyVal(bidObject, 'requestId', bidId);
    assert.propertyVal(bidObject, 'width', width);
    assert.propertyVal(bidObject, 'height', height);
    assert.propertyVal(bidObject, 'cpm', cpm);
    assert.propertyVal(bidObject, 'currency', 'EUR');
    assert.propertyVal(bidObject, 'netRevenue', true);
    assert.propertyVal(bidObject, 'creativeId', '');
  }

  function assertStandardFieldsOnBannerBid(bidObject, bidId, ad, width, height, cpm) {
    assertStandardFieldsBid(bidObject, bidId, width, height, cpm);
    assertBannerAdMarkup(bidObject, ad);
  }

  function assertStandardFieldsOnVideoBid(bidObject, bidId, vastXml, width, height, cpm) {
    assertStandardFieldsBid(bidObject, bidId, width, height, cpm);
    assertVideoVastXml(bidObject, vastXml);
  }

  function assertBannerAdMarkup(bidObject, ad) {
    assert.propertyVal(bidObject, 'ad', ad);
    assert.notProperty(bidObject, 'vastXml');
  }

  function assertVideoVastXml(bidObject, vastXml) {
    assert.propertyVal(bidObject, 'vastXml', vastXml);
    assert.notProperty(bidObject, 'ad');
  }

  // Vendor user ids and associated data
  const userIds = Object.freeze({
    criteoId: 'criteo-user-id',
    digitrustid: {
      data: {
        id: 'encrypted-user-id==',
        keyv: 4,
        privacy: {optout: false},
        producer: 'ABC',
        version: 2
      }
    },
    lipb: {
      lipbid: 'T7JiRRvsRAmh88',
      segments: ['999']
    }
  });

  const buildBidderRequest = () => ({
    bidderRequestId: 'bidder-request-id-123',
    bidderCode: 'stroeerCore',
    timeout: 5000,
    auctionStart: 10000,
    refererInfo: {
      page: 'https://www.example.com/monkey/index.html',
      ref: 'https://www.example.com/?search=monkey'
    },
    bids: [{
      bidId: 'bid1',
      bidder: 'stroeerCore',
      adUnitCode: 'div-1',
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [160, 60]]
        }
      },
      params: {
        sid: 'NDA='
      },
      userId: userIds
    }, {
      bidId: 'bid2',
      bidder: 'stroeerCore',
      adUnitCode: 'div-2',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]],
        }
      },
      params: {
        sid: 'ODA='
      },
      userId: userIds
    }],
  });

  const buildBidderResponse = () => ({
    'bids': [{
      'bidId': 'bid1', 'cpm': 4.0, 'width': 300, 'height': 600, 'ad': '<div>tag1</div>', 'tracking': {'brandId': 123}
    }, {
      'bidId': 'bid2', 'cpm': 7.3, 'width': 728, 'height': 90, 'ad': '<div>tag2</div>'
    }]
  });

  const buildBidderResponseWithVideo = () => ({
    'bids': [{
      'bidId': 'bid1', 'cpm': 4.0, 'width': 800, 'height': 250, 'vastXml': '<vast>video</vast>'
    }]
  });

  const createWindow = (href, params = {}) => {
    let {parent, top, frameElement, placementElements = []} = params;

    const protocol = href.startsWith('https') ? 'https:' : 'http:';
    const win = {
      frameElement,
      parent,
      top,
      location: {
        protocol, href
      },
      document: {
        createElement: function () {
          return {
            setAttribute: function () {
            }
          }
        },
        getElementById: id => find(placementElements, el => el.id === id)
      }
    };

    win.self = win;

    if (!parent) {
      win.parent = win;
    }

    if (!top) {
      win.top = win;
    }

    return win;
  };

  function createElement(id, offsetTop = 0) {
    return {
      id,
      getBoundingClientRect: function () {
        return {
          top: offsetTop, height: 1
        }
      }
    }
  }

  function setupSingleWindow(sandBox, placementElements = [createElement('div-1', 17), createElement('div-2', 54)]) {
    const win = createWindow('http://www.xyz.com/', {
      parent: win, top: win, frameElement: createElement(undefined, 304), placementElements: placementElements
    });

    win.innerHeight = 200;

    sandBox.stub(utils, 'getWindowSelf').returns(win);
    sandBox.stub(utils, 'getWindowTop').returns(win);

    return win;
  }

  function setupNestedWindows(sandBox, placementElements = [createElement('div-1', 17), createElement('div-2', 54)]) {
    const topWin = createWindow('http://www.abc.org/');
    topWin.innerHeight = 800;

    const midWin = createWindow('http://www.abc.org/', {parent: topWin, top: topWin, frameElement: createElement()});
    midWin.innerHeight = 400;

    const win = createWindow('http://www.xyz.com/', {
      parent: midWin, top: topWin, frameElement: createElement(undefined, 304), placementElements
    });

    win.innerHeight = 200;

    sandBox.stub(utils, 'getWindowSelf').returns(win);
    sandBox.stub(utils, 'getWindowTop').returns(topWin);

    return {topWin, midWin, win};
  }

  it('should support BANNER and VIDEO mediaType', function () {
    assert.deepEqual(spec.supportedMediaTypes, [BANNER, VIDEO]);
  });

  it('should have GDPR vendor list id (gvlid) set on the spec', function () {
    assert.equal(spec.gvlid, 136);
  });

  describe('bid validation entry point', () => {
    let bidRequest;

    beforeEach(() => {
      bidRequest = buildBidderRequest().bids[0];
    });

    it('should have \"isBidRequestValid\" function', () => {
      assert.isFunction(spec.isBidRequestValid);
    });

    it('should pass a valid bid', () => {
      assert.isTrue(spec.isBidRequestValid(bidRequest));
    });

    it('should exclude bids without slot id param', () => {
      bidRequest.params.sid = undefined;
      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('should allow instream video bids', () => {
      delete bidRequest.mediaTypes.banner;
      bidRequest.mediaTypes.video = {
        playerSize: [640, 480],
        context: 'instream'
      };

      assert.isTrue(spec.isBidRequestValid(bidRequest));
    });

    it('should allow outstream video bids', () => {
      delete bidRequest.mediaTypes.banner;
      bidRequest.mediaTypes.video = {
        playerSize: [640, 480],
        context: 'outstream'
      };

      assert.isTrue(spec.isBidRequestValid(bidRequest));
    });

    it('should allow multi-format bid that has banner and instream video', () => {
      assert.isTrue('banner' in bidRequest.mediaTypes);

      // Allowed because instream video component of the bid will be ignored in buildRequest()
      bidRequest.mediaTypes.video = {
        playerSize: [640, 480],
        context: 'instream'
      };

      assert.isTrue(spec.isBidRequestValid(bidRequest))
    });

    it('should exclude multi-format bid that has no format of interest', () => {
      bidRequest.mediaTypes = {
        video: {
          playerSize: [640, 480],
          context: 'adpod'
        },
        native: {
          image: {
            required: true,
            sizes: [150, 50]
          },
          title: {
            required: true,
            len: 80
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          },
          privacyLink: {
            required: false
          },
          body: {
            required: true
          },
          icon: {
            required: true,
            sizes: [50, 50]
          }
        }
      };

      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('should exclude video bids without context', () => {
      delete bidRequest.mediaTypes.banner;
      bidRequest.mediaTypes.video = {
        playerSize: [640, 480],
        context: undefined
      };

      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('should exclude video, pre-version 3 bids', () => {
      delete bidRequest.mediaTypes;
      bidRequest.mediaType = VIDEO;
      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });
  });

  describe('build request entry point', () => {
    it('should have \"buildRequests\" function', () => {
      assert.isFunction(spec.buildRequests);
    });

    describe('url on server request info object', () => {
      let win;
      beforeEach(() => {
        win = setupSingleWindow(sandbox);
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should use hardcoded url as default endpoint', () => {
        const bidReq = buildBidderRequest();
        let serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

        assert.equal(serverRequestInfo.method, 'POST');
        assert.isObject(serverRequestInfo.data);
        assert.equal(serverRequestInfo.url, 'https://hb.adscale.de/dsh');
      });

      describe('should use custom url if provided', () => {
        const samples = [{
          protocol: 'http:',
          params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'},
          expected: 'https://other.com:234/xyz'
        }, {
          protocol: 'https:',
          params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'},
          expected: 'https://other.com:234/xyz'
        }, {
          protocol: 'https:',
          params: {sid: 'ODA=', host: 'other.com', port: '234', securePort: '871', path: '/xyz'},
          expected: 'https://other.com:871/xyz'
        }, {
          protocol: 'http:', params: {sid: 'ODA=', port: '234', path: '/xyz'}, expected: 'https://hb.adscale.de:234/xyz'
        }, ];

        samples.forEach(sample => {
          it(`should use ${sample.expected} as endpoint when given params ${JSON.stringify(sample.params)} and protocol ${sample.protocol}`,
            function () {
              win.location.protocol = sample.protocol;

              const bidReq = buildBidderRequest();
              bidReq.bids[0].params = sample.params;
              bidReq.bids.length = 1;

              let serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

              assert.equal(serverRequestInfo.method, 'POST');
              assert.isObject(serverRequestInfo.data);
              assert.equal(serverRequestInfo.url, sample.expected);
            });
        });
      });
    });

    describe('payload on server request info object', () => {
      let topWin;
      let win;

      let placementElements;
      beforeEach(() => {
        placementElements = [createElement('div-1', 17), createElement('div-2', 54)];
        ({ topWin, win } = setupNestedWindows(sandbox, placementElements));
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should have expected JSON structure', () => {
        clock.tick(13500);
        const bidReq = buildBidderRequest();

        const UUID = 'fb6a39e3-083f-424c-9046-f1095e15f3d5';

        const generateUUIDStub = sinon.stub(utils, 'generateUUID').returns(UUID);

        const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

        const expectedTimeout = bidderRequest.timeout - (13500 - bidderRequest.auctionStart);

        assert.equal(expectedTimeout, 1500);

        const expectedJsonPayload = {
          'id': UUID,
          'timeout': expectedTimeout,
          'ref': 'https://www.example.com/?search=monkey',
          'mpa': true,
          'ssl': false,
          'url': 'https://www.example.com/monkey/index.html',
          'bids': [{
            'sid': 'NDA=',
            'bid': 'bid1',
            'viz': true,
            'ban': {
              'siz': [[300, 600], [160, 60]]
            }
          }, {
            'sid': 'ODA=',
            'bid': 'bid2',
            'viz': true,
            'ban': {
              'siz': [[728, 90]]
            }
          }],
          'user': {
            'euids': userIds
          }
        };

        // trim away fields with undefined
        const actualJsonPayload = JSON.parse(JSON.stringify(serverRequestInfo.data));
        assert.deepEqual(actualJsonPayload, expectedJsonPayload);

        generateUUIDStub.restore();
      });

      describe('video bids', () => {
        it('should be able to build instream video bid', () => {
          bidderRequest.bids = [{
            bidId: 'bid1',
            bidder: 'stroeerCore',
            adUnitCode: 'div-1',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/quicktime']
              }
            },
            params: {
              sid: 'NDA='
            },
            userId: userIds
          }];

          const expectedBids = [{
            'sid': 'NDA=',
            'bid': 'bid1',
            'viz': true,
            'vid': {
              'ctx': 'instream',
              'siz': [640, 480],
              'mim': ['video/mp4', 'video/quicktime']
            }
          }];

          const serverRequestInfo = spec.buildRequests(bidderRequest.bids, bidderRequest);

          const bids = JSON.parse(JSON.stringify(serverRequestInfo.data.bids));
          assert.deepEqual(bids, expectedBids);
        });
      });

      describe('multi-formats', () => {
        it(`should create a request for video and banner`, () => {
          const videoBid = {
            bidId: 'bid3',
            bidder: 'stroeerCore',
            adUnitCode: 'div-1',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/quicktime'],
              }
            },
            params: {
              sid: 'ODA=',
            },
            userId: userIds
          }

          const bannerBid1 = {
            bidId: 'bid8',
            bidder: 'stroeerCore',
            adUnitCode: 'div-2',
            mediaTypes: {
              banner: {
                sizes: [[300, 600], [160, 60]],
              }
            },
            params: {
              sid: 'NDA=',
            },
            userId: userIds
          }

          const bannerBid2 = {
            bidId: 'bid12',
            bidder: 'stroeerCore',
            adUnitCode: 'div-3',
            mediaTypes: {
              banner: {
                sizes: [[100, 200], [300, 500]],
              }
            },
            params: {
              sid: 'ABC=',
            },
            userId: userIds
          }

          bidderRequest.bids = [bannerBid1, videoBid, bannerBid2];

          const expectedBannerBids = [
            {
              'sid': 'NDA=',
              'bid': 'bid8',
              'viz': true,
              'ban': {
                'siz': [[300, 600], [160, 60]],
                'fp': undefined
              },
            },
            {
              'sid': 'ABC=',
              'bid': 'bid12',
              'ban': {
                'siz': [[100, 200], [300, 500]],
                'fp': undefined
              },
              'viz': undefined
            }
          ];

          const expectedVideoBids = [
            {
              'sid': 'ODA=',
              'bid': 'bid3',
              'viz': true,
              'vid': {
                'ctx': 'instream',
                'siz': [640, 480],
                'mim': ['video/mp4', 'video/quicktime'],
                'fp': undefined
              }
            }
          ];

          const serverRequestInfo = spec.buildRequests(bidderRequest.bids, bidderRequest);

          assert.deepEqual(serverRequestInfo.data.bids, [...expectedBannerBids, ...expectedVideoBids]);
        });

        it('should split multi-format bid', function() {
          const multiFormatBid = {
            bidId: 'bid3',
            bidder: 'stroeerCore',
            adUnitCode: 'div-1',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/quicktime'],
              },
              banner: {
                sizes: [[100, 200], [300, 500]],
              }
            },
            params: {
              sid: 'ODA=',
            },
            userId: userIds
          }

          bidderRequest.bids = [multiFormatBid];

          const serverRequestInfo = spec.buildRequests(bidderRequest.bids, bidderRequest);

          const expectedBannerBids = [
            {
              'sid': 'ODA=',
              'bid': 'bid3',
              'viz': true,
              'ban': {
                'siz': [[100, 200], [300, 500]],
                'fp': undefined
              }
            }
          ];

          const expectedVideoBids = [
            {
              'sid': 'ODA=',
              'bid': 'bid3',
              'viz': true,
              'vid': {
                'ctx': 'instream',
                'siz': [640, 480],
                'mim': ['video/mp4', 'video/quicktime'],
                'fp': undefined
              }
            }
          ];

          assert.deepEqual(serverRequestInfo.data.bids, [...expectedBannerBids, ...expectedVideoBids]);
        });
      });

      describe('optional fields', () => {
        it('should skip viz field when unable to determine visibility of placement', () => {
          placementElements.length = 0;
          const bidReq = buildBidderRequest();

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);
          assert.lengthOf(serverRequestInfo.data.bids, 2);

          for (let bid of serverRequestInfo.data.bids) {
            assert.isUndefined(bid.viz);
          }
        });

        it('should skip ref field when unable to determine document referrer', () => {
          // i.e., empty if user came from bookmark, or web page using 'rel="noreferrer" on link, etc
          buildBidderRequest();

          const serverRequestInfo = spec.buildRequests(bidderRequest.bids, bidderRequest);
          assert.lengthOf(serverRequestInfo.data.bids, 2);

          for (let bid of serverRequestInfo.data.bids) {
            assert.isUndefined(bid.ref);
          }
        });

        const gdprSamples = [
          {consentString: 'RG9ua2V5IEtvbmc=', gdprApplies: true},
          {consentString: 'UGluZyBQb25n', gdprApplies: false},
          {consentString: undefined, gdprApplies: true},
          {consentString: undefined, gdprApplies: false},
          {consentString: undefined, gdprApplies: undefined},
        ];
        gdprSamples.forEach((sample) => {
          it(`should add GDPR info ${JSON.stringify(sample)} when provided`, () => {
            const bidReq = buildBidderRequest();
            bidReq.gdprConsent = sample;

            const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

            const actualGdpr = serverRequestInfo.data.gdpr;
            assert.propertyVal(actualGdpr, 'applies', sample.gdprApplies);
            assert.propertyVal(actualGdpr, 'consent', sample.consentString);
          });
        });

        it(`should not add GDPR info when not provided`, () => {
          const bidReq = buildBidderRequest();

          delete bidReq.gdprConsent;

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

          assert.notProperty(serverRequestInfo.data, 'gdpr');
        });

        it('should be able to build without third party user id data', () => {
          const bidReq = buildBidderRequest();
          bidReq.bids.forEach(bid => delete bid.userId);
          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);
          assert.lengthOf(serverRequestInfo.data.bids, 2);
          assert.notProperty(serverRequestInfo, 'uids');
        });

        it('should add schain if available', () => {
          const schain = Object.freeze({
            ver: '1.0',
            complete: 1,
            'nodes': [
              {
                asi: 'exchange1.com',
                sid: 'ABC',
                hp: 1,
                rid: 'bid-request-1',
                name: 'publisher',
                domain: 'publisher.com'
              }
            ]
          });

          const bidReq = buildBidderRequest();
          bidReq.bids.forEach(bid => bid.schain = schain);

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);
          assert.deepEqual(serverRequestInfo.data.schain, schain);
        });

        it('should add floor info to banner bid request if floor is available', () => {
          const bidReq = buildBidderRequest();

          const getFloorStub1 = sinon.stub();
          const getFloorStub2 = sinon.stub();

          getFloorStub1
            .returns({})
            .withArgs({currency: 'EUR', mediaType: BANNER, size: '*'})
            .returns({currency: 'TRY', floor: 0.7})
            .withArgs({currency: 'EUR', mediaType: 'banner', size: [300, 600]})
            .returns({currency: 'TRY', floor: 1.3})
            .withArgs({currency: 'EUR', mediaType: 'banner', size: [160, 60]})
            .returns({currency: 'TRY', floor: 2.5})

          getFloorStub2
            .returns({})
            .withArgs({currency: 'EUR', mediaType: 'banner', size: '*'})
            .returns({currency: 'USD', floor: 1.2})
            .withArgs({currency: 'EUR', mediaType: 'banner', size: [728, 90]})
            .returns({currency: 'USD', floor: 1.85})

          bidReq.bids[0].getFloor = getFloorStub1;
          bidReq.bids[1].getFloor = getFloorStub2;

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

          const serverRequestBids = serverRequestInfo.data.bids;
          const firstBid = serverRequestBids[0];
          const secondBid = serverRequestBids[1];

          assert.nestedPropertyVal(firstBid, 'ban.fp.def', 0.7);
          assert.nestedPropertyVal(firstBid, 'ban.fp.cur', 'TRY');
          assert.deepNestedPropertyVal(firstBid, 'ban.fp.siz', [{w: 300, h: 600, p: 1.3}, {w: 160, h: 60, p: 2.5}]);

          assert.isTrue(getFloorStub1.calledThrice);

          assert.nestedPropertyVal(secondBid, 'ban.fp.def', 1.2);
          assert.nestedPropertyVal(secondBid, 'ban.fp.cur', 'USD');
          assert.deepNestedPropertyVal(secondBid, 'ban.fp.siz', [{w: 728, h: 90, p: 1.85}]);

          assert.isTrue(getFloorStub2.calledTwice);
        });

        it('should add floor info to video bid request if floor is available', () => {
          const bidReq = buildBidderRequest();

          const getFloorStub1 = sinon.stub();
          const getFloorStub2 = sinon.stub();

          getFloorStub1
            .returns({})
            .withArgs({currency: 'EUR', mediaType: 'video', size: '*'})
            .returns({currency: 'NZD', floor: 3.25})
            .withArgs({currency: 'EUR', mediaType: 'video', size: [640, 480]})
            .returns({currency: 'NZD', floor: 4.10});

          getFloorStub2
            .returns({})
            .withArgs({currency: 'EUR', mediaType: 'video', size: '*'})
            .returns({currency: 'GBP', floor: 4.75})
            .withArgs({currency: 'EUR', mediaType: 'video', size: [1280, 720]})
            .returns({currency: 'GBP', floor: 6.50})

          delete bidReq.bids[0].mediaTypes.banner;
          bidReq.bids[0].mediaTypes.video = {
            playerSize: [640, 480],
            context: 'instream'
          };

          delete bidReq.bids[1].mediaTypes.banner;
          bidReq.bids[1].mediaTypes.video = {
            playerSize: [1280, 720],
            context: 'outstream'
          };

          bidReq.bids[0].getFloor = getFloorStub1;
          bidReq.bids[1].getFloor = getFloorStub2;

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

          const serverRequestBids = serverRequestInfo.data.bids;
          const firstBid = serverRequestBids[0];
          const secondBid = serverRequestBids[1];

          assert.nestedPropertyVal(firstBid, 'vid.fp.def', 3.25);
          assert.nestedPropertyVal(firstBid, 'vid.fp.cur', 'NZD');
          assert.deepNestedPropertyVal(firstBid, 'vid.fp.siz', [{w: 640, h: 480, p: 4.10}]);

          assert.isTrue(getFloorStub1.calledTwice);

          assert.nestedPropertyVal(secondBid, 'vid.fp.def', 4.75);
          assert.nestedPropertyVal(secondBid, 'vid.fp.cur', 'GBP');
          assert.deepNestedPropertyVal(secondBid, 'vid.fp.siz', [{w: 1280, h: 720, p: 6.50}]);

          assert.isTrue(getFloorStub2.calledTwice);
        });

        it('should not add floor info to bid request if floor is unavailable', () => {
          const bidReq = buildBidderRequest();
          const getFloorSpy = sinon.spy(() => ({}));

          delete bidReq.bids[0].getFloor;
          bidReq.bids[1].getFloor = getFloorSpy;

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

          const serverRequestBids = serverRequestInfo.data.bids;
          const firstBid = serverRequestBids[0];
          const secondBid = serverRequestBids[1];

          assert.nestedPropertyVal(firstBid, 'ban.fp', undefined);
          assert.nestedPropertyVal(secondBid, 'ban.fp', undefined);

          assert.isTrue(getFloorSpy.calledWith({currency: 'EUR', mediaType: 'banner', size: '*'}));
          assert.isTrue(getFloorSpy.calledWith({currency: 'EUR', mediaType: 'banner', size: [728, 90]}));
          assert.isTrue(getFloorSpy.calledTwice);
        });

        it('should not add floor info for a size when it is the same as the default', () => {
          const bidReq = buildBidderRequest();
          const getFloorStub = sinon.stub();

          getFloorStub
            .returns({currency: 'EUR', floor: 1.9})
            .withArgs({currency: 'EUR', mediaType: BANNER, size: [160, 60]})
            .returns({currency: 'EUR', floor: 2.7});

          bidReq.bids[0].getFloor = getFloorStub;

          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

          const serverRequestBids = serverRequestInfo.data.bids;
          const bid = serverRequestBids[0];

          assert.nestedPropertyVal(bid, 'ban.fp.def', 1.9);
          assert.nestedPropertyVal(bid, 'ban.fp.cur', 'EUR');
          assert.deepNestedPropertyVal(bid, 'ban.fp.siz', [{w: 160, h: 60, p: 2.7}]);
        });
      });
    });
  });

  describe('interpret response entry point', () => {
    it('should have \"interpretResponse\" function', () => {
      assert.isFunction(spec.interpretResponse);
    });

    const invalidResponses = ['', '  ', ' ', undefined, null];
    invalidResponses.forEach(sample => {
      it('should ignore invalid responses (\"' + sample + '\") response', () => {
        const result = spec.interpretResponse({body: sample});
        assert.isArray(result);
        assert.lengthOf(result, 0);
      });
    });

    it('should interpret a standard response', () => {
      const bidderResponse = buildBidderResponse();

      const result = spec.interpretResponse({body: bidderResponse});
      assertStandardFieldsOnBannerBid(result[0], 'bid1', '<div>tag1</div>', 300, 600, 4);
      assertStandardFieldsOnBannerBid(result[1], 'bid2', '<div>tag2</div>', 728, 90, 7.3);
    });

    it('should return empty array, when response contains no bids', () => {
      const result = spec.interpretResponse({body: {bids: []}});
      assert.deepStrictEqual(result, []);
    });

    it('should interpret a video response', () => {
      const bidderResponse = buildBidderResponseWithVideo();
      const bidResponses = spec.interpretResponse({body: bidderResponse});
      let videoBidResponse = bidResponses[0];
      assertStandardFieldsOnVideoBid(videoBidResponse, 'bid1', '<vast>video</vast>', 800, 250, 4);
    })

    it('should add data to meta object', () => {
      const response = buildBidderResponse();
      response.bids[0] = Object.assign(response.bids[0], {adomain: ['website.org', 'domain.com']});
      const result = spec.interpretResponse({body: response});
      assert.deepPropertyVal(result[0], 'meta', {advertiserDomains: ['website.org', 'domain.com']});
      // nothing provided for the second bid
      assert.deepPropertyVal(result[1], 'meta', {advertiserDomains: undefined});
    });
  });

  describe('get user syncs entry point', () => {
    let win;

    beforeEach(() => {
      win = setupSingleWindow(sandbox);

      // fake
      win.document.createElement = function () {
        const attrs = {};
        return {
          setAttribute: (name, value) => {
            attrs[name] = value
          },
          getAttribute: (name) => attrs[name],
          hasAttribute: (name) => attrs[name] !== undefined,
          tagName: 'SCRIPT',
        }
      }
    });

    it('should have \"getUserSyncs\" function', () => {
      assert.isFunction(spec.getUserSyncs);
    });

    describe('when iframe option is enabled', () => {
      it('should perform user connect when there was a response', () => {
        const expectedUrl = 'https://js.adscale.de/pbsync.html';
        const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, ['']);

        assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
      });

      it('should not perform user connect when there was no response', () => {
        const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, []);

        assert.deepStrictEqual(userSyncResponse, []);
      });

      describe('and gdpr consent is defined', () => {
        describe('and gdpr applies', () => {
          it('should place gdpr query param to the user sync url with value of 1', () => {
            const expectedUrl = 'https://js.adscale.de/pbsync.html?gdpr=1&gdpr_consent=';
            const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, [''], {gdprApplies: true});

            assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
          });
        });

        describe('and gdpr does not apply', () => {
          it('should place gdpr query param to the user sync url with zero value', () => {
            const expectedUrl = 'https://js.adscale.de/pbsync.html?gdpr=0&gdpr_consent=';
            const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, [''], {gdprApplies: false});

            assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
          });

          describe('because consent does not specify it', () => {
            it('should place gdpr query param to the user sync url with zero value', () => {
              const expectedUrl = 'https://js.adscale.de/pbsync.html?gdpr=0&gdpr_consent=';
              const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, [''], {});

              assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
            });
          });
        });

        describe('and consent string is defined', () => {
          it('should pass consent string to gdpr consent query param', () => {
            const consentString = 'consent_string';
            const expectedUrl = `https://js.adscale.de/pbsync.html?gdpr=1&gdpr_consent=${consentString}`;
            const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, [''], {gdprApplies: true, consentString});

            assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
          });

          it('should correctly escape invalid characters', () => {
            const consentString = 'consent ?stri&ng';
            const expectedUrl = `https://js.adscale.de/pbsync.html?gdpr=1&gdpr_consent=consent%20%3Fstri%26ng`;
            const userSyncResponse = spec.getUserSyncs({iframeEnabled: true}, [''], {gdprApplies: true, consentString});

            assert.deepStrictEqual(userSyncResponse, [{type: 'iframe', url: expectedUrl}]);
          });
        });
      });
    });

    describe('when iframe option is disabled', () => {
      it('should not perform user connect even when there was a response', () => {
        const userSyncResponse = spec.getUserSyncs({iframeEnabled: false}, ['']);

        assert.deepStrictEqual(userSyncResponse, []);
      });

      it('should not perform user connect when there was no response', () => {
        const userSyncResponse = spec.getUserSyncs({iframeEnabled: false}, []);

        assert.deepStrictEqual(userSyncResponse, []);
      });
    });
  });
});
