/* globals describe, beforeEach, afterEach, sinon */
import { expect } from 'chai';
import { getDeviceType, getBrowser, getOS } from 'libraries/userAgentUtils';
import { deviceTypes, browserTypes, osTypes } from 'libraries/userAgentUtils/userAgentTypes.enums';

const ORIGINAL_USER_AGENT = window.navigator.userAgent;
const ORIGINAL_VENDOR = window.navigator.vendor;
const ORIGINAL_APP_VERSION = window.navigator.appVersion;

describe('Test user agent categorization', () => {
  afterEach(() => {
    window.navigator.__defineGetter__('userAgent', () => ORIGINAL_USER_AGENT);
    window.navigator.__defineGetter__('vendor', () => ORIGINAL_VENDOR);
    window.navigator.__defineGetter__('appVersion', () => ORIGINAL_APP_VERSION);
  })

  describe('test getDeviceType', () => {
    it('user agent device type is tablet', () => {
      const tabletUserAgent = 'Mozilla/5.0 (iPad; CPU OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4.17.9 (KHTML, like Gecko) Version/5.1 Mobile/9B206 Safari/7534.48.3'
      window.navigator.__defineGetter__('userAgent', () => tabletUserAgent);
      expect(getDeviceType()).to.equal(deviceTypes.TABLET);
    })
    it('user agent device type is mobile', () => {
      const mobileUserAgent = 'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
      window.navigator.__defineGetter__('userAgent', () => mobileUserAgent);
      expect(getDeviceType()).to.equal(deviceTypes.MOBILE);
    })
    it('user agent device type is desktop', () => {
      const desktopUserAgent = 'Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36'
      window.navigator.__defineGetter__('userAgent', () => desktopUserAgent);
      expect(getDeviceType()).to.equal(deviceTypes.DESKTOP);
    })
  })

  describe('test getBrowser', () => {
    it('user agent browser is edge', () => {
      const edgeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10532'
      window.navigator.__defineGetter__('userAgent', () => edgeUserAgent);
      expect(getBrowser()).to.equal(browserTypes.EDGE);
    })
    it('user agent browser is chrome', () => {
      const chromeUserAgent = 'Mozilla/5.0 (iPad; CPU OS 8_4 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) CriOS/44.0.2403.67 Mobile/12H143 Safari/600.1.4'
      window.navigator.__defineGetter__('userAgent', () => chromeUserAgent);
      expect(getBrowser()).to.equal(browserTypes.CHROME);
    })
    it('user agent browser is firefox', () => {
      const firefoxUserAgent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:40.0) Gecko/20100101 Firefox/40.0.2 Waterfox/40.0.2'
      window.navigator.__defineGetter__('userAgent', () => firefoxUserAgent);
      expect(getBrowser()).to.equal(browserTypes.FIREFOX);
    })
    it('user agent browser is safari', () => {
      const safariUserAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36'
      window.navigator.__defineGetter__('userAgent', () => safariUserAgent);
      window.navigator.__defineGetter__('vendor', () => 'Apple Computer, Inc.');
      expect(getBrowser()).to.equal(browserTypes.SAFARI);
    })
    it('user agent browser is internet explorer', () => {
      const internetexplorerUserAgent = 'Mozilla/5.0 (MSIE 9.0; Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
      window.navigator.__defineGetter__('userAgent', () => internetexplorerUserAgent);
      expect(getBrowser()).to.equal(browserTypes.INTERNET_EXPLORER);
    })
    it('user agent is other', () => {
      const otherUserAgent = 'Dalvik/2.1.0 (Linux; U; Android 9; ADT-2 Build/PTT5.181126.002)'
      window.navigator.__defineGetter__('userAgent', () => otherUserAgent);
      expect(getBrowser()).to.equal(browserTypes.OTHER);
    })
  })

  describe('test getOS', () => {
    it('user agent is android', () => {
      const androidUserAgent = 'Mozilla/5.0 (Android; Mobile; rv:40.0) Gecko/40.0 Firefox/40.0'
      window.navigator.__defineGetter__('userAgent', () => androidUserAgent);
      expect(getOS()).to.equal(osTypes.ANDROID);
    })
    it('user agent is ios', () => {
      const iosUserAgent = 'Mozilla/5.0 (iPad; CPU OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4'
      window.navigator.__defineGetter__('userAgent', () => iosUserAgent);
      expect(getOS()).to.equal(osTypes.IOS);
    })
    it('user agent is windows', () => {
      const windowsUserAgent = 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36'
      window.navigator.__defineGetter__('userAgent', () => windowsUserAgent);
      expect(getOS()).to.equal(osTypes.WINDOWS);
    })
    it('user agent is mac', () => {
      const macUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:33.0) Gecko/20100101 Firefox/33.0'
      window.navigator.__defineGetter__('userAgent', () => macUserAgent);
      expect(getOS()).to.equal(osTypes.MAC);
    })
    it('user agent is linux', () => {
      const linuxUserAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:31.0) Gecko/20100101 Firefox/31.0'
      window.navigator.__defineGetter__('userAgent', () => linuxUserAgent);
      expect(getOS()).to.equal(osTypes.LINUX);
    })
    it('user agent is unix', () => {
      const unixUserAgent = 'Mozilla/5.0 (X11; CrOS armv7l 7077.134.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.156 Safari/537.36'
      const unixappVersion = '5.0 (X11; CrOS armv7l 7077.134.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.156 Safari/537.36'
      window.navigator.__defineGetter__('userAgent', () => unixUserAgent);
      window.navigator.__defineGetter__('appVersion', () => unixappVersion);
      expect(getOS()).to.equal(osTypes.UNIX);
    })
    it('user agent is other', () => {
      const otherUserAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      window.navigator.__defineGetter__('userAgent', () => otherUserAgent);
      window.navigator.__defineGetter__('appVersion', () => '');
      expect(getOS()).to.equal(osTypes.OTHER);
    })
  })
})
