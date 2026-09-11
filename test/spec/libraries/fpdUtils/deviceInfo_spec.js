import { expect } from 'chai';
import { getBrowserLanguage } from 'libraries/fpdUtils/deviceInfo.js';

describe('fpdUtils deviceInfo', function () {
  describe('getBrowserLanguage', function () {
    it('returns the BCP-47 language reported by the window', function () {
      expect(getBrowserLanguage({ navigator: { language: 'en-US' } })).to.equal('en-US');
    });

    it('returns an empty string when the browser reports no language', function () {
      expect(getBrowserLanguage({ navigator: { language: '' } })).to.equal('');
      expect(getBrowserLanguage({ navigator: {} })).to.equal('');
    });

    it('returns an empty string when the window has no navigator', function () {
      expect(getBrowserLanguage({})).to.equal('');
    });

    it('defaults to the current window', function () {
      expect(getBrowserLanguage()).to.equal(navigator.language);
    });
  });
});
