import { expect } from 'chai';
import { spec } from 'modules/nexverseBidAdapter.js';
import { getDeviceModel, buildEndpointUrl, parseNativeResponse } from '../../../libraries/nexverseUtils/index.js';
import { getOsVersion } from '../../../libraries/advangUtils/index.js';

const BIDDER_ENDPOINT = 'https://rtb.nexverse.ai';

describe('nexverseBidAdapterTests', () => {
  describe('isBidRequestValid', function () {
    let sbid = {
      'adUnitCode': 'div',
      'bidder': 'nexverse',
      'params': {
        'uid': '77d4a2eb3d209ce6c7691dc79fcab358',
        'pubId': '24051'
      },
    };

    it('should not accept bid without required params', function () {
      let isValid = spec.isBidRequestValid(sbid);
      expect(isValid).to.equal(false);
    });

    it('should return false when params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {uid: '', pubId: '', pubEpid: ''};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.adUnitCode = '';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return true when valid params are passed as nums', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051', pubEpid: '34561'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('getDeviceModel', () => {
    it('should return "iPhone" for iPhone userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', configurable: true });
      expect(getDeviceModel()).to.equal('iPhone');
    });

    it('should return "iPad" for iPad userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', configurable: true });
      expect(getDeviceModel()).to.equal('iPad');
    });

    it('should return the Android device name for Android userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10; Pixel 3 Build/QQ2A.200305.003) AppleWebKit/537.36', configurable: true });
      expect(getDeviceModel()).to.equal('Pixel 3');
    });

    it('should return "Unknown Android Device" if device name is missing in Android userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10;) AppleWebKit/537.36', configurable: true });
      expect(getDeviceModel()).to.equal('Unknown Android Device');
    });

    it('should return "Mac" for Mac userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', configurable: true });
      expect(getDeviceModel()).to.equal('Mac');
    });

    it('should return "Linux" for Linux userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (X11; Linux x86_64)', configurable: true });
      expect(getDeviceModel()).to.equal('Linux');
    });

    it('should return "Windows PC" for Windows userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', configurable: true });
      expect(getDeviceModel()).to.equal('Windows PC');
    });

    it('should return "Unknown Device" for an unrecognized userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Unknown OS)', configurable: true });
      expect(getDeviceModel()).to.equal('');
    });
  });

  describe('buildEndpointUrl', () => {
    it('should construct the URL with uid, pubId, and pubEpid', function () {
      const bid = {
        params: {
          uid: '12345',
          pubId: '67890',
          pubEpid: 'abcdef'
        },
        isDebug: false
      };
      const expectedUrl = `${BIDDER_ENDPOINT}?uid=12345&pub_id=67890&pub_epid=abcdef`;
      expect(buildEndpointUrl(BIDDER_ENDPOINT, bid)).to.equal(expectedUrl);
    });
  });

  describe('buildEndpointUrl', () => {
    it('should construct the test URL with uid, pubId, and pubEpid', function () {
      const bid = {
        params: {
          uid: '12345',
          pubId: '67890',
          pubEpid: 'abcdef'
        },
        isDebug: true
      };
      const expectedUrl = `${BIDDER_ENDPOINT}?uid=12345&pub_id=67890&pub_epid=abcdef&test=1`;
      expect(buildEndpointUrl(BIDDER_ENDPOINT, bid)).to.equal(expectedUrl);
    });
  });

  describe('parseNativeResponse', () => {
    it('should parse and return the empty json object from a invalid JSON string', function () {
      const adm = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Nexverse test ad</title></head></body></html>';
      const result = parseNativeResponse(adm);
      expect(result).to.deep.equal({});
    });
    it('should parse and return the native object from a valid JSON string', function () {
      const adm = '{"native": "sample native ad"}'; // JSON string
      const result = parseNativeResponse(adm);
      expect(result).to.deep.equal('sample native ad');
    });
  });

  describe('getOsVersion', () => {
    it('should detect Android OS', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10; Pixel 3 Build/QQ2A.200305.003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36', configurable: true });
      expect(getOsVersion()).to.equal('Android');
    });
    it('should detect iOS', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('iOS');
    });
    it('should detect Mac OS X', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Mac OS X');
    });
    it('should detect Windows 10', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Windows 10');
    });
    it('should detect Linux', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Linux');
    });
    it('should detect Windows 7', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Windows 7');
    });
    it('should detect Search Bot', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Search Bot');
    });
    it('should return unknown for an unrecognized user agent', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Unknown OS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('unknown');
    });
  });
});
