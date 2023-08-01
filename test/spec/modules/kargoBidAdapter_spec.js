import { expect, assert } from 'chai';
import { spec } from 'modules/kargoBidAdapter.js';
import { config } from 'src/config.js';
const utils = require('src/utils');

describe('kargo adapter tests', function () {
  var sandbox, clock, frozenNow = new Date();
  const testSchain = {
    complete: 1,
    nodes: [
      {
        'asi': 'test-page.com',
        'hp': 1,
        'rid': '57bdd953-6e57-4d5b-9351-ed67ca238890',
        'sid': '8190248274'
      }
    ]
  }

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers(frozenNow.getTime());
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
  });

  describe('bid request validity', function () {
    it('passes when the bid includes a placement ID', function () {
      assert(spec.isBidRequestValid({ params: { placementId: 'foo' } }) === true);
    });

    it('fails when the bid does not include a placement ID', function () {
      assert(spec.isBidRequestValid({ params: {} }) === false);
    });

    it('fails when bid is falsey', function () {
      assert(spec.isBidRequestValid() === false);
    });

    it('fails when the bid has no params at all', function () {
      assert(spec.isBidRequestValid({}) === false);
    });
  });

  describe('build request', function () {
    var bids, undefinedCurrency, noAdServerCurrency, nonUSDAdServerCurrency, cookies = [], localStorageItems = [], sessionIds = [], requestCount = 0;

    beforeEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {
        kargo: {
          storageAllowed: true
        }
      };
      undefinedCurrency = false;
      noAdServerCurrency = false;
      nonUSDAdServerCurrency = false;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'currency') {
          if (undefinedCurrency) {
            return undefined;
          }
          if (noAdServerCurrency) {
            return {};
          }
          if (nonUSDAdServerCurrency) {
            return { adServerCurrency: 'EUR' };
          }
          return { adServerCurrency: 'USD' };
        }
        if (key === 'debug') return true;
        if (key === 'deviceAccess') return true;
        throw new Error(`Config stub incomplete! Missing key "${key}"`)
      });

      bids = [
        {
          params: {
            placementId: 'foo',
            socialCanvas: {
              segments: ['segment_1', 'segment_2', 'segment_3'],
              url: 'https://socan.url'
            }
          },
          auctionId: '1234098',
          bidId: '1',
          adUnitCode: '101',
          sizes: [[320, 50], [300, 250], [300, 600]],
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [300, 50]]
            }
          },
          bidRequestsCount: 1,
          bidderRequestsCount: 2,
          bidderWinsCount: 3,
          schain: testSchain,
          userId: {
            tdid: 'ed1562d5-e52b-406f-8e65-e5ab3ed5583c'
          },
          userIdAsEids: [
            {
              'source': 'adserver.org',
              'uids': [
                {
                  'id': 'ed1562d5-e52b-406f-8e65-e5ab3ed5583c',
                  'atype': 1,
                  'ext': {
                    'rtiPartner': 'TDID'
                  }
                }
              ]
            }
          ],
          floorData: {
            floorMin: 1
          },
          ortb2: {
            device: {
              sua: {
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
              }
            }
          },
          ortb2Imp: {
            ext: {
              tid: '10101',
              data: {
                adServer: {
                  name: 'gam',
                  adSlot: '/22558409563,18834096/dfy_mobile_adhesion'
                },
                pbAdSlot: '/22558409563,18834096/dfy_mobile_adhesion'
              },
              gpid: '/22558409563,18834096/dfy_mobile_adhesion'
            }
          }
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: '2',
          adUnitCode: '202',
          sizes: [[320, 50], [300, 250], [300, 600]],
          mediaTypes: {
            video: {
              sizes: [[320, 50], [300, 50]]
            }
          },
          bidRequestsCount: 0,
          bidderRequestsCount: 0,
          bidderWinsCount: 0,
          ortb2Imp: {
            ext: {
              tid: '20202',
              data: {
                adServer: {
                  name: 'gam',
                  adSlot: '/22558409563,18834096/dfy_mobile_adhesion'
                },
                pbAdSlot: '/22558409563,18834096/dfy_mobile_adhesion'
              }
            }
          }
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: '3',
          adUnitCode: '303',
          sizes: [[320, 50], [300, 250], [300, 600]],
          mediaTypes: {
            native: {
              sizes: [[320, 50], [300, 50]]
            }
          },
          ortb2Imp: {
            ext: {
              tid: '30303',
              data: {
                adServer: {
                  name: 'gam',
                  adSlot: '/22558409563,18834096/dfy_mobile_adhesion'
                }
              }
            }
          }
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
      nonUSDAdServerCurrency = false;
    }

    function simulateNoAdServerCurrency() {
      undefinedCurrency = false;
      noAdServerCurrency = true;
      nonUSDAdServerCurrency = false;
    }

    function simulateNonUSDAdServerCurrency() {
      undefinedCurrency = false;
      noAdServerCurrency = false;
      nonUSDAdServerCurrency = true;
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

    function generatePageView() {
      return {
        id: '112233',
        timestamp: frozenNow.getTime(),
        url: 'http://pageview.url'
      }
    }

    function generateRawCRB(rawCRB, rawCRBLocalStorage) {
      if (rawCRB == null && rawCRBLocalStorage == null) {
        return null
      }

      let result = {}

      if (rawCRB != null) {
        result.rawCRB = rawCRB
      }

      if (rawCRBLocalStorage != null) {
        result.rawCRBLocalStorage = rawCRBLocalStorage
      }

      return result
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

    function initializePageView() {
      setLocalStorageItem('pageViewId', 112233);
      setLocalStorageItem('pageViewTimestamp', frozenNow.getTime());
      setLocalStorageItem('pageViewUrl', 'http://pageview.url');
    }

    function initializeEmptyKrgCrbCookie() {
      setCookie('krg_crb', getEmptyKrgCrbOldStyle());
    }

    function getSessionId() {
      return spec._getSessionId();
    }

    function getExpectedKrakenParams(expectedCRB, expectedPage, excludeUserIds, expectedGDPR, currency) {
      var base = {
        pbv: '$prebid.version$',
        aid: '1234098',
        requestCount: 0,
        sid: getSessionId(),
        url: 'https://www.prebid.org',
        timeout: 200,
        ts: frozenNow.getTime(),
        schain: testSchain,
        device: {
          size: [
            screen.width,
            screen.height
          ],
          sua: {
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
            source: 1
          },
        },
        imp: [
          {
            code: '101',
            id: '1',
            pid: 'foo',
            tid: '10101',
            banner: {
              sizes: [[320, 50], [300, 50]]
            },
            bidRequestCount: 1,
            bidderRequestCount: 2,
            bidderWinCount: 3,
            floor: 1,
            fpd: {
              gpid: '/22558409563,18834096/dfy_mobile_adhesion'
            }
          },
          {
            code: '202',
            id: '2',
            pid: 'bar',
            tid: '20202',
            video: {
              sizes: [[320, 50], [300, 50]]
            },
            fpd: {
              gpid: '/22558409563,18834096/dfy_mobile_adhesion'
            }
          },
          {
            code: '303',
            id: '3',
            pid: 'bar',
            tid: '30303',
            native: {
              sizes: [[320, 50], [300, 50]]
            },
            fpd: {
              gpid: '/22558409563,18834096/dfy_mobile_adhesion'
            }
          }
        ],
        socan: {
          segments: ['segment_1', 'segment_2', 'segment_3'],
          url: 'https://socan.url'
        },
        user: {
          kargoID: '5f108831-302d-11e7-bf6b-4595acd3bf6c',
          clientID: '2410d8f2-c111-4811-88a5-7b5e190e475f',
          tdID: 'ed1562d5-e52b-406f-8e65-e5ab3ed5583c',
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
          usp: '1---',
          sharedIDEids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: 'ed1562d5-e52b-406f-8e65-e5ab3ed5583c',
                  atype: 1,
                  ext: {
                    rtiPartner: 'TDID'
                  }
                }
              ]
            }
          ]
        }
      };

      if (excludeUserIds) {
        base.user.crbIDs = {};
        delete base.user.clientID;
        delete base.user.kargoID;
        delete base.user.optOut;
      }

      if (expectedGDPR) {
        base.user.gdpr = expectedGDPR;
      }

      if (expectedPage) {
        base.page = expectedPage;
      }

      if (currency) {
        base.cur = currency;
      }

      const reqCount = requestCount++;
      base.requestCount = reqCount

      if (expectedCRB != null) {
        if (expectedCRB.rawCRB != null) {
          base.rawCRB = expectedCRB.rawCRB
        }
        if (expectedCRB.rawCRBLocalStorage != null) {
          base.rawCRBLocalStorage = expectedCRB.rawCRBLocalStorage
        }
      }

      return base;
    }

    function testBuildRequests(expected, gdpr) {
      var clonedBids = JSON.parse(JSON.stringify(bids));

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
      var krakenParams = request.data;

      expect(request.url).to.equal('https://krk2.kargo.com/api/v1/prebid');
      expect(request.method).to.equal('POST');
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

    it('works when all params and localstorage and cookies are correctly set', function () {
      initializeKrgCrb();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), generatePageView()));
    });

    it('works when all params and cookies are correctly set but no localstorage', function () {
      initializeKrgCrb(true);
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle())));
    });

    it('gracefully handles nothing being set', function () {
      testBuildRequests(getExpectedKrakenParams(undefined, undefined, true));
    });

    it('gracefully handles browsers without localStorage', function () {
      simulateNoLocalStorage();
      testBuildRequests(getExpectedKrakenParams(undefined, undefined, true));
    });

    it('handles empty yet valid Kargo CRB', function () {
      initializeEmptyKrgCrb();
      initializeEmptyKrgCrbCookie();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getEmptyKrgCrbOldStyle(), getEmptyKrgCrb()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where base64 encoding is invalid', function () {
      initializeInvalidKrgCrbType1();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(undefined, getInvalidKrgCrbType1()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where top level JSON is invalid on cookie', function () {
      initializeInvalidKrgCrbType1Cookie();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getInvalidKrgCrbType1()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where decoded JSON is invalid', function () {
      initializeInvalidKrgCrbType2();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(undefined, getInvalidKrgCrbType2()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where inner base 64 is invalid on cookie', function () {
      initializeInvalidKrgCrbType2Cookie();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getInvalidKrgCrbType2OldStyle()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where inner JSON is invalid on cookie', function () {
      initializeInvalidKrgCrbType3Cookie();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getInvalidKrgCrbType3OldStyle()), generatePageView(), true));
    });

    it('handles broken Kargo CRBs where inner JSON is falsey', function () {
      initializeInvalidKrgCrbType4Cookie();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getInvalidKrgCrbType4OldStyle()), generatePageView(), true));
    });

    it('handles a non-existant currency object on the config', function () {
      simulateNoCurrencyObject();
      initializeKrgCrb();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), generatePageView()));
    });

    it('handles no ad server currency being set on the currency object in the config', function () {
      simulateNoAdServerCurrency();
      initializeKrgCrb();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), generatePageView()));
    });

    it('handles non-USD ad server currency being set on the currency object in the config', function () {
      simulateNonUSDAdServerCurrency();
      initializeKrgCrb();
      initializePageView();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), generatePageView(), undefined, undefined, 'EUR'));
    });

    it('sends gdpr consent', function () {
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), undefined, false, generateGDPRExpect(true, true)), generateGDPR(true, true));
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), undefined, false, generateGDPRExpect(false, true)), generateGDPR(false, true));
      testBuildRequests(getExpectedKrakenParams(generateRawCRB(getKrgCrbOldStyle(), getKrgCrb()), undefined, false, generateGDPRExpect(false, false)), generateGDPR(false, false));
    });
  });

  describe('response handler', function () {
    it('handles bid responses', function () {
      var resp = spec.interpretResponse({
        body: {
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
            currency: 'EUR'
          }
        }
      }, {
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
      var expectation = [{
        ad: '<div id="1"></div>',
        requestId: '1',
        cpm: 3,
        width: 320,
        height: 50,
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
        ad: '<div id="2"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
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
        ad: '<div id="2"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
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
        ad: '<div id="4"></div>',
        cpm: 2.5,
        width: 300,
        height: 250,
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
      }, {
        requestId: '6',
        cpm: 2.5,
        width: 300,
        height: 250,
        vastUrl: 'https://foobar.com/vast_adm',
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

  describe('user sync handler', function () {
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
        sandbox.stub(crypto, 'getRandomValues').callsFake(function (buf) {
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

      sandbox.stub(spec, '_getCrb').callsFake(function () {
        return crb;
      });
    });

    function getUserSyncsWhenAllowed(gdprConsent, usPrivacy, gppConsent) {
      return spec.getUserSyncs({ iframeEnabled: true }, null, gdprConsent, usPrivacy, gppConsent);
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

    function getSyncUrl(index, gdprApplies, gdprConsentString, usPrivacy, gpp, gppSid) {
      return {
        type: 'iframe',
        url: `https://crb.kargo.com/api/v1/initsyncrnd/${clientId}?seed=3205e885-8d37-4139-b47e-f82cff268000&idx=${index}&gdpr=${gdprApplies}&gdpr_consent=${gdprConsentString}&us_privacy=${usPrivacy}&gpp=${gpp}&gpp_sid=${gppSid}`
      };
    }

    function getSyncUrls(gdprApplies, gdprConsentString, usPrivacy, gpp, gppSid) {
      var syncs = [];
      for (var i = 0; i < 5; i++) {
        syncs[i] = getSyncUrl(i, gdprApplies || 0, gdprConsentString || '', usPrivacy || '', gpp || '', gppSid || '');
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

    it('handles user syncs when there is a client id', function () {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.deep.equal(getSyncUrls()));
    });

    it('no user syncs when there is no client id', function () {
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.be.an('array').that.is.empty);
    });

    it('no user syncs when there is no us privacy consent', function () {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed(null, '1YYY')).to.be.an('array').that.is.empty);
    });

    it('pass through us privacy consent', function () {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed(null, '1YNY')).to.deep.equal(getSyncUrls(0, '', '1YNY')));
    });

    it('pass through gdpr consent', function () {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed({ gdprApplies: true, consentString: 'consentstring' })).to.deep.equal(getSyncUrls(1, 'consentstring', '')));
    });

    it('pass through gpp consent', function () {
      turnOnClientId();
      safelyRun(() => expect(getUserSyncsWhenAllowed(null, null, { consentString: 'gppString', applicableSections: [-1] })).to.deep.equal(getSyncUrls('', '', '', 'gppString', '-1')));
    });

    it('no user syncs when there is outdated browser', function () {
      turnOnClientId();
      simulateOutdatedBrowser();
      safelyRun(() => expect(getUserSyncsWhenAllowed()).to.be.an('array').that.is.empty);
    });

    it('no user syncs when no iframe syncing allowed', function () {
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
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://krk2.kargo.com/api/v1/event/timeout');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('aid=1234');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('ato=2000');
    });
  });
});
