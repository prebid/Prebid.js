describe('kargo adapter tests', function () {
  const expect = require('chai').expect;
  const assert = require('chai').assert;
  const adapter = require('modules/kargoBidAdapter');
  const bidmanager = require('src/bidmanager');
  const bidfactory = require('src/bidfactory');
  const adloader = require('src/adloader');
  const CONSTANTS = require('src/constants.json');

  var sandbox, params, krakenParams, adUnits, bidFactorySpy, addBidResponseSpy, bodyAppendSpy, cookies = [], localStorageItems = [];

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    addBidResponseSpy = sandbox.stub(bidmanager, 'addBidResponse');
    bodyAppendSpy = sandbox.stub(document.body, 'appendChild');
    simulateBidFactory();
    simulateAdLoader();

    params = {
      timeout: 200,
      requestId: 'f4cf851b-665a-43d7-b22c-33c8fdebe577',
      bids: [
        {
          params: {
            placementId: 'foo'
          },
          placementCode: 1
        },
        {
          params: {
            placementId: 'bar'
          },
          placementCode: 2
        }
      ]
    };

    adUnits = {
      foo: {
        receivedTracker: 'fake-tracker-1',
        cpm: 3,
        adm: '<div id="1"></div>',
        width: 320,
        height: 50
      },
      bar: {
        cpm: 2.5,
        adm: '<div id="2"></div>',
        width: 300,
        height: 250
      }
    }
  });

  afterEach(() => {
    sandbox.restore();

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

  function simulateAdLoader() {
    sandbox.stub(adloader, 'loadScript').callsFake((url) => {
      window.$$PREBID_GLOBAL$$.kargo_prebid_f4cf851b_665a_43d7_b22c_33c8fdebe577(adUnits);
      krakenParams = JSON.parse(decodeURIComponent(url.match(/\?json=(.*)&cb=/)[1]));
    });
  }

  function simulateNoLocalStorage() {
    return sandbox.stub(localStorage, 'getItem').throws();
  }

  function simulateBidFactory() {
    bidFactorySpy = sandbox.stub(bidfactory, 'createBid').withArgs(CONSTANTS.STATUS.GOOD);

    bidFactorySpy.onCall(0).returns({
      statusMessage: 'Bid available',
      adId: '12dd646671a959'
    });

    bidFactorySpy.onCall(1).returns({
      statusMessage: 'Bid available',
      adId: '33f07659bdaf94'
    });
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

  function initializeKrgCrb() {
    setCookie('krg_crb', '%7B%22v%22%3A%22eyJzeW5jSWRzIjp7IjIiOiI4MmZhMjU1NS01OTY5LTQ2MTQtYjRjZS00ZGNmMTA4MGU5ZjkiLCIxNiI6IlZveElrOEFvSnowQUFFZENleUFBQUFDMiY1MDIiLCIyMyI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjI0IjoiVm94SWs4QW9KejBBQUVkQ2V5QUFBQUMyJjUwMiIsIjI1IjoiNWVlMjQxMzgtNWUwMy00YjlkLWE5NTMtMzhlODMzZjI4NDlmIiwiMl84MCI6ImQyYTg1NWE1LTFiMWMtNDMwMC05NDBlLWE3MDhmYTFmMWJkZSIsIjJfOTMiOiI1ZWUyNDEzOC01ZTAzLTRiOWQtYTk1My0zOGU4MzNmMjg0OWYifSwiZXhwaXJlVGltZSI6MTQ5NzQ0OTM4MjY2OCwibGFzdFN5bmNlZEF0IjoxNDk3MzYyOTc5MDEyfQ%3D%3D%22%7D');
  }

  function initializeInvalidKrgUid() {
    setCookie('krg_uid', 'invalid-krg-uid');
  }

  function initializeInvalidKrgCrbType1() {
    setCookie('krg_crb', 'invalid-krg-crb');
  }

  function initializeInvalidKrgCrbType2() {
    setCookie('krg_crb', '%7B%22v%22%3A%22%26%26%26%26%26%26%22%7D');
  }

  function initializeInvalidKrgCrbType3() {
    setCookie('krg_crb', '%7B%22v%22%3A%22Ly8v%22%7D');
  }

  function initializeEmptyKrgUid() {
    setCookie('krg_uid', '%7B%7D');
  }

  function initializeEmptyKrgCrb() {
    setCookie('krg_crb', '%7B%22v%22%3A%22eyJleHBpcmVUaW1lIjoxNDk3NDQ5MzgyNjY4LCJsYXN0U3luY2VkQXQiOjE0OTczNjI5NzkwMTJ9%22%7D');
  }

  function getExpectedKrakenParams(excludeUserIds, excludeKrux) {
    var base = {
      timeout: 200,
      currency: 'USD',
      cpmGranularity: 1,
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      adSlotIds: [
        'foo',
        'bar'
      ],
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
      pageURL: window.location.href
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

  function getExpectedFirstBid() {
    return {
      'bidderCode': 'kargo',
      'width': 320,
      'height': 50,
      'statusMessage': 'Bid available',
      'adId': '12dd646671a959',
      'cpm': 3,
      'ad': '<div id=\"1\"></div>'
    };
  }

  function getExpectedSecondBid() {
    return {
      'bidderCode': 'kargo',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '33f07659bdaf94',
      'cpm': 2.5,
      'ad': '<div id=\"2\"></div>'
    };
  }

  function generalAssertions() {
    assert(bidFactorySpy.calledTwice);

    assert(addBidResponseSpy.getCall(0).calledWithExactly(1, sinon.match(getExpectedFirstBid())));
    assert(addBidResponseSpy.getCall(1).calledWithExactly(2, sinon.match(getExpectedSecondBid())));
    assert(addBidResponseSpy.calledTwice);

    var trackerEl = bodyAppendSpy.getCall(0).args[0];
    assert(trackerEl instanceof HTMLImageElement);
    assert(trackerEl.src === `${window.location.origin}/fake-tracker-1`);
    assert(bodyAppendSpy.calledOnce);
  }

  it('works when all params and cookies are correctly set', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeKrgUid();
    initializeKrgCrb();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams());
  });

  it('gracefully handles nothing being set', function() {
    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams(true, true));
  });

  it('gracefully handles browsers without localStorage', function() {
    simulateNoLocalStorage();
    initializeKrgUid();
    initializeKrgCrb();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams(false, true));
  });

  it('handles empty yet valid Kargo CRBs and UIDs', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeEmptyKrgUid();
    initializeEmptyKrgCrb();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams(true));
  });

  it('handles broken Kargo UIDs', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeInvalidKrgUid();
    initializeKrgCrb();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams({uid: true}));
  });

  it('handles broken Kargo CRBs where top level JSON is invalid', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeKrgUid();
    initializeInvalidKrgCrbType1();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams({crb: true}));
  });

  it('handles broken Kargo CRBs where inner base 64 is invalid', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeKrgUid();
    initializeInvalidKrgCrbType2();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams({crb: true}));
  });

  it('handles broken Kargo CRBs where inner JSON is invalid', function() {
    initializeKruxUser();
    initializeKruxSegments();
    initializeKrgUid();
    initializeInvalidKrgCrbType3();

    adapter().callBids(params);

    generalAssertions();
    expect(krakenParams).to.deep.equal(getExpectedKrakenParams({crb: true}));
  });
});
