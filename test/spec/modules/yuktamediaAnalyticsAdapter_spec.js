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
        'userId': {
          'id5id': { uid: 'ID5-ZHMOxXeRXPe3inZKGD-Lj0g7y8UWdDbsYXQ_n6aWMQ' },
          'parrableid': '01.1595590997.46d951017bdc272ca50b88dbcfb0545cfc636bec3e3d8c02091fb1b413328fb2fd3baf65cb4114b3f782895fd09f82f02c9042b85b42c4654d08ba06dc77f0ded936c8ea3fc4085b4a99',
          'pubcid': '100a8bc9-f588-4c22-873e-a721cb68bc34'
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

let prebidNativeAuction = {
  'auctionInit': {
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'timestamp': 1595589742100,
  },
  'bidRequested': {
    'bidderCode': 'appnexus',
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'tid': 'f9c220eb-e44f-412b-92ff-8c24085ca675',
    'bids': [
      {
        'bidder': 'appnexus',
        'bid_id': '19a879bd73bc8d',
        'nativeParams': {
          'title': {
            'required': true,
            'len': 800
          },
          'image': {
            'required': true,
            'sizes': [
              989,
              742
            ]
          },
          'sponsoredBy': {
            'required': true
          }
        },
        'mediaTypes': {
          'native': {
            'title': {
              'required': true,
              'len': 800
            },
            'image': {
              'required': true,
              'sizes': [
                989,
                742
              ]
            },
            'sponsoredBy': {
              'required': true
            }
          }
        },
        'adUnitCode': '/19968336/prebid_native_example_1',
        'sizes': [],
        'bidId': '19a879bd73bc8d',
        'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
        'src': 's2s',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 0,
        'bidderWinsCount': 0
      },
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
        'bidId': '28f8cc7d10f2db',
        'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
        'src': 's2s',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 2,
        'bidderWinsCount': 0
      }
    ],
    'auctionStart': 1595589742100,
    'timeout': 1000,
    'src': 's2s',
    'start': 1595589742108
  },
  'bidRequested1': {
    'bidderCode': 'ix',
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'bidderRequestId': '5e64168f3654af',
    'bids': [
      {
        'bidder': 'ix',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ]
            ]
          }
        },
        'adUnitCode': 'dfp-ad-rightrail_top',
        'sizes': [[300, 250]],
        'bidId': '9424dea605368f',
        'bidderRequestId': '5e64168f3654af',
        'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
        'src': 's2s'
      }
    ],
    'auctionStart': 1595589742100,
    'timeout': 1000,
    'src': 's2s',
    'start': 1595589742108
  },
  'noBid': {
    'bidder': 'ix',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            300,
            250
          ]
        ]
      }
    },
    'adUnitCode': 'dfp-ad-rightrail_top',
    'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
    'sizes': [[300, 250]],
    'bidId': '9424dea605368f',
    'bidderRequestId': '5e64168f3654af',
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'src': 's2s',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 4,
    'bidderWinsCount': 0
  },
  'bidTimeout': [
    {
      'bidId': '28f8cc7d10f2db',
      'bidder': 'appnexus',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'auctionId': '86e005fa-1900-4782-b6df-528500f09128'
    }
  ],
  'bidResponse': {
    'bidderCode': 'appnexus',
    'statusMessage': 'Bid available',
    'source': 's2s',
    'getStatusCode': function () { return 1; },
    'cpm': 10,
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_pb': '10.00',
      'hb_adid': '4e756c72ee9044',
      'hb_size': 'undefinedxundefined',
      'hb_source': 's2s',
      'hb_format': 'native',
      'hb_native_linkurl': 'some_long_url',
      'hb_native_title': 'This is a Prebid Native Creative',
      'hb_native_brand': 'Prebid.org'
    },
    'native': {
      'clickUrl': {
        'url': 'some_long_url'
      },
      'impressionTrackers': [
        'some_long_url'
      ],
      'javascriptTrackers': [],
      'image': {
        'url': 'some_long_image_path',
        'width': 989,
        'height': 742
      },
      'title': 'This is a Prebid Native Creative',
      'sponsoredBy': 'Prebid.org'
    },
    'currency': 'USD',
    'ttl': 60,
    'netRevenue': true,
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'responseTimestamp': 1595589742827,
    'requestTimestamp': 1595589742108,
    'bidder': 'appnexus',
    'adUnitCode': '/19968336/prebid_native_example_1',
    'timeToRespond': 719,
    'size': 'undefinedxundefined'
  },
  'auctionEnd': {
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128'
  },
  'bidWon': {
    'bidderCode': 'appnexus',
    'mediaType': 'native',
    'source': 's2s',
    'getStatusCode': function () { return 1; },
    'cpm': 10,
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_pb': '10.00',
      'hb_adid': '4e756c72ee9044',
      'hb_size': 'undefinedxundefined',
      'hb_source': 's2s',
      'hb_format': 'native',
      'hb_native_linkurl': 'some_long_url',
      'hb_native_title': 'This is a Prebid Native Creative',
      'hb_native_brand': 'Prebid.org'
    },
    'native': {
      'clickUrl': {
        'url': 'some_long_url'
      },
      'impressionTrackers': [
        'some_long_url'
      ],
      'javascriptTrackers': [],
      'image': {
        'url': 'some_long_image_path',
        'width': 989,
        'height': 742
      },
      'title': 'This is a Prebid Native Creative',
      'sponsoredBy': 'Prebid.org'
    },
    'currency': 'USD',
    'ttl': 60,
    'netRevenue': true,
    'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
    'responseTimestamp': 1595589742827,
    'requestTimestamp': 1595589742108,
    'bidder': 'appnexus',
    'adUnitCode': '/19968336/prebid_native_example_1',
    'timeToRespond': 719,
    'size': 'undefinedxundefined',
    'status': 'rendered'
  }
}

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

    it('should catch all events 1', function () {
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
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch all events 2', function () {
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
      events.emit(constants.EVENTS.BID_REQUESTED, prebidAuction[constants.EVENTS.BID_REQUESTED]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch all events 3', function () {
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
      events.emit(constants.EVENTS.NO_BID, prebidAuction[constants.EVENTS.NO_BID]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch all events 4', function () {
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
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidAuction[constants.EVENTS.BID_TIMEOUT]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch all events 5', function () {
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
      events.emit(constants.EVENTS.BID_RESPONSE, prebidAuction[constants.EVENTS.BID_RESPONSE]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch all events 6', function () {
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
      events.emit(constants.EVENTS.AUCTION_END, prebidAuction[constants.EVENTS.AUCTION_END]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
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

    it('should catch nobid, timeout and bidwon event events one of eight', function () {
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
      events.emit(constants.EVENTS.AUCTION_INIT, prebidNativeAuction[constants.EVENTS.AUCTION_INIT]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events two of eight', function () {
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
      events.emit(constants.EVENTS.BID_REQUESTED, prebidNativeAuction[constants.EVENTS.BID_REQUESTED]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events three of eight', function () {
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
      events.emit(constants.EVENTS.BID_REQUESTED, prebidNativeAuction[constants.EVENTS.BID_REQUESTED + '1']);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events four of eight', function () {
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
      events.emit(constants.EVENTS.NO_BID, prebidNativeAuction[constants.EVENTS.NO_BID]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events five of eight', function () {
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
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidNativeAuction[constants.EVENTS.BID_TIMEOUT]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events six of eight', function () {
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
      events.emit(constants.EVENTS.BID_RESPONSE, prebidNativeAuction[constants.EVENTS.BID_RESPONSE]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events seven of eight', function () {
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
      events.emit(constants.EVENTS.AUCTION_END, prebidNativeAuction[constants.EVENTS.AUCTION_END]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
    });

    it('should catch nobid, timeout and bidwon event events eight of eight', function () {
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
      events.emit(constants.EVENTS.AUCTION_END, prebidNativeAuction[constants.EVENTS.BID_WON]);
      sinon.assert.called(yuktamediaAnalyticsAdapter.track);
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

    afterEach(function () {
      localStorage.clear();
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

    it('should return empty object for disabled utm setting', function () {
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

  describe('build session information', function () {
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
