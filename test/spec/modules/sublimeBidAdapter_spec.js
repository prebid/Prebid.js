import { expect } from 'chai';
import { spec } from 'modules/sublimeBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
const sinon = require('sinon');

const utils = require('src/utils');

const USER_AGENT = {
  // UNKOWN
  'Opera/9.80 (S60; SymbOS; Opera Mobi/1209; U; sk) Presto/2.5.28 Version/10.1': {
    type: 'desktop', os: { name: '', version: 0 }, browser: { name: '', version: 0 },
  },
  'Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02': {
    type: 'tablet', os: { name: 'android', version: 4.1 }, browser: { name: '', version: 0 },
  },

  // MOBILES
  // Android Mobile User Agents
  'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)': {
    type: 'mobile', os: { name: 'windowsPhone', version: 7.5 }, browser: { name: 'Internet Explorer', version: 9 },
  },
  'Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1': {
    type: 'mobile', os: { name: 'android', version: 2.3 }, browser: { name: 'Safari', version: 4 },
  },
  'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30': {
    type: 'mobile', os: { name: 'android', version: 4 }, browser: { name: 'Safari', version: 4 },
  },
  'Mozilla/5.0 (Linux; U; Android 4.4.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30': {
    type: 'mobile', os: { name: 'android', version: 4.4 }, browser: { name: 'Safari', version: 4 },
  },
  'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 55 },
  },
  'Mozilla/5.0 (Linux; Android 7.0; SM-G892A Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.107 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 7 }, browser: { name: 'Chrome', version: 60 },
  },
  'Mozilla/5.0 (Linux; Android 7.0; SM-G930VC Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 7 }, browser: { name: 'Chrome', version: 58 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; SM-G935S Build/MMB29K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 55 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; SM-G920V Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; Android 5.1.1; SM-G928X Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 5.1 }, browser: { name: 'Chrome', version: 47 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 6P Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 47 },
  },
  'Mozilla/5.0 (Linux; Android 7.1.1; G8231 Build/41.2.A.0.219; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/59.0.3071.125 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 7.1 }, browser: { name: 'Chrome', version: 59 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; E6653 Build/32.2.A.0.253) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; Android 6.0; HTC One X10 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.98 Mobile Safari/537.36': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 61 },
  },
  'Mozilla/5.0 (Linux; Android 6.0; HTC One M9 Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.3': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; U; 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML like Gecko) Version/4.0 Mobile Safari/534.30': {
    type: 'mobile', os: { name: '', version: 0 }, browser: { name: 'Safari', version: 4 },
  },
  // iPhone User Agents
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1': {
    type: 'mobile', os: { name: 'iOS', version: 11 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1': {
    type: 'mobile', os: { name: 'iOS', version: 11 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A5370a Safari/604.1': {
    type: 'mobile', os: { name: 'iOS', version: 11 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (iPhone9,3; U; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1': {
    type: 'mobile', os: { name: 'iOS', version: 10 }, browser: { name: 'Safari', version: 10 },
  },
  'Mozilla/5.0 (iPhone9,4; U; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1': {
    type: 'mobile', os: { name: 'iOS', version: 10 }, browser: { name: 'Safari', version: 10 },
  },
  'Mozilla/5.0 (Apple-iPhone7C2/1202.466; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543 Safari/419.3': {
    type: 'mobile', os: { name: '', version: 0 }, browser: { name: 'Safari', version: 3 },
  },
  'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; RM-1152) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15254': {
    type: 'mobile', os: { name: 'windowsPhone', version: 10 }, browser: { name: 'Edge', version: 15.15254 },
  },
  'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; RM-1127_16056) AppleWebKit/537.36(KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Edge/12.10536': {
    type: 'mobile', os: { name: 'windowsPhone', version: 10 }, browser: { name: 'Edge', version: 12.10536 },
  },
  'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.1058': {
    type: 'mobile', os: { name: 'windowsPhone', version: 10 }, browser: { name: 'Edge', version: 13.1058 },
  },
  'Mozilla/5.0 (Linux; 7.0; SM-G892A Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.107 Mobile Safari/537.36': {
    type: 'mobile', os: { name: '', version: 0 }, browser: { name: 'Chrome', version: 60 },
  },
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1': {
    type: 'mobile', os: { name: 'iOS', version: 11.3 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; SM-G903F Build/MMB29K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/44.0.2403.119 Mobile Safari/537.36 ACHEETAHI/1': {
    type: 'mobile', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 44 },
  },

  // TABLETS
  'Mozilla/5.0 (Linux; Android 5.0.2; SAMSUNG SM-T550 Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.3 Chrome/38.0.2125.102 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 5 }, browser: { name: 'Chrome', version: 38 },
  },
  'Mozilla/5.0 (Linux; Android 5.1.1; SHIELD Tablet Build/LMY48C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 5.1 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; Android 7.0; Pixel C Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 7 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; SGP771 Build/32.2.A.0.253; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 52 },
  },
  'Mozilla/5.0 (Linux; Android 6.0.1; SHIELD Tablet K1 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 6 }, browser: { name: 'Chrome', version: 55 },
  },
  'Mozilla/5.0 (Linux; Android 7.0; SM-T827R4 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.116 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 7 }, browser: { name: 'Chrome', version: 60 },
  },
  'Mozilla/5.0 (Linux; Android 4.4.3; KFTHWI Build/KTU84M) AppleWebKit/537.36 (KHTML, like Gecko) Silk/47.1.79 like Chrome/47.0.2526.80 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 4.4 }, browser: { name: 'Chrome', version: 47 },
  },
  'Mozilla/5.0 (Linux; Android 5.0.2; LG-V410/V41020c Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/34.0.1847.118 Safari/537.36': {
    type: 'tablet', os: { name: 'android', version: 5 }, browser: { name: 'Chrome', version: 34 },
  },
  'Mozilla/5.0 (iPad; CPU OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13F69 Safari/601.1': {
    type: 'tablet', os: { name: 'iOS', version: 9.3 }, browser: { name: 'Safari', version: 9 },
  },
  'Mozilla/5.0 (iPad; CPU OS 11_0_2 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A421 Safari/604.1': {
    type: 'tablet', os: { name: 'iOS', version: 11 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (Android 7.0; Tablet; rv:62.0) Gecko/62.0 Firefox/62.0': {
    type: 'tablet', os: { name: 'android', version: 7 }, browser: { name: 'Firefox', version: 62 },
  },

  // DESKTOP
  'Mozilla/ 5.0(Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari / 537.36': {
    type: 'desktop', os: { name: 'Windows', version: 6.1 }, browser: { name: 'Chrome', version: 41 },
  },
  'Mozilla/5.0 (hone; CPU one OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1': {
    type: 'desktop', os: { name: '', version: 0 }, browser: { name: 'Safari', version: 11 },
  },
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246': {
    type: 'desktop', os: { name: 'Windows', version: 10 }, browser: { name: 'Edge', version: 12.246 },
  },
  'Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36': {
    type: 'desktop', os: { name: '', version: 0 }, browser: { name: 'Chrome', version: 51 },
  },
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9': {
    type: 'desktop', os: { name: 'Mac', version: 10.11 }, browser: { name: 'Safari', version: 9 },
  },
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36': {
    type: 'desktop', os: { name: 'Windows', version: 6.1 }, browser: { name: 'Chrome', version: 47 },
  },
};

