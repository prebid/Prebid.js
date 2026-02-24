import { fireViewabilityPixels, getViewabilityUrlsFromBid } from 'libraries/bidViewabilityPixels/index.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { EVENT_TYPE_IMPRESSION, EVENT_TYPE_VIEWABLE, TRACKER_METHOD_IMG, TRACKER_METHOD_JS } from 'src/eventTrackers.js';

const VIEWABILITY_PIXEL_URLS = [
  'https://domain-1.com/end-point?a=1',
  'https://domain-2.com/end-point/',
  'https://domain-3.com/end-point?a=1'
];

const bidWithViewabilityTrackers = {
  adUnitCode: 'test-unit',
  bidder: 'test-bidder',
  eventtrackers: VIEWABILITY_PIXEL_URLS.map(url => ({
    event: EVENT_TYPE_VIEWABLE,
    method: TRACKER_METHOD_IMG,
    url
  }))
};

describe('bidViewabilityPixels library', function () {
  let sandbox;
  let triggerPixelSpy;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    triggerPixelSpy = sandbox.spy(utils, 'triggerPixel');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getViewabilityUrlsFromBid', function () {
    it('should return empty array when bid is null, undefined, or has no valid eventtrackers', function () {
      expect(getViewabilityUrlsFromBid(null)).to.deep.equal([]);
      expect(getViewabilityUrlsFromBid(undefined)).to.deep.equal([]);
      expect(getViewabilityUrlsFromBid({ adUnitCode: 'x' })).to.deep.equal([]);
      expect(getViewabilityUrlsFromBid({ eventtrackers: {} })).to.deep.equal([]);
      expect(getViewabilityUrlsFromBid({ eventtrackers: 'trackers' })).to.deep.equal([]);
      expect(getViewabilityUrlsFromBid({ eventtrackers: [] })).to.deep.equal([]);
    });

    it('should return URLs for EVENT_TYPE_VIEWABLE + TRACKER_METHOD_IMG only', function () {
      expect(getViewabilityUrlsFromBid(bidWithViewabilityTrackers)).to.deep.equal(VIEWABILITY_PIXEL_URLS);
    });

    it('should return only viewable img URLs when eventtrackers has mixed types', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://viewable.com' },
          { event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'https://impression.com' }
        ]
      };
      expect(getViewabilityUrlsFromBid(bid)).to.deep.equal(['https://viewable.com']);
    });

    it('should return empty array when viewable trackers have no img method', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_JS, url: 'https://viewable-js.com' }
        ]
      };
      expect(getViewabilityUrlsFromBid(bid)).to.deep.equal([]);
    });
  });

  describe('fireViewabilityPixels', function () {
    it('should not call triggerPixel when bid has no eventtrackers', function () {
      fireViewabilityPixels({ adUnitCode: 'x' });
      expect(triggerPixelSpy.callCount).to.equal(0);
    });

    it('should not call triggerPixel when eventtrackers is empty array', function () {
      fireViewabilityPixels({ eventtrackers: [] });
      expect(triggerPixelSpy.callCount).to.equal(0);
    });

    it('should fire one pixel per viewable img URL in eventtrackers', function () {
      fireViewabilityPixels(bidWithViewabilityTrackers);
      expect(triggerPixelSpy.callCount).to.equal(VIEWABILITY_PIXEL_URLS.length);
      VIEWABILITY_PIXEL_URLS.forEach((url, i) => {
        expect(triggerPixelSpy.getCall(i).args[0]).to.equal(url);
      });
    });

    it('should only fire EVENT_TYPE_VIEWABLE + TRACKER_METHOD_IMG URLs', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://viewable-img.com' },
          { event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'https://impression.com' }
        ]
      };
      fireViewabilityPixels(bid);
      expect(triggerPixelSpy.callCount).to.equal(1);
      expect(triggerPixelSpy.getCall(0).args[0]).to.equal('https://viewable-img.com');
    });
  });
});
