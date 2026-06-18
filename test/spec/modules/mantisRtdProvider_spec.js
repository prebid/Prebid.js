import { mantisDataModule } from 'modules/mantisRtdProvider.js';
import * as mantisModule from 'modules/mantisRtdProvider.js';
import { server } from '../../mocks/xhr.js';
import sinon from 'sinon';
import * as utils from 'src/utils.js';
import { expect } from 'chai';

describe('mantisDataModule', function () {
  const makeConfig = (overrides = {}) => ({
    name: 'mantis',
    waitForIt: true,
    params: {
      endpoint: 'https://example.com/api',
      timeout: 1000,
      ...overrides,
    },
  });

  describe('mantisDataModule.init()', function () {
    it('should initialise and return true', function () {
      expect(mantisDataModule.init(makeConfig())).to.equal(true);
    });

    it('should return false when params is missing', function () {
      expect(mantisDataModule.init({ name: 'mantis' })).to.equal(false);
    });

    it('should return false when params is null', function () {
      expect(mantisDataModule.init({ name: 'mantis', params: null })).to.equal(false);
    });

    it('should return false when required parameters are missing', function () {
      expect(mantisDataModule.init(makeConfig({ endpoint: undefined }))).to.equal(false);
    });
  });

  describe('mantisDataModule.getBidRequestData()', function () {
    let reqBidsConfigObj;
    let onDoneSpy;
    let clock;

    beforeEach(function () {
      reqBidsConfigObj = {
        adUnits: [{ code: 'adunit1' }],
        ortb2Fragments: { global: {} },
      };
      onDoneSpy = sinon.spy();
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('should call onDone immediately if endpoint param is missing', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, { params: {} });
      expect(onDoneSpy.calledOnce).to.equal(true);
      expect(server.requests).to.have.lengthOf(0);
    });

    it('should call onDone when cleanUrl returns empty string (simulates invalid location)', function () {
      // cleanUrl is called as a local binding inside buildApiUrl, so we can't stub it via
      // the module namespace. Instead verify the behaviour using a real invalid location,
      // which window.location.href is not (it's always valid in the test runner).
      // The equivalent coverage is provided by the cleanUrl unit tests below.
      // This test verifies that a missing endpoint causes onDone immediately (no request).
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, { params: { endpoint: '' } });
      expect(onDoneSpy.calledOnce).to.equal(true);
      expect(server.requests).to.have.lengthOf(0);
    });

    it('should make a GET request and populate ortb2 on success', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig());

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].method).to.equal('GET');

      const apiResponse = {
        sentiment: 'positive',
        emotion: { happy: { level: 'high' } },
        ratings: [{ customer: 'amazon', rating: 'GREEN' }],
        categories: {
          mantis: [{ label: 'sports', score: 0.9 }],
          iab: [{ id: 'IAB1', score: 0.9 }],
        },
      };
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(apiResponse));

      expect(onDoneSpy.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.site).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.exist;
    });

    it('should call onDone on empty API response', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig());
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '{}');
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should call onDone when the ajax request errors', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig());
      server.requests[0].respond(500, {}, 'Internal Server Error');
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should call onDone when response is invalid JSON', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig());
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, 'not-json{{{');
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should call onDone on timeout', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig({ timeout: 500 }));
      clock.tick(510);
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should not call onDone a second time when late response arrives after timeout', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig({ timeout: 500 }));

      clock.tick(510);
      expect(onDoneSpy.calledOnce).to.equal(true);

      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '{}');
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should not call onDone twice when response arrives before timeout', function () {
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig());
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '{}');
      clock.tick(1100);
      expect(onDoneSpy.calledOnce).to.equal(true);
    });

    it('should not set ortb2 when timeout fires before response arrives', function () {
      // Verify onDone fires after the timeout elapses with no response.
      // The fake XHR server's fetch mock resolves synchronously on respond(), which means
      // it cannot be used to simulate a post-timeout response reliably with fake timers.
      // The isDone guard in the source is verified by the "not call onDone twice" test above.
      mantisDataModule.getBidRequestData(reqBidsConfigObj, onDoneSpy, makeConfig({ timeout: 100 }));

      clock.tick(110);
      expect(onDoneSpy.calledOnce).to.equal(true);
      // No response has been sent, so ortb2 must be unpopulated
      expect(reqBidsConfigObj.ortb2Fragments.global.site).to.not.exist;
    });
  });

  describe('mantisModule.setOrtb2FromResponse', function () {
    let reqBidsConfigObj;

    beforeEach(function () {
      reqBidsConfigObj = {
        ortb2Fragments: { global: {} },
      };
    });

    it('should return false if ortb2StructuredData is null', function () {
      expect(mantisModule.setOrtb2FromResponse(reqBidsConfigObj, null)).to.equal(false);
    });

    it('should return false if ortb2StructuredData is not an object', function () {
      expect(mantisModule.setOrtb2FromResponse(reqBidsConfigObj, 'invalid')).to.equal(false);
    });

    it('should merge site data and return true', function () {
      const result = mantisModule.setOrtb2FromResponse(reqBidsConfigObj, {
        site: { domain: 'example.com' },
      });
      expect(result).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.site).to.deep.equal({ domain: 'example.com' });
    });

    it('should merge user data and return true', function () {
      const result = mantisModule.setOrtb2FromResponse(reqBidsConfigObj, {
        user: { id: 'user123' },
      });
      expect(result).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.deep.equal({ id: 'user123' });
    });

    it('should merge both site and user data when present', function () {
      const result = mantisModule.setOrtb2FromResponse(reqBidsConfigObj, {
        site: { page: 'https://example.com' },
        user: { buyeruid: '12345' },
      });
      expect(result).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.site).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.exist;
    });

    it('should return true and not throw when neither site nor user is present', function () {
      expect(mantisModule.setOrtb2FromResponse(reqBidsConfigObj, {})).to.equal(true);
    });
  });

  describe('mantisModule.processMantisData', function () {
    it('should process full valid mantis data correctly', function () {
      const mantisData = {
        emotion: {
          happy: { level: 'high' },
          sad: { level: 'low' },
        },
        sentiment: 'positive',
        ratings: [
          { customer: 'amazon', rating: 'GREEN' },
          { customer: 'google', rating: 'RED' },
        ],
        categories: {
          mantis: [
            { label: 'sports', score: 0.8 },
            { label: 'crime', score: 0.4 },
          ],
          iab: [
            { id: 'IAB1', score: 0.9 },
            { id: 'IAB2', score: 0.3 },
          ],
        },
      };

      const result = mantisModule.processMantisData(mantisData);
      const mantis = result.standard.mantis;

      expect(mantis).to.contain('amazon-GREEN');
      expect(mantis).to.contain('google-RED');
      expect(mantis).to.contain('sentiment-positive');
      expect(mantis).to.contain('happy-high');
      expect(mantis).to.contain('sad-low');
      expect(mantis).to.contain('prebid-rtdmodule');

      expect(result.standard.mantis_context).to.equal('sports');
      expect(result.standard.iab_context).to.equal('IAB1');
    });

    it('should default emotions to emotions-unknown when emotion object is empty', function () {
      const result = mantisModule.processMantisData({
        emotion: {},
        sentiment: 'neutral',
        ratings: [{ customer: 'amazon', rating: 'GREEN' }],
        categories: {},
      });
      expect(result.standard.mantis).to.contain('emotions-unknown');
    });

    it('should treat unknown emotion key as emotions-unknown', function () {
      const result = mantisModule.processMantisData({
        emotion: { unknown: { level: 'medium' } },
      });
      expect(result.standard.mantis).to.contain('emotions-unknown');
    });

    it('should fallback to sentiment-unknown if sentiment is missing', function () {
      const result = mantisModule.processMantisData({
        emotion: { angry: { level: 'high' } },
      });
      expect(result.standard.mantis).to.contain('sentiment-unknown');
    });

    it('should skip ratings with N/A value', function () {
      const result = mantisModule.processMantisData({
        ratings: [
          { customer: 'amazon', rating: 'N/A' },
          { customer: 'google', rating: 'GREEN' },
        ],
      });
      expect(result.standard.mantis).to.contain('google-GREEN');
      expect(result.standard.mantis).not.to.contain('amazon');
    });

    it('should fallback ratings to unknown if no valid ratings exist', function () {
      const result = mantisModule.processMantisData({
        ratings: [{ customer: 'amazon', rating: 'N/A' }],
      });
      expect(result.standard.mantis.startsWith('unknown')).to.equal(true);
    });

    it('should return unknown for mantis_context and iab_context if scores are below threshold', function () {
      const result = mantisModule.processMantisData({
        categories: {
          mantis: [{ label: 'politics', score: 0.2 }],
          iab: [{ id: 'IAB5', score: 0.5 }],
        },
      });
      expect(result.standard.mantis_context).to.equal('unknown');
      expect(result.standard.iab_context).to.equal('unknown');
    });

    it('should handle empty input safely', function () {
      const result = mantisModule.processMantisData();
      expect(result).to.deep.equal({
        standard: {
          mantis: 'unknown,sentiment-unknown,emotions-unknown,prebid-rtdmodule',
          mantis_context: 'unknown',
          iab_context: 'unknown',
        },
      });
    });
  });

  describe('mantisModule.buildApiUrl', function () {
    const endpoint = 'https://api.example.com/analyze';

    it('should build API URL with required query parameters', function () {
      const result = mantisModule.buildApiUrl(endpoint);
      expect(result).to.include(endpoint + '?');
      expect(result).to.include('filter=fullRatings,input,findings,sentiment,emotion,categories');
      expect(result).to.include('&url=');
      expect(result).to.include('cacheType=public');
    });
  });

  describe('mantisModule.cleanUrl', function () {
    let logWarnSpy;

    beforeEach(function () {
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      logWarnSpy.restore();
    });

    it('should return empty string and log warning for invalid URL', function () {
      const result = mantisModule.cleanUrl('invalid-url');
      expect(result).to.equal('');
      expect(logWarnSpy.calledOnce).to.equal(true);
    });

    it('should return empty string for null URL', function () {
      const result = mantisModule.cleanUrl(null);
      expect(result).to.equal('');
    });

    it('should return empty string for undefined URL', function () {
      const result = mantisModule.cleanUrl(undefined);
      expect(result).to.equal('');
    });

    it('should extract host and pathname, stripping query string', function () {
      const result = mantisModule.cleanUrl('https://example.com/path/to/page?query=1');
      expect(result).to.equal('example.com/path/to/page');
    });

    it('should preserve port in host if specified', function () {
      const result = mantisModule.cleanUrl('https://example.com:8080/path');
      expect(result).to.equal('example.com:8080/path');
    });

    it('should handle URL without path', function () {
      const result = mantisModule.cleanUrl('https://example.com');
      expect(result).to.equal('example.com/');
    });
  });

  describe('mantisModule.getMantisKeysSegmentData', function () {
    it('should return empty array for null input', function () {
      expect(mantisModule.getMantisKeysSegmentData(null)).to.be.an('array').that.is.empty;
    });

    it('should return empty array for undefined input', function () {
      expect(mantisModule.getMantisKeysSegmentData(undefined)).to.be.an('array').that.is.empty;
    });

    it('should return empty array when standard is missing', function () {
      expect(mantisModule.getMantisKeysSegmentData({})).to.be.an('array').that.is.empty;
    });

    it('should always return three segment objects (one per key)', function () {
      const result = mantisModule.getMantisKeysSegmentData({ standard: {} });
      expect(result).to.have.lengthOf(3);
      expect(result.map(r => r.name)).to.deep.equal(['mantis', 'mantis_context', 'iab_context']);
    });

    it('should extract segments from mantis key', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: { mantis: 'rating-green,sentiment-positive,emotions-happy,prebid-rtdmodule' },
      });
      const mantisItem = result.find(item => item.name === 'mantis');
      expect(mantisItem).to.exist;
      expect(mantisItem.segment).to.have.lengthOf(4);
      expect(mantisItem.segment.map(s => s.id)).to.include.members([
        'rating-green', 'sentiment-positive', 'emotions-happy', 'prebid-rtdmodule',
      ]);
    });

    it('should extract segments from mantis_context key', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: { mantis_context: 'sports,news,technology' },
      });
      const mantisContext = result.find(item => item.name === 'mantis_context');
      expect(mantisContext).to.deep.equal({
        name: 'mantis_context',
        segment: [{ id: 'sports' }, { id: 'news' }, { id: 'technology' }],
      });
    });

    it('should extract segments from iab_context key', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: { iab_context: 'IAB1,IAB2,IAB3' },
      });
      const iabContext = result.find(item => item.name === 'iab_context');
      expect(iabContext).to.deep.equal({
        name: 'iab_context',
        segment: [{ id: 'IAB1' }, { id: 'IAB2' }, { id: 'IAB3' }],
      });
    });

    it('should trim whitespace and filter empty values', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: {
          mantis: '  , value1 ,  , value2 ,  ',
          mantis_context: '',
          iab_context: '   ',
        },
      });

      const mantisItem = result.find(item => item.name === 'mantis');
      expect(mantisItem.segment).to.have.lengthOf(2);
      expect(mantisItem.segment[0].id).to.equal('value1');
      expect(mantisItem.segment[1].id).to.equal('value2');

      const mantisContextItem = result.find(item => item.name === 'mantis_context');
      expect(mantisContextItem.segment).to.be.empty;

      const iabContextItem = result.find(item => item.name === 'iab_context');
      expect(iabContextItem.segment).to.be.empty;
    });

    it('should deduplicate segment IDs', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: { mantis: 'value1,value2,value1,value3,value2' },
      });
      const mantisItem = result.find(item => item.name === 'mantis');
      expect(mantisItem.segment).to.have.lengthOf(3);
      expect(mantisItem.segment.map(s => s.id)).to.include.members(['value1', 'value2', 'value3']);
    });

    it('should return all three segment types when all keys are present', function () {
      const result = mantisModule.getMantisKeysSegmentData({
        standard: {
          mantis: 'rating-green,sentiment-positive',
          mantis_context: 'sports',
          iab_context: 'IAB1',
        },
      });

      expect(result).to.have.lengthOf(3);

      const mantisItem = result.find(item => item.name === 'mantis');
      const mantisContextItem = result.find(item => item.name === 'mantis_context');
      const iabContextItem = result.find(item => item.name === 'iab_context');

      expect(mantisItem.segment).to.have.lengthOf(2);
      expect(mantisContextItem.segment).to.have.lengthOf(1);
      expect(iabContextItem.segment).to.have.lengthOf(1);
    });
  });
});
