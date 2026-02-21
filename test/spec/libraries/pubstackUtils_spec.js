import { expect } from 'chai';
import sinon from 'sinon';
import * as boundingClientRectLib from '../../../libraries/boundingClientRect/boundingClientRect.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';
import { getElementForAdUnitCode, getViewportDistance } from '../../../libraries/pubstackUtils/index.js';
import * as utils from '../../../src/utils.js';

describe('pubstackUtils', function () {
  let sandbox;
  let topDocument;
  let selfDocument;
  let topWindow;
  let selfWindow;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    topDocument = {
      getElementById: sandbox.stub(),
      documentElement: { clientHeight: 1000 },
      body: { clientHeight: 1000 }
    };
    selfDocument = {
      getElementById: sandbox.stub(),
      documentElement: { clientHeight: 1000 },
      body: { clientHeight: 1000 }
    };
    topWindow = {
      innerHeight: 1000,
      document: topDocument
    };
    selfWindow = {
      innerHeight: 1000,
      document: selfDocument
    };

    sandbox.stub(utils, 'canAccessWindowTop').returns(true);
    sandbox.stub(utils, 'getWindowTop').returns(topWindow);
    sandbox.stub(utils, 'getWindowSelf').returns(selfWindow);
    sandbox.stub(gptUtils, 'getGptSlotInfoForAdUnitCode').returns({});
    sandbox.stub(boundingClientRectLib, 'getBoundingClientRect');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getElementForAdUnitCode', function () {
    it('returns undefined when adUnitCode is not provided', function () {
      expect(getElementForAdUnitCode()).to.equal(undefined);
    });

    it('returns the element that matches the adUnitCode', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);

      const result = getElementForAdUnitCode('ad-unit-code');

      expect(result).to.equal(element);
      expect(gptUtils.getGptSlotInfoForAdUnitCode.called).to.equal(false);
    });

    it('falls back to GPT divId when adUnitCode does not match a DOM element', function () {
      const element = { id: 'gpt-div-id' };
      gptUtils.getGptSlotInfoForAdUnitCode.withArgs('ad-unit-code').returns({ divId: 'gpt-div-id' });
      topDocument.getElementById.withArgs('gpt-div-id').returns(element);

      const result = getElementForAdUnitCode('ad-unit-code');

      expect(result).to.equal(element);
      expect(gptUtils.getGptSlotInfoForAdUnitCode.calledOnceWith('ad-unit-code')).to.equal(true);
    });

    it('uses window.self when top window access is unavailable', function () {
      utils.canAccessWindowTop.returns(false);
      const element = { id: 'self-div' };
      selfDocument.getElementById.withArgs('self-div').returns(element);

      const result = getElementForAdUnitCode('self-div');

      expect(result).to.equal(element);
      expect(topDocument.getElementById.called).to.equal(false);
    });
  });

  describe('getViewportDistance', function () {
    it('returns undefined when no adUnitCode is provided', function () {
      expect(getViewportDistance()).to.equal(undefined);
    });

    it('returns undefined when no matching element exists', function () {
      expect(getViewportDistance('missing-ad-unit')).to.equal(undefined);
    });

    it('returns undefined when bounding rect is not available', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns(undefined);

      expect(getViewportDistance('ad-unit-code')).to.equal(undefined);
    });

    it('computes positive distance when element is below the viewport', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 1400, bottom: 1700 });

      expect(getViewportDistance('ad-unit-code')).to.equal(0.4);
    });

    it('computes negative distance when element is above the viewport', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: -350, bottom: -200 });

      expect(getViewportDistance('ad-unit-code')).to.equal(-0.2);
    });

    it('computes distance from top when element starts above the viewport', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: -250, bottom: 100 });

      expect(getViewportDistance('ad-unit-code')).to.equal(-0.25);
    });

    it('computes distance from bottom when element extends below the viewport', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 900, bottom: 1250 });

      expect(getViewportDistance('ad-unit-code')).to.equal(0.25);
    });

    it('returns 0 when the element is inside the viewport', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 100, bottom: 200 });

      expect(getViewportDistance('ad-unit-code')).to.equal(0);
    });

    it('falls back to documentElement height when innerHeight is unavailable', function () {
      topWindow.innerHeight = 0;
      topDocument.documentElement.clientHeight = 800;
      topDocument.body.clientHeight = 700;
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 1000, bottom: 1200 });

      expect(getViewportDistance('ad-unit-code')).to.equal(0.25);
    });

    it('returns undefined when viewport height is unavailable', function () {
      topWindow.innerHeight = 0;
      topDocument.documentElement.clientHeight = 0;
      topDocument.body.clientHeight = 0;
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 1000, bottom: 1200 });

      expect(getViewportDistance('ad-unit-code')).to.equal(undefined);
    });

    it('uses GPT div id fallback when adUnitCode does not match an element', function () {
      const element = { id: 'gpt-div-id' };
      gptUtils.getGptSlotInfoForAdUnitCode.withArgs('ad-unit-code').returns({ divId: 'gpt-div-id' });
      topDocument.getElementById.withArgs('gpt-div-id').returns(element);
      boundingClientRectLib.getBoundingClientRect.returns({ top: 100, bottom: 200 });

      expect(getViewportDistance('ad-unit-code')).to.equal(0);
    });

    it('returns undefined when an exception is thrown', function () {
      const element = { id: 'ad-unit-code' };
      topDocument.getElementById.withArgs('ad-unit-code').returns(element);
      boundingClientRectLib.getBoundingClientRect.throws(new Error('unexpected error'));

      expect(getViewportDistance('ad-unit-code')).to.equal(undefined);
    });
  });
});
