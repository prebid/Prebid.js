import { expect } from 'chai';
import find from 'core-js/library/fn/array/find';
import { newBidder } from 'src/adapters/bidderFactory';
import AdapterManager from 'src/adapterManager';
import { newAuctionManager } from 'src/auctionManager';
import * as utils from 'src/utils';
import * as urlUtils from 'src/url';
import events from 'src/events';
import { YieldbotAdapter, spec } from 'modules/yieldbotBidAdapter';

before(function() {
  YieldbotAdapter.clearAllCookies();
});
describe('Yieldbot Adapter Unit Tests', function() {
  const ALL_SEARCH_PARAMS = ['apie', 'bt', 'cb', 'cts_ad', 'cts_imp', 'cts_ini', 'cts_js', 'cts_ns', 'cts_rend', 'cts_res', 'e', 'ioa', 'it', 'la', 'lo', 'lpv', 'lpvi', 'mtp', 'np', 'pvd', 'pvi', 'r', 'ri', 'sb', 'sd', 'si', 'slot', 'sn', 'ssz', 'to', 'ua', 'v', 'vi'];

  const BID_LEADERBOARD_728x90 = {
    bidder: 'yieldbot',
    params: {
      psn: '1234',
      slot: 'leaderboard'
    },
    adUnitCode: '/0000000/leaderboard',
    transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c19',
    sizes: [728, 90],
    bidId: '2240b2af6064bb',
    bidderRequestId: '1e878e3676fb85',
    auctionId: 'c9964bd5-f835-4c91-916e-00295819f932'
  };

  const BID_MEDREC_300x600 = {
    bidder: 'yieldbot',
    params: {
      psn: '1234',
      slot: 'medrec'
    },
    adUnitCode: '/0000000/side-bar',
    transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c20',
    sizes: [300, 600],
    bidId: '332067957eaa33',
    bidderRequestId: '1e878e3676fb85',
    auctionId: 'c9964bd5-f835-4c91-916e-00295819f932'
  };

  const BID_MEDREC_300x250 = {
    bidder: 'yieldbot',
    params: {
      psn: '1234',
      slot: 'medrec'
    },
    adUnitCode: '/0000000/medrec',
    transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c21',
    sizes: [[300, 250]],
    bidId: '49d7fe5c3a15ed',
    bidderRequestId: '1e878e3676fb85',
    auctionId: 'c9964bd5-f835-4c91-916e-00295819f932'
  };

  const BID_SKY160x600 = {
    bidder: 'yieldbot',
    params: {
      psn: '1234',
      slot: 'skyscraper'
    },
    adUnitCode: '/0000000/side-bar',
    transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c21',
    sizes: [160, 600],
    bidId: '49d7fe5c3a16ee',
    bidderRequestId: '1e878e3676fb85',
    auctionId: 'c9964bd5-f835-4c91-916e-00295819f932'
  };

  const AD_UNITS = [
    {
      transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c19',
      code: '/00000000/leaderboard',
      sizes: [728, 90],
      bids: [
        {
          bidder: 'yieldbot',
          params: {
            psn: '1234',
            slot: 'leaderboard'
          }
        }
      ]
    },
    {
      transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c20',
      code: '/00000000/medrec',
      sizes: [[300, 250]],
      bids: [
        {
          bidder: 'yieldbot',
          params: {
            psn: '1234',
            slot: 'medrec'
          }
        }
      ]
    },
    {
      transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c21',
      code: '/00000000/multi-size',
      sizes: [[300, 600]],
      bids: [
        {
          bidder: 'yieldbot',
          params: {
            psn: '1234',
            slot: 'medrec'
          }
        }
      ]
    },
    {
      transactionId: '3bcca099-e22a-4e1e-ab60-365a74a87c22',
      code: '/00000000/skyscraper',
      sizes: [[160, 600]],
      bids: [
        {
          bidder: 'yieldbot',
          params: {
            psn: '1234',
            slot: 'skyscraper'
          }
        }
      ]
    }
  ];

  const INTERPRET_RESPONSE_BID_REQUEST = {
    method: 'GET',
    url: '//i.yldbt.com/m/1234/v1/init',
    data: {
      cts_js: 1518184900582,
      cts_ns: 1518184900582,
      v: 'pbjs-yb-1.0.0',
      vi: 'jdg00eijgpvemqlz73',
      si: 'jdg00eil9y4mcdo850',
      pvd: 6,
      pvi: 'jdg03ai5kp9k1rkheh',
      lpv: 1518184868108,
      lpvi: 'jdg02lfwmdx8n0ncgc',
      bt: 'init',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
      np: 'MacIntel',
      la: 'en-US',
      to: 5,
      sd: '2560x1440',
      lo: 'http://localhost:9999/test/spec/e2e/gpt-examples/gpt_yieldbot.html',
      r: '',
      e: '',
      sn: 'leaderboard|medrec|medrec|skyscraper',
      ssz: '728x90|300x250|300x600|160x600',
      cts_ini: 1518184900591
    },
    yieldbotSlotParams: {
      psn: '1234',
      sn: 'leaderboard|medrec|medrec|skyscraper',
      ssz: '728x90|300x250|300x600|160x600',
      bidIdMap: {
        'jdg03ai5kp9k1rkheh:leaderboard:728x90': '2240b2af6064bb',
        'jdg03ai5kp9k1rkheh:medrec:300x250': '49d7fe5c3a15ed',
        'jdg03ai5kp9k1rkheh:medrec:300x600': '332067957eaa33',
        'jdg03ai5kp9k1rkheh:skyscraper:160x600': '49d7fe5c3a16ee'
      }
    },
    options: {
      withCredentials: true,
      customHeaders: {
        Accept: 'application/json'
      }
    }
  };

  const INTERPRET_RESPONSE_SERVER_RESPONSE = {
    body: {
      pvi: 'jdg03ai5kp9k1rkheh',
      subdomain_iframe: 'ads-adseast-vpc',
      url_prefix: 'http://ads-adseast-vpc.yldbt.com/m/',
      slots: [
        {
          slot: 'leaderboard',
          cpm: '800',
          size: '728x90'
        },
        {
          slot: 'medrec',
          cpm: '300',
          size: '300x250'
        },
        {
          slot: 'medrec',
          cpm: '800',
          size: '300x600'
        },
        {
          slot: 'skyscraper',
          cpm: '300',
          size: '160x600'
        }
      ],
      user_syncs: [
        'https://usersync.dd9693a32aa1.com/00000000.gif?p=a',
        'https://usersync.3b19503b37d8.com/00000000.gif?p=b',
        'https://usersync.5cb389d36d30.com/00000000.gif?p=c'
      ]
    },
    headers: {}
  };

  let FIXTURE_AD_UNITS, FIXTURE_SERVER_RESPONSE, FIXTURE_BID_REQUEST, FIXTURE_BID_REQUESTS, FIXTURE_BIDS;
  beforeEach(function() {
    FIXTURE_AD_UNITS = utils.deepClone(AD_UNITS);
    FIXTURE_BIDS = {
      BID_LEADERBOARD_728x90: utils.deepClone(BID_LEADERBOARD_728x90),
      BID_MEDREC_300x600: utils.deepClone(BID_MEDREC_300x600),
      BID_MEDREC_300x250: utils.deepClone(BID_MEDREC_300x250),
      BID_SKY160x600: utils.deepClone(BID_SKY160x600)
    };

    FIXTURE_BID_REQUEST = utils.deepClone(INTERPRET_RESPONSE_BID_REQUEST);
    FIXTURE_SERVER_RESPONSE = utils.deepClone(INTERPRET_RESPONSE_SERVER_RESPONSE);
    FIXTURE_BID_REQUESTS = [
      FIXTURE_BIDS.BID_LEADERBOARD_728x90,
      FIXTURE_BIDS.BID_MEDREC_300x600,
      FIXTURE_BIDS.BID_MEDREC_300x250,
      FIXTURE_BIDS.BID_SKY160x600
    ];
  });

  afterEach(function() {
    YieldbotAdapter._optOut = false;
    YieldbotAdapter.clearAllCookies();
    YieldbotAdapter._isInitialized = false;
    YieldbotAdapter.initialize();
  });

  describe('Adapter exposes BidderSpec API', function() {
    it('code', function() {
      expect(spec.code).to.equal('yieldbot');
    });
    it('supportedMediaTypes', function() {
      expect(spec.supportedMediaTypes).to.deep.equal(['banner']);
    });
    it('isBidRequestValid', function() {
      expect(spec.isBidRequestValid).to.be.a('function');
    });
    it('buildRequests', function() {
      expect(spec.buildRequests).to.be.a('function');
    });
    it('interpretResponse', function() {
      expect(spec.interpretResponse).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      bidder: 'yieldbot',
      'params': {
        psn: 'foo',
        slot: 'bar'
      },
      sizes: [[300, 250], [300, 600]]
    };

    it('valid parameters', function() {
      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo',
          slot: 'bar'
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(true);
    });

    it('undefined parameters', function() {
      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo'
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          slot: 'bar'
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);
    });

    it('falsey string parameters', function() {
      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: '',
          slot: 'bar'
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo',
          slot: ''
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo',
          slot: 0
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);
    });

    it('parameters type invalid', function() {
      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo',
          slot: 0
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: { name: 'foo' },
          slot: 'bar'
        },
        sizes: [[300, 250], [300, 600]]
      })).to.equal(false);
    });

    it('invalid sizes type', function() {
      expect(spec.isBidRequestValid({
        bidder: 'yieldbot',
        'params': {
          psn: 'foo',
          slot: 'bar'
        },
        sizes: {}
      })).to.equal(true);
    });
  });

  describe('getSlotRequestParams', function() {
    const EMPTY_SLOT_PARAMS = { sn: '', ssz: '', bidIdMap: {} };

    it('should default to empty slot params', function() {
      expect(YieldbotAdapter.getSlotRequestParams('')).to.deep.equal(EMPTY_SLOT_PARAMS);
      expect(YieldbotAdapter.getSlotRequestParams()).to.deep.equal(EMPTY_SLOT_PARAMS);
      expect(YieldbotAdapter.getSlotRequestParams('', [])).to.deep.equal(EMPTY_SLOT_PARAMS);
      expect(YieldbotAdapter.getSlotRequestParams(0, [])).to.deep.equal(EMPTY_SLOT_PARAMS);
    });

    it('should build slot bid request parameters', function() {
      const bidRequests = [
        FIXTURE_BIDS.BID_LEADERBOARD_728x90,
        FIXTURE_BIDS.BID_MEDREC_300x600,
        FIXTURE_BIDS.BID_MEDREC_300x250
      ];
      const slotParams = YieldbotAdapter.getSlotRequestParams('f0e1d2c', bidRequests);

      expect(slotParams.psn).to.equal('1234');
      expect(slotParams.sn).to.equal('leaderboard|medrec');
      expect(slotParams.ssz).to.equal('728x90|300x600.300x250');

      let bidId = slotParams.bidIdMap['f0e1d2c:leaderboard:728x90'];
      expect(bidId).to.equal('2240b2af6064bb');

      bidId = slotParams.bidIdMap['f0e1d2c:medrec:300x250'];
      expect(bidId).to.equal('49d7fe5c3a15ed');

      bidId = slotParams.bidIdMap['f0e1d2c:medrec:300x600'];
      expect(bidId).to.equal('332067957eaa33');
    });

    it('should build slot bid request parameters in order of bidRequests', function() {
      const bidRequests = [
        FIXTURE_BIDS.BID_MEDREC_300x600,
        FIXTURE_BIDS.BID_LEADERBOARD_728x90,
        FIXTURE_BIDS.BID_MEDREC_300x250
      ];

      const slotParams = YieldbotAdapter.getSlotRequestParams('f0e1d2c', bidRequests);

      expect(slotParams.psn).to.equal('1234');
      expect(slotParams.sn).to.equal('medrec|leaderboard');
      expect(slotParams.ssz).to.equal('300x600.300x250|728x90');

      let bidId = slotParams.bidIdMap['f0e1d2c:leaderboard:728x90'];
      expect(bidId).to.equal('2240b2af6064bb');

      bidId = slotParams.bidIdMap['f0e1d2c:medrec:300x250'];
      expect(bidId).to.equal('49d7fe5c3a15ed');

      bidId = slotParams.bidIdMap['f0e1d2c:medrec:300x600'];
      expect(bidId).to.equal('332067957eaa33');
    });

    it('should exclude slot bid requests with malformed sizes', function() {
      const bid = FIXTURE_BIDS.BID_MEDREC_300x250;
      bid.sizes = ['300x250'];
      const bidRequests = [bid, FIXTURE_BIDS.BID_LEADERBOARD_728x90];
      const slotParams = YieldbotAdapter.getSlotRequestParams('affffffe', bidRequests);
      expect(slotParams.psn).to.equal('1234');
      expect(slotParams.sn).to.equal('leaderboard');
      expect(slotParams.ssz).to.equal('728x90');
    });
  });

  describe('getCookie', function() {
    it('should return null if cookie name not found', function() {
      const cookieName = YieldbotAdapter.newId();
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });
  });

  describe('setCookie', function() {
    it('should set a root path first-party cookie with temporal expiry', function() {
      const cookieName = YieldbotAdapter.newId();
      const cookieValue = YieldbotAdapter.newId();

      YieldbotAdapter.setCookie(cookieName, cookieValue, 2000, '/');
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(cookieValue);

      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should set a root path first-party cookie with session expiry', function() {
      const cookieName = YieldbotAdapter.newId();
      const cookieValue = YieldbotAdapter.newId();

      YieldbotAdapter.setCookie(cookieName, cookieValue, null, '/');
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(cookieValue);

      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should fail to set a cookie x-domain', function() {
      const cookieName = YieldbotAdapter.newId();
      const cookieValue = YieldbotAdapter.newId();

      YieldbotAdapter.setCookie(cookieName, cookieValue, null, '/', `${cookieName}.com`);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });
  });

  describe('clearAllcookies', function() {
    it('should delete all first-party cookies', function() {
      let idx, cookieLabels = YieldbotAdapter._cookieLabels, cookieName, cookieValue;
      for (idx = 0; idx < cookieLabels.length; idx++) {
        YieldbotAdapter.deleteCookie('__ybot' + cookieLabels[idx]);
      }

      YieldbotAdapter.sessionBlocked = true;
      expect(YieldbotAdapter.sessionBlocked, 'sessionBlocked').to.equal(true);

      const userId = YieldbotAdapter.userId;
      expect(YieldbotAdapter.userId, 'userId').to.equal(userId);

      const sessionId = YieldbotAdapter.sessionId;
      expect(YieldbotAdapter.sessionId, 'sessionId').to.equal(sessionId);

      const pageviewDepth = YieldbotAdapter.pageviewDepth;
      expect(pageviewDepth, 'returned pageviewDepth').to.equal(1);
      expect(YieldbotAdapter.pageviewDepth, 'get pageviewDepth').to.equal(2);

      const lastPageviewId = YieldbotAdapter.newId();
      YieldbotAdapter.lastPageviewId = lastPageviewId;
      expect(YieldbotAdapter.lastPageviewId, 'get lastPageviewId').to.equal(lastPageviewId);

      const lastPageviewTime = Date.now();
      YieldbotAdapter.lastPageviewTime = lastPageviewTime;
      expect(YieldbotAdapter.lastPageviewTime, 'lastPageviewTime').to.equal(lastPageviewTime);

      const urlPrefix = YieldbotAdapter.urlPrefix('http://here.there.com/ad/');
      expect(YieldbotAdapter.urlPrefix(), 'urlPrefix').to.equal('http://here.there.com/ad/');

      for (idx = 0; idx < cookieLabels.length; idx++) {
        cookieValue = YieldbotAdapter.getCookie('__ybot' + cookieLabels[idx]);
        expect(!!cookieValue, 'setter: ' + cookieLabels[idx]).to.equal(true);
      }

      YieldbotAdapter.clearAllCookies();

      for (idx = 0; idx < cookieLabels.length; idx++) {
        cookieName = '__ybot' + cookieLabels[idx];
        cookieValue = YieldbotAdapter.getCookie(cookieName);
        expect(cookieValue, cookieName).to.equal(null);
      };
    });
  });

  describe('sessionBlocked', function() {
    const cookieName = '__ybotn';
    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should return true if cookie value is interpreted as non-zero', function() {
      YieldbotAdapter.setCookie(cookieName, '1', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string "1"').to.equal(true);

      YieldbotAdapter.setCookie(cookieName, '10.01', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string "10.01"').to.equal(true);

      YieldbotAdapter.setCookie(cookieName, '-10.01', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string "-10.01"').to.equal(true);

      YieldbotAdapter.setCookie(cookieName, 1, 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the number 1').to.equal(true);
    });

    it('should return false if cookie name not found', function() {
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);
    });

    it('should return false if cookie value is interpreted as zero', function() {
      YieldbotAdapter.setCookie(cookieName, '0', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string "0"').to.equal(false);

      YieldbotAdapter.setCookie(cookieName, '.01', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string ".01"').to.equal(false);

      YieldbotAdapter.setCookie(cookieName, '-.9', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the string "-.9"').to.equal(false);

      YieldbotAdapter.setCookie(cookieName, 0, 2000, '/');
      expect(YieldbotAdapter.sessionBlocked, 'cookie value: the number 0').to.equal(false);
    });

    it('should return false if cookie value source is a non-numeric string', function() {
      YieldbotAdapter.setCookie(cookieName, 'true', 2000, '/');
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);
    });

    it('should return false if cookie value source is a boolean', function() {
      YieldbotAdapter.setCookie(cookieName, true, 2000, '/');
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);
    });

    it('should set sessionBlocked', function() {
      YieldbotAdapter.sessionBlocked = true;
      expect(YieldbotAdapter.sessionBlocked).to.equal(true);
      YieldbotAdapter.sessionBlocked = false;
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);

      YieldbotAdapter.sessionBlocked = 1;
      expect(YieldbotAdapter.sessionBlocked).to.equal(true);
      YieldbotAdapter.sessionBlocked = 0;
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);

      YieldbotAdapter.sessionBlocked = '1';
      expect(YieldbotAdapter.sessionBlocked).to.equal(true);
      YieldbotAdapter.sessionBlocked = '';
      expect(YieldbotAdapter.sessionBlocked).to.equal(false);
    });
  });

  describe('userId', function() {
    const cookieName = '__ybotu';
    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should set a user Id if cookie does not exist', function() {
      const userId = YieldbotAdapter.userId;
      expect(userId).to.match(/[0-9a-z]{18}/);
    });

    it('should return user Id if cookie exists', function() {
      const expectedUserId = YieldbotAdapter.newId();
      YieldbotAdapter.setCookie(cookieName, expectedUserId, 2000, '/');
      const userId = YieldbotAdapter.userId;
      expect(userId).to.equal(expectedUserId);
    });
  });

  describe('sessionId', function() {
    const cookieName = '__ybotsi';
    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should set a session Id if cookie does not exist', function() {
      const sessionId = YieldbotAdapter.sessionId;
      expect(sessionId).to.match(/[0-9a-z]{18}/);
    });

    it('should return session Id if cookie exists', function() {
      const expectedSessionId = YieldbotAdapter.newId();
      YieldbotAdapter.setCookie(cookieName, expectedSessionId, 2000, '/');
      const sessionId = YieldbotAdapter.sessionId;
      expect(sessionId).to.equal(expectedSessionId);
    });
  });

  describe('lastPageviewId', function() {
    const cookieName = '__ybotlpvi';

    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should return empty string if cookie does not exist', function() {
      const lastBidId = YieldbotAdapter.lastPageviewId;
      expect(lastBidId).to.equal('');
    });

    it('should set an id string', function() {
      const id = YieldbotAdapter.newId();
      YieldbotAdapter.lastPageviewId = id;
      const lastBidId = YieldbotAdapter.lastPageviewId;
      expect(lastBidId).to.equal(id);
    });
  });

  describe('lastPageviewTime', function() {
    const cookieName = '__ybotlpv';

    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should return zero if cookie does not exist', function() {
      const lastBidTime = YieldbotAdapter.lastPageviewTime;
      expect(lastBidTime).to.equal(0);
    });

    it('should set a timestamp', function() {
      const ts = Date.now();
      YieldbotAdapter.lastPageviewTime = ts;
      const lastBidTime = YieldbotAdapter.lastPageviewTime;
      expect(lastBidTime).to.equal(ts);
    });
  });

  describe('pageviewDepth', function() {
    const cookieName = '__ybotpvd';

    beforeEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
    });

    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should return one (1) if cookie does not exist', function() {
      const pageviewDepth = YieldbotAdapter.pageviewDepth;
      expect(pageviewDepth).to.equal(1);
    });

    it('should increment the integer string for depth', function() {
      let pageviewDepth = YieldbotAdapter.pageviewDepth;
      expect(pageviewDepth).to.equal(1);

      pageviewDepth = YieldbotAdapter.pageviewDepth;
      expect(pageviewDepth).to.equal(2);
    });
  });

  describe('urlPrefix', function() {
    const cookieName = '__ybotc';
    const protocol = document.location.protocol;
    afterEach(function() {
      YieldbotAdapter.deleteCookie(cookieName);
      expect(YieldbotAdapter.getCookie(cookieName)).to.equal(null);
    });

    it('should set the default prefix if cookie does not exist', function(done) {
      const urlPrefix = YieldbotAdapter.urlPrefix();
      expect(urlPrefix).to.equal('//i.yldbt.com/m/');
      done();
    });

    it('should return prefix if cookie exists', function() {
      YieldbotAdapter.setCookie(cookieName, protocol + '//closest.az.com/path/', 2000, '/');
      const urlPrefix = YieldbotAdapter.urlPrefix();
      expect(urlPrefix).to.equal(protocol + '//closest.az.com/path/');
    });

    it('should reset prefix if default already set', function() {
      const defaultUrlPrefix = YieldbotAdapter.urlPrefix();
      const url = protocol + '//close.az.com/path/';
      expect(defaultUrlPrefix).to.equal('//i.yldbt.com/m/');

      let urlPrefix = YieldbotAdapter.urlPrefix(url);
      expect(urlPrefix, 'reset prefix').to.equal(url);

      urlPrefix = YieldbotAdapter.urlPrefix();
      expect(urlPrefix, 'subsequent request').to.equal(url);
    });

    it('should set containing document protocol', function() {
      let urlPrefix = YieldbotAdapter.urlPrefix('http://close.az.com/path/');
      expect(urlPrefix, 'http - use: ' + protocol).to.equal(protocol + '//close.az.com/path/');

      urlPrefix = YieldbotAdapter.urlPrefix('https://close.az.com/path/');
      expect(urlPrefix, 'https - use: ' + protocol).to.equal(protocol + '//close.az.com/path/');
    });

    it('should fallback to default for invalid argument', function() {
      let urlPrefix = YieldbotAdapter.urlPrefix('//close.az.com/path/');
      expect(urlPrefix, 'Url w/o protocol').to.equal('//i.yldbt.com/m/');

      urlPrefix = YieldbotAdapter.urlPrefix('mumble');
      expect(urlPrefix, 'Invalid Url').to.equal('//i.yldbt.com/m/');
    });
  });

  describe('initBidRequestParams', function() {
    it('should build common bid request state parameters', function() {
      const params = YieldbotAdapter.initBidRequestParams(
        [
          {
            'params': {
              psn: '1234',
              slot: 'medrec'
            },
            sizes: [[300, 250], [300, 600]]
          }
        ]
      );

      const expectedParamKeys = [
        'v',
        'vi',
        'si',
        'pvi',
        'pvd',
        'lpvi',
        'bt',
        'lo',
        'r',
        'sd',
        'to',
        'la',
        'np',
        'ua',
        'lpv',
        'cts_ns',
        'cts_js',
        'e'
      ];

      const missingKeys = [];
      expectedParamKeys.forEach((item) => {
        if (item in params === false) {
          missingKeys.push(item);
        }
      });
      const extraKeys = [];
      Object.keys(params).forEach((item) => {
        if (!find(expectedParamKeys, param => param === item)) {
          extraKeys.push(item);
        }
      });

      expect(
        missingKeys.length,
        `\nExpected: ${expectedParamKeys}\nMissing keys: ${JSON.stringify(missingKeys)}`)
        .to.equal(0);
      expect(
        extraKeys.length,
        `\nExpected: ${expectedParamKeys}\nExtra keys: ${JSON.stringify(extraKeys)}`)
        .to.equal(0);
    });
  });

  describe('buildRequests', function() {
    it('should not return bid requests if optOut', function() {
      YieldbotAdapter._optOut = true;
      const requests = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS);
      expect(requests.length).to.equal(0);
    });

    it('should not return bid requests if sessionBlocked', function() {
      YieldbotAdapter.sessionBlocked = true;
      const requests = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS);
      expect(requests.length).to.equal(0);
      YieldbotAdapter.sessionBlocked = false;
    });

    it('should re-enable requests when sessionBlocked expires', function() {
      const cookieName = '__ybotn';
      YieldbotAdapter.setCookie(
        cookieName,
        1,
        2000,
        '/');
      let requests = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS);
      expect(requests.length).to.equal(0);
      YieldbotAdapter.deleteCookie(cookieName);
      requests = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS);
      expect(requests.length).to.equal(1);
    });

    it('should return a single BidRequest object', function() {
      const requests = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS);
      expect(requests.length).to.equal(1);
    });

    it('should have expected server options', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      const expectedOptions = {
        withCredentials: true,
        customHeaders: {
          Accept: 'application/json'
        }
      };
      expect(request.options).to.eql(expectedOptions);
    });

    it('should be a GET request', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.method).to.equal('GET');
    });

    it('should have bid request specific params', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.data).to.not.equal(undefined);

      const expectedParamKeys = [
        'v',
        'vi',
        'si',
        'pvi',
        'pvd',
        'lpvi',
        'bt',
        'lo',
        'r',
        'sd',
        'to',
        'la',
        'np',
        'ua',
        'sn',
        'ssz',
        'lpv',
        'cts_ns',
        'cts_js',
        'cts_ini',
        'e'
      ];

      const missingKeys = [];
      expectedParamKeys.forEach((item) => {
        if (item in request.data === false) {
          missingKeys.push(item);
        }
      });
      const extraKeys = [];
      Object.keys(request.data).forEach((item) => {
        if (!find(expectedParamKeys, param => param === item)) {
          extraKeys.push(item);
        }
      });

      expect(
        missingKeys.length,
        `\nExpected: ${expectedParamKeys}\nMissing keys: ${JSON.stringify(missingKeys)}`)
        .to.equal(0);
      expect(
        extraKeys.length,
        `\nExpected: ${expectedParamKeys}\nExtra keys: ${JSON.stringify(extraKeys)}`)
        .to.equal(0);
    });

    it('should have the correct bidUrl form', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      const bidUrl = '//i.yldbt.com/m/1234/v1/init';
      expect(request.url).to.equal(bidUrl);
    });

    it('should set the bid request slot/bidId mapping', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.yieldbotSlotParams).to.not.equal(undefined);
      expect(request.yieldbotSlotParams.bidIdMap).to.not.equal(undefined);

      const map = {};
      map[request.data.pvi + ':leaderboard:728x90'] = '2240b2af6064bb';
      map[request.data.pvi + ':medrec:300x250'] = '49d7fe5c3a15ed';
      map[request.data.pvi + ':medrec:300x600'] = '332067957eaa33';
      map[request.data.pvi + ':skyscraper:160x600'] = '49d7fe5c3a16ee';
      expect(request.yieldbotSlotParams.bidIdMap).to.eql(map);
    });

    it('should set the bid request publisher number', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.yieldbotSlotParams.psn).to.equal('1234');
    });

    it('should have unique slot name parameter', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.yieldbotSlotParams.sn).to.equal('leaderboard|medrec|skyscraper');
    });

    it('should have slot sizes parameter', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.yieldbotSlotParams.ssz).to.equal('728x90|300x600.300x250|160x600');
    });

    it('should use edge server Url prefix if set', function() {
      const cookieName = '__ybotc';
      YieldbotAdapter.setCookie(
        cookieName,
        'http://close.edge.adserver.com/',
        2000,
        '/');

      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.url).to.match(/^http:\/\/close\.edge\.adserver\.com\//);
    });

    it('should be adapter loaded before navigation start time', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      const timeDiff = request.data.cts_ns - request.data.cts_js;
      expect(timeDiff >= 0, 'adapter loaded < nav').to.equal(true);
    });

    it('should be navigation start before bid request time', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      const timeDiff = request.data.cts_ini - request.data.cts_ns;
      expect(timeDiff >= 0, 'nav start < request').to.equal(true);
    });
  });

  describe('interpretResponse', function() {
    it('should not return Bids if optOut', function() {
      YieldbotAdapter._optOut = true;
      const responses = YieldbotAdapter.interpretResponse();
      expect(responses.length).to.equal(0);
    });

    it('should not return Bids if no server response slot bids', function() {
      FIXTURE_SERVER_RESPONSE.body.slots = [];
      const responses = YieldbotAdapter.interpretResponse(FIXTURE_SERVER_RESPONSE, FIXTURE_BID_REQUEST);
      expect(responses.length).to.equal(0);
    });

    it('should not include Bid if missing cpm', function() {
      delete FIXTURE_SERVER_RESPONSE.body.slots[1].cpm;
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses.length).to.equal(3);
    });

    it('should not include Bid if missing size', function() {
      delete FIXTURE_SERVER_RESPONSE.body.slots[2].size;
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses.length).to.equal(3);
    });

    it('should not include Bid if missing slot', function() {
      delete FIXTURE_SERVER_RESPONSE.body.slots[3].slot;
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses.length).to.equal(3);
    });

    it('should have a valid creativeId', function() {
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses.length).to.equal(4);
      responses.forEach((bid) => {
        expect(bid.creativeId).to.match(/[0-9a-z]{18}/);
        const containerDivId = 'ybot-' + bid.creativeId;
        const re = new RegExp(containerDivId);
        expect(re.test(bid.ad)).to.equal(true);
      });
    });

    it('should specify Net revenue type for bid', function() {
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses[0].netRevenue).to.equal(true);
    });

    it('should specify USD currency for bid', function() {
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses[1].currency).to.equal('USD');
    });

    it('should set edge server Url prefix', function() {
      FIXTURE_SERVER_RESPONSE.body.url_prefix = 'http://close.edge.adserver.com/';
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      const edgeServerUrlPrefix = YieldbotAdapter.getCookie('__ybotc');

      const protocol = document.location.protocol;
      const beginsRegex = new RegExp('^' + protocol + '\/\/close\.edge\.adserver\.com\/');
      const containsRegex = new RegExp(protocol + '\/\/close\.edge\.adserver\.com\/');
      expect(edgeServerUrlPrefix).to.match(beginsRegex);
      expect(responses[0].ad).to.match(containsRegex);
    });

    it('should not use document.open() in ad markup', function() {
      FIXTURE_SERVER_RESPONSE.body.url_prefix = 'http://close.edge.adserver.com/';
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );
      expect(responses[0].ad).to.not.match(/var innerFrameDoc=innerFrame\.contentWindow\.document;innerFrameDoc\.open\(\);innerFrameDoc\.write\(iframeHtml\);innerFrameDoc\.close\(\);/);
      expect(responses[0].ad).to.match(/var innerFrameDoc=innerFrame\.contentWindow\.document;innerFrameDoc\.write\(iframeHtml\);innerFrameDoc\.close\(\);/);
    });
  });

  describe('getUserSyncs', function() {
    let responses;
    beforeEach(function () {
      responses = [FIXTURE_SERVER_RESPONSE];
    });
    it('should return empty Array when server response property missing', function() {
      delete responses[0].body.user_syncs;
      const userSyncs = YieldbotAdapter.getUserSyncs({ pixelEnabled: true }, responses);
      expect(userSyncs.length).to.equal(0);
    });

    it('should return empty Array when server response property is empty', function() {
      responses[0].body.user_syncs = [];
      const userSyncs = YieldbotAdapter.getUserSyncs({ pixelEnabled: true }, responses);
      expect(userSyncs.length).to.equal(0);
    });

    it('should return empty Array pixel disabled', function() {
      const userSyncs = YieldbotAdapter.getUserSyncs({ pixelEnabled: false }, responses);
      expect(userSyncs.length).to.equal(0);
    });

    it('should return empty Array pixel option not provided', function() {
      const userSyncs = YieldbotAdapter.getUserSyncs({ pixelNotHere: true }, responses);
      expect(userSyncs.length).to.equal(0);
    });

    it('should return image type pixels', function() {
      const userSyncs = YieldbotAdapter.getUserSyncs({ pixelEnabled: true }, responses);
      expect(userSyncs).to.eql(
        [
          { type: 'image', url: 'https://usersync.dd9693a32aa1.com/00000000.gif?p=a' },
          { type: 'image', url: 'https://usersync.3b19503b37d8.com/00000000.gif?p=b' },
          { type: 'image', url: 'https://usersync.5cb389d36d30.com/00000000.gif?p=c' }
        ]
      );
    });
  });

  describe('Adapter Auction Behavior', function() {
    AdapterManager.bidderRegistry['yieldbot'] = newBidder(spec);
    let sandbox, server, auctionManager;
    const bidUrlRegexp = /yldbt\.com\/m\/1234\/v1\/init/;
    beforeEach(function() {
      sandbox = sinon.sandbox.create({ useFakeServer: true });
      server = sandbox.server;
      server.respondImmediately = true;
      server.respondWith(
        'GET',
        bidUrlRegexp,
        [
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify(FIXTURE_SERVER_RESPONSE.body)
        ]
      );
      FIXTURE_SERVER_RESPONSE.user_syncs = [];
      auctionManager = newAuctionManager();
    });

    afterEach(function() {
      auctionManager = null;
      sandbox.restore();
      YieldbotAdapter._bidRequestCount = 0;
    });

    it('should provide auction bids', function(done) {
      let bidCount = 0;
      const firstAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      const bidResponseHandler = (event) => {
        bidCount++;
        if (bidCount === 4) {
          events.off('bidResponse', bidResponseHandler);
          done();
        }
      };
      events.on('bidResponse', bidResponseHandler);
      firstAuction.callBids();
    });

    it('should provide multiple auctions with correct bid cpms', function(done) {
      let bidCount = 0;
      let firstAuctionId = '';
      let secondAuctionId = '';
      /*
       * 'bidResponse' event handler checks for respective adUnit auctions and bids
       */
      const bidResponseHandler = (event) => {
        try {
          switch (true) {
            case event.adUnitCode === '/00000000/leaderboard' && event.auctionId === firstAuctionId:
              expect(event.cpm, 'leaderboard, first auction cpm').to.equal(8);
              break;
            case event.adUnitCode === '/00000000/medrec' && event.auctionId === firstAuctionId:
              expect(event.cpm, 'medrec, first auction cpm').to.equal(3);
              break;
            case event.adUnitCode === '/00000000/multi-size' && event.auctionId === firstAuctionId:
              expect(event.cpm, 'multi-size, first auction cpm').to.equal(8);
              break;
            case event.adUnitCode === '/00000000/skyscraper' && event.auctionId === firstAuctionId:
              expect(event.cpm, 'skyscraper, first auction cpm').to.equal(3);
              break;
            case event.adUnitCode === '/00000000/medrec' && event.auctionId === secondAuctionId:
              expect(event.cpm, 'medrec, second auction cpm').to.equal(1.11);
              break;
            case event.adUnitCode === '/00000000/multi-size' && event.auctionId === secondAuctionId:
              expect(event.cpm, 'multi-size, second auction cpm').to.equal(2.22);
              break;
            case event.adUnitCode === '/00000000/skyscraper' && event.auctionId === secondAuctionId:
              expect(event.cpm, 'skyscraper, second auction cpm').to.equal(3.33);
              break;
            default:
              done(new Error(`Bid response to assert not found: ${event.adUnitCode}:${event.size}:${event.auctionId}, [${firstAuctionId}, ${secondAuctionId}]`));
          }
          bidCount++;
          if (bidCount === 7) {
            events.off('bidResponse', bidResponseHandler);
            done();
          }
        } catch (err) {
          done(err);
        }
      };
      events.on('bidResponse', bidResponseHandler);

      /*
       * First auction
       */
      const firstAdUnits = FIXTURE_AD_UNITS;
      const firstAdUnitCodes = FIXTURE_AD_UNITS.map(unit => unit.code);
      const firstAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      firstAuctionId = firstAuction.getAuctionId();
      firstAuction.callBids();

      /*
       * Second auction with different bid values and fewer slots
       */
      FIXTURE_AD_UNITS.shift();
      const FIXTURE_SERVER_RESPONSE_2 = utils.deepClone(FIXTURE_SERVER_RESPONSE);
      FIXTURE_SERVER_RESPONSE_2.user_syncs = [];
      FIXTURE_SERVER_RESPONSE_2.body.slots.shift();
      FIXTURE_SERVER_RESPONSE_2.body.slots.forEach((bid, idx) => { const num = idx + 1; bid.cpm = `${num}${num}${num}`; });
      const secondAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      secondAuctionId = secondAuction.getAuctionId();
      server.respondWith(
        'GET',
        bidUrlRegexp,
        [
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify(FIXTURE_SERVER_RESPONSE_2.body)
        ]
      );
      secondAuction.callBids();
    });

    it('should have refresh bid type after the first auction', function(done) {
      const firstAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      firstAuction.callBids();

      const secondAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      secondAuction.callBids();

      const firstRequest = urlUtils.parse(server.firstRequest.url);
      expect(firstRequest.search.bt, 'First request bid type').to.equal('init');

      const secondRequest = urlUtils.parse(server.secondRequest.url);
      expect(secondRequest.search.bt, 'Second request bid type').to.equal('refresh');

      done();
    });

    it('should use server response url_prefix property value after the first auction', function(done) {
      const firstAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      firstAuction.callBids();

      const secondAuction = auctionManager.createAuction(
        {
          adUnits: FIXTURE_AD_UNITS,
          adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
        }
      );
      secondAuction.callBids();

      expect(server.firstRequest.url, 'Default url prefix').to.match(/i\.yldbt\.com\/m\//);
      expect(server.secondRequest.url, 'Locality url prefix').to.match(/ads-adseast-vpc\.yldbt\.com\/m\//);

      done();
    });

    it('should increment the session page view depth only before the first auction', function(done) {
      /*
       * First visit: two bid requests
       */
      for (let idx = 0; idx < 2; idx++) {
        auctionManager.createAuction(
          {
            adUnits: FIXTURE_AD_UNITS,
            adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
          }
        ).callBids();
      }

      const firstRequest = urlUtils.parse(server.firstRequest.url);
      expect(firstRequest.search.pvd, 'First pvd').to.equal('1');

      const secondRequest = urlUtils.parse(server.secondRequest.url);
      expect(secondRequest.search.pvd, 'Second pvd').to.equal('1');

      /*
       * Next visit: two bid requests
       */
      YieldbotAdapter._isInitialized = false;
      YieldbotAdapter.initialize();
      for (let idx = 0; idx < 2; idx++) {
        auctionManager.createAuction(
          {
            adUnits: FIXTURE_AD_UNITS,
            adUnitCodes: FIXTURE_AD_UNITS.map(unit => unit.code)
          }
        ).callBids();
      }

      const nextVisitFirstRequest = urlUtils.parse(server.thirdRequest.url);
      expect(nextVisitFirstRequest.search.pvd, 'Second visit, first pvd').to.equal('2');

      const nextVisitSecondRequest = urlUtils.parse(server.lastRequest.url);
      expect(nextVisitSecondRequest.search.pvd, 'Second visit, second pvd').to.equal('2');

      done();
    });
  });

  describe('Adapter Request Timestamps', function() {
    let sandbox;
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(Date, 'now').callsFake(() => {
        return new Date();
      });
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should have overridden Date.now() function', function() {
      expect(Date.now().getTime()).to.match(/^[0-9]+/);
    });

    it('should be milliseconds past epoch query param values', function() {
      const request = YieldbotAdapter.buildRequests(FIXTURE_BID_REQUESTS)[0];
      expect(request.data).to.not.equal(undefined);

      const timestampParams = [
        'cts_ns',
        'cts_js',
        'cts_ini'
      ];

      timestampParams.forEach((item) => {
        expect(!isNaN(request.data[item])).to.equal(true);
        expect(request.data[item] > 0).to.equal(true);
        expect(request.data[item]).to.match(/^[0-9]+/);
      });
    });

    it('should use (new Date()).getTime() for timestamps in ad markup', function() {
      FIXTURE_SERVER_RESPONSE.body.url_prefix = 'http://close.edge.adserver.com/';
      const responses = YieldbotAdapter.interpretResponse(
        FIXTURE_SERVER_RESPONSE,
        FIXTURE_BID_REQUEST
      );

      expect(responses[0].ad).to.match(/cts_rend_.*='\+\(new Date\(\)\)\.getTime\(\)/);
      expect(responses[0].ad).to.match(/cts_ad='\+\(new Date\(\)\)\.getTime\(\)/);
      expect(responses[0].ad).to.match(/cts_imp='\+\(new Date\(\)\)\.getTime\(\)/);
    });
  });
});
