import { createRequire } from 'node:module';
import { expect } from 'chai';

const require = createRequire(import.meta.url);
const { chromeNeedsNoSandbox } = require('../../karma.conf.maker.js');

describe('Karma configuration', function () {
  describe('chromeNeedsNoSandbox', function () {
    it('disables the Chrome sandbox in Docker', function () {
      expect(chromeNeedsNoSandbox(true, () => 1000)).to.be.true;
    });

    it('disables the Chrome sandbox when running as root outside Docker', function () {
      expect(chromeNeedsNoSandbox(false, () => 0)).to.be.true;
    });

    it('keeps the Chrome sandbox for non-root hosts', function () {
      expect(chromeNeedsNoSandbox(false, () => 1000)).to.be.false;
    });

    it('keeps the Chrome sandbox where user IDs are unavailable', function () {
      expect(chromeNeedsNoSandbox(false, null)).to.be.false;
    });
  });
});
