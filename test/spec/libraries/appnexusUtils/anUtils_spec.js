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
  describe('convertCamelToUnderscore', function () {
    it('converts camel-case bidder parameters to underscore-separated names', function () {
      expect(convertCamelToUnderscore('placementId')).to.equal('placement_id');
      expect(convertCamelToUnderscore('allowSmallerSizes')).to.equal('allow_smaller_sizes');
    });

    it('handles an initial capital without adding a leading underscore', function () {
      expect(convertCamelToUnderscore('PlacementId')).to.equal('placement_id');
    });

    it('keeps empty, lowercase, and already underscored names unchanged', function () {
      ['', 'placement', 'placement_id'].forEach(value => {
        expect(convertCamelToUnderscore(value)).to.equal(value);
      });
    });
  });

  describe('fill', function () {
    it('creates the requested number of entries with the supplied primitive value', function () {
      expect(fill('banner', 3)).to.deep.equal(['banner', 'banner', 'banner']);
      expect(fill(0, 2)).to.deep.equal([0, 0]);
      expect(fill(false, 2)).to.deep.equal([false, false]);
    });

    it('preserves null and undefined values in each populated entry', function () {
      expect(fill(null, 2)).to.deep.equal([null, null]);
      expect(fill(undefined, 2)).to.deep.equal([undefined, undefined]);
    });

    it('returns an empty array when no entries are requested', function () {
      expect(fill({ placementId: 123 }, 0)).to.deep.equal([]);
    });

    it('deep-clones object templates so changing one entry leaves the others and template intact', function () {
      const template = {
        bidder: 'appnexus',
        params: { placementId: 123 },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      const entries = fill(template, 2);

      expect(entries).to.deep.equal([template, template]);
      expect(entries[0]).not.to.equal(template);
      expect(entries[0]).not.to.equal(entries[1]);

      entries[0].params.placementId = 456;
      entries[0].mediaTypes.banner.sizes[0][0] = 728;
      entries[0].mediaTypes.banner.sizes.push([320, 50]);

      expect(entries[1]).to.deep.equal({
        bidder: 'appnexus',
        params: { placementId: 123 },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      });
      expect(template).to.deep.equal(entries[1]);
    });

    it('creates independent result arrays on separate calls', function () {
      const first = fill('banner', 1);
      const second = fill('banner', 1);
      first.push('video');

      expect(second).to.deep.equal(['banner']);
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
