import roxotAnalytic from 'modules/roxotAnalyticsAdapter';
import { expect } from 'chai';
let events = require('src/events');
let adaptermanager = require('src/adaptermanager');
let constants = require('src/constants.json');

describe('Roxot Prebid Analytic', function () {
  describe('enableAnalytics', function () {
    it('should enable roxot analytics', () => {
      sinon.spy(roxotAnalytic, 'enableAnalytics');
      adaptermanager.registerAnalyticsAdapter({
        code: 'roxot',
        adapter: roxotAnalytic
      });

      adaptermanager.enableAnalytics({
        provider: 'roxot',
        options: {
          publisherIds: ['test_roxot_prebid_analytid_publisher_id']
        }
      });
      sinon.assert.calledOnce(roxotAnalytic.enableAnalytics);
      roxotAnalytic.enableAnalytics.restore();
    });
    it('should catch all events', function () {
      sinon.spy(roxotAnalytic, 'track');

      adaptermanager.registerAnalyticsAdapter({
        code: 'roxot',
        adapter: roxotAnalytic
      });

      adaptermanager.enableAnalytics({
        provider: 'roxot',
        options: {
          publisherIds: ['test_roxot_prebid_analytid_publisher_id']
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(roxotAnalytic.track, 5);
      roxotAnalytic.track.restore();
    });
  });
  describe('build utm tag data', () => {
    beforeEach(() => {
      localStorage.setItem('roxot_analytics_utm_source', 'utm_source');
      localStorage.setItem('roxot_analytics_utm_medium', 'utm_medium');
      localStorage.setItem('roxot_analytics_utm_campaign', '');
      localStorage.setItem('roxot_analytics_utm_term', '');
      localStorage.setItem('roxot_analytics_utm_content', '');
      localStorage.setItem('roxot_analytics_utm_timeout', Date.now());
    });
    it('should build utm data from local storage', () => {
      let utmTagData = roxotAnalytic.buildUtmTagData();
      expect(utmTagData.utm_source).to.equal('utm_source');
      expect(utmTagData.utm_medium).to.equal('utm_medium');
      expect(utmTagData.utm_campaign).to.equal('');
      expect(utmTagData.utm_term).to.equal('');
      expect(utmTagData.utm_content).to.equal('');
    });
  });
  describe('push bid response event', () => {
    let pushEvent = sinon.stub(roxotAnalytic, 'pushEvent');

    adaptermanager.registerAnalyticsAdapter({
      code: 'roxot',
      adapter: roxotAnalytic
    });

    adaptermanager.enableAnalytics({
      provider: 'roxot',
      options: {
        publisherIds: ['test_roxot_prebid_analytid_publisher_id'],

      }
    });

    events.emit(constants.EVENTS.AUCTION_INIT, {});
    events.emit(constants.EVENTS.AUCTION_END, {});
    events.emit(constants.EVENTS.BID_RESPONSE, {});

    sinon.assert.calledWith(pushEvent, constants.EVENTS.BID_RESPONSE, {});
    roxotAnalytic.pushEvent.restore();
  });
  describe('send bid won', function () {
    let send = sinon.spy(roxotAnalytic, 'send');

    adaptermanager.registerAnalyticsAdapter({
      code: 'roxot',
      adapter: roxotAnalytic
    });

    adaptermanager.enableAnalytics({
      provider: 'roxot',
      options: {
        publisherIds: ['test_roxot_prebid_analytid_publisher_id']
      }
    });

    events.emit(constants.EVENTS.AUCTION_INIT, {});
    events.emit(constants.EVENTS.AUCTION_END, {});
    events.emit(constants.EVENTS.BID_WON, {});

    sinon.assert.callCount(send, 1);
    send.restore();
  });
});
