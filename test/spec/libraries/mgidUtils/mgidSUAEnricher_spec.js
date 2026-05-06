import { expect } from 'chai';
import { getMgidSUAEnricher } from 'libraries/mgidUtils/mgidSUAEnricher';
import * as suaModule from 'src/fpd/sua.js';
import {
  SUA_SOURCE_LOW_ENTROPY,
  SUA_SOURCE_HIGH_ENTROPY,
  SUA_SOURCE_UA_HEADER,
} from 'src/fpd/sua.js';

describe('mgidUtils: mgidSUAEnricher', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  async function enricherWithCache(cachedSua) {
    sandbox.stub(suaModule, 'getHighEntropySUA').resolves(cachedSua);
    const enrich = getMgidSUAEnricher();
    await Promise.resolve();
    await Promise.resolve();
    return enrich;
  }

  describe('warmup: caches the high-entropy SUA in memory', function () {
    it('should expose the high-entropy sua once core resolves the high-entropy hints', async function () {
      const enrich = await enricherWithCache({
        source: SUA_SOURCE_HIGH_ENTROPY,
        platform: { brand: 'Android', version: ['14'] },
        architecture: 'arm',
      });

      const sua = enrich(undefined);
      expect(sua.source).to.equal(SUA_SOURCE_HIGH_ENTROPY);
      expect(sua.platform).to.be.an('object');
      expect(sua.architecture).to.equal('arm');
    });

    it('should still return a sua without throwing when the high-entropy warmup yields nothing', async function () {
      const enrich = await enricherWithCache(null);
      let sua;
      expect(() => { sua = enrich(undefined); }).to.not.throw();
      expect(sua).to.be.an('object');
    });
  });

  describe('cache: high-entropy SUA is reused for subsequent requests', function () {
    it('should return the cached high-entropy sua when there is no first-party device.sua', async function () {
      const enrich = await enricherWithCache({
        source: SUA_SOURCE_HIGH_ENTROPY,
        platform: { brand: 'Android', version: ['14'] },
        architecture: 'arm',
        model: 'Pixel 9',
      });

      const sua = enrich(undefined);
      expect(sua.source).to.equal(SUA_SOURCE_HIGH_ENTROPY);
      expect(sua.architecture).to.equal('arm');
      expect(sua.model).to.equal('Pixel 9');
    });
  });

  describe('source priority: replace weaker sources, supplement high-entropy ones', function () {
    it('should keep an existing high-entropy sua\'s explicit fields but fill missing ones from the cache', async function () {
      const enrich = await enricherWithCache({ source: SUA_SOURCE_HIGH_ENTROPY, architecture: 'arm', model: 'Pixel 9' });

      const existing = { source: SUA_SOURCE_HIGH_ENTROPY, model: 'publisher-model' };
      const sua = enrich(existing);
      expect(sua).to.not.equal(existing);
      expect(sua.source).to.equal(SUA_SOURCE_HIGH_ENTROPY);
      expect(sua.model).to.equal('publisher-model');
      expect(sua.architecture).to.equal('arm');
    });

    it('should preserve a source-less first-party sua and fill gaps, but not its platform.version when the brand differs', async function () {
      const enrich = await enricherWithCache({
        source: SUA_SOURCE_HIGH_ENTROPY,
        platform: { brand: 'Windows', version: ['14'] },
        architecture: 'arm',
      });

      const existing = { platform: { brand: 'macOS' } };
      const sua = enrich(existing);
      expect(sua.platform.brand).to.equal('macOS');
      expect(sua.platform).to.not.have.property('version');
      expect(sua.architecture).to.equal('arm');
    });

    it('should supplement a partial high-entropy sua (publisher uaHints subset) with architecture/model/platform.version', async function () {
      const enrich = await enricherWithCache({
        source: SUA_SOURCE_HIGH_ENTROPY,
        platform: { brand: 'Android', version: ['14'] },
        architecture: 'arm',
        bitness: '64',
        model: 'Pixel 9',
      });

      const existing = { source: SUA_SOURCE_HIGH_ENTROPY, mobile: 0, platform: { brand: 'Android' } };
      const sua = enrich(existing);
      expect(sua.platform).to.deep.equal({ brand: 'Android', version: ['14'] });
      expect(sua.architecture).to.equal('arm');
      expect(sua.bitness).to.equal('64');
      expect(sua.model).to.equal('Pixel 9');
    });

    it('should keep a server-derived (source=UA_HEADER) sua\'s explicit fields and only fill gaps from the cache', async function () {
      const enrich = await enricherWithCache({ source: SUA_SOURCE_HIGH_ENTROPY, architecture: 'arm' });

      const existing = { source: SUA_SOURCE_UA_HEADER, mobile: 1, platform: { brand: 'iOS' } };
      const sua = enrich(existing);
      expect(sua.source).to.equal(SUA_SOURCE_UA_HEADER);
      expect(sua.platform).to.deep.equal({ brand: 'iOS' });
      expect(sua.architecture).to.equal('arm');
    });

    it('should not overwrite a field the existing high-entropy sua already has', async function () {
      const enrich = await enricherWithCache({ source: SUA_SOURCE_HIGH_ENTROPY, architecture: 'arm' });

      const existing = { source: SUA_SOURCE_HIGH_ENTROPY, architecture: 'x86' };
      const sua = enrich(existing);
      expect(sua.architecture).to.equal('x86');
      expect(sua.source).to.equal(SUA_SOURCE_HIGH_ENTROPY);
    });

    it('should replace a low-entropy (source=LOW_ENTROPY) sua with the cached high-entropy sua', async function () {
      const enrich = await enricherWithCache({ source: SUA_SOURCE_HIGH_ENTROPY, architecture: 'arm' });

      const existing = { source: SUA_SOURCE_LOW_ENTROPY, mobile: 1 };
      const sua = enrich(existing);
      expect(sua).to.not.equal(existing);
      expect(sua.source).to.equal(SUA_SOURCE_HIGH_ENTROPY);
      expect(sua.architecture).to.equal('arm');
    });

    it('should keep a low-entropy sua unchanged when no stronger (high-entropy) sua is available', async function () {
      const enrich = await enricherWithCache(null);

      const existing = { source: SUA_SOURCE_LOW_ENTROPY, mobile: 1 };
      expect(enrich(existing)).to.equal(existing);
    });
  });
});
