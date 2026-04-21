import { fireViewabilityPixels, getViewabilityTrackersFromBid } from 'libraries/bidViewabilityPixels/index.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { EVENT_TYPE_IMPRESSION, EVENT_TYPE_VIEWABLE, TRACKER_METHOD_IMG, TRACKER_METHOD_JS } from 'src/eventTrackers.js';
import { auctionManager } from 'src/auctionManager.js';

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
  let insertHtmlIntoIframeSpy;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    triggerPixelSpy = sandbox.spy(utils, 'triggerPixel');
    insertHtmlIntoIframeSpy = sandbox.spy(utils, 'insertHtmlIntoIframe');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getViewabilityTrackersFromBid', function () {
    it('should return { img: [], js: [] } when bid is null, undefined, or has no valid eventtrackers', function () {
      const empty = { img: [], js: [] };
      expect(getViewabilityTrackersFromBid(null)).to.deep.equal(empty);
      expect(getViewabilityTrackersFromBid(undefined)).to.deep.equal(empty);
      expect(getViewabilityTrackersFromBid({ adUnitCode: 'x' })).to.deep.equal(empty);
      expect(getViewabilityTrackersFromBid({ eventtrackers: {} })).to.deep.equal(empty);
      expect(getViewabilityTrackersFromBid({ eventtrackers: 'trackers' })).to.deep.equal(empty);
      expect(getViewabilityTrackersFromBid({ eventtrackers: [] })).to.deep.equal(empty);
    });

    it('should return img and js URLs for viewable trackers', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://img.com' },
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_JS, url: 'https://js.com' }
        ]
      };
      expect(getViewabilityTrackersFromBid(bid)).to.deep.equal({
        img: ['https://img.com'],
        js: ['https://js.com']
      });
    });

    it('should return only viewable trackers when eventtrackers has mixed event types', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://viewable.com' },
          { event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'https://impression.com' }
        ]
      };
      expect(getViewabilityTrackersFromBid(bid)).to.deep.equal({
        img: ['https://viewable.com'],
        js: []
      });
    });

    it('should return only js when viewable trackers have JS method only', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_JS, url: 'https://viewable-js.com' }
        ]
      };
      expect(getViewabilityTrackersFromBid(bid)).to.deep.equal({
        img: [],
        js: ['https://viewable-js.com']
      });
    });
  });

  describe('fireViewabilityPixels', function () {
    it('should not call triggerPixel or insertHtmlIntoIframe when bid has no eventtrackers', function () {
      fireViewabilityPixels({ adUnitCode: 'x' });
      expect(triggerPixelSpy.callCount).to.equal(0);
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(0);
    });

    it('should not call triggerPixel or insertHtmlIntoIframe when eventtrackers is empty array', function () {
      fireViewabilityPixels({ eventtrackers: [] });
      expect(triggerPixelSpy.callCount).to.equal(0);
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(0);
    });

    it('should fire one pixel per viewable img URL in eventtrackers', function () {
      fireViewabilityPixels(bidWithViewabilityTrackers);
      expect(triggerPixelSpy.callCount).to.equal(VIEWABILITY_PIXEL_URLS.length);
      VIEWABILITY_PIXEL_URLS.forEach((url, i) => {
        expect(triggerPixelSpy.getCall(i).args[0]).to.equal(url);
      });
    });

    it('should fire viewable JS trackers via insertHtmlIntoIframe with script tag', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_JS, url: 'https://viewable-js.com' }
        ]
      };
      fireViewabilityPixels(bid);
      expect(triggerPixelSpy.callCount).to.equal(0);
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(1);
      expect(insertHtmlIntoIframeSpy.getCall(0).args[0]).to.include('script async src="https://viewable-js.com"');
    });

    it('should fire both img (triggerPixel) and js (insertHtmlIntoIframe) viewable trackers', function () {
      const bid = {
        eventtrackers: [
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://img.com' },
          { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_JS, url: 'https://js.com' }
        ]
      };
      fireViewabilityPixels(bid);
      expect(triggerPixelSpy.callCount).to.equal(1);
      expect(triggerPixelSpy.getCall(0).args[0]).to.equal('https://img.com');
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(1);
      expect(insertHtmlIntoIframeSpy.getCall(0).args[0]).to.include('script async src="https://js.com"');
    });

    it('should only fire EVENT_TYPE_VIEWABLE URLs', function () {
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

    describe('when bid has native response with eventtrackers (viewable)', function () {
      let indexStub;
      let getMediaTypesStub;

      beforeEach(function () {
        getMediaTypesStub = sinon.stub();
        indexStub = sandbox.stub(auctionManager, 'index').get(() => ({ getMediaTypes: getMediaTypesStub }));
      });

      it('should fire viewable trackers from bid.native.ortb.eventtrackers in addition to bid.eventtrackers', function () {
        getMediaTypesStub.returns({});
        const bid = {
          eventtrackers: [
            { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://from-bid.com' }
          ],
          native: {
            ortb: {
              eventtrackers: [
                { event: EVENT_TYPE_VIEWABLE, method: TRACKER_METHOD_IMG, url: 'https://from-native.com' }
              ]
            }
          }
        };
        fireViewabilityPixels(bid);
        expect(triggerPixelSpy.callCount).to.equal(2);
        expect(triggerPixelSpy.getCall(0).args[0]).to.equal('https://from-bid.com');
        expect(triggerPixelSpy.getCall(1).args[0]).to.equal('https://from-native.com');
      });
    });
  });
});
