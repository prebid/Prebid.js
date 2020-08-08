import yuktamediaAnalyticsAdapter from 'modules/yuktamediaAnalyticsAdapter.js';
import { expect } from 'chai';
let events = require('src/events');
let constants = require('src/constants.json');

let prebidAuction = {
  'auctionInit': {
    'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954',
    'timestamp': 1595850680304,
  },
  'bidRequested': {
    'bidderCode': 'appnexus',
    'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954',
    'bidderRequestId': '181df4d465699c',
    'bids': [
      {
        'bidder': 'appnexus',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ]
          }
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ],
        'bidId': '2bccebeda7fbe4',
        'bidderRequestId': '181df4d465699c',
        'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'auctionStart': 1595850680304,
    'timeout': 1100,
    'start': 1595850680307
  },
  'noBid': {},
  'bidTimeout': [],
  'bidResponse': {
    'bidderCode': 'appnexus',
    'width': 300,
    'height': 250,
    'statusMessage': 'Bid available',
    'getStatusCode': function () { return 1; },
    'adId': '3ade442375213f',
    'requestId': '2bccebeda7fbe4',
    'mediaType': 'banner',
    'source': 'client',
    'cpm': 0.5,
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 300,
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954',
    'responseTimestamp': 1595850681254,
    'requestTimestamp': 1595850680307,
    'bidder': 'appnexus',
    'timeToRespond': 947,
    'size': '300x250',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '3ade442375213f',
      'hb_pb': '0.50',
      'hb_size': '300x250',
      'hb_source': 'client',
      'hb_format': 'banner'
    }
  },
  'auctionEnd': {
    'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954'
  },
  'bidWon': {
    'bidderCode': 'appnexus',
    'width': 300,
    'height': 250,
    'requestId': '2bccebeda7fbe4',
    'mediaType': 'banner',
    'source': 'client',
    'cpm': 0.5,
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 300,
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'auctionId': 'ca421611-0bc0-4164-a69c-fe4158c68954',
    'responseTimestamp': 1595850681254,
    'requestTimestamp': 1595850680307,
    'bidder': 'appnexus',
    'timeToRespond': 947,
    'size': '300x250',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '3ade442375213f',
      'hb_pb': '0.50',
      'hb_size': '300x250',
      'hb_source': 'client',
      'hb_format': 'banner'
    },
    'status': 'rendered'
  }
};

describe('yuktamedia analytics adapter', function () {
  beforeEach(() => {
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(() => {
    events.getEvents.restore();
  });

  describe('enableAnalytics', function () {
    beforeEach(() => {
      sinon.spy(yuktamediaAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      yuktamediaAnalyticsAdapter.disableAnalytics();
      yuktamediaAnalyticsAdapter.track.restore();
    });

    it('should catch all events', function () {
      yuktamediaAnalyticsAdapter.enableAnalytics({
        provider: 'yuktamedia',
        options: {
          pubId: '1',
          pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
          enableUTMCollection: true,
          enableSession: true,
          enableUserIdCollection: true
        }
      });
      events.emit(constants.EVENTS.AUCTION_INIT, prebidAuction[constants.EVENTS.AUCTION_INIT]);
      events.emit(constants.EVENTS.BID_REQUESTED, prebidAuction[constants.EVENTS.BID_REQUESTED]);
      events.emit(constants.EVENTS.NO_BID, prebidAuction[constants.EVENTS.NO_BID]);
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidAuction[constants.EVENTS.BID_TIMEOUT]);
      events.emit(constants.EVENTS.BID_RESPONSE, prebidAuction[constants.EVENTS.BID_RESPONSE]);
      events.emit(constants.EVENTS.AUCTION_END, prebidAuction[constants.EVENTS.AUCTION_END]);
      sinon.assert.callCount(yuktamediaAnalyticsAdapter.track, 6);
    });

    it('should catch no events if no pubKey and pubId', function () {
      yuktamediaAnalyticsAdapter.enableAnalytics({
        provider: 'yuktamedia',
        options: {
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(yuktamediaAnalyticsAdapter.track, 0);
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

    it('should return empty object for disabled utm setting', function() {
      let utmTagData = yuktamediaAnalyticsAdapter.buildUtmTagData({
        pubId: '1',
        pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
        enableUTMCollection: false,
        enableSession: true,
        enableUserIdCollection: true
      });
      expect(utmTagData).deep.equal({});
    });
  });

  describe('build session information', function() {
    beforeEach(() => {
      sinon.spy(yuktamediaAnalyticsAdapter, 'track');
      localStorage.clear();
    });
    afterEach(() => {
      yuktamediaAnalyticsAdapter.disableAnalytics();
      yuktamediaAnalyticsAdapter.track.restore();
      localStorage.clear();
    });

    it('should create session id in local storage if enabled', function () {
      yuktamediaAnalyticsAdapter.enableAnalytics({
        provider: 'yuktamedia',
        options: {
          pubId: '1',
          pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
          enableUTMCollection: true,
          enableSession: true,
          enableUserIdCollection: true
        }
      });
      events.emit(constants.EVENTS.AUCTION_INIT, prebidAuction[constants.EVENTS.AUCTION_INIT]);
      events.emit(constants.EVENTS.BID_REQUESTED, prebidAuction[constants.EVENTS.BID_REQUESTED]);
      events.emit(constants.EVENTS.NO_BID, prebidAuction[constants.EVENTS.NO_BID]);
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidAuction[constants.EVENTS.BID_TIMEOUT]);
      events.emit(constants.EVENTS.BID_RESPONSE, prebidAuction[constants.EVENTS.BID_RESPONSE]);
      events.emit(constants.EVENTS.AUCTION_END, prebidAuction[constants.EVENTS.AUCTION_END]);
      expect(localStorage.getItem('yuktamediaAnalytics_session_id')).to.not.equal(null);
    });

    it('should not create session id in local storage if disabled', function () {
      yuktamediaAnalyticsAdapter.enableAnalytics({
        provider: 'yuktamedia',
        options: {
          pubId: '1',
          pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
          enableUTMCollection: true,
          enableSession: false,
          enableUserIdCollection: true
        }
      });
      events.emit(constants.EVENTS.AUCTION_INIT, prebidAuction[constants.EVENTS.AUCTION_INIT]);
      events.emit(constants.EVENTS.BID_REQUESTED, prebidAuction[constants.EVENTS.BID_REQUESTED]);
      events.emit(constants.EVENTS.NO_BID, prebidAuction[constants.EVENTS.NO_BID]);
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidAuction[constants.EVENTS.BID_TIMEOUT]);
      events.emit(constants.EVENTS.BID_RESPONSE, prebidAuction[constants.EVENTS.BID_RESPONSE]);
      events.emit(constants.EVENTS.AUCTION_END, prebidAuction[constants.EVENTS.AUCTION_END]);
      expect(localStorage.getItem('yuktamediaAnalytics_session_id')).to.equal(null);
    });
  });
});
