import {expect, assert} from 'chai';
import {spec} from 'modules/kargoBidAdapter';
import {registerBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';

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
    var bids, undefinedCurrency, noAdServerCurrency, cookies = [], localStorageItems = [];

    beforeEach(function () {
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
        throw new Error(`Config stub incomplete! Missing key "${key}"`)
      });

      bids = [
        {
          params: {
            placementId: 'foo'
          },
          bidId: 1
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: 2
        },
        {
          params: {
            placementId: 'bar'
          },
          bidId: 3
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

    function initializeKruxUser() {
      setLocalStorageItem('kxkar_user', 'rsgr9pnij');
    }

    function initializeKruxSegments() {
      setLocalStorageItem('kxkar_segs', 'qv9v984dy,rpx2gy365,qrd5u4axv,rnub9nmtd,reha00jnu');
    }

    function initializeKrgUid() {
      setCookie('krg_uid', '%7B%22v%22%3A%7B%22userId%22%3A%225f108831-302d-11e7-bf6b-4595acd3bf6c%22%2C%22clientId%22%3A%222410d8f2-c111-4811-88a5-7b5e190e475f%22%2C%22optOut%22%3Afalse%7D%7D');
    }

    function getKrgCrb() {
      return '%7B%22v%22%3A%22eyJzeW5jSWRzIjp7IjIiOiI4MmZhMjU1NS01OTY5LTQ2MTQtYjRjZS00ZGNmMTA4MGU5ZjkiLCIxNiI6IlZveElrOEFvSnowQUFFZENleUFBQUFDMiY1MDIiLCIyMyI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjI0IjoiVm94SWs4QW9KejBBQUVkQ2V5QUFBQUMyJjUwMiIsIjI1IjoiNWVlMjQxMzgtNWUwMy00YjlkLWE5NTMtMzhlODMzZjI4NDlmIiwiMl84MCI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjJfOTMiOiI1ZWUyNDEzOC01ZTAzLTRiOWQtYTk1My0zOGU4MzNmMjg0OWYifSwiZXhwaXJlVGltZSI6MTQ5NzQ0OTM4MjY2OCwibGFzdFN5bmNlZEF0IjoxNDk3MzYyOTc5MDEyfQ%3D%3D%22%7D';
    }

    function initializeKrgCrb() {
      setCookie('krg_crb', getKrgCrb());
    }

    function initializeInvalidKrgUid() {
      setCookie('krg_uid', 'invalid-krg-uid');
    }

    function getInvalidKrgCrbType1() {
      return 'invalid-krg-crb';
    }

    function initializeInvalidKrgCrbType1() {
      setCookie('krg_crb', getInvalidKrgCrbType1());
    }

    function getInvalidKrgCrbType2() {
      return '%7B%22v%22%3A%22%26%26%26%26%26%26%22%7D';
    }

    function initializeInvalidKrgCrbType2() {
      setCookie('krg_crb', getInvalidKrgCrbType2());
    }

    function getInvalidKrgCrbType3() {
      return '%7B%22v%22%3A%22Ly8v%22%7D';
    }

    function initializeInvalidKrgCrbType3() {
      setCookie('krg_crb', getInvalidKrgCrbType3());
    }

    function initializeEmptyKrgUid() {
      setCookie('krg_uid', '%7B%7D');
    }

    function getEmptyKrgCrb() {
      return '%7B%22v%22%3A%22eyJleHBpcmVUaW1lIjoxNDk3NDQ5MzgyNjY4LCJsYXN0U3luY2VkQXQiOjE0OTczNjI5NzkwMTJ9%22%7D';
    }

    function initializeEmptyKrgCrb() {
      setCookie('krg_crb', getEmptyKrgCrb());
    }

    function getExpectedKrakenParams(excludeUserIds, excludeKrux, expectedRawCRB) {
      var base = {
        timeout: 200,
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
        userIDs: {
          kargoID: '5f108831-302d-11e7-bf6b-4595acd3bf6c',
          clientID: '2410d8f2-c111-4811-88a5-7b5e190e475f',
          crbIDs: {
            2: '82fa2555-5969-4614-b4ce-4dcf1080e9f9',
            16: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
            23: 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
            24: 'VoxIk8AoJz0AAEdCeyAAAAC2&502',
            25: '5ee24138-5e03-4b9d-a953-38e833f2849f',
            '2_80': 'd2a855a5-1b1c-4300-940e-a708fa1f1bde',
            '2_93': '5ee24138-5e03-4b9d-a953-38e833f2849f'
          },
          optOut: false
        },
        krux: {
          userID: 'rsgr9pnij',
          segments: [
            'qv9v984dy',
            'rpx2gy365',
            'qrd5u4axv',
            'rnub9nmtd',
            'reha00jnu'
          ]
        },
        pageURL: window.location.href,
        rawCRB: expectedRawCRB
      };

      if (excludeUserIds === true) {
        base.userIDs = {
          crbIDs: {}
        };
      } else if (excludeUserIds) {
        if (excludeUserIds.uid) {
          delete base.userIDs.kargoID;
          delete base.userIDs.clientID;
          delete base.userIDs.optOut;
        }

        if (excludeUserIds.crb) {
          base.userIDs.crbIDs = {};
        }
      }

      if (excludeKrux) {
        base.krux = {
          userID: null,
          segments: []
        };
      }

      return base;
    }

    function testBuildRequests(expected) {
      var request = spec.buildRequests(bids, {timeout: 200, foo: 'bar'});
      var krakenParams = JSON.parse(decodeURIComponent(request.data.slice(5)));
      expect(request.data.slice(0, 5)).to.equal('json=');
      expect(request.url).to.equal('https://krk.kargo.com/api/v2/bid');
      expect(request.method).to.equal('GET');
      expect(request.currency).to.equal('USD');
      expect(request.timeout).to.equal(200);
      expect(request.foo).to.equal('bar');
      expect(krakenParams).to.deep.equal(expected);
    }

    it('works when all params and cookies are correctly set', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams(undefined, undefined, getKrgCrb()));
    });

    it('gracefully handles nothing being set', function() {
      testBuildRequests(getExpectedKrakenParams(true, true, null));
    });

    it('gracefully handles browsers without localStorage', function() {
      simulateNoLocalStorage();
      initializeKrgUid();
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams(false, true, getKrgCrb()));
    });

    it('handles empty yet valid Kargo CRBs and UIDs', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeEmptyKrgUid();
      initializeEmptyKrgCrb();
      testBuildRequests(getExpectedKrakenParams(true, undefined, getEmptyKrgCrb()));
    });

    it('handles broken Kargo UIDs', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeInvalidKrgUid();
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams({uid: true}, undefined, getKrgCrb()));
    });

    it('handles broken Kargo CRBs where top level JSON is invalid', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeInvalidKrgCrbType1();
      testBuildRequests(getExpectedKrakenParams({crb: true}, undefined, getInvalidKrgCrbType1()));
    });

    it('handles broken Kargo CRBs where inner base 64 is invalid', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeInvalidKrgCrbType2();
      testBuildRequests(getExpectedKrakenParams({crb: true}, undefined, getInvalidKrgCrbType2()));
    });

    it('handles broken Kargo CRBs where inner JSON is invalid', function() {
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeInvalidKrgCrbType3();
      testBuildRequests(getExpectedKrakenParams({crb: true}, undefined, getInvalidKrgCrbType3()));
    });

    it('handles a non-existant currency object on the config', function() {
      simulateNoCurrencyObject();
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams(undefined, undefined, getKrgCrb()));
    });

    it('handles no ad server currency being set on the currency object in the config', function() {
      simulateNoAdServerCurrency();
      initializeKruxUser();
      initializeKruxSegments();
      initializeKrgUid();
      initializeKrgCrb();
      testBuildRequests(getExpectedKrakenParams(undefined, undefined, getKrgCrb()));
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
          height: 50
        },
        2: {
          id: 'bar',
          cpm: 2.5,
          adm: '<div id="2"></div>',
          width: 300,
          height: 250,
          targetingCustom: 'dmpmptest1234'
        },
        3: {
          id: 'bar',
          cpm: 2.5,
          adm: '<div id="2"></div>',
          width: 300,
          height: 250
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
        currency: 'USD'
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
        currency: 'USD'
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
        currency: 'USD'
      }];
      expect(resp).to.deep.equal(expectation);
    });
  });

  describe('user sync handler', function() {
    const clientId = '74c81cbb-7d07-46d9-be9b-68ccb291c949';
    var shouldSimulateOutdatedBrowser, uid, isActuallyOutdatedBrowser;

    beforeEach(() => {
      uid = {};
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

      sandbox.stub(spec, '_getUid').callsFake(function() {
        return uid;
      });
    });

    function getUserSyncsWhenAllowed() {
      return spec.getUserSyncs({iframeEnabled: true});
    }

    function getUserSyncsWhenForbidden() {
      return spec.getUserSyncs({});
    }

    function turnOnClientId() {
      uid.clientId = clientId;
    }

    function simulateOutdatedBrowser() {
      shouldSimulateOutdatedBrowser = true;
    }

    function getSyncUrl(index) {
      return {
        type: 'iframe',
        url: `https://crb.kargo.com/api/v1/initsyncrnd/${clientId}?seed=3205e885-8d37-4139-b47e-f82cff268000&idx=${index}`
      };
    }

    function getSyncUrls() {
      var syncs = [];
      for (var i = 0; i < 5; i++) {
        syncs[i] = getSyncUrl(i);
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
});
