import {expect, assert} from 'chai';
import {spec} from 'modules/kargoBidAdapter.js';
import {config} from 'src/config.js';
const utils = require('src/utils');

describe('kargo adapter tests', function () {
  var sandbox, clock, frozenNow = new Date();

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers(frozenNow.getTime());
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
  });

  describe('bid request validity', function() {
    it('passes when the bid includes a placement ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo'}}) === true);
    });

    it('fails when the bid does not include a placement ID', function() {
      assert(spec.isBidRequestValid({params: {}}) === false);
    });

    it('fails when bid is falsey', function() {
      assert(spec.isBidRequestValid() === false);
    });

    it('fails when the bid has no params at all', function() {
      assert(spec.isBidRequestValid({}) === false);
    });
  });

  describe('build request', function() {
    var bids, undefinedCurrency, noAdServerCurrency, cookies = [], localStorageItems = [], sessionIds = [], requestCount = 0;

    beforeEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {
        kargo: {
          storageAllowed: true
        }
      };
      undefinedCurrency = false;
      noAdServerCurrency = false;
      sandbox.stub(config, 'getConfig').callsFake(function(key) {
        if (key === 'currency') {
          if (undefinedCurrency) {
            return undefined;
          }
          if (noAdServerCurrency) {
            return {};
          }
          return {adServerCurrency: 'USD'};
        }
        if (key === 'debug') return true;
        if (key === 'deviceAccess') return true;
        throw new Error(`Config stub incomplete! Missing key "${key}"`)
      });

      bids = [
        {
          params: {
            placementId: 'foo'
          },
          bidId: 1,
          userId: {
            tdid: 'fake-tdid'
          },
          sizes: [[320, 50], [300, 250], [300, 600]],
          ortb2: {
            device: {
              sua: {
                platform: {
                  brand: 'macOS',
                  version: [ '12', '6', '0' ]
                },
                browsers: [
                  {
                    brand: 'Chromium',
                    version: [ '106', '0', '5249', '119' ]
                  },
                  {
                    brand: 'Google Chrome',
                    version: [ '106', '0', '5249', '119' ]
                  },
                  {
                    brand: 'Not;A=Brand',
                    version: [ '99', '0', '0', '0' ]
                  }
                ],
                mobile: 0,
                model: ''
              }
            }
          }
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: 2,
          sizes: [[320, 50], [300, 250], [300, 600]]
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: 3,
          sizes: [[320, 50], [300, 250], [300, 600]]
        }
      ];
    });

    afterEach(function () {
      for (let key in cookies) {
        let cookie = cookies[key];
        removeCookie(cookie);
      }

      for (let key in localStorageItems) {
        let localStorageItem = localStorageItems[key];
        localStorage.removeItem(localStorageItem);
      }

      cookies.length = 0;
      localStorageItems.length = 0;
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });

    function setCookie(cname, cvalue, exdays = 1) {
      _setCookie(cname, cvalue, exdays);
      cookies.push(cname);
    }

    function removeCookie(cname) {
      _setCookie(cname, '', -1);
    }

    function _setCookie(cname, cvalue, exdays = 1) {
      var d = new Date(),
        expires;

      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      expires = `expires=${d.toUTCString()}`;
      document.cookie = `${cname}=${cvalue};${expires};path=/`;
    }

    function setLocalStorageItem(name, val) {
      localStorage.setItem(name, val);
      localStorageItems.push(name);
    }

    function simulateNoLocalStorage() {
      return sandbox.stub(localStorage, 'getItem').throws();
    }

    function simulateNoCurrencyObject() {
      undefinedCurrency = true;
      noAdServerCurrency = false;
    }

    function simulateNoAdServerCurrency() {
      undefinedCurrency = false;
      noAdServerCurrency = true;
    }

    function generateGDPR(applies, haveConsent) {
      var data = {
        consentString: 'gdprconsentstring',
        gdprApplies: applies,
      };
      return data;
    }

    function generateGDPRExpect(applies, haveConsent) {
      return {
        consent: 'gdprconsentstring',
        applies: applies,
      };
    }

    function getKrgCrb() {
      return 'eyJzeW5jSWRzIjp7IjIiOiI4MmZhMjU1NS01OTY5LTQ2MTQtYjRjZS00ZGNmMTA4MGU5ZjkiLCIxNiI6IlZveElrOEFvSnowQUFFZENleUFBQUFDMiY1MDIiLCIyMyI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjI0IjoiVm94SWs4QW9KejBBQUVkQ2V5QUFBQUMyJjUwMiIsIjI1IjoiNWVlMjQxMzgtNWUwMy00YjlkLWE5NTMtMzhlODMzZjI4NDlmIiwiMl84MCI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjJfOTMiOiI1ZWUyNDEzOC01ZTAzLTRiOWQtYTk1My0zOGU4MzNmMjg0OWYifSwibGV4SWQiOiI1ZjEwODgzMS0zMDJkLTExZTctYmY2Yi00NTk1YWNkM2JmNmMiLCJjbGllbnRJZCI6IjI0MTBkOGYyLWMxMTEtNDgxMS04OGE1LTdiNWUxOTBlNDc1ZiIsIm9wdE91dCI6ZmFsc2UsImV4cGlyZVRpbWUiOjE0OTc0NDkzODI2NjgsImxhc3RTeW5jZWRBdCI6MTQ5NzM2Mjk3OTAxMn0=';
    }

    function getKrgCrbOldStyle() {
      return '{"v":"eyJzeW5jSWRzIjp7IjIiOiI4MmZhMjU1NS01OTY5LTQ2MTQtYjRjZS00ZGNmMTA4MGU5ZjkiLCIxNiI6IlZveElrOEFvSnowQUFFZENleUFBQUFDMiY1MDIiLCIyMyI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjI0IjoiVm94SWs4QW9KejBBQUVkQ2V5QUFBQUMyJjUwMiIsIjI1IjoiNWVlMjQxMzgtNWUwMy00YjlkLWE5NTMtMzhlODMzZjI4NDlmIiwiMl84MCI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjJfOTMiOiI1ZWUyNDEzOC01ZTAzLTRiOWQtYTk1My0zOGU4MzNmMjg0OWYifSwibGV4SWQiOiI1ZjEwODgzMS0zMDJkLTExZTctYmY2Yi00NTk1YWNkM2JmNmMiLCJjbGllbnRJZCI6IjI0MTBkOGYyLWMxMTEtNDgxMS04OGE1LTdiNWUxOTBlNDc1ZiIsIm9wdE91dCI6ZmFsc2UsImV4cGlyZVRpbWUiOjE0OTc0NDkzODI2NjgsImxhc3RTeW5jZWRBdCI6MTQ5NzM2Mjk3OTAxMn0="}';
    }

    function initializeKrgCrb(cookieOnly) {
      if (!cookieOnly) {
        setLocalStorageItem('krg_crb', getKrgCrb());
      }
      setCookie('krg_crb', getKrgCrbOldStyle());
    }

    function getInvalidKrgCrbType1() {
      return 'invalid-krg-crb';
    }

    function initializeInvalidKrgCrbType1() {
      setLocalStorageItem('krg_crb', getInvalidKrgCrbType1());
    }

    function initializeInvalidKrgCrbType1Cookie() {
      setCookie('krg_crb', getInvalidKrgCrbType1());
    }

    function getInvalidKrgCrbType2() {
      return 'Ly8v';
    }

    function getInvalidKrgCrbType2OldStyle() {
      return '{"v":"&&&&&&"}';
    }

    function initializeInvalidKrgCrbType2() {
      setLocalStorageItem('krg_crb', getInvalidKrgCrbType2());
    }

    function initializeInvalidKrgCrbType2Cookie() {
      setCookie('krg_crb', getInvalidKrgCrbType2OldStyle());
    }

    function getInvalidKrgCrbType3OldStyle() {
      return '{"v":"Ly8v"}';
    }

    function initializeInvalidKrgCrbType3Cookie() {
      setCookie('krg_crb', getInvalidKrgCrbType3OldStyle());
    }

    function getInvalidKrgCrbType4OldStyle() {
      return '{"v":"bnVsbA=="}';
    }

    function initializeInvalidKrgCrbType4Cookie() {
      setCookie('krg_crb', getInvalidKrgCrbType4OldStyle());
    }

    function getEmptyKrgCrb() {
      return 'eyJleHBpcmVUaW1lIjoxNDk3NDQ5MzgyNjY4LCJsYXN0U3luY2VkQXQiOjE0OTczNjI5NzkwMTJ9';
    }

    function getEmptyKrgCrbOldStyle() {
      return '{"v":"eyJleHBpcmVUaW1lIjoxNDk3NDQ5MzgyNjY4LCJsYXN0U3luY2VkQXQiOjE0OTczNjI5NzkwMTJ9"}';
    }

    function initializeEmptyKrgCrb() {
      setLocalStorageItem('krg_crb', getEmptyKrgCrb());
    }

    function initializeEmptyKrgCrbCookie() {
      setCookie('krg_crb', getEmptyKrgCrbOldStyle());
    }

    function getSessionId() {
      return spec._getSessionId();
    }

    function getExpectedKrakenParams(excludeUserIds, expectedRawCRB, expectedRawCRBCookie, expectedGDPR) {
      var base = {
        timeout: 200,
        requestCount: requestCount++,
        currency: 'USD',
        cpmGranularity: 1,
        timestamp: frozenNow.getTime(),
        cpmRange: {
          floor: 0,
          ceil: 20
        },
        bidIDs: {
          1: 'foo',
          2: 'bar',
          3: 'bar'
        },
        bidSizes: {
          1: [[320, 50], [300, 250], [300, 600]],
          2: [[320, 50], [300, 250], [300, 600]],
          3: [[320, 50], [300, 250], [300, 600]]
        },
        device: {
          width: screen.width,
          height: screen.height,
          sua: {
            platform: {
              brand: 'macOS',
              version: [ '12', '6', '0' ]
            },
            browsers: [
              {
                brand: 'Chromium',
                version: [ '106', '0', '5249', '119' ]
              },
              {
                brand: 'Google Chrome',
                version: [ '106', '0', '5249', '119' ]
              },
              {
                brand: 'Not;A=Brand',
                version: [ '99', '0', '0', '0' ]
              }
            ],
            mobile: 0,
            model: '',
          },
        },
        userIDs: {
          kargoID: '5f108831-302d-11e7-bf6b-4595acd3bf6c',
          clientID: '2410d8f2-c111-4811-88a5-7b5e190e475f',
          tdID: 'fake-tdid',
          crbIDs: {
            2: '82fa2555-5969-4614-b4ce-4dcf1080e9f9',
            16: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
            23: 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
            24: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
            25: '5ee24138-5e03-4b9d-a953-38e833f2849f',
            '2_80': 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
            '2_93': '5ee24138-5e03-4b9d-a953-38e833f2849f'
          },
          optOut: false,
          usp: '1---'
        },
        pageURL: 'https://www.prebid.org',
        prebidRawBidRequests: [
          {
            bidId: 1,
            ortb2: {
              device: {
                sua: {
                  platform: {
                    brand: 'macOS',
                    version: [ '12', '6', '0' ]
                  },
                  browsers: [
                    {
                      brand: 'Chromium',
                      version: [ '106', '0', '5249', '119' ]
                    },
                    {
                      brand: 'Google Chrome',
                      version: [ '106', '0', '5249', '119' ]
                    },
                    {
                      brand: 'Not;A=Brand',
                      version: [ '99', '0', '0', '0' ]
                    }
                  ],
                  mobile: 0,
                  model: ''
                }
              }
            },
            params: {
              placementId: 'foo'
            },
            userId: {
              tdid: 'fake-tdid'
            },
            sizes: [[320, 50], [300, 250], [300, 600]],
          },
          {
            bidId: 2,
            params: {
              placementId: 'bar'
            },
            sizes: [[320, 50], [300, 250], [300, 600]]
          },
          {
            bidId: 3,
            params: {
              placementId: 'bar'
            },
            sizes: [[320, 50], [300, 250], [300, 600]]
          }
        ],
        rawCRB: expectedRawCRBCookie,
        rawCRBLocalStorage: expectedRawCRB
      };

      if (expectedGDPR) {
        base.userIDs['gdpr'] = expectedGDPR;
      }

      if (excludeUserIds === true) {
        base.userIDs = {
          crbIDs: {},
          usp: '1---'
        };
        delete base.prebidRawBidRequests[0].userId.tdid;
      }

      return base;
    }

    function testBuildRequests(excludeTdid, expected, gdpr) {
      var clonedBids = JSON.parse(JSON.stringify(bids));
      if (excludeTdid) {
        delete clonedBids[0].userId.tdid;
      }
      var payload = {
        timeout: 200,
        uspConsent: '1---',
        refererInfo: {
          page: 'https://www.prebid.org',
        },
      };

      if (gdpr) {
        payload['gdprConsent'] = gdpr
      }

      var request = spec.buildRequests(clonedBids, payload);
      expected.sessionId = getSessionId();
      sessionIds.push(expected.sessionId);
      var krakenParams = JSON.parse(decodeURIComponent(request.data.slice(5)));
      expect(request.data.slice(0, 5)).to.equal('json=');
      expect(request.url).to.equal('https://krk.kargo.com/api/v2/bid');
      expect(request.method).to.equal('GET');
      expect(request.currency).to.equal('USD');
      expect(request.timeout).to.equal(200);
      expect(krakenParams).to.deep.equal(expected);
      // Make sure session ID stays the same across requests simulating multiple auctions on one page load
      for (let i in sessionIds) {
        if (i == 0) {
          continue;
        }
        let sessionId = sessionIds[i];
        expect(sessionIds[0]).to.equal(sessionId);
      }
    }

    it('works when all params and localstorage and cookies are correctly set', function() {
      initializeKrgCrb();
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle()));
    });

    it('works when all params and cookies are correctly set but no localstorage', function() {
      initializeKrgCrb(true);
      testBuildRequests(false, getExpectedKrakenParams(undefined, null, getKrgCrbOldStyle()));
    });

    it('gracefully handles nothing being set', function() {
      testBuildRequests(true, getExpectedKrakenParams(true, null, null));
    });

    it('gracefully handles browsers without localStorage', function() {
      simulateNoLocalStorage();
      testBuildRequests(true, getExpectedKrakenParams(true, null, null));
    });

    it('handles empty yet valid Kargo CRB', function() {
      initializeEmptyKrgCrb();
      initializeEmptyKrgCrbCookie();
      testBuildRequests(true, getExpectedKrakenParams(true, getEmptyKrgCrb(), getEmptyKrgCrbOldStyle()));
    });

    it('handles broken Kargo CRBs where base64 encoding is invalid', function() {
      initializeInvalidKrgCrbType1();
      testBuildRequests(true, getExpectedKrakenParams(true, getInvalidKrgCrbType1(), null));
    });

    it('handles broken Kargo CRBs where top level JSON is invalid on cookie', function() {
      initializeInvalidKrgCrbType1Cookie();
      testBuildRequests(true, getExpectedKrakenParams(true, null, getInvalidKrgCrbType1()));
    });

    it('handles broken Kargo CRBs where decoded JSON is invalid', function() {
      initializeInvalidKrgCrbType2();
      testBuildRequests(true, getExpectedKrakenParams(true, getInvalidKrgCrbType2(), null));
    });

    it('handles broken Kargo CRBs where inner base 64 is invalid on cookie', function() {
      initializeInvalidKrgCrbType2Cookie();
      testBuildRequests(true, getExpectedKrakenParams(true, null, getInvalidKrgCrbType2OldStyle()));
    });

    it('handles broken Kargo CRBs where inner JSON is invalid on cookie', function() {
      initializeInvalidKrgCrbType3Cookie();
      testBuildRequests(true, getExpectedKrakenParams(true, null, getInvalidKrgCrbType3OldStyle()));
    });

    it('handles broken Kargo CRBs where inner JSON is falsey', function() {
      initializeInvalidKrgCrbType4Cookie();
      testBuildRequests(true, getExpectedKrakenParams(true, null, getInvalidKrgCrbType4OldStyle()));
    });

    it('handles a non-existant currency object on the config', function() {
      simulateNoCurrencyObject();
      initializeKrgCrb();
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle()));
    });

    it('handles no ad server currency being set on the currency object in the config', function() {
      simulateNoAdServerCurrency();
      initializeKrgCrb();
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle()));
    });

    it('sends gdpr consent', function () {
      initializeKrgCrb();
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle(), generateGDPRExpect(true, true)), generateGDPR(true, true));
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle(), generateGDPRExpect(false, true)), generateGDPR(false, true));
      testBuildRequests(false, getExpectedKrakenParams(undefined, getKrgCrb(), getKrgCrbOldStyle(), generateGDPRExpect(false, false)), generateGDPR(false, false));
    });
  });

  describe('response handler', function() {
    it('handles bid responses', function() {
      var resp = spec.interpretResponse({body: {
        1: {
          id: 'foo',
          cpm: 3,
          adm: '<div id="1"></div>',
          width: 320,
          height: 50,
          metadata: {}
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
          }
        },
        3: {
          id: 'bar',
          cpm: 2.5,
          adm: '<div id="2"></div>',
          width: 300,
          height: 250
        },
        4: {
          id: 'bar',
          cpm: 2.5,
          adm: '<div id="4"></div>',
          width: 300,
          height: 250,
          mediaType: 'banner',
          metadata: {},
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
          currency: 'EUR'
        }
      }}, {
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
        }]
      });
      var expectation = [{
        requestId: '1',
        cpm: 3,
        width: 320,
        height: 50,
        ad: '<div id="1"></div>',
        ttl: 300,
        creativeId: 'foo',
        dealId: undefined,
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        }
      }, {
        requestId: '2',
        cpm: 2.5,
        width: 300,
        height: 250,
        ad: '<div id="2"></div>',
        ttl: 300,
        creativeId: 'bar',
        dealId: 'dmpmptest1234',
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner',
          clickUrl: 'https://foobar.com',
          advertiserDomains: ['https://foobar.com']
        }
      }, {
        requestId: '3',
        cpm: 2.5,
        width: 300,
        height: 250,
        ad: '<div id="2"></div>',
        ttl: 300,
        creativeId: 'bar',
        dealId: undefined,
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        }
      }, {
        requestId: '4',
        cpm: 2.5,
        width: 300,
        height: 250,
        ad: '<div id="4"></div>',
        ttl: 300,
        creativeId: 'bar',
        dealId: undefined,
        netRevenue: true,
        currency: 'EUR',
        mediaType: 'banner',
        meta: {
          mediaType: 'banner'
        }
      }, {
        requestId: '5',
        cpm: 2.5,
        width: 300,
        height: 250,
        ad: '<VAST></VAST>',
        vastXml: '<VAST></VAST>',
        ttl: 300,
        creativeId: 'bar',
        dealId: undefined,
        netRevenue: true,
        currency: 'EUR',
        mediaType: 'video',
        meta: {
          mediaType: 'video'
        }
      }];
      expect(resp).to.deep.equal(expectation);
    });
  });

  describe('user sync handler', function() {
    const clientId = '74c81cbb-7d07-46d9-be9b-68ccb291c949';
    var shouldSimulateOutdatedBrowser, crb, isActuallyOutdatedBrowser;

    beforeEach(() => {
      $$PREBID_GLOBAL$$.bidderSettings = {
        kargo: {
          storageAllowed: true
        }
      };
      crb = {};
      shouldSimulateOutdatedBrowser = false;
      isActuallyOutdatedBrowser = false;

      // IE11 fails these tests in the Prebid test suite. Since this
      // browser won't support any of this stuff we expect all user
      // syncing to fail gracefully. Kargo is mobile only, so this
      // doesn't really matter.
      if (!window.crypto) {
        isActuallyOutdatedBrowser = true;
      } else {
        sandbox.stub(crypto, 'getRandomValues').callsFake(function(buf) {
          if (shouldSimulateOutdatedBrowser) {
            throw new Error('Could not generate random values');
          }
          var bytes = [50, 5, 232, 133, 141, 55, 49, 57, 244, 126, 248, 44, 255, 38, 128, 0];
          for (var i = 0; i < bytes.length; i++) {
            buf[i] = bytes[i];
          }
          return buf;
        });
      }

      sandbox.stub(spec, '_getCrb').callsFake(function() {
        return crb;
      });
    });

    function getUserSyncsWhenAllowed(gdprConsent, usPrivacy) {
      return spec.getUserSyncs({iframeEnabled: true}, null, gdprConsent, usPrivacy);
    }

    function getUserSyncsWhenForbidden() {
      return spec.getUserSyncs({});
    }

    function turnOnClientId() {
      crb.clientId = clientId;
    }

    function simulateOutdatedBrowser() {
      shouldSimulateOutdatedBrowser = true;
    }

    function getSyncUrl(index, gdprApplies, gdprConsentString, usPrivacy) {
      return {
        type: 'iframe',
        url: `https://crb.kargo.com/api/v1/initsyncrnd/${clientId}?seed=3205e885-8d37-4139-b47e-f82cff268000&idx=${index}&gdpr=${gdprApplies}&gdpr_consent=${gdprConsentString}&us_privacy=${usPrivacy}`
      };
    }

    function getSyncUrls(gdprApplies, gdprConsentString, usPrivacy) {
      var syncs = [];
      for (var i = 0; i < 5; i++) {
        syncs[i] = getSyncUrl(i, gdprApplies || 0, gdprConsentString || '', usPrivacy || '');
      }
      return syncs;
    }

    function safelyRun(runExpectation) {
      if (isActuallyOutdatedBrowser) {
        expect(getUserSyncsWhenAllowed()).to.be.an('array').that.is.empty;
      } else {
        runExpectation();
      }
    }

    it('handles user syncs when there is a client id', function() {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.deep.equal(getSyncUrls()));
    });

    it('no user syncs when there is no client id', function() {
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.be.an('array').that.is.empty);
    });

    it('no user syncs when there is no us privacy consent', function() {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed(null, '1YYY')).to.be.an('array').that.is.empty);
    });

    it('pass through us privacy consent', function() {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed(null, '1YNY')).to.deep.equal(getSyncUrls(0, '', '1YNY')));
    });

    it('pass through gdpr consent', function() {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed({ gdprApplies: true, consentString: 'consentstring' })).to.deep.equal(getSyncUrls(1, 'consentstring', '')));
    });

    it('no user syncs when there is outdated browser', function() {
      turnOnClientId();
      simulateOutdatedBrowser();
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.be.an('array').that.is.empty);
    });

    it('no user syncs when no iframe syncing allowed', function() {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenForbidden()).to.be.an('array').that.is.empty);
    });
  });

  describe('timeout pixel trigger', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should call triggerPixel utils function when timed out is filled', function () {
      spec.onTimeout();
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onTimeout([{ auctionId: '1234', timeout: 2000 }]);
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://krk.kargo.com/api/v1/event/timeout');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('aid=1234');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('ato=2000');
    });
  });
});
