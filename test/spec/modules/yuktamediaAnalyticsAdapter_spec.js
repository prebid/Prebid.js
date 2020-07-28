import yuktamediaAnalyticsAdapter from 'modules/yuktamediaAnalyticsAdapter.js';
import { expect } from 'chai';
let adapterManager = require('src/adapterManager').default;

let events = require('src/events');
let constants = require('src/constants.json');

describe('yuktamedia analytics adapter', function () {
  describe('enableAnalytics', function() {
    beforeEach(function () {
      sinon.spy(yuktamediaAnalyticsAdapter, 'track');
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      yuktamediaAnalyticsAdapter.track.restore();
      events.getEvents.restore();
    });

    it('should catch all events', function () {
      adapterManager.registerAnalyticsAdapter({
        code: 'yuktamedia',
        adapter: yuktamediaAnalyticsAdapter
      });

      adapterManager.enableAnalytics({
        provider: 'yuktamedia',
        options: {
          pubId: '1',
          pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
          enableUTMCollection: true,
          enableSession: true,
          enableUserIdCollection: true
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.NO_BID, {})
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(yuktamediaAnalyticsAdapter.track, 6);
    });
  });

  describe('build utm tag data', function () {
    beforeEach(function () {
      localStorage.setItem('yuktamediaAnalytics_utm_source', 'prebid');
      localStorage.setItem('yuktamediaAnalytics_utm_medium', 'ad');
      localStorage.setItem('yuktamediaAnalytics_utm_campaign', '');
      localStorage.setItem('yuktamediaAnalytics_utm_term', '');
      localStorage.setItem('yuktamediaAnalytics_utm_content', '');
      localStorage.setItem('yuktamediaAnalytics_utm_timeout', Date.now());
    });

    it('should build utm data from local storage', function () {
      let utmTagData = yuktamediaAnalyticsAdapter.buildUtmTagData({
        pubId: '1',
        pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
        enableUTMCollection: true,
        enableSession: true,
        enableUserIdCollection: true
      });
      expect(utmTagData.utm_source).to.equal('prebid');
      expect(utmTagData.utm_medium).to.equal('ad');
      expect(utmTagData.utm_campaign).to.equal('');
      expect(utmTagData.utm_term).to.equal('');
      expect(utmTagData.utm_content).to.equal('');
    });
  });
});
