// These coverage tests were written by Codex, an AI agent.
import { INSTREAM, OUTSTREAM, ORTB_AUDIO_PARAMS, isValidAudioBid } from 'src/audio.js';
import { auctionManager } from 'src/auctionManager.js';
import { config } from 'src/config.js';
import { hook } from 'src/hook.js';
import * as utils from 'src/utils.js';
import { stubAuctionIndex } from '../helpers/indexStub.js';

describe('audio.js', () => {
  let sandbox;
  let logError;

  before(() => {
    hook.ready();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logError = sandbox.stub(utils, 'logError');
  });

  afterEach(() => {
    config.resetConfig();
    sandbox.restore();
  });

  function validate(bid = {}, audio = {}, adUnitProperties = {}) {
    const adUnits = [{
      adUnitId: 'audio-unit',
      mediaTypes: { audio },
      ...adUnitProperties
    }];
    return isValidAudioBid({ adUnitId: 'audio-unit', ...bid }, {
      index: stubAuctionIndex({ adUnits })
    });
  }

  describe('isValidAudioBid', () => {
    [INSTREAM, undefined].forEach(context => {
      describe(`with ${context === undefined ? 'the default' : context} context`, () => {
        it('accepts a VAST URL without requiring a cache', () => {
          expect(validate({ vastUrl: 'https://example.com/ad.xml' }, { context })).to.equal(true);
          sinon.assert.notCalled(logError);
        });

        it('rejects a bid without VAST XML or a VAST URL', () => {
          expect(validate({}, { context })).to.equal(false);
        });

        it('rejects VAST XML alone when no cache is configured', () => {
          expect(validate({ vastXml: '<VAST/>' }, { context })).to.equal(false);
          sinon.assert.calledOnce(logError);
          expect(logError.firstCall.args[0]).to.include('vastXml').and.include('useLocal');
        });
      });
    });

    [
      { url: 'https://cache.example.com' },
      { useLocal: true }
    ].forEach(cache => {
      it(`accepts VAST XML alone with ${cache.useLocal ? 'local' : 'remote'} caching`, () => {
        config.setConfig({ cache });
        expect(validate({ vastXml: '<VAST/>' })).to.equal(true);
        sinon.assert.notCalled(logError);
      });
    });

    it('rejects VAST XML alone when the cache configuration is empty', () => {
      config.setConfig({ cache: {} });
      expect(validate({ vastXml: '<VAST/>' })).to.equal(false);
      sinon.assert.calledOnce(logError);
    });

    it('accepts VAST XML accompanied by a URL without a cache', () => {
      expect(validate({ vastXml: '<VAST/>', vastUrl: 'https://example.com/ad.xml' })).to.equal(true);
      sinon.assert.notCalled(logError);
    });

    it('does not require VAST assets when the ad unit has no audio media type', () => {
      expect(validate({}, undefined, { mediaTypes: {} })).to.equal(true);
    });

    it('uses the auction manager index when no index is supplied', () => {
      const bid = { adUnitId: 'audio-unit', vastUrl: 'https://example.com/ad.xml' };
      const getMediaTypes = sandbox.stub(auctionManager.index, 'getMediaTypes').returns({ audio: {} });
      const getAdUnit = sandbox.stub(auctionManager.index, 'getAdUnit').returns({ adUnitId: 'audio-unit' });

      expect(isValidAudioBid(bid)).to.equal(true);
      sinon.assert.calledOnceWithExactly(getMediaTypes, bid);
      sinon.assert.calledOnceWithExactly(getAdUnit, bid);
    });

    describe('with outstream context', () => {
      const renderer = { url: 'https://example.com/renderer.js', render: () => {} };

      it('accepts a renderer supplied on the bid', () => {
        expect(validate({ renderer }, { context: OUTSTREAM })).to.equal(true);
      });

      it('accepts a renderer supplied on the ad unit', () => {
        expect(validate({}, { context: OUTSTREAM }, { renderer })).to.equal(true);
      });

      it('accepts a renderer supplied in the audio media type', () => {
        expect(validate({}, { context: OUTSTREAM, renderer })).to.equal(true);
      });

      it('rejects a bid without a renderer even when it has a VAST URL', () => {
        expect(validate({ vastUrl: 'https://example.com/ad.xml' }, { context: OUTSTREAM })).to.equal(false);
      });

      it('requires VAST assets instead of a renderer when useCacheKey is enabled', () => {
        expect(validate({ renderer }, { context: OUTSTREAM, useCacheKey: true })).to.equal(false);
        expect(validate({ vastUrl: 'https://example.com/ad.xml' }, { context: OUTSTREAM, useCacheKey: true })).to.equal(true);
      });

      it('requires caching for VAST XML alone when useCacheKey is enabled', () => {
        const audio = { context: OUTSTREAM, useCacheKey: true };
        expect(validate({ vastXml: '<VAST/>' }, audio)).to.equal(false);
        config.setConfig({ cache: { useLocal: true } });
        expect(validate({ vastXml: '<VAST/>' }, audio)).to.equal(true);
      });
    });
  });

  describe('OpenRTB audio MIME validation', () => {
    [
      { value: ['audio/mpeg'], valid: true },
      { value: ['audio/mpeg', 'audio/mp4'], valid: true },
      { value: [], valid: false },
      { value: 'audio/mpeg', valid: false },
      { value: ['audio/mpeg', 1], valid: false },
      { value: null, valid: false }
    ].forEach(({ value, valid }) => {
      it(`${valid ? 'accepts' : 'rejects'} ${JSON.stringify(value)}`, () => {
        expect(ORTB_AUDIO_PARAMS.get('mimes')(value)).to.equal(valid);
      });
    });
  });
});
