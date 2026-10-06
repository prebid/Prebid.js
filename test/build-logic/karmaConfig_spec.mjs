import { createRequire } from 'node:module';
import { expect } from 'chai';

const require = createRequire(import.meta.url);
const karmaConfMaker = require('../../karma.conf.maker.js');
const { chromeNeedsNoSandbox } = karmaConfMaker;

describe('Karma configuration', function () {
  describe('webpack watch', function () {
    function watchOptions(watchMode) {
      return karmaConfMaker(false, false, watchMode, ['test/spec/a_spec.js'], null, 1, true).webpack.watchOptions;
    }

    it('ignores source map changes in watch mode', function () {
      const { ignored } = watchOptions(true);
      expect(ignored.test('/repo/dist/src/modules/a.js.map')).to.be.true;
      expect(ignored.test('/repo/dist/src/modules/a.js')).to.be.false;
    });

    it('leaves watch options alone in single run mode', function () {
      expect(watchOptions(false)).to.equal(undefined);
    });
  });

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
