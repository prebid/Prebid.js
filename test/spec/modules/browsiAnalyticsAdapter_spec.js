import browsiAnalytics from 'modules/browsiAnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import { expect } from 'chai';
import { EVENTS } from 'src/constants.js';
import { server } from 'test/mocks/xhr.js';
import { getGlobal } from 'src/prebidGlobal.js';
import * as utils from 'src/utils.js';

let events = require('src/events');

describe('browsi analytics adapter', function () {
  const auctionId = 'abe18da6-cee1-438b-9013-dc5a62c9d4a8';
  const auctionEnd = {
    'auctionId': auctionId,
    'timestamp': 1740559969178,
    'auctionEnd': 1740559971388,
    'auctionStatus': 'completed',
    'adUnits': [
      {
        'code': 'realtid_mobile-mobil-1_:r1:',
        'sizes': [ [ 300, 250 ], [ 320, 100 ], [ 320, 160 ], [ 320, 320 ] ],
        'mediaTypes': {
          'banner': {
            'sizes': [ [ 300, 250 ], [ 320, 100 ], [ 320, 160 ], [ 320, 320 ] ]
          }
        },
        'bids': [
          {
            'bidder': 'livewrapped',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'browsi': {
                    'scrollDepth': 0.4,
                    'density': 0.6,
                    'numberOfAds': 3,
                    'lcp': 2.5,
                    'cls': 0.08,
                    'inp': 150,
                    'viewability': 0.66,
                    'revenue': 0.44,
                    'adLocation': 1220
                  }
                }
              }
            },
          },
          {
            'bidder': 'adprofitadform',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
          },
          {
            'bidder': 'leeads',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'browsi': {
                    'scrollDepth': 0.4,
                    'density': 0.6,
                    'numberOfAds': 3,
                    'lcp': 2.5,
                    'cls': 0.08,
                    'inp': 150,
                    'viewability': 0.66,
                    'revenue': 0.44,
                    'adLocation': 1220
                  }
                }
              }
            },
          },
        ],
        'lwPName': 'realtid_mobile-mobil-1',
        'adUnitId': '974f76d1-02af-4bb9-93d8-6aa8d4f81f30',
        'transactionId': '39fe8024-758e-4dbc-82c8-656cfba1d06b',
        'adserverTargeting': {
          'browsiViewability': [
            '0.60'
          ],
          'browsiScroll': [
            '0.40'
          ],
          'browsiRevenue': [
            'medium'
          ]
        }
      },
      {
        'code': 'realtid_mobile-mobil-2_:r2:',
        'sizes': [ [ 300, 250 ], [ 320, 100 ], [ 320, 160 ], [ 320, 320 ], [ 320, 400 ], [ 320, 480 ] ],
        'mediaTypes': {
          'banner': {
            'sizes': [ [ 300, 250 ], [ 320, 100 ], [ 320, 160 ], [ 320, 320 ], [ 320, 400 ], [ 320, 480 ] ]
          }
        },
        'bids': [
          {
            'bidder': 'livewrapped',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'browsi': {
                    'scrollDepth': 0.4,
                    'density': 0.6,
                    'numberOfAds': 3,
                    'lcp': 2.5,
                    'cls': 0.08,
                    'inp': 150
                  }
                }
              }
            },
          },
          {
            'bidder': 'tmapubmatic',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
          },
          {
            'bidder': 'adprofitadform',
            'auctionId': 'abe18da6-cee1-438b-9013-dc5a62c9d4a8',
          },
        ],
        'lwPName': 'realtid_mobile-mobil-2',
        'adUnitId': '644e15c8-4ee4-4205-9bf0-72dd22f8a678',
        'transactionId': '2299ea95-cd7e-492d-952f-38a637afff81',
        'adserverTargeting': {
          'browsiScroll': [
            '0.40'
          ],
          'browsiRevenue': [
            'no fill'
          ]
        }
      }
    ],
    'adUnitCodes': [
      'realtid_mobile-mobil-1_:r1:',
      'realtid_mobile-mobil-2_:r2:'
    ]
  }
  const browsiInit = {
    'moduleName': 'browsi',
    't': 1740559969178,
    'pvid': '123456',
    'pk': 'pub_key',
    'sk': 'site_key',
  }
  const dataSet1 = {
    pvid: '123456',
    d: 'MOBILE',
    g: 'IL',
    aid: 'article_123',
    es: true,
    sk: 'site_key',
    pk: 'pub_key',
    t: 1740559969178
  }
  const dataSet2 = {
    pvid: '654321',
    d: 'DESKTOP',
    g: 'US',
    aid: 'article_321',
    es: false,
    sk: ' site_key',
    pk: 'pub_key',
    t: 1740559969178
  }
  const timestamp = 1740559971388;

  let sandbox;

  before(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'timestamp').returns(timestamp);

    adapterManager.registerAnalyticsAdapter({
      code: 'browsi',
      adapter: browsiAnalytics
    });
  });
  after(() => {
    sandbox.restore();
  });
  afterEach(() => {
    browsiAnalytics.disableAnalytics();
    window.browsitag = undefined;
  });

  it('should send auction data', function () {
    window.browsitag = window.browsitag || {};
    window.browsitag.rtd = dataSet1;

    browsiAnalytics.enableAnalytics({
      provider: 'browsi',
      options: { }
    });

    events.emit(EVENTS.AUCTION_END, auctionEnd);
    expect(server.requests.length).to.equal(1);

    const request = server.requests[0];
    const { protocol, hostname, pathname, search } = utils.parseUrl(request.url);
    expect(protocol).to.equal('https');
    expect(hostname).to.equal('events.browsiprod.com');
    expect(pathname).to.equal('/events/v2/rtd_demand');
    expect(search).to.deep.equal({'p': '123456'});

    const body = JSON.parse(request.requestBody);
    expect(body.length).to.equal(1);

    const event = body[0];
    expect(event.to).to.equal(timestamp - dataSet1.t);
    expect(event.pvid).to.equal(dataSet1.pvid);
    expect(event.pk).to.equal(dataSet1.pk);
    expect(event.sk).to.equal(dataSet1.sk);
    expect(event.geo).to.equal(dataSet1.g);
    expect(event.dp).to.equal(dataSet1.d);
    expect(event.aid).to.equal(dataSet1.aid);
    expect(event.pbv).to.equal(getGlobal().version);
    expect(event.url).to.equal(encodeURIComponent(window.location.href));
    expect(event.et).to.equal('auction_data_sent');
    expect(event.aucid).to.equal(auctionId);
    expect(event.ad_units).to.have.length(2);

    expect(event.ad_units[0].plid).to.equal('realtid_mobile-mobil-1_:r1:');
    expect(event.ad_units[0].au).to.be.null;
    expect(event.ad_units[0].pbd).to.deep.equal(['livewrapped', 'leeads']);
    expect(event.ad_units[0].rtm).to.deep.equal({
      'scrollDepth': 0.4,
      'density': 0.6,
      'numberOfAds': 3,
      'lcp': 2.5,
      'cls': 0.08,
      'inp': 150,
      'viewability': 0.66,
      'revenue': 0.44,
      'adLocation': 1220
    });
    expect(event.ad_units[1].plid).to.equal('realtid_mobile-mobil-2_:r2:');
    expect(event.ad_units[1].au).to.be.null;
    expect(event.ad_units[1].pbd).to.deep.equal(['livewrapped']);
    expect(event.ad_units[1].rtm).to.deep.equal({
      'scrollDepth': 0.4,
      'density': 0.6,
      'numberOfAds': 3,
      'lcp': 2.5,
      'cls': 0.08,
      'inp': 150
    });
  });
  it('should send auction data without rtm data', function () {
    window.browsitag = window.browsitag || {};
    window.browsitag.rtd = dataSet2;

    browsiAnalytics.enableAnalytics({
      provider: 'browsi',
      options: { }
    });

    events.emit(EVENTS.AUCTION_END, auctionEnd);
    expect(server.requests.length).to.equal(2);

    const request = server.requests[1];
    const body = JSON.parse(request.requestBody);
    expect(body.length).to.equal(1);

    const event = body[0];
    expect(event.ad_units[0].rtm).to.be.undefined;
    expect(event.ad_units[1].rtm).to.be.undefined;
  });
  it('should send rtd init event', function () {
    window.browsitag = window.browsitag || {};
    window.browsitag.rtd = dataSet1;

    browsiAnalytics.enableAnalytics({
      provider: 'browsi',
      options: { }
    });

    events.emit(EVENTS.BROWSI_INIT, browsiInit);
    expect(server.requests.length).to.equal(3);

    const request = server.requests[2];
    const { protocol, hostname, pathname, search } = utils.parseUrl(request.url);
    expect(protocol).to.equal('https');
    expect(hostname).to.equal('events.browsiprod.com');
    expect(pathname).to.equal('/events/v2/rtd_supply');
    expect(search).to.deep.equal({'p': '123456'});

    const body = JSON.parse(request.requestBody);
    expect(body.length).to.equal(1);

    const event = body[0];
    expect(event.et).to.equal('rtd_init');
    expect(event.to).to.equal(timestamp - dataSet1.t);
    expect(event.pvid).to.equal(dataSet1.pvid);
    expect(event.pk).to.equal(dataSet1.pk);
    expect(event.sk).to.equal(dataSet1.sk);
    expect(event.geo).to.equal(dataSet1.g);
    expect(event.dp).to.equal(dataSet1.d);
    expect(event.pbv).to.equal(getGlobal().version);
    expect(event.url).to.equal(encodeURIComponent(window.location.href));
  });
  it('should send rtd init event without browsitag.rtd', function () {
    browsiAnalytics.enableAnalytics({
      provider: 'browsi',
      options: { }
    });

    events.emit(EVENTS.BROWSI_INIT, browsiInit);
    expect(server.requests.length).to.equal(4);

    const request = server.requests[3];
    const body = JSON.parse(request.requestBody);
    expect(body.length).to.equal(1);

    const event = body[0];
    expect(event.et).to.equal('rtd_init');
    expect(event.to).to.equal(timestamp - browsiInit.t);
    expect(event.pvid).to.equal(browsiInit.pvid);
    expect(event.pk).to.equal(browsiInit.pk);
    expect(event.sk).to.equal(browsiInit.sk);
    expect(event.geo).to.be.undefined;
    expect(event.dp).to.be.undefined;
    expect(event.pbv).to.equal(getGlobal().version);
    expect(event.url).to.equal(encodeURIComponent(window.location.href));
  });
  it('should not send rtd init event if event module name is not browsi', function () {
    browsiAnalytics.enableAnalytics({
      provider: 'browsi',
      options: { }
    });

    events.emit(EVENTS.BROWSI_INIT, { moduleName: 'not_browsi' });
    expect(server.requests.length).to.equal(4);
  });
});
