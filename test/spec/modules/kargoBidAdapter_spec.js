import { expect } from 'chai';
import { spec } from 'modules/kargoBidAdapter.js';
import { config } from 'src/config.js';
const utils = require('src/utils');

describe('kargo adapter tests', function() {
  let bid, outstreamBid, testBids, sandbox, clock, frozenNow = new Date(), oldBidderSettings;

  const topUrl = 'https://random.com/this/is/a/url';
  const domain = 'random.com';
  const referer = 'https://random.com/';

  const defaultBidParams = Object.freeze({
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    getFloor: () => {},
    ortb2: {
      device: {
        w: 1720,
        h: 1000,
        dnt: 0,
        language: 'en',
        ua: 'Mozilla/5.0'
      },
      site: {
        domain: domain,
        mobile: 0,
        page: topUrl,
        publisher: {
          domain: domain
        },
        ref: referer
      },
      source: {
        tid: 'random-tid'
      }
    },
    ortb2Imp: {
      ext: {
        data: {
          pbadslot: '/1234/prebid/slot/path'
        },
        gpid: '/1234/prebid/slot/path',
      }
    },
    userId: {
      tdid: 'random-tdid'
    },
    userIdAsEids: [
      {
        source: 'adquery.io',
        uids: [ {
          id: 'adquery-id',
          atype: 1
        } ]
      },
      {
        source: 'criteo.com',
        uids: [ {
          id: 'criteo-id',
          atype: 1
        } ]
      },
      {
        source: 'adserver.org',
        uids: [ {
          id: 'adserver-id',
          atype: 1,
          ext: { rtiPartner: 'TDID' }
        } ]
      },
    ],
    floorData: {
      floorMin: 1
    },
    schain: {
      validation: 'strict',
      config: {
        ver: '1.0',
        complete: 1,
        nodes: [ {
          asi: 'indirectseller.com',
          sid: '00001',
          hp: 1,
        } ]
      }
    },
  });

  const minimumBidParams = Object.freeze({
    params: {
      placementId: 'foobar'
    },
    mediaTypes: {
      banner: { sizes: [ [1, 1] ] }
    }
  });

  const validCrbIds = {
    2: '82fa2555-5969-4614-b4ce-4dcf1080e9f9',
    16: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
    23: 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
    24: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
    25: '5ee24138-5e03-4b9d-a953-38e833f2849f',
    '2_80': 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
    '2_93': '5ee24138-5e03-4b9d-a953-38e833f2849f'
  };
  const validCrbIdsLs = {
    2: '82fa2555-5969-4614-b4ce-4dcf1080e9f9',
    16: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
    23: 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
    25: '5ee24138-5e03-4b9d-a953-38e833f2849f',
    '2_80': 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
    '2_93': '5ee24138-5e03-4b9d-a953-38e833f2849f'
  };
  function buildCrbValue(isCookie, withIds, withTdid, withLexId, withClientId, optOut) {
    let value = {
      expireTime: Date.now() + 60000,
      lastSyncedAt: Date.now() - 60000,
      optOut,
    };
    const locationString = isCookie ? 'cookie' : 'localstorage';

    if (withIds) {
      if (isCookie) {
        value.syncIds = validCrbIds;
      } else {
        value.syncIds = validCrbIdsLs;
      }
    }
    if (withTdid) {
      value.tdID = `test-tdid-cerberus-${locationString}`;
    }
    if (withLexId) {
      value.lexId = `test-lexid-cerberus-${locationString}`;
    }
    if (withClientId) {
      value.clientId = `test-clientid-cerberus-${locationString}`;
    }

    const b64Value = btoa(JSON.stringify(value));
    if (isCookie) {
      return JSON.stringify({ v: b64Value });
    }
    return b64Value;
  }

  beforeEach(function() {
    oldBidderSettings = $$PREBID_GLOBAL$$.bidderSettings;
    $$PREBID_GLOBAL$$.bidderSettings = {
      kargo: { storageAllowed: true }
    };

    bid = {
      ...defaultBidParams,
      bidder: 'kargo',
      params: {
        placementId: 'displayPlacement'
      },
      mediaTypes: {
        banner: {
          sizes: [ [970, 250], [1, 1] ]
        }
      },
      adUnitCode: 'displayAdunitCode',
      sizes: [ [300, 250], [300, 600] ],
      bidId: 'randomBidId',
      bidderRequestId: 'randomBidderRequestId',
      auctionId: 'randomAuctionId'
    };

    outstreamBid = {
      ...defaultBidParams,
      bidder: 'kargo',
      params: {
        placementId: 'instreamPlacement'
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480],
          api: [ 1, 2 ],
          linearity: 1,
          maxduration: 60,
          mimes: [ 'video/mp4', 'video/webm', 'application/javascript' ],
          minduration: 0,
          placement: 1,
          playbackmethod: [ 1, 2, 3 ],
          plcmt: 1,
          protocols: [ 2, 3, 5 ],
          skip: 1
        }
      },
      adUnitCode: 'instreamAdunitCode',
      sizes: [ [300, 250], [300, 600] ],
      bidId: 'randomBidId2',
      bidderRequestId: 'randomBidderRequestId2',
      auctionId: 'randomAuctionId2'
    };

    testBids = [{ ...minimumBidParams }];

    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers(frozenNow.getTime());
  });

  afterEach(function() {
    sandbox.restore();
    clock.restore();
    $$PREBID_GLOBAL$$.bidderSettings = oldBidderSettings;
  });

  describe('gvlid', function() {
    it('exposes the gvlid (global vendor list ID) of 972', function() {
      expect(spec.gvlid).to.exist.and.equal(972);
    });
  });

  describe('code', function() {
    it('exposes the code kargo', function() {
      expect(spec.code).to.exist.and.equal('kargo');
    });
  });

  describe('isBidRequestValid', function() {
    it('fails when the bid object is undefined', function() {
      expect(spec.isBidRequestValid()).to.equal(false);
    });

    it('fails when the bid object has no keys at all', function() {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('fails when the bid includes params but not a placement ID', function() {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    });

    it('passes when the bid includes a placement ID', function () {
      expect(spec.isBidRequestValid({ params: { placementId: 'foo' } })).to.equal(true);
    });

    it('passes when the bid includes a placement ID and other keys', function() {
      expect(spec.isBidRequestValid({ params: { placementId: 'foo', other: 'value' } })).to.equal(true);
    });

    it('passes when the full bid information is provided', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      expect(spec.isBidRequestValid(outstreamBid)).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    let bids,
      bidderRequest,
      undefinedCurrency,
      noAdServerCurrency,
      nonUSDAdServerCurrency,
      cookies = [],
      localStorageItems = [],
      session_id = null;

    before(function() {
      sinon.spy(spec, 'buildRequests');
    });

    beforeEach(function() {
      undefinedCurrency = false;
      noAdServerCurrency = false;
      nonUSDAdServerCurrency = false;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'currency') {
          if (undefinedCurrency) return undefined;

          if (noAdServerCurrency) return {};

          if (nonUSDAdServerCurrency) return { adServerCurrency: 'EUR' };

          return { adServerCurrency: 'USD' };
        }

        if (key === 'debug') return true;
        if (key === 'deviceAccess') return true;
        throw new Error(`Config stub incomplete, missing key "${key}"`);
      });

      bids = [
        bid,
        outstreamBid
      ];

      bidderRequest = {
        bidderCode: 'kargo',
        auctionId: 'test-auction-id',
        bidderRequestId: 'test-request-id',
        bids,
        ortb2: defaultBidParams.ortb2,
        refererInfo: {
          canonicalUrl: topUrl,
          domain,
          isAmp: false,
          location: topUrl,
          numIframs: 0,
          page: topUrl,
          reachedTop: true,
          ref: referer,
          stack: [ topUrl ],
          topmostLocation: topUrl,
        },
        start: Date.now(),
        timeout: 2500,
      };
    });
    afterEach(function() {
      cookies.forEach(key => document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`);
      cookies = [];

      localStorageItems.forEach(key => localStorage.removeItem(key));
      localStorageItems = [];
    });

    function getPayloadFromTestBids(testBids) {
      const request = spec.buildRequests(testBids, { ...bidderRequest, bids: testBids });
      const payload = request.data;
      if (session_id === null) session_id = spec._getSessionId();

      expect(payload).to.exist;
      expect(payload.imp).to.have.length(testBids.length);
      expect(payload.requestCount).to.equal(spec.buildRequests.callCount - 1);
      expect(payload.sid).to.equal(session_id);

      return payload;
    }

    function setCookieValue(name, value) {
      cookies.push(name);
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age-in-seconds=1000; path=/`;
    }

    function setLocalStorageValue(name, value) {
      localStorageItems.push(name);
      localStorage.setItem(name, value);
    }

    const crbValues = {
      valid: buildCrbValue(true, true, true, true, true, false),
      validLs: buildCrbValue(false, true, true, true, true, false),
      invalidB64: 'crbValue',
      invalidB64Ls: 'crbValueLs',
      invalidJson: 'eyJ0ZXN0OiJ2YWx1ZSJ9',
      invalidJsonLs: 'eyJ0ZXN0OiJ2YWx1ZSJ9',
    };
    function setCrb(
      setCookie = 'valid',
      setLocalStorage = 'valid'
    ) {
      if (crbValues.hasOwnProperty(setCookie)) {
        setCookieValue('krg_crb', crbValues[setCookie]);
      }
      if (crbValues.hasOwnProperty(`${setLocalStorage}Ls`)) {
        setLocalStorageValue('krg_crb', crbValues[`${setLocalStorage}Ls`]);
      }
    }

    it('exists and produces an object', function() {
      const request = spec.buildRequests(bids, bidderRequest);
      expect(request).to.exist.and.to.be.an('object');
    });

    it('produces a POST request with a payload', function() {
      const request = spec.buildRequests(bids, bidderRequest);
      expect(request.method).to.exist.and.equal('POST');
      expect(request.url).to.exist.and.equal('https://krk2.kargo.com/api/v1/prebid');

      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.imp).to.have.length(2);

      // Display bid
      const bidImp = payload.imp[0];
      expect(bidImp.id).to.equal('randomBidId');
      expect(bidImp.banner).to.deep.equal({ sizes: [ [970, 250], [1, 1] ] });
      expect(bidImp.video).to.be.undefined;
      expect(bidImp.bidRequestCount).to.equal(1);
      expect(bidImp.bidderRequestCount).to.equal(1);
      expect(bidImp.code).to.equal('displayAdunitCode');
      expect(bidImp.ext.ortb2Imp).to.deep.equal(defaultBidParams.ortb2Imp);
      expect(bidImp.fpd).to.deep.equal({ gpid: '/1234/prebid/slot/path' });
      expect(bidImp.pid).to.equal('displayPlacement');

      // Video bid
      const videoBidImp = payload.imp[1];
      expect(videoBidImp.id).to.equal('randomBidId2');
      expect(videoBidImp.banner).to.be.undefined;
      expect(videoBidImp.video).to.deep.equal(outstreamBid.mediaTypes.video);
      expect(videoBidImp.bidRequestCount).to.equal(1);
      expect(videoBidImp.bidderRequestCount).to.equal(1);
      expect(videoBidImp.code).to.equal('instreamAdunitCode');
      expect(videoBidImp.ext.ortb2Imp).to.deep.equal(defaultBidParams.ortb2Imp);
      expect(videoBidImp.fpd).to.deep.equal({ gpid: '/1234/prebid/slot/path' });
      expect(videoBidImp.pid).to.equal('instreamPlacement');

      // User
      expect(payload.user).to.be.an('object');
      expect(payload.user.crbIDs).to.deep.equal({});
      expect(payload.user.data).to.deep.equal([]);
      expect(payload.user.sharedIDEids).to.deep.equal(defaultBidParams.userIdAsEids);

      // General keys
      expect(payload.aid).to.equal('randomAuctionId');
      expect(payload.device).to.deep.equal({ size: [ window.screen.width, window.screen.height ] });
      expect(payload.ext.ortb2).to.deep.equal(defaultBidParams.ortb2);
      expect(payload.pbv).to.equal('$prebid.version$');
      expect(payload.requestCount).to.equal(spec.buildRequests.callCount - 1);
      expect(payload.sid).to.be.a('string').with.length(36);
      expect(payload.timeout).to.equal(2500);
      expect(payload.url).to.equal(topUrl);
      expect(payload.ts).to.be.a('number');
    });

    it('copies the ortb2 object from the first bid request if present', function() {
      let payload;
      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        ortb2: {
          user: {
            key: 'value'
          }
        }
      }]);
      expect(payload.ext).to.deep.equal({ ortb2: {
        user: { key: 'value' }
      }});

      payload = getPayloadFromTestBids(testBids);
      expect(payload.ext).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        ortb2: {
          user: {
            key: 'value'
          }
        }
      }, {
        ...minimumBidParams,
        ortb2: {
          site: {
            key2: 'value2'
          }
        }
      }]);
      expect(payload.ext).to.deep.equal({ortb2: {
        user: { key: 'value' }
      }});
    });

    it('pulls the site category from the first bids ortb2 object', function() {
      let payload;
      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        ortb2: { site: { cat: 'test-cat' } }
      }]);
      expect(payload.site).to.deep.equal({ cat: 'test-cat' });

      payload = getPayloadFromTestBids(testBids);
      expect(payload.site).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        ortb2: { site: { cat: 'test-cat' } }
      }, {
        ...minimumBidParams,
        ortb2: { site: { cat: 'test-cat-2' } }
      }]);
      expect(payload.site).to.deep.equal({ cat: 'test-cat' });
    });

    it('pulls the schain from the first bid if it is populated', function() {
      let payload;
      payload = getPayloadFromTestBids(testBids);
      expect(payload.schain).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        schain: {}
      }, {
        ...minimumBidParams,
        schain: {
          complete: 1,
          nodes: [{
            asi: 'test-page.com',
            hp: 1,
            rid: '57bdd953-6e57-4d5b-9351-ed67ca238890',
            sid: '8190248274'
          }]
        }
      }]);
      expect(payload.schain).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        schain: {
          complete: 1,
          nodes: [{
            asi: 'test-page.com',
            hp: 1,
            rid: '57bdd953-6e57-4d5b-9351-ed67ca238890',
            sid: '8190248274'
          }]
        }
      }, {
        ...minimumBidParams,
        schain: {
          complete: 1,
          nodes: [{
            asi: 'test-page-2.com',
            hp: 1,
            rid: 'other-rid',
            sid: 'other-sid'
          }]
        }
      }]);
      expect(payload.schain).to.deep.equal({
        complete: 1,
        nodes: [{
          asi: 'test-page.com',
          hp: 1,
          rid: '57bdd953-6e57-4d5b-9351-ed67ca238890',
          sid: '8190248274'
        }]
      });
    });

    it('does not send currency if it is not defined', function() {
      undefinedCurrency = true;
      let payload = getPayloadFromTestBids(testBids);
      expect(payload.cur).to.be.undefined;
    });

    it('does not send currency if it is missing', function() {
      noAdServerCurrency = true;
      let payload = getPayloadFromTestBids(testBids);
      expect(payload.cur).to.be.undefined;
    });

    it('does not send currency if it is USD', function() {
      let payload = getPayloadFromTestBids(testBids);
      expect(payload.cur).to.be.undefined;
    });

    it('provides the currency if it is not USD', function() {
      nonUSDAdServerCurrency = true;
      let payload = getPayloadFromTestBids(testBids);
      expect(payload.cur).to.equal('EUR');
    });

    it('provides the social canvas segments and URL if provided', function() {
      let payload;
      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
      }, {
        ...minimumBidParams,
        params: {
          ...minimumBidParams.params,
          socialCanvas: {
            segments: ['segment_1', 'segment_2', 'segment_3'],
            url: 'https://socan.url'
          }
        }
      }]);
      expect(payload.socan).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        params: {
          ...minimumBidParams.params,
          socialCanvas: null
        }
      }, {
        ...minimumBidParams,
        params: {
          ...minimumBidParams.params,
          socialCanvas: {
            segments: ['segment_1', 'segment_2', 'segment_3'],
            url: 'https://socan.url'
          }
        }
      }]);
      expect(payload.socan).to.be.undefined;

      payload = getPayloadFromTestBids([{
        ...minimumBidParams,
        params: {
          ...minimumBidParams.params,
          socialCanvas: {
            segments: ['segment_1', 'segment_2', 'segment_3'],
            url: 'https://socan.url'
          }
        }
      }, {
        ...minimumBidParams,
        params: {
          ...minimumBidParams.params,
          socialCanvas: {
            segments: ['segment_4', 'segment_5', 'segment_6'],
            url: 'https://socan.url/new'
          }
        }
      }]);
      expect(payload.socan).to.deep.equal({
        segments: ['segment_1', 'segment_2', 'segment_3'],
        url: 'https://socan.url'
      });
    });

    describe('imp', function() {
      it('handles slots with different combinations of formats', function() {
        const testBids = [
          // Banner and Outstream
          {
            ...bid,
            params: {
              inventoryCode: 'banner_outstream_test',
              floor: 1.0,
              video: {
                mimes: [ 'video/mp4' ],
                maxduration: 30,
                minduration: 6,
                w: 640,
                h: 480
              }
            },
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [640, 380]
              },
              banner: {
                sizes: [ [970, 250], [1, 1] ]
              }
            },
            adUnitCode: 'adunit-code-banner-outstream',
            sizes: [ [300, 250], [300, 600], [1, 1, 1], ['flex'] ],
            bidId: 'banner-outstream-bid-id',
            bidderRequestId: 'kargo-request-id',
            auctionId: 'kargo-auction-id',
          },
          // Banner and Native
          {
            ...bid,
            params: {
              inventoryCode: 'banner_outstream_test',
              floor: 1.0,
              video: {
                mimes: [ 'video/mp4' ],
                maxduration: 30,
                minduration: 6,
                w: 640,
                h: 480
              }
            },
            mediaTypes: {
              banner: {
                sizes: [ [970, 250], [1, 1] ]
              },
              native: {}
            },
            adUnitCode: 'adunit-code-banner-outstream',
            sizes: [ [300, 250], [300, 600], [1, 1, 1], ['flex'] ],
            bidId: 'banner-outstream-bid-id',
            bidderRequestId: 'kargo-request-id',
            auctionId: 'kargo-auction-id',
          },
          // Native and Outstream
          {
            ...bid,
            params: {
              inventoryCode: 'banner_outstream_test',
              floor: 1.0,
              video: {
                mimes: [ 'video/mp4' ],
                maxduration: 30,
                minduration: 6,
                w: 640,
                h: 480
              }
            },
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [640, 380]
              },
              native: {},
            },
            adUnitCode: 'adunit-code-banner-outstream',
            sizes: [ [300, 250], [300, 600], [1, 1, 1], ['flex'] ],
            bidId: 'banner-outstream-bid-id',
            bidderRequestId: 'kargo-request-id',
            auctionId: 'kargo-auction-id',
          },
          // Banner and Native and Outstream
          {
            ...bid,
            params: {
              inventoryCode: 'banner_outstream_test',
              floor: 1.0,
              video: {
                mimes: [ 'video/mp4' ],
                maxduration: 30,
                minduration: 6,
                w: 640,
                h: 480
              }
            },
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [640, 380]
              },
              banner: {
                sizes: [ [970, 250], [1, 1] ]
              },
              native: {},
            },
            adUnitCode: 'adunit-code-banner-outstream',
            sizes: [ [300, 250], [300, 600], [1, 1, 1], ['flex'] ],
            bidId: 'banner-outstream-bid-id',
            bidderRequestId: 'kargo-request-id',
            auctionId: 'kargo-auction-id',
          },
        ];

        const payload = getPayloadFromTestBids(testBids);

        const bannerImp = {
          sizes: [ [970, 250], [1, 1] ]
        };
        const videoImp = {
          context: 'outstream',
          playerSize: [640, 380]
        };
        const nativeImp = {};

        // Banner and Outstream
        expect(payload.imp[0].banner).to.deep.equal(bannerImp);
        expect(payload.imp[0].video).to.deep.equal(videoImp);
        expect(payload.imp[0].native).to.be.undefined;
        // Banner and Native
        expect(payload.imp[1].banner).to.deep.equal(bannerImp);
        expect(payload.imp[1].video).to.be.undefined;
        expect(payload.imp[1].native).to.deep.equal(nativeImp);
        // Native and Outstream
        expect(payload.imp[2].banner).to.be.undefined;
        expect(payload.imp[2].video).to.deep.equal(videoImp);
        expect(payload.imp[2].native).to.deep.equal(nativeImp);
        // Banner and Native and Outstream
        expect(payload.imp[3].banner).to.deep.equal(bannerImp);
        expect(payload.imp[3].video).to.deep.equal(videoImp);
        expect(payload.imp[3].native).to.deep.equal(nativeImp);
      });

      it('pulls gpid from ortb2Imp.ext.gpid then ortb2Imp.ext.data.pbadslot', function () {
        const gpidGpid = 'ortb2Imp.ext.gpid-gpid';
        const gpidPbadslot = 'ortb2Imp.ext.data.pbadslot-gpid'
        const testBids = [
          {
            ...minimumBidParams,
            ortb2Imp: {
              ext: {
                gpid: gpidGpid,
                data: {
                  pbadslot: gpidPbadslot
                }
              }
            }
          },
          {
            ...minimumBidParams,
            ortb2Imp: {
              ext: {
                gpid: gpidGpid,
                data: {},
              }
            }
          },
          {
            ...minimumBidParams,
            ortb2Imp: {
              ext: {
                data: {
                  pbadslot: gpidPbadslot
                }
              }
            }
          },
          {
            ...minimumBidParams,
            ortb2Imp: {
              ext: {
                gpid: null,
                data: {
                  pbadslot: null
                }
              }
            }
          },
          { ...minimumBidParams }
        ];

        const payload = getPayloadFromTestBids(testBids);

        // Both present
        expect(payload.imp[0].fpd).to.deep.equal({ gpid: gpidGpid });
        // Only ext.gpid
        expect(payload.imp[1].fpd).to.deep.equal({ gpid: gpidGpid });
        // Only ext.data.pbadslot
        expect(payload.imp[2].fpd).to.deep.equal({ gpid: gpidPbadslot });
        // Neither present
        expect(payload.imp[3].fpd).to.be.undefined;
        expect(payload.imp[4].fpd).to.be.undefined;
      });

      it('includes bidRequestCount, bidderRequestCount, and bidderWinsCount if they are greater than 0', function() {
        const testBids = [
          {
            ...minimumBidParams,
            bidRequestsCount: 1,
            bidderRequestsCount: 0,
            bidderWinsCount: 0,
          },
          {
            ...minimumBidParams,
            bidRequestsCount: 0,
            bidderRequestsCount: 2,
            bidderWinsCount: 0,
          },
          {
            ...minimumBidParams,
            bidRequestsCount: 0,
            bidderRequestsCount: 0,
            bidderWinsCount: 3,
          },
          {
            ...minimumBidParams,
            bidRequestsCount: 4,
            bidderRequestsCount: 1,
            bidderWinsCount: 3,
          },
        ];

        [ 0, null, false, 'foobar' ].forEach(value => testBids.push({
          ...minimumBidParams,
          bidRequestsCount: value,
          bidderRequestsCount: value,
          bidderWinsCount: value
        }));

        const payload = getPayloadFromTestBids(testBids);

        // bidRequestCount
        expect(payload.imp[0].bidRequestCount).to.equal(1);
        expect(payload.imp[0].bidderRequestCount).to.be.undefined;
        expect(payload.imp[0].bidderWinCount).to.be.undefined;
        // bidderRequestCount
        expect(payload.imp[1].bidRequestCount).to.be.undefined;
        expect(payload.imp[1].bidderRequestCount).to.equal(2);
        expect(payload.imp[1].bidderWinCount).to.be.undefined;
        // bidderWinCount
        expect(payload.imp[2].bidRequestCount).to.be.undefined;
        expect(payload.imp[2].bidderRequestCount).to.be.undefined;
        expect(payload.imp[2].bidderWinCount).to.equal(3);
        // all
        expect(payload.imp[3].bidRequestCount).to.equal(4);
        expect(payload.imp[3].bidderRequestCount).to.equal(1);
        expect(payload.imp[3].bidderWinCount).to.equal(3);
        // none
        for (let i = 4; i < payload.imp.length; i++) {
          expect(payload.imp[i].bidRequestCount).to.be.undefined;
          expect(payload.imp[i].bidderRequestCount).to.be.undefined;
          expect(payload.imp[i].bidderWinCount).to.be.undefined;
        }
      });

      it('queries the getFloor function to retrieve the floor and validates it', function() {
        const testBids = [];

        [
          { currency: 'USD', floor: 1.99 },
          { currency: 'USD', floor: '1.99' },
          { currency: 'EUR', floor: 1.99 },
          { currency: 'USD', floor: 'foo' },
          { currency: 'USD', floor: null },
          { currency: 'USD', floor: true },
          { currency: 'USD', floor: false },
          { currency: 'USD', floor: {} },
          { currency: 'USD', floor: [] },
        ].forEach(floorValue => testBids.push({
          ...minimumBidParams,
          getFloor: () => floorValue
        }));

        const payload = getPayloadFromTestBids(testBids);

        // Valid floor
        expect(payload.imp[0].floor).to.equal(1.99);
        // Valid floor but string
        expect(payload.imp[1].floor).to.equal('1.99'); // @TODO - convert this to a number?
        // Non-USD valid floor
        expect(payload.imp[2].floor).to.be.undefined;
        // Invalid floor
        for (let i = 3; i < payload.imp.length; i++) {
          expect(payload.imp[i].floor).to.be.undefined;
        }
      });

      it('calls getFloor with the right values', function() {
        const testBids = [
          {
            ...minimumBidParams,
            getFloor: () => ({ currency: 'USD', value: 0.5 })
          }
        ];
        sinon.spy(testBids[0], 'getFloor');

        getPayloadFromTestBids(testBids);

        expect(testBids[0].getFloor.calledWith({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        })).to.be.true;
      });
    });

    describe('cerberus', function() {
      it('retrieves CRB from localStorage and cookies', function() {
        setCrb('valid', 'valid');

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.equal(crbValues.valid);
        expect(payload.rawCRBLocalStorage).to.equal(crbValues.validLs);
        expect(payload.user.crbIDs).to.deep.equal(validCrbIdsLs);
        expect(payload.user.tdID).to.equal('test-tdid-cerberus-localstorage');
        expect(payload.user.kargoID).to.equal('test-lexid-cerberus-localstorage');
        expect(payload.user.clientID).to.equal('test-clientid-cerberus-localstorage');
        expect(payload.user.optOut).to.equal(false);
      });

      it('retrieves CRB from localStorage if cookie is missing', function() {
        setCrb(false, 'valid');

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.be.undefined;
        expect(payload.rawCRBLocalStorage).to.equal(crbValues.validLs);
        expect(payload.user.crbIDs).to.deep.equal(validCrbIdsLs);
        expect(payload.user.tdID).to.equal('test-tdid-cerberus-localstorage');
        expect(payload.user.kargoID).to.equal('test-lexid-cerberus-localstorage');
        expect(payload.user.clientID).to.equal('test-clientid-cerberus-localstorage');
        expect(payload.user.optOut).to.equal(false);
      });

      it('retrieves CRB from cookies if localstorage is missing', function() {
        setCrb('valid', false);

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.equal(crbValues.valid);
        expect(payload.rawCRBLocalStorage).to.be.undefined;
        expect(payload.user.crbIDs).to.deep.equal(validCrbIds);
        expect(payload.user.tdID).to.equal('test-tdid-cerberus-cookie');
        expect(payload.user.kargoID).to.equal('test-lexid-cerberus-cookie');
        expect(payload.user.clientID).to.equal('test-clientid-cerberus-cookie');
        expect(payload.user.optOut).to.equal(false);
      });

      it('retrieves CRB from cookies if localstorage is not functional', function() {
        // Note: this does not cause localStorage to throw an error in Firefox so in that browser this
        // test is not 100% true to its name
        sandbox.stub(localStorage, 'getItem').throws();
        setCrb('valid', 'invalid');

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.equal(crbValues.valid);
        expect(payload.rawCRBLocalStorage).to.be.undefined;
        expect(payload.user.crbIDs).to.deep.equal(validCrbIds);
        expect(payload.user.tdID).to.equal('test-tdid-cerberus-cookie');
        expect(payload.user.kargoID).to.equal('test-lexid-cerberus-cookie');
        expect(payload.user.clientID).to.equal('test-clientid-cerberus-cookie');
        expect(payload.user.optOut).to.equal(false);
      });

      it('does not fail if CRB is missing', function() {
        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.be.undefined;
        expect(payload.rawCRBLocalStorage).to.be.undefined;
        expect(payload.user.crbIDs).to.deep.equal({});
        expect(payload.user.tdID).to.be.undefined;
        expect(payload.user.kargoID).to.be.undefined;
        expect(payload.user.clientID).to.be.undefined;
        expect(payload.user.optOut).to.be.undefined;
      });

      it('fails gracefully if the CRB is invalid base 64 cookie', function() {
        setCrb('invalidB64', false);

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.equal(crbValues.invalidB64);
        expect(payload.rawCRBLocalStorage).to.be.undefined;
        expect(payload.user.crbIDs).to.deep.equal({});
        expect(payload.user.tdID).to.be.undefined;
        expect(payload.user.kargoID).to.be.undefined;
        expect(payload.user.clientID).to.be.undefined;
        expect(payload.user.optOut).to.be.undefined;
      });

      it('fails gracefully if the CRB is invalid base 64 localStorage', function() {
        setCrb(false, 'invalidB64');

        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.rawCRB).to.be.undefined;
        expect(payload.rawCRBLocalStorage).to.equal(crbValues.invalidB64Ls);
        expect(payload.user.crbIDs).to.deep.equal({});
        expect(payload.user.tdID).to.be.undefined;
        expect(payload.user.kargoID).to.be.undefined;
        expect(payload.user.clientID).to.be.undefined;
        expect(payload.user.optOut).to.be.undefined;
      });

      [
        [ 'valid', 'invalidB64', 'cookie' ],
        [ 'valid', 'invalidJson', 'cookie' ],
        [ 'invalidB64', 'invalidJson', 'none' ],
        [ 'invalidB64', 'invalidB64', 'none' ],
        [ 'invalidB64', 'valid', 'localStorage' ],
        [ 'invalidJson', 'invalidJson', 'none' ],
        [ 'invalidJson', 'invalidB64', 'none' ],
        [ 'invalidJson', 'valid', 'localStorage' ],
      ].forEach(config => {
        it(`uses ${config[2]} if the cookie is ${config[0]} and localStorage is ${config[1]}`, function() {
          setCrb(config[0], config[1]);
          const payload = getPayloadFromTestBids(testBids, bidderRequest);

          expect(payload.rawCRB).to.equal(crbValues[config[0]]);
          expect(payload.rawCRBLocalStorage).to.equal(crbValues[`${config[1]}Ls`]);
          if (config[2] === 'cookie') {
            expect(payload.user.crbIDs).to.deep.equal(validCrbIds);
            expect(payload.user.tdID).to.equal('test-tdid-cerberus-cookie');
            expect(payload.user.kargoID).to.equal('test-lexid-cerberus-cookie');
            expect(payload.user.clientID).to.equal('test-clientid-cerberus-cookie');
            expect(payload.user.optOut).to.equal(false);
          } else if (config[2] === 'localStorage') {
            expect(payload.user.crbIDs).to.deep.equal(validCrbIdsLs);
            expect(payload.user.tdID).to.equal('test-tdid-cerberus-localstorage');
            expect(payload.user.kargoID).to.equal('test-lexid-cerberus-localstorage');
            expect(payload.user.clientID).to.equal('test-clientid-cerberus-localstorage');
            expect(payload.user.optOut).to.equal(false);
          } else {
            expect(payload.user.crbIDs).to.deep.equal({});
            expect(payload.user.tdID).to.be.undefined;
            expect(payload.user.kargoID).to.be.undefined;
            expect(payload.user.clientID).to.be.undefined;
            expect(payload.user.optOut).to.be.undefined;
          }
        });
      });

      it('uses the tdID from cerberus to populate the tdID field', function() {
        setCrb('valid', 'valid');
        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.user.tdID).to.equal('test-tdid-cerberus-localstorage');
      });

      it('uses the lexId from cerberus to populate the kargoID field', function() {
        setCrb('valid', 'valid');
        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.user.kargoID).to.equal('test-lexid-cerberus-localstorage');
      });

      it('uses the clientId from cerberus to populate the clientID field', function() {
        setCrb('valid', 'valid');
        const payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.user.clientID).to.equal('test-clientid-cerberus-localstorage');
      });

      it('uses the optOut from cerberus to populate the clientID field', function() {
        setCrb('valid', 'valid');
        let payload;
        payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.user.optOut).to.equal(false);

        setLocalStorageValue('krg_crb', buildCrbValue(false, true, true, true, true, true));
        payload = getPayloadFromTestBids(testBids, bidderRequest);

        expect(payload.user.optOut).to.equal(true);
      });
    });

    describe('user', function() {
      it('fetches the trade desk id from the adapter if present', function() {
        const payload = getPayloadFromTestBids([{
          ...minimumBidParams,
          userId: {
            tdid: 'test-tdid-module'
          }
        }]);

        expect(payload.user.tdID).to.equal('test-tdid-module');
      });

      it('fetches the trade desk id from cerberus if present', function() {
        setLocalStorageValue('krg_crb', btoa(JSON.stringify({ tdID: 'test-tdid-crb' })));

        const payload = getPayloadFromTestBids([{
          ...minimumBidParams,
        }]);

        expect(payload.user.tdID).to.equal('test-tdid-crb');
      });

      it('fetches the trade desk id from the adapter if adapter and cerberus are present', function() {
        setLocalStorageValue('krg_crb', buildCrbValue(false, true, true, true, true, false));

        const payload = getPayloadFromTestBids([{
          ...minimumBidParams,
          userId: {
            tdid: 'test-tdid-module'
          }
        }]);

        expect(payload.user.tdID).to.equal('test-tdid-module');
      });

      it('does not set kargoId if it is not present', function() {
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.lexId).to.be.undefined;
      });

      it('does not populate usp, gdpr, or gpp if they are not present', function() {
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.usp).to.be.undefined;
        expect(payload.user.gdpr).to.be.undefined;
        expect(payload.user.gpp).to.be.undefined;
      });

      it('fetches usp from the bidder request if present', function() {
        bidderRequest.uspConsent = '1---';
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.usp).to.equal('1---');
      });

      it('fetches gpp from the bidder request if present', function() {
        bidderRequest.gppConsent = {
          consentString: 'gppString',
          applicableSections: [-1]
        };
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.gpp).to.deep.equal({
          gppString: 'gppString',
          applicableSections: [-1]
        });
      });

      it('does not send empty gpp values', function() {
        bidderRequest.gppConsent = {
          consentString: '',
          applicableSections: ''
        };
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.gpp).to.be.undefined;
      });

      it('fetches gdpr consent from the bidder request if present', function() {
        bidderRequest.gdprConsent = {
          consentString: 'gdpr-consent-string',
          gdprApplies: true
        };
        const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);

        expect(payload.user.gdpr).to.deep.equal({
          consent: 'gdpr-consent-string',
          applies: true
        });
      });

      it('handles malformed gdpr applies from the bidder request', function() {
        [
          ['true', true],
          ['false', true],
          ['1', true],
          [1, true],
          [0, false],
          ['0', true],
          ['y', true],
          ['yes', true],
          ['n', true],
          ['no', true],
          [null, false],
          [{}, true],
        ].forEach(testValue => {
          bidderRequest.gdprConsent = { gdprApplies: testValue[0] };
          const payload = getPayloadFromTestBids([{ ...minimumBidParams }]);
          expect(payload.user.gdpr, `Value - ${JSON.stringify(testValue[0])}`).to.deep.equal({
            consent: '',
            applies: testValue[1]
          });
        });
      });

      it('passes the user.data from the first bid request if availabale', function() {
        let payload;
        payload = getPayloadFromTestBids([{
          ...minimumBidParams,
        }, {
          ...minimumBidParams,
          ortb2: { user: { data: { test: 'value' } } }
        }]);
        expect(payload.user.data).to.deep.equal([]);

        payload = getPayloadFromTestBids([{
          ...minimumBidParams,
          ortb2: { user: { data: { test: 'value' } } }
        }, {
          ...minimumBidParams,
          ortb2: { user: { data: { test2: 'value2' } } }
        }]);
        expect(payload.user.data).to.deep.equal({
          test: 'value'
        });
      });

      it('fails gracefully if there is no localStorage', function() {
        sandbox.stub(localStorage, 'getItem').throws();
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.user).to.deep.equal({
          crbIDs: {},
          data: []
        });
      });
    });

    describe('sua', function() {
      it('is not provided if not present in the first valid bid', function() {
        let payload = getPayloadFromTestBids([
          ...testBids,
          {
            ...minimumBidParams,
            ortb2: { device: { sua: {
              platform: {
                brand: 'macOS',
                version: ['12', '6', '0']
              },
              browsers: [
                {
                  brand: 'Chromium',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Google Chrome',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Not;A=Brand',
                  version: ['99', '0', '0', '0']
                }
              ],
              mobile: 1,
              model: 'model',
              source: 1,
            } } }
          }
        ]);
        expect(payload.device.sua).to.be.undefined;
      });

      it('is provided if present in the first valid bid', function() {
        let payload = getPayloadFromTestBids([
          {
            ...minimumBidParams,
            ortb2: { device: { sua: {
              platform: {
                brand: 'macOS',
                version: ['12', '6', '0']
              },
              browsers: [
                {
                  brand: 'Chromium',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Google Chrome',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Not;A=Brand',
                  version: ['99', '0', '0', '0']
                }
              ],
              mobile: 1,
              model: 'model',
              source: 1,
            } } }
          },
          {
            ...minimumBidParams,
            ortb2: { device: { sua: {
              platform: {
                brand: 'macOS2',
                version: ['122', '6', '0']
              },
              browsers: [
                {
                  brand: 'Chromium2',
                  version: ['1062', '0', '5249', '119']
                },
                {
                  brand: 'Google Chrome2',
                  version: ['102', '0', '5249', '119']
                },
                {
                  brand: 'Not;A=Brand2',
                  version: ['992', '0', '0', '0']
                }
              ],
              mobile: 2,
              model: 'model2',
              source: 2,
            } } }
          }
        ]);
        expect(payload.device.sua).to.deep.equal({
          platform: {
            brand: 'macOS',
            version: ['12', '6', '0']
          },
          browsers: [
            {
              brand: 'Chromium',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Google Chrome',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Not;A=Brand',
              version: ['99', '0', '0', '0']
            }
          ],
          mobile: 1,
          model: 'model',
          source: 1,
        });
      });

      it('does not send non-mapped attributes', function() {
        let payload = getPayloadFromTestBids([{...minimumBidParams,
          ortb2: { device: { sua: {
            other: 'value',
            objectMissing: {
              key: 'value'
            },
            platform: {
              brand: 'macOS',
              version: ['12', '6', '0']
            },
            browsers: [
              {
                brand: 'Chromium',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Google Chrome',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Not;A=Brand',
                version: ['99', '0', '0', '0']
              }
            ],
            mobile: 1,
            model: 'model',
            source: 1,
          } } }
        }]);
        expect(payload.device.sua).to.deep.equal({
          platform: {
            brand: 'macOS',
            version: ['12', '6', '0']
          },
          browsers: [
            {
              brand: 'Chromium',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Google Chrome',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Not;A=Brand',
              version: ['99', '0', '0', '0']
            }
          ],
          mobile: 1,
          model: 'model',
          source: 1,
        });
      });

      it('does not send non-truthy values or empty strings', function() {
        [
          false,
          0,
          null,
          '',
          '      ',
          ' ',
        ].forEach(value => {
          let payload = getPayloadFromTestBids([{...minimumBidParams,
            ortb2: { device: { sua: {
              platform: value,
              browsers: [
                {
                  brand: 'Chromium',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Google Chrome',
                  version: ['106', '0', '5249', '119']
                },
                {
                  brand: 'Not;A=Brand',
                  version: ['99', '0', '0', '0']
                }
              ],
              mobile: 1,
              model: 'model',
              source: 1,
            } } }
          }]);
          expect(payload.device.sua, `Value - ${JSON.stringify(value)}`).to.deep.equal({
            browsers: [
              {
                brand: 'Chromium',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Google Chrome',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Not;A=Brand',
                version: ['99', '0', '0', '0']
              }
            ],
            mobile: 1,
            model: 'model',
            source: 1,
          });
        });
      });

      it('does not send 0 for mobile or source', function() {
        let payload = getPayloadFromTestBids([{
          ...minimumBidParams,
          ortb2: { device: { sua: {
            platform: {
              brand: 'macOS',
              version: ['12', '6', '0']
            },
            browsers: [
              {
                brand: 'Chromium',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Google Chrome',
                version: ['106', '0', '5249', '119']
              },
              {
                brand: 'Not;A=Brand',
                version: ['99', '0', '0', '0']
              }
            ],
            mobile: 0,
            model: 'model',
            source: 0,
          } } }
        }]);
        expect(payload.device.sua).to.deep.equal({
          platform: {
            brand: 'macOS',
            version: ['12', '6', '0']
          },
          browsers: [
            {
              brand: 'Chromium',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Google Chrome',
              version: ['106', '0', '5249', '119']
            },
            {
              brand: 'Not;A=Brand',
              version: ['99', '0', '0', '0']
            }
          ],
          model: 'model',
        });
      });
    });

    describe('page', function() {
      it('pulls the page ID from localStorage', function() {
        setLocalStorageValue('pageViewId', 'test-page-id');
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.page).to.deep.equal({
          id: 'test-page-id'
        });
      });

      it('pulls the page timestamp from localStorage', function() {
        setLocalStorageValue('pageViewTimestamp', '123456789');
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.page).to.deep.equal({
          timestamp: 123456789
        });
      });

      it('pulls the page ID from localStorage', function() {
        setLocalStorageValue('pageViewUrl', 'https://test-url.com');
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.page).to.deep.equal({
          url: 'https://test-url.com'
        });
      });

      it('pulls all 3 together', function() {
        setLocalStorageValue('pageViewId', 'test-page-id');
        setLocalStorageValue('pageViewTimestamp', '123456789');
        setLocalStorageValue('pageViewUrl', 'https://test-url.com');
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.page).to.deep.equal({
          id: 'test-page-id',
          timestamp: 123456789,
          url: 'https://test-url.com'
        });
      });

      it('fails gracefully without localStorage', function() {
        sandbox.stub(localStorage, 'getItem').throws();
        let payload = getPayloadFromTestBids(testBids);
        expect(payload.page).to.be.undefined;
      });
    });
  });

  describe('interpretResponse', function() {
    const response = Object.freeze({ body: {
      1: {
        id: 'foo',
        cpm: 3,
        adm: '<div id="1"></div>',
        width: 320,
        height: 50,
        metadata: {},
        creativeID: 'bar'
      },
      2: {
        id: 'bar',
        cpm: 2.5,
        adm: '<div id="2"></div>',
        width: 300,
        height: 250,
        targetingCustom: 'dmpmptest1234',
        metadata: {
          landingPageDomain: ['https://foobar.com']
        },
        creativeID: 'foo'
      },
      3: {
        id: 'bar',
        cpm: 2.5,
        adm: '<div id="2"></div>',
        width: 300,
        height: 250,
        creativeID: 'foo'
      },
      4: {
        id: 'bar',
        cpm: 2.5,
        adm: '<div id="4"></div>',
        width: 300,
        height: 250,
        mediaType: 'banner',
        metadata: {},
        creativeID: 'foo',
        currency: 'EUR'
      },
      5: {
        id: 'bar',
        cpm: 2.5,
        adm: '<VAST></VAST>',
        width: 300,
        height: 250,
        mediaType: 'video',
        metadata: {},
        creativeID: 'foo',
        currency: 'EUR'
      },
      6: {
        id: 'bar',
        cpm: 2.5,
        adm: '',
        admUrl: 'https://foobar.com/vast_adm',
        width: 300,
        height: 250,
        mediaType: 'video',
        metadata: {},
        creativeID: 'foo',
        currency: 'EUR'
      }
    }});
    const bidderRequest = Object.freeze({
      currency: 'USD',
      bids: [{
        bidId: 1,
        params: {
          placementId: 'foo'
        }
      }, {
        bidId: 2,
        params: {
          placementId: 'bar'
        }
      }, {
        bidId: 3,
        params: {
          placementId: 'bar'
        }
      }, {
        bidId: 4,
        params: {
          placementId: 'bar'
        }
      }, {
        bidId: 5,
        params: {
          placementId: 'bar'
        }
      }, {
        bidId: 6,
        params: {
          placementId: 'bar'
        }
      }]
    });

    it('returns an empty array if the response body is empty or not an object', function() {
      [
        '',
        undefined,
        false,
        true,
        null,
        [],
        {},
        1234,
      ].forEach(value => {
        let bids = spec.interpretResponse({ body: value }, bidderRequest);
        expect(bids, `Value - ${JSON.stringify(value)}`).to.deep.equal([]);
      });
    });

    it('returns bid response for various objects', function() {
      let bids = spec.interpretResponse(response, bidderRequest);
      expect(bids).to.have.length(Object.keys(response.body).length);
      expect(bids[0]).to.deep.equal({
        ad: '<div id="1"></div>',
        cpm: 3,
        creativeId: 'bar',
        currency: 'USD',
        dealId: undefined,
        height: 50,
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        },
        netRevenue: true,
        requestId: '1',
        ttl: 300,
        width: 320,
      });
      expect(bids[1]).to.deep.equal({
        requestId: '2',
        ad: '<div id="2"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
        ttl: 300,
        creativeId: 'foo',
        dealId: 'dmpmptest1234',
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner',
          clickUrl: 'https://foobar.com',
          advertiserDomains: ['https://foobar.com']
        }
      });
      expect(bids[2]).to.deep.equal({
        requestId: '3',
        ad: '<div id="2"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
        ttl: 300,
        creativeId: 'foo',
        dealId: undefined,
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        }
      });
      expect(bids[3]).to.deep.equal({
        requestId: '4',
        ad: '<div id="4"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
        ttl: 300,
        creativeId: 'foo',
        dealId: undefined,
        netRevenue: true,
        currency: 'EUR',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        }
      });
      expect(bids[4]).to.deep.equal({
        requestId: '5',
        cpm: 2.5,
        width: 300,
        height: 250,
        vastXml: '<VAST></VAST>',
        ttl: 300,
        creativeId: 'foo',
        dealId: undefined,
        netRevenue: true,
        currency: 'EUR',
        mediaType: 'video',
        meta: {
          mediaType: 'video'
        }
      });
      expect(bids[5]).to.deep.equal({
        requestId: '6',
        cpm: 2.5,
        width: 300,
        height: 250,
        vastUrl: 'https://foobar.com/vast_adm',
        ttl: 300,
        creativeId: 'foo',
        dealId: undefined,
        netRevenue: true,
        currency: 'EUR',
        mediaType: 'video',
        meta: {
          mediaType: 'video'
        }
      });
    });

    it('adds landingPageDomain data', function() {
      let response = spec.interpretResponse({ body: { 0: {
        metadata: {
          landingPageDomain: [
            'https://foo.com',
            'https://bar.com'
          ]
        }
      } } }, {});
      expect(response[0].meta).to.deep.equal({
        mediaType: 'banner',
        clickUrl: 'https://foo.com',
        advertiserDomains: [ 'https://foo.com', 'https://bar.com' ]
      });
    });

    it('should return fledgeAuctionConfigs if provided in bid response', function () {
      const auctionConfig = {
        seller: 'https://kargo.com',
        decisionLogicUrl: 'https://kargo.com/decision_logic.js',
        interestGroupBuyers: ['https://some_buyer.com'],
        perBuyerSignals: {
          'https://some_buyer.com': { a: 1 }
        }
      }

      const body = response.body;
      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          if (key % 2 !== 0) { // Add auctionConfig to every other object
            body[key].auctionConfig = auctionConfig;
          }
        }
      }

      let result = spec.interpretResponse(response, bidderRequest);

      // Test properties of bidResponses
      result.bids.forEach(bid => {
        expect(bid).to.have.property('requestId');
        expect(bid).to.have.property('cpm');
        expect(bid).to.have.property('width');
        expect(bid).to.have.property('height');
        expect(bid).to.have.property('ttl');
        expect(bid).to.have.property('creativeId');
        expect(bid.netRevenue).to.be.true;
        expect(bid).to.have.property('meta').that.is.an('object');
      });

      // Test properties of fledgeAuctionConfigs
      expect(result.fledgeAuctionConfigs).to.have.lengthOf(3);

      const expectedBidIds = ['1', '3', '5']; // Expected bidIDs
      result.fledgeAuctionConfigs.forEach(config => {
        expect(config).to.have.property('bidId');
        expect(expectedBidIds).to.include(config.bidId);

        expect(config).to.have.property('config').that.is.an('object');
        expect(config.config).to.have.property('seller', 'https://kargo.com');
        expect(config.config).to.have.property('decisionLogicUrl', 'https://kargo.com/decision_logic.js');
        expect(config.config.interestGroupBuyers).to.be.an('array').that.includes('https://some_buyer.com');
        expect(config.config.perBuyerSignals).to.have.property('https://some_buyer.com').that.deep.equals({ a: 1 });
      });
    });
  });

  describe('getUserSyncs', function() {
    let crb = {};
    const clientId = 'random-client-id-string';
    const baseUrl = 'https://crb.kargo.com/api/v1/initsyncrnd/random-client-id-string?seed=3205e885-8d37-4139-b47e-f82cff268000&idx=0&gdpr=0&gdpr_consent=&us_privacy=&gpp=&gpp_sid=';

    function buildSyncUrls(baseUrl = 'https://crb.kargo.com/api/v1/initsyncrnd/random-client-id-string?seed=3205e885-8d37-4139-b47e-f82cff268000&idx=0&gdpr=0&gdpr_consent=&us_privacy=&gpp=&gpp_sid=') {
      let syncs = [];
      for (let i = 0; i < 5; i++) {
        syncs.push({
          type: 'iframe',
          url: baseUrl.replace(/idx=\d+&/, `idx=${i}&`),
        });
      }

      return syncs;
    }

    function getUserSyncs(gdpr, usp, gpp) {
      return spec.getUserSyncs(
        { iframeEnabled: true },
        null,
        gdpr,
        usp,
        gpp
      );
    }

    beforeEach(function() {
      crb = { clientId };
      sandbox.stub(spec, '_getCrb').callsFake(function() { return crb; });

      // Makes the seed in the URLs predictable
      sandbox.stub(crypto, 'getRandomValues').callsFake(function (buf) {
        var bytes = [50, 5, 232, 133, 141, 55, 49, 57, 244, 126, 248, 44, 255, 38, 128, 0];
        for (var i = 0; i < bytes.length; i++) {
          buf[i] = bytes[i];
        }
        return buf;
      });
    });

    it('returns user syncs when an ID is present', function() {
      expect(getUserSyncs()).to.deep.equal(buildSyncUrls());
    });

    it('returns no syncs if there is no user ID', function() {
      delete crb.clientId;
      expect(getUserSyncs()).to.deep.equal([]);
    });

    it('returns no syncs if there is no usp consent', function() {
      expect(getUserSyncs(undefined, '1YYY')).to.deep.equal([]);
    });

    it('returns no syncs if iframe syncing is not allowed', function() {
      expect(spec.getUserSyncs({ iframeEnabled: false }, null, undefined, undefined, undefined))
        .to.deep.equal([]);
      expect(spec.getUserSyncs({}, null, undefined, undefined, undefined))
        .to.deep.equal([]);
    });

    it('includes the US privacy string in the sync URL if present', function() {
      [
        '0---',
        '1---',
        '1NNN',
        'invalid',
        1234,
      ].forEach(value => expect(getUserSyncs(undefined, value), `Value - ${value}`)
        .to.deep.equal(buildSyncUrls(baseUrl.replace(/us_privacy=/, `us_privacy=${value}`))));
    });

    it('includes gdpr information if provided', function() {
      [
        { gdprApplies: true, consentString: 'test-consent-string', ga: '1', cs: 'test-consent-string' },
        { gdprApplies: false, consentString: 'test-consent-string', ga: '0', cs: 'test-consent-string' },
        { gdprApplies: true, ga: '1', cs: '' },
        { gdprApplies: false, ga: '0', cs: '' },
        { ga: '0', cs: '' },
      ].forEach(value => expect(getUserSyncs(value), `Value - ${value}`)
        .to.deep.equal(buildSyncUrls(baseUrl
          .replace(/gdpr=\d/, `gdpr=${value.ga}`)
          .replace(/gdpr_consent=/, `gdpr_consent=${value.cs}`))));
    });

    it('handles malformed gdpr information', function() {
      [
        null,
        false,
        true,
        1,
        '1',
        'test-applies',
        [],
        {}
      ].forEach(value => expect(getUserSyncs(value), `Value - ${JSON.stringify(value)}`)
        .to.deep.equal(buildSyncUrls(baseUrl)));
    });

    it('includes gpp information if provided', function() {
      [
        { applicableSections: [-1], consentString: 'test-consent-string', as: '-1', cs: 'test-consent-string' },
        { applicableSections: [1, 2, 3], consentString: 'test-consent-string', as: '1,2,3', cs: 'test-consent-string' },
        { applicableSections: [-1], as: '-1', cs: '' },
        { applicableSections: false, consentString: 'test-consent-string', as: '', cs: 'test-consent-string' },
        { applicableSections: null, consentString: 'test-consent-string', as: '', cs: 'test-consent-string' },
        { applicableSections: {}, consentString: 'test-consent-string', as: '', cs: 'test-consent-string' },
        { applicableSections: [], consentString: 'test-consent-string', as: '', cs: 'test-consent-string' },
        { as: '', cs: '' },
      ].forEach(value => expect(getUserSyncs(undefined, undefined, value), `Value - ${value}`)
        .to.deep.equal(buildSyncUrls(baseUrl
          .replace(/gpp=/, `gpp=${value.cs}`)
          .replace(/gpp_sid=/, `gpp_sid=${value.as}`))));
    });

    it('handles malformed gpp information', function() {
      [
        null,
        false,
        true,
        1,
        '1',
        'test-applies',
        [],
        {}
      ].forEach(value => expect(getUserSyncs(undefined, undefined, value), `Value - ${JSON.stringify(value)}`)
        .to.deep.equal(buildSyncUrls(baseUrl)));
    });

    it('includes all 3 if provided', function() {
      expect(getUserSyncs(
        { gdprApplies: true, consentString: 'test-gdpr-consent' },
        '1---',
        { applicableSections: [1, 2, 3], consentString: 'test-gpp-consent' }
      )).to.deep.equal(buildSyncUrls(baseUrl
        .replace(/gdpr=\d/, 'gdpr=1')
        .replace(/gdpr_consent=/, 'gdpr_consent=test-gdpr-consent')
        .replace(/us_privacy=/, 'us_privacy=1---')
        .replace(/gpp=/, 'gpp=test-gpp-consent')
        .replace(/gpp_sid=/, 'gpp_sid=1,2,3')));
    });
  });

  describe('supportedMediaTypes', function() {
    it('exposes video and banner', function() {
      expect(spec.supportedMediaTypes).to.deep.equal([ 'banner', 'video' ]);
    });
  });

  describe('onTimeout', function() {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('does not call triggerPixel if timeout data is not provided', function() {
      spec.onTimeout(null);
      expect(utils.triggerPixel.callCount).to.equal(0);
    });

    it('calls triggerPixel if any timeout data is provided', function() {
      spec.onTimeout([
        {auctionId: 'test-auction-id', timeout: 400},
        {auctionId: 'test-auction-id-2', timeout: 100},
        {auctionId: 'test-auction-id-3', timeout: 450},
        {auctionId: 'test-auction-id-4', timeout: 500},
      ]);
      expect(utils.triggerPixel.calledWith('https://krk2.kargo.com/api/v1/event/timeout?aid=test-auction-id&ato=400')).to.be.true;
      expect(utils.triggerPixel.calledWith('https://krk2.kargo.com/api/v1/event/timeout?aid=test-auction-id-2&ato=100')).to.be.true;
      expect(utils.triggerPixel.calledWith('https://krk2.kargo.com/api/v1/event/timeout?aid=test-auction-id-3&ato=450')).to.be.true;
      expect(utils.triggerPixel.calledWith('https://krk2.kargo.com/api/v1/event/timeout?aid=test-auction-id-4&ato=500')).to.be.true;
    });
  });
});
