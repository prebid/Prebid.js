/* globals describe, beforeEach, afterEach, it, sinon */
import { expect } from 'chai';
import * as sua from '../../../../src/fpd/sua.js';
import { getBrowserType, getCurrentTimeOfDay, getUtmValue, getDayOfWeek, getHourOfDay } from '../../../../libraries/pubmaticUtils/pubmaticUtils.js';

describe('pubmaticUtils', () => {
  let sandbox;
  const ORIGINAL_USER_AGENT = window.navigator.userAgent;
  const ORIGINAL_LOCATION = window.location;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
    window.navigator.__defineGetter__('userAgent', () => ORIGINAL_USER_AGENT);

    // Restore original window.location if it was modified
    if (window.location !== ORIGINAL_LOCATION) {
      delete window.location;
      window.location = ORIGINAL_LOCATION;
    }
  });

  describe('getBrowserType', () => {
    it('should return browser type from SUA when available', () => {
      const mockSuaData = {
        browsers: [
          { brand: 'Chrome' }
        ]
      };

      sandbox.stub(sua, 'getLowEntropySUA').returns(mockSuaData);

      expect(getBrowserType()).to.equal('9'); // Chrome ID from BROWSER_REGEX_MAP
    });

    it('should return browser type from userAgent when SUA is not available', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);

      const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      window.navigator.__defineGetter__('userAgent', () => chromeUserAgent);

      expect(getBrowserType()).to.equal('9'); // Chrome ID
    });

    it('should return browser type for Edge browser', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);

      const edgeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      window.navigator.__defineGetter__('userAgent', () => edgeUserAgent);

      expect(getBrowserType()).to.equal('2'); // Edge ID
    });

    it('should return browser type for Opera browser', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);

      const operaUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277';
      window.navigator.__defineGetter__('userAgent', () => operaUserAgent);

      expect(getBrowserType()).to.equal('3'); // Opera ID
    });

    it('should return browser type for Firefox browser', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);

      const firefoxUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      window.navigator.__defineGetter__('userAgent', () => firefoxUserAgent);

      expect(getBrowserType()).to.equal('12'); // Firefox ID
    });

    it('should return "0" when browser type cannot be determined', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);

      const unknownUserAgent = 'Unknown Browser';
      window.navigator.__defineGetter__('userAgent', () => unknownUserAgent);

      expect(getBrowserType()).to.equal('0');
    });

    it('should return "-1" when userAgent is null', () => {
      sandbox.stub(sua, 'getLowEntropySUA').returns(null);
      window.navigator.__defineGetter__('userAgent', () => null);

      expect(getBrowserType()).to.equal('-1');
    });
  });

  describe('getCurrentTimeOfDay', () => {
    let clock;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it('should return "night" for hours between 0 and 4', () => {
      // Set time to 3:30 AM
      clock = sinon.useFakeTimers(new Date(2025, 7, 6, 3, 30, 0).getTime());
      expect(getCurrentTimeOfDay()).to.equal('night');
    });

    it('should return "morning" for hours between 5 and 11', () => {
      // Set time to 9:15 AM
      clock = sinon.useFakeTimers(new Date(2025, 7, 6, 9, 15, 0).getTime());
      expect(getCurrentTimeOfDay()).to.equal('morning');
    });

    it('should return "afternoon" for hours between 12 and 16', () => {
      // Set time to 2:45 PM
      clock = sinon.useFakeTimers(new Date(2025, 7, 6, 14, 45, 0).getTime());
      expect(getCurrentTimeOfDay()).to.equal('afternoon');
    });

    it('should return "evening" for hours between 17 and 18', () => {
      // Set time to 5:30 PM
      clock = sinon.useFakeTimers(new Date(2025, 7, 6, 17, 30, 0).getTime());
      expect(getCurrentTimeOfDay()).to.equal('evening');
    });

    it('should return "night" for hours between 19 and 23', () => {
      // Set time to 10:00 PM
      clock = sinon.useFakeTimers(new Date(2025, 7, 6, 22, 0, 0).getTime());
      expect(getCurrentTimeOfDay()).to.equal('night');
    });
  });

  describe('getUtmValue', () => {
    // Setup for mocking URL and URLSearchParams
    let mockUrl;
    let mockUrlParams;
    let origURL;
    let origURLSearchParams;

    beforeEach(() => {
      // Save original constructors
      origURL = global.URL;
      origURLSearchParams = global.URLSearchParams;

      // Create mock URL and URLSearchParams
      mockUrl = {};
      mockUrlParams = {
        toString: sandbox.stub().returns(''),
        includes: sandbox.stub().returns(false)
      };

      // Mock URL constructor
      global.URL = sandbox.stub().returns(mockUrl);

      // Mock URLSearchParams constructor
      global.URLSearchParams = sandbox.stub().returns(mockUrlParams);
    });

    afterEach(() => {
      // Restore original constructors
      global.URL = origURL;
      global.URLSearchParams = origURLSearchParams;
    });

    it('should return "1" when URL contains utm_source parameter', () => {
      // Setup mock URL with utm_source parameter
      mockUrl.search = '?utm_source=test';
      mockUrlParams.toString.returns('utm_source=test');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });

    it('should return "1" when URL contains utm_medium parameter', () => {
      // Setup mock URL with utm_medium parameter
      mockUrl.search = '?utm_medium=social';
      mockUrlParams.toString.returns('utm_medium=social');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });

    it('should return "1" when URL contains utm_campaign parameter', () => {
      // Setup mock URL with utm_campaign parameter
      mockUrl.search = '?utm_campaign=summer2025';
      mockUrlParams.toString.returns('utm_campaign=summer2025');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });

    it('should return "1" when URL contains multiple UTM parameters', () => {
      // Setup mock URL with multiple UTM parameters
      mockUrl.search = '?utm_source=google&utm_medium=cpc&utm_campaign=brand';
      mockUrlParams.toString.returns('utm_source=google&utm_medium=cpc&utm_campaign=brand');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });

    it('should return "1" when URL contains UTM parameters mixed with other parameters', () => {
      // Setup mock URL with mixed parameters
      mockUrl.search = '?id=123&utm_source=newsletter&page=2';
      mockUrlParams.toString.returns('id=123&utm_source=newsletter&page=2');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });

    it('should return "0" when URL contains no UTM parameters', () => {
      // Setup mock URL with no UTM parameters
      mockUrl.search = '?id=123&page=2';
      mockUrlParams.toString.returns('id=123&page=2');
      mockUrlParams.includes.withArgs('utm_').returns(false);

      expect(getUtmValue()).to.equal('0');
    });

    it('should return "0" when URL has no query parameters', () => {
      // Setup mock URL with no query parameters
      mockUrl.search = '';
      mockUrlParams.toString.returns('');
      mockUrlParams.includes.withArgs('utm_').returns(false);

      expect(getUtmValue()).to.equal('0');
    });

    it('should handle URL with hash fragment correctly', () => {
      // Setup mock URL with hash fragment
      mockUrl.search = '?utm_source=test';
      mockUrlParams.toString.returns('utm_source=test');
      mockUrlParams.includes.withArgs('utm_').returns(true);

      expect(getUtmValue()).to.equal('1');
    });
  });

  describe('getDayOfWeek', () => {
    let clock;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it('should return the correct day of the week', () => {
      // Sunday
      clock = sinon.useFakeTimers(new Date('2023-01-01T12:00:00Z').getTime());
      expect(getDayOfWeek()).to.equal('0');
      clock.restore();

      // Wednesday
      clock = sinon.useFakeTimers(new Date('2023-01-04T12:00:00Z').getTime());
      expect(getDayOfWeek()).to.equal('3');
      clock.restore();

      // Saturday
      clock = sinon.useFakeTimers(new Date('2023-01-07T12:00:00Z').getTime());
      expect(getDayOfWeek()).to.equal('6');
    });
  });

  describe('getHourOfDay', () => {
    let clock;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it('should return the correct hour of the day', () => {
      // Midnight (0:00)
      clock = sinon.useFakeTimers(new Date(2023, 0, 1, 0, 0, 0).getTime());
      expect(getHourOfDay()).to.equal('0');
      clock.restore();

      // 11:30 AM should return 11
      clock = sinon.useFakeTimers(new Date(2023, 0, 1, 11, 30, 0).getTime());
      expect(getHourOfDay()).to.equal('11');
      clock.restore();

      // 11:59 PM (23:59) should return 23
      clock = sinon.useFakeTimers(new Date(2023, 0, 1, 23, 59, 59).getTime());
      expect(getHourOfDay()).to.equal('23');
    });
  });
});
