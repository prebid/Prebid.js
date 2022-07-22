import {assert} from 'chai';
import {spec} from 'modules/stroeerCoreBidAdapter.js';
import * as utils from 'src/utils.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';
import {find} from 'src/polyfill.js';

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

  function assertStandardFieldsOnBid(bidObject, bidId, ad, width, height, cpm) {
    assert.propertyVal(bidObject, 'requestId', bidId);
    assert.propertyVal(bidObject, 'ad', ad);
    assert.propertyVal(bidObject, 'width', width);
    assert.propertyVal(bidObject, 'height', height);
    assert.propertyVal(bidObject, 'cpm', cpm);
    assert.propertyVal(bidObject, 'currency', 'EUR');
    assert.propertyVal(bidObject, 'netRevenue', true);
    assert.propertyVal(bidObject, 'creativeId', '');
  }

  const AUCTION_ID = utils.getUniqueIdentifierStr();

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
    auctionId: AUCTION_ID,
    bidderRequestId: 'bidder-request-id-123',
    bidderCode: 'stroeerCore',
    timeout: 5000,
    auctionStart: 10000,
    refererInfo: {
      referer: 'https://www.example.com/index.html'
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

  const buildBidderRequestPreVersion3 = () => {
    const request = buildBidderRequest();
    request.bids.forEach((bid) => {
      bid.sizes = bid.mediaTypes.banner.sizes;
      delete bid.mediaTypes;
      bid.mediaType = 'banner';
    });
    return request;
  };

  const buildBidderResponse = () => ({
    'bids': [{
      'bidId': 'bid1', 'cpm': 4.0, 'width': 300, 'height': 600, 'ad': '<div>tag1</div>', 'tracking': {'brandId': 123}
    }, {
      'bidId': 'bid2', 'cpm': 7.3, 'width': 728, 'height': 90, 'ad': '<div>tag2</div>'
    }]
  });

  const createWindow = (href, params = {}) => {
    let {parent, referrer, top, frameElement, placementElements = []} = params;

    const protocol = (href.indexOf('https') === 0) ? 'https:' : 'http:';
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
        referrer,
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
    const topWin = createWindow('http://www.abc.org/', {referrer: 'http://www.google.com/?query=monkey'});
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

  it('should only support BANNER mediaType', function () {
    assert.deepEqual(spec.supportedMediaTypes, [BANNER]);
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

    it('should exclude non-banner bids', () => {
      delete bidRequest.mediaTypes.banner;
      bidRequest.mediaTypes.video = {
        playerSize: [640, 480]
      };

      assert.isFalse(spec.isBidRequestValid(bidRequest));
    });

    it('should exclude non-banner, pre-version 3 bids', () => {
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
          protocol: 'http:', params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'}, expected: 'https://other.com:234/xyz'
        }, {
          protocol: 'https:', params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'}, expected: 'https://other.com:234/xyz'
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

        const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

        const expectedTimeout = bidderRequest.timeout - (13500 - bidderRequest.auctionStart);

        assert.equal(expectedTimeout, 1500);

        const expectedJsonPayload = {
          'id': AUCTION_ID,
          'timeout': expectedTimeout,
          'ref': topWin.document.referrer,
          'mpa': true,
          'ssl': false,
          'url': 'https://www.example.com/index.html',
          'bids': [{
            'sid': 'NDA=', 'bid': 'bid1', 'siz': [[300, 600], [160, 60]], 'viz': true
          }, {
            'sid': 'ODA=', 'bid': 'bid2', 'siz': [[728, 90]], 'viz': true
          }],
          'user': {
            'euids': userIds
          }
        };

        // trim away fields with undefined
        const actualJsonPayload = JSON.parse(JSON.stringify(serverRequestInfo.data));

        assert.deepEqual(actualJsonPayload, expectedJsonPayload);
      });

      it('should handle banner sizes for pre version 3', () => {
        // Version 3 changes the way how banner sizes are accessed.
        // We can support backwards compatibility with version 2.x
        const bidReq = buildBidderRequestPreVersion3();
        const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);
        assert.deepEqual(serverRequestInfo.data.bids[0].siz, [[300, 600], [160, 60]]);
        assert.deepEqual(serverRequestInfo.data.bids[1].siz, [[728, 90]]);
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

        const gdprSamples = [{consentString: 'RG9ua2V5IEtvbmc=', gdprApplies: true}, {consentString: 'UGluZyBQb25n', gdprApplies: false}];
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

        const skippableGdprSamples = [{consentString: null, gdprApplies: true}, //
          {consentString: 'UGluZyBQb25n', gdprApplies: null}, //
          {consentString: null, gdprApplies: null}, //
          {consentString: undefined, gdprApplies: true}, //
          {consentString: 'UGluZyBQb25n', gdprApplies: undefined}, //
          {consentString: undefined, gdprApplies: undefined}];
        skippableGdprSamples.forEach((sample) => {
          it(`should not add GDPR info ${JSON.stringify(sample)} when one or more values are missing`, () => {
            const bidReq = buildBidderRequest();
            bidReq.gdprConsent = sample;

            const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);

            const actualGdpr = serverRequestInfo.data.gdpr;
            assert.isUndefined(actualGdpr);
          });
        });

        it('should be able to build without third party user id data', () => {
          const bidReq = buildBidderRequest();
          bidReq.bids.forEach(bid => delete bid.userId);
          const serverRequestInfo = spec.buildRequests(bidReq.bids, bidReq);
          assert.lengthOf(serverRequestInfo.data.bids, 2);
          assert.notProperty(serverRequestInfo, 'uids');
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
      assertStandardFieldsOnBid(result[0], 'bid1', '<div>tag1</div>', 300, 600, 4);
      assertStandardFieldsOnBid(result[1], 'bid2', '<div>tag2</div>', 728, 90, 7.3);
    });

    it('should return empty array, when response contains no bids', () => {
      const result = spec.interpretResponse({body: {bids: []}});
      assert.deepStrictEqual(result, []);
    });

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
