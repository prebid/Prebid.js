import * as bidViewabilityIO from 'modules/bidViewabilityIO.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import { expect } from 'chai';
import CONSTANTS from 'src/constants.json';

describe('#bidViewabilityIO', function() {
  const makeElement = (id) => {
    const el = document.createElement('div');
    el.setAttribute('id', id);
    return el;
  }
  const banner_bid = {
    adUnitCode: 'banner_id',
    mediaType: 'banner',
    width: 728,
    height: 90
  };

  const large_banner_bid = {
    adUnitCode: 'large_banner_id',
    mediaType: 'banner',
    width: 970,
    height: 250
  };

  const video_bid = {
    mediaType: 'video',
  };

  const native_bid = {
    mediaType: 'native',
  };

  it('init to be a function', function() {
    expect(bidViewabilityIO.init).to.be.a('function')
  });

  describe('isSupportedMediaType tests', function() {
    it('banner to be supported', function() {
      expect(bidViewabilityIO.isSupportedMediaType(banner_bid)).to.be.true
    });

    it('video not to be supported', function() {
      expect(bidViewabilityIO.isSupportedMediaType(video_bid)).to.be.false
    });

    it('native not to be supported', function() {
      expect(bidViewabilityIO.isSupportedMediaType(native_bid)).to.be.false
    });
  })

  describe('getViewableOptions tests', function() {
    it('normal banner has expected threshold in options object', function() {
      expect(bidViewabilityIO.getViewableOptions(banner_bid).threshold).to.equal(bidViewabilityIO.IAB_VIEWABLE_DISPLAY_THRESHOLD);
    });

    it('large banner has expected threshold in options object', function() {
      expect(bidViewabilityIO.getViewableOptions(large_banner_bid).threshold).to.equal(bidViewabilityIO.IAB_VIEWABLE_DISPLAY_LARGE_THRESHOLD)
    });

    it('video bid has undefined viewable options', function() {
      expect(bidViewabilityIO.getViewableOptions(video_bid)).to.be.undefined
    });

    it('native bid has undefined viewable options', function() {
      expect(bidViewabilityIO.getViewableOptions(native_bid)).to.be.undefined
    });
  })

  describe('markViewed tests', function() {
    let sandbox;
    const mockObserver = {
      unobserve: sinon.spy()
    };
    const mockEntry = {
      target: makeElement('target_id')
    };

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    })

    afterEach(function() {
      sandbox.restore()
    })

    it('markViewed returns a function', function() {
      expect(bidViewabilityIO.markViewed(banner_bid, mockEntry, mockObserver)).to.be.a('function')
    });

    it('markViewed unobserves', function() {
      const emitSpy = sandbox.spy(events, ['emit']);
      const func = bidViewabilityIO.markViewed(banner_bid, mockEntry, mockObserver);
      func();
      expect(mockObserver.unobserve.calledOnce).to.be.true;
      expect(emitSpy.calledOnce).to.be.true;
      // expect(emitSpy.firstCall.args).to.be.false;
      expect(emitSpy.firstCall.args[0]).to.eq(CONSTANTS.EVENTS.BID_VIEWABLE);
    });
  })

  describe('viewCallbackFactory tests', function() {
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    })

    afterEach(function() {
      sandbox.restore()
    })

    it('viewCallbackFactory returns a function', function() {
      expect(bidViewabilityIO.viewCallbackFactory(banner_bid)).to.be.a('function')
    });

    it('viewCallbackFactory function does stuff', function() {
      const logMessageSpy = sandbox.spy(utils, ['logMessage']);
      const mockObserver = {
        unobserve: sandbox.spy()
      };
      const mockEntries = [{
        isIntersecting: true,
        target: makeElement('true_id')
      },
      {
        isIntersecting: false,
        target: makeElement('false_id')
      },
      {
        isIntersecting: false,
        target: makeElement('false_id')
      }];
      mockEntries[2].target.view_tracker = 8;

      const func = bidViewabilityIO.viewCallbackFactory(banner_bid);
      func(mockEntries, mockObserver);
      expect(mockEntries[0].target.view_tracker).to.be.a('number');
      expect(mockEntries[1].target.view_tracker).to.be.undefined;
      expect(logMessageSpy.lastCall.lastArg).to.eq('bidViewabilityIO: viewable timer stopped for id: false_id code: banner_id');
    });
  })
});
