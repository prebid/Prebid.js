import { expect } from 'chai';

import { config } from 'src/config.js';
import { getDevicePixelRatio } from 'libraries/devicePixelRatio/devicePixelRatio.js';
import { isWebdriverEnabled } from 'libraries/webdriver/webdriver.js';
import { getTimeZone } from 'libraries/timezone/timezone.js';

describe('disableFingerprintingApis', function () {
  after(function () {
    config.resetConfig();
  });

  it('when devicepixelratio is disabled, getDevicePixelRatio returns 1 without reading window.devicePixelRatio', function () {
    const devicePixelRatioSpy = sinon.spy();
    const mockWin = {
      get devicePixelRatio() {
        devicePixelRatioSpy();
        return 2;
      }
    };
    config.setConfig({ disableFingerprintingApis: ['devicepixelratio'] });
    const result = getDevicePixelRatio(mockWin);
    expect(result).to.equal(1);
    sinon.assert.notCalled(devicePixelRatioSpy);
  });

  it('when webdriver is disabled, isWebdriverEnabled returns false without reading navigator.webdriver', function () {
    const webdriverSpy = sinon.spy();
    const mockWin = {
      navigator: {
        get webdriver() {
          webdriverSpy();
          return true;
        }
      }
    };
    config.setConfig({ disableFingerprintingApis: ['webdriver'] });
    const result = isWebdriverEnabled(mockWin);
    expect(result).to.equal(false);
    sinon.assert.notCalled(webdriverSpy);
  });

  it('when resolvedoptions is disabled, getTimeZone returns safe default without calling Intl.DateTimeFormat', function () {
    const resolvedOptionsSpy = sinon.spy();
    const dateTimeFormatStub = sinon.stub(Intl, 'DateTimeFormat').returns({
      resolvedOptions: function () {
        resolvedOptionsSpy();
        return { timeZone: 'America/New_York' };
      }
    });
    try {
      config.setConfig({ disableFingerprintingApis: ['resolvedoptions'] });
      const result = getTimeZone();
      expect(result).to.equal('');
      sinon.assert.notCalled(resolvedOptionsSpy);
    } finally {
      dateTimeFormatStub.restore();
    }
  });
});
