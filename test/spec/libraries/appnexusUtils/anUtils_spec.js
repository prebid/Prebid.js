import { expect } from 'chai';
import * as utils from 'src/utils.js';
import {
  buildNativeRequest,
  convertCamelToUnderscore,
  convertUserParams,
  fill,
  getAppDeviceObj,
  getAppIdObj,
  getRtbBid,
  handleOutstreamRendererEvents,
  hasMemberId,
  isErrorResponse,
  NATIVE_MAPPING,
  parseMediaType
} from '../../../../libraries/appnexusUtils/anUtils.js';

describe('appnexusUtils/anUtils', () => {
  describe('convertCamelToUnderscore', () => {
    it('converts camel case to snake case', () => {
      expect(convertCamelToUnderscore('placementId')).to.equal('placement_id');
      expect(convertCamelToUnderscore('PlacementId')).to.equal('placement_id');
      expect(convertCamelToUnderscore('member')).to.equal('member');
    });
  });

  describe('fill', () => {
    it('fills an array with copies of a plain object', () => {
      const value = { a: 1 };
      const result = fill(value, 2);
      expect(result).to.deep.equal([{ a: 1 }, { a: 1 }]);
      expect(result[0]).to.not.equal(value);
      expect(result[0]).to.not.equal(result[1]);
    });

    it('fills an array with a primitive value', () => {
      expect(fill('x', 3)).to.deep.equal(['x', 'x', 'x']);
      expect(fill('x', 0)).to.deep.equal([]);
    });
  });

  describe('convertUserParams', () => {
    it('converts names to snake case and segments to objects', () => {
      expect(convertUserParams({
        externalUid: 'abc',
        age: 30,
        segments: [1, { id: 2, value: 'x' }, 'ignored'],
        other: true
      })).to.deep.equal({
        external_uid: 'abc',
        age: 30,
        segments: [{ id: 1 }, { id: 2, value: 'x' }],
        other: true
      });
    });

    it('passes only the allowed params', () => {
      expect(convertUserParams({ age: 30, other: true }, ['age'])).to.deep.equal({ age: 30 });
    });

    it('drops segments that are not an array', () => {
      expect(convertUserParams({ segments: 'x', age: 1 })).to.deep.equal({ age: 1 });
    });
  });

  describe('getAppDeviceObj', () => {
    it("returns the bid's allowed app params", () => {
      expect(getAppDeviceObj({ params: { app: { geo: { lat: 1 }, device_id: { idfa: 'x' }, id: 'app' } } }, ['geo', 'device_id']))
        .to.deep.equal({ geo: { lat: 1 }, device_id: { idfa: 'x' } });
    });

    it('returns undefined without an app bid', () => {
      expect(getAppDeviceObj(undefined, ['geo'])).to.equal(undefined);
      expect(getAppDeviceObj({ params: {} }, ['geo'])).to.equal(undefined);
    });
  });

  describe('getAppIdObj', () => {
    it('returns the app id', () => {
      const bid = { params: { app: { id: 'app' } } };
      expect(getAppIdObj(bid, bid)).to.deep.equal({ appid: 'app' });
    });

    it('returns undefined without an app id', () => {
      const bid = { params: { app: {} } };
      expect(getAppIdObj(undefined, bid)).to.equal(undefined);
      expect(getAppIdObj(bid, bid)).to.equal(undefined);
    });
  });

  describe('isErrorResponse', () => {
    let logError;
    beforeEach(() => {
      logError = sinon.stub(utils, 'logError');
    });
    afterEach(() => {
      logError.restore();
    });

    it('is false for a response body', () => {
      expect(isErrorResponse({ tags: [] }, { bidderCode: 'appnexus' })).to.equal(false);
      sinon.assert.notCalled(logError);
    });

    it('logs and is true for a missing body', () => {
      expect(isErrorResponse(undefined, { bidderCode: 'appnexus' })).to.equal(true);
      sinon.assert.calledWith(logError, 'in response for appnexus adapter');
    });

    it('logs the error of an error response', () => {
      expect(isErrorResponse({ error: 'bad' }, { bidderCode: 'appnexus' })).to.equal(true);
      sinon.assert.calledWith(logError, 'in response for appnexus adapter: bad');
    });
  });

  describe('hasMemberId', () => {
    it('is true for a non-zero member', () => {
      expect(hasMemberId({ params: { member: '958' } })).to.equal(true);
      expect(hasMemberId({ params: { member: 958 } })).to.equal(true);
    });

    it('is false without a usable member', () => {
      expect(hasMemberId({ params: {} })).to.equal(false);
      expect(hasMemberId({ params: { member: '0' } })).to.equal(false);
      expect(hasMemberId({ params: { member: 'abc' } })).to.equal(false);
    });
  });

  describe('getRtbBid', () => {
    it('returns the first ad with an rtb bid', () => {
      const rtb = { rtb: { banner: {} }, id: 2 };
      expect(getRtbBid({ ads: [{ id: 1 }, rtb, { rtb: {}, id: 3 }] })).to.equal(rtb);
    });

    it('returns nothing truthy without an rtb ad', () => {
      expect(getRtbBid(undefined)).to.not.be.ok;
      expect(getRtbBid({})).to.not.be.ok;
      expect(getRtbBid({ ads: [] })).to.not.be.ok;
      expect(getRtbBid({ ads: [{ id: 1 }] })).to.not.be.ok;
    });
  });

  describe('parseMediaType', () => {
    it('maps the ad type to a media type, defaulting to banner', () => {
      expect(parseMediaType({ ad_type: 'video' })).to.equal('video');
      expect(parseMediaType({ ad_type: 'native' })).to.equal('native');
      expect(parseMediaType({ ad_type: 'banner' })).to.equal('banner');
      expect(parseMediaType({})).to.equal('banner');
    });
  });

  describe('handleOutstreamRendererEvents', () => {
    it("passes the event to the bid's renderer", () => {
      const bid = { renderer: { handleVideoEvent: sinon.spy() } };
      handleOutstreamRendererEvents(bid, 'id1', 'loaded');
      sinon.assert.calledWith(bid.renderer.handleVideoEvent, { id: 'id1', eventName: 'loaded' });
    });
  });

  describe('buildNativeRequest', () => {
    it('renames assets to their /ut names and adds required params', () => {
      expect(buildNativeRequest({
        title: { required: true, len: 80 },
        body: { required: false },
        image: { sizes: [150, 50] },
        icon: { sizes: [[50, 50], [100, 100]] },
        sponsoredBy: { required: true }
      })).to.deep.equal({
        title: { required: true, len: 80 },
        description: { required: false },
        main_image: { required: true, sizes: [{ width: 150, height: 50 }] },
        icon: { required: true, sizes: [{ width: 50, height: 50 }, { width: 100, height: 100 }] },
        sponsored_by: { required: true }
      });
    });

    it('lets the ad unit override required params', () => {
      expect(buildNativeRequest({ image: { required: false } })).to.deep.equal({
        main_image: { required: false }
      });
    });

    it('leaves image sizes alone unless they are sizes', () => {
      expect(buildNativeRequest({ image: { sizes: 'any' } }).main_image.sizes).to.equal('any');
      expect(buildNativeRequest({ image: { sizes: [] } }).main_image.sizes).to.deep.equal([]);
    });

    it('flags privacy link support', () => {
      expect(buildNativeRequest({ privacyLink: {} })).to.deep.equal({
        privacy_link: {},
        privacy_supported: true
      });
    });

    it('passes unmapped assets through', () => {
      expect(buildNativeRequest({ rating: { required: false } })).to.deep.equal({ rating: { required: false } });
    });

    it('maps every renamed asset', () => {
      expect(Object.keys(NATIVE_MAPPING)).to.include.members(['body', 'body2', 'cta', 'image', 'icon', 'sponsoredBy', 'privacyLink', 'salePrice', 'displayUrl']);
    });
  });
});