describe('Sublime Adapter', function () {
  describe('detectDevice', function () {
    it('should correctly detect device', function () {
      const uaStub = sinon.stub(window.navigator, 'userAgent');

      Object.keys(USER_AGENT).forEach(userAgent => {
        const value = USER_AGENT[userAgent];
        uaStub.value(userAgent);
        expect(spec.detectDevice()).to.equal(value.type.charAt(0));
      });

      uaStub.restore();
    })
  });

  describe('sendEvent', function () {
    let sandbox;
    const triggeredPixelProperties = [
      't',
      'tse',
      'z',
      'e',
      'src',
      'puid',
      'notid',
      'pbav',
      'pubpbv',
      'device',
      'pubtimeout',
    ];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger pixel', function () {
      sandbox.spy(utils, 'triggerPixel');
      spec.sendEvent('test');
      expect(utils.triggerPixel.called).to.equal(true);
      const params = utils.parseUrl(utils.triggerPixel.args[0][0]).search;
      expect(Object.keys(params)).to.have.members(triggeredPixelProperties);
    });

    afterEach(function () {
      sandbox.restore();
    });
  })

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        bidder: 'sublime',
        params: {
          zoneId: 24549,
          endpoint: '',
        },
      };
    })

    afterEach(function () {
      delete window.sublime;
    })

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when a valid notifyId is provided', function () {
      bid.params.notifyId = 'f1514724-0922-4b45-a297-27531aeb829a';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when an invalid notifyId is provided', function () {
      bid.params.notifyId = 'some_invalid_notify_id';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when the notifyId does not match sublime one', function () {
      bid.params.notifyId = 'f1514724-0922-4b45-a297-27531aeb829a';
      window.sublime = { notifyId: '5c444a48-7713-4333-a895-44b1ae793417' };
      expect(spec.isBidRequestValid(bid)).to.equal(false); // FIX THIS
      delete window.sublime;
    });
  });

  describe('getNotifyId', function () {
    afterEach(function () {
      delete window.sublime;
    });

    it('generates a notifyId (not in params, not in sublime)', function () {
      const params = Object.freeze({});
      window.sublime = {};
      const notifyId = spec.getNotifyId(params);
      expect(spec.isValidNotifyId(notifyId)).to.be.true;
      expect(window.sublime.notifyId).to.equal(notifyId);
    });

    it('uses sublime notifyId (not in params, present in sublime)', function () {
      const params = Object.freeze({});
      window.sublime = { notifyId: '5c444a48-7713-4333-a895-44b1ae793417' };
      const notifyId = spec.getNotifyId(params);
      expect(notifyId).to.equal('5c444a48-7713-4333-a895-44b1ae793417');
      expect(window.sublime.notifyId).to.equal('5c444a48-7713-4333-a895-44b1ae793417');
    });

    it('assigns notifyId from params to sublime (present in params, not in sublime)', function () {
      const params = Object.freeze({ notifyId: 'f1514724-0922-4b45-a297-27531aeb829a' });
      window.sublime = {};
      const notifyId = spec.getNotifyId(params);
      expect(notifyId).to.equal('f1514724-0922-4b45-a297-27531aeb829a');
      expect(window.sublime.notifyId).to.equal('f1514724-0922-4b45-a297-27531aeb829a');
    });

    it('returns notifyId from params (same in params & in sublime)', function () {
      const params = Object.freeze({ notifyId: 'f1514724-0922-4b45-a297-27531aeb829a' });
      window.sublime = { notifyId: 'f1514724-0922-4b45-a297-27531aeb829a' };
      const notifyId = spec.getNotifyId(params);
      expect(notifyId).to.equal('f1514724-0922-4b45-a297-27531aeb829a');
      expect(window.sublime.notifyId).to.equal('f1514724-0922-4b45-a297-27531aeb829a');
    });

    it('returns notifyId from params (present in params & in sublime, with mismatch)', function () {
      const params = Object.freeze({ notifyId: 'f1514724-0922-4b45-a297-27531aeb829a' });
      window.sublime = { notifyId: '5c444a48-7713-4333-a895-44b1ae793417' };
      const notifyId = spec.getNotifyId(params);
      expect(notifyId).to.equal('f1514724-0922-4b45-a297-27531aeb829a');
      expect(window.sublime.notifyId).to.equal('5c444a48-7713-4333-a895-44b1ae793417'); // did not change
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'sublime',
        adUnitCode: 'sublime_code',
        bidId: 'abc1234',
        sizes: [[1800, 1000], [640, 300]],
        requestId: 'xyz654',
        params: {
          zoneId: 123,
          callbackName: 'false',
          notifyId: 'ea252d4f-93d9-4c2f-8cca-88cec3a0a347'
        }
      }, {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        sizes: [[1, 1]],
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      }
    ];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'EOHEIRCOUCOUIEHZIOEIU-TEST',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://example.com',
        numIframes: 2,
      }
    };

    it('should have a post method', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });

    it('should contains a request id equals to the bid id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      for (let i = 0; i < request.length; i = i + 1) {
        expect(JSON.parse(request[i].data).requestId).to.equal(bidRequests[i].bidId);
      }
    });

    it('should have an url that contains bid keyword', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request[0].url).to.match(/bid/);
      expect(request[1].url).to.match(/bid/);
    });

    it('should contains a request notifyId', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      for (let i = 0; i < request.length; i = i + 1) {
        const { notifyId } = JSON.parse(request[i].data);
        expect(spec.isValidNotifyId(notifyId)).to.be.true;
      }
    });
  });

  describe('buildRequests: default arguments', function () {
    const bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 123
      }
    }];

    it('should have an url that match the default endpoint', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.equal('https://pbjs.sskzlabs.com/bid');
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      'request_id': '3db3773286ee59',
      'sspname': 'foo',
      'cpm': 0.5,
      'ad': '<!-- Creative -->',
    };

    it('should get correct bid response', function () {
      // Mock the fire method
      top.window.sublime = {
        analytics: {
          fire: function () { }
        }
      };

      const expectedResponse = [
        {
          requestId: '',
          cpm: 0.5,
          width: 1800,
          height: 1000,
          creativeId: 1,
          dealId: 1,
          currency: 'USD',
          sspname: 'foo',
          netRevenue: true,
          ttl: 600,
          pbav: '0.8.0',
          ad: '',
        },
      ];
      const result = spec.interpretResponse({ body: serverResponse });
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get correct default size for 1x1', function () {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'sspname': 'sublime',
        'cpm': 0.5,
        'ad': '<!-- Creative -->',
      };

      const bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = {
        requestId: 'xyz654_2',
        cpm: 0.5,
        width: 1,
        height: 1,
        creativeId: 1,
        dealId: 1,
        currency: 'EUR',
        netRevenue: true,
        ttl: 600,
        ad: '<!-- Creative -->',
        pbav: '0.8.0',
        sspname: 'sublime'
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return bid empty response', function () {
      const serverResponse = '';
      const bidRequest = {};

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should return bid with default value in response', function () {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'sspname': 'sublime',
        'ad': '<!-- ad -->',
      };

      const bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = {
        requestId: 'xyz654_2',
        cpm: 0,
        width: 1,
        height: 1,
        creativeId: 1,
        dealId: 1,
        currency: 'EUR',
        sspname: 'sublime',
        netRevenue: true,
        ttl: 600,
        ad: '<!-- ad -->',
        pbav: '0.8.0',
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return empty bid response because of timeout', function () {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'timeout': true,
        'ad': '',
      };

      const bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);

      describe('On bid Time out', function () {
        spec.onTimeout(result);
      });
    });

    it('should add advertiserDomains', function () {
      const responseWithAdvertiserDomains = utils.deepClone(serverResponse);
      responseWithAdvertiserDomains.advertiserDomains = ['a_sublime_adomain'];

      const bidRequest = {
        bidder: 'sublime',
        params: {
          zoneId: 456,
        }
      };

      const result = spec.interpretResponse({ body: responseWithAdvertiserDomains }, bidRequest);

      expect(Object.keys(result[0].meta)).to.include.members(['advertiserDomains']);
      expect(Object.keys(result[0].meta.advertiserDomains)).to.deep.equal([]);
    });
  });

  describe('onBidWon', function () {
    let sandbox;
    const bid = { foo: 'bar' };

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger "bidwon" pixel', function () {
      sandbox.spy(utils, 'triggerPixel');
      spec.onBidWon(bid);
      const params = utils.parseUrl(utils.triggerPixel.args[0][0]).search;
      expect(params.e).to.equal('bidwon');
    });

    afterEach(function () {
      sandbox.restore();
    });
  });

  describe('onTimeout', function () {
    let sandbox;
    // Array of bids that timed out
    const timeoutData = [{
      timeout: 1234
    }];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger "bidtimeout" pixel', function () {
      sandbox.spy(utils, 'triggerPixel');
      spec.onTimeout(timeoutData);
      const params = utils.parseUrl(utils.triggerPixel.args[0][0]).search;
      expect(params.e).to.equal('bidtimeout');
    });

    it('should set timeout value in state', function () {
      spec.onTimeout(timeoutData);
      expect(spec.state).to.deep.include({ timeout: 1234 });
    });

    afterEach(function () {
      sandbox.restore();
    });
  })
});
