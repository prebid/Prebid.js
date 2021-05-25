import adapterManager from '../../../src/adapterManager.js';
import id5AnalyticsAdapter from '../../../modules/id5AnalyticsAdapter.js';
import { expect } from 'chai';
import sinon from 'sinon';
import events from '../../../src/events.js';
import constants from '../../../src/constants.json';
import { generateUUID } from '../../../src/utils.js';

const CONFIG_URL = 'https://127.0.0.1:8443/analytics/12349/pbjs';
const INGEST_URL = 'https://test.me/ingest';

describe.only('ID5 analytics adapter', () => {
  let server;
  let config;

  beforeEach(() => {
    server = sinon.createFakeServer();
    config = {
      options: {
        partnerId: 12349,
      }
    };

    // Used because events module is stateful and accumulates events forever !!
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(() => {
    server.restore();
    events.getEvents.restore();
  });

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('id5Analytics');
    expect(adapter).to.exist;
    expect(adapter.gvlid).to.be.a('number');
    expect(adapter.adapter).to.equal(id5AnalyticsAdapter);
  });

  it('tolerates undefined or empty config', () => {
    id5AnalyticsAdapter.enableAnalytics(undefined);
    id5AnalyticsAdapter.enableAnalytics({});
  });

  it('calls configuration endpoint', () => {
    server.respondWith('GET', CONFIG_URL, [200,
      {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      `{ "sampling": 0, "ingestUrl": "${INGEST_URL}" }`
    ]);
    id5AnalyticsAdapter.enableAnalytics(config);
    server.respond();

    expect(server.requests).to.have.length(1);

    id5AnalyticsAdapter.disableAnalytics();
  });

  it('dos not calls configuration endpoint when partner id is missing', () => {
    id5AnalyticsAdapter.enableAnalytics({});
    server.respond();

    expect(server.requests).to.have.length(0);

    id5AnalyticsAdapter.disableAnalytics();
  });

  describe('after configuration', () => {
    let auction;

    beforeEach(() => {
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}" }`
      ]);

      server.respondWith('POST', INGEST_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        ''
      ]);

      auction = {
        auctionId: generateUUID(),
        adUnits: [{
          'code': 'user-728',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600], [728, 90]]
            }
          },
          adUnitCodes: ['user-728']
        }],
      };
    });

    afterEach(() => {
      id5AnalyticsAdapter.disableAnalytics();
    });

    it('sends auction init and auction end events to the backend', () => {
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      events.emit(constants.EVENTS.AUCTION_INIT, auction);
      server.respond();

      // Why 3? 1: config, 2: tcfEnforcement, 3: auctionEnd
      // tcfEnforcement? yes, gdprEnforcement module emits in reaction to auctionEnd
      expect(server.requests).to.have.length(4);

      const body1 = JSON.parse(server.requests[1].requestBody);
      expect(body1.source).to.equal('pbjs');
      expect(body1.event).to.equal('tcf2Enforcement');
      expect(body1.partnerId).to.equal(12349);
      expect(body1.meta).to.be.a('object');
      expect(body1.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body1.meta.sampling).to.equal(1);
      expect(body1.meta.tz).to.be.a('number');

      const body2 = JSON.parse(server.requests[2].requestBody);
      expect(body2.source).to.equal('pbjs');
      expect(body2.event).to.equal('auctionEnd');
      expect(body2.partnerId).to.equal(12349);
      expect(body2.meta).to.be.a('object');
      expect(body2.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body2.meta.sampling).to.equal(1);
      expect(body2.meta.tz).to.be.a('number');
      expect(body2.payload).to.eql(auction);

      const body3 = JSON.parse(server.requests[3].requestBody);
      expect(body3.source).to.equal('pbjs');
      expect(body3.event).to.equal('auctionInit');
      expect(body3.partnerId).to.equal(12349);
      expect(body3.meta).to.be.a('object');
      expect(body3.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body3.meta.sampling).to.equal(1);
      expect(body3.meta.tz).to.be.a('number');
      expect(body3.payload).to.eql(auction);
    });

    it('filters unwanted IDs from the events it sends', () => {
      auction.adUnits[0].bids = [{
        'bidder': 'appnexus',
        'params': {
          'placementId': '16618951'
        },
        'userId': {
          'criteoId': '_h_y_19IMUhMZG1TOTRReHFNc29TekJ3TzQ3elhnRU81ayUyQjhiRkdJJTJGaTFXJTJCdDRnVmN4S0FETUhQbXdmQWg0M3g1NWtGbGolMkZXalclMkJvWjJDOXFDSk1HU3ZKaVElM0QlM0Q',
          'id5id': {
            'uid': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*FSycZQy7v7zWXiKbEpPEWoB3_UiWdPGzh554ncYDvOkAAA3rajiR0yNrFAU7oDTu',
            'ext': { 'linkType': 1 }
          },
          'tdid': '888a6042-8f99-483b-aa26-23c44bc9166b'
        },
        'userIdAsEids': [{
          'source': 'criteo.com',
          'uids': [{
            'id': '_h_y_19IMUhMZG1TOTRReHFNc29TekJ3TzQ3elhnRU81ayUyQjhiRkdJJTJGaTFXJTJCdDRnVmN4S0FETUhQbXdmQWg0M3g1NWtGbGolMkZXalclMkJvWjJDOXFDSk1HU3ZKaVElM0QlM0Q',
            'atype': 1
          }]
        }, {
          'source': 'id5-sync.com',
          'uids': [{
            'id': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*FSycZQy7v7zWXiKbEpPEWoB3_UiWdPGzh554ncYDvOkAAA3rajiR0yNrFAU7oDTu',
            'atype': 1,
            'ext': { 'linkType': 1 }
          }]
        }]
      }];

      auction.adUnits[0].bidsReceived = [{
        'bidderCode': 'appnexus',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '99e7838aa7f1c4f',
        'requestId': '21e0b32208ee9a',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.020601,
        'creativeId': 209272535,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'user-728',
        'appnexus': {
          'buyerMemberId': 11563
        },
        'meta': {
          'advertiserId': 4388779
        },
        'ad': 'stuff i am not interested in',
        'originalCpm': 0.020601,
        'originalCurrency': 'USD',
        'auctionId': 'c7694dbb-a583-4a73-a933-b16f1f821ba4'
      }];

      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(3);

      const body = JSON.parse(server.requests[2].requestBody);
      expect(body.event).to.equal('auctionEnd');
      expect(body.payload.adUnits[0].bids[0].userId).to.eql({
        'criteoId': '__ID5_REDACTED__',
        'id5id': '__ID5_REDACTED__',
        'tdid': '__ID5_REDACTED__'
      });
      body.payload.adUnits[0].bids[0].userIdAsEids.forEach((userId) => {
        expect(userId.uids[0].id).to.equal('__ID5_REDACTED__');
      });
      expect(body.payload.adUnits[0].bidsReceived[0].ad).to.equal(undefined);
      expect(body.payload.adUnits[0].bidsReceived[0].requestId).to.equal('21e0b32208ee9a');
    });

    it('can override events to collect if configured to do so', () => {
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}", "eventsToTrack": ["tcf2Enforcement"] }`
      ]);
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(2);
      const body1 = JSON.parse(server.requests[1].requestBody);
      expect(body1.event).to.equal('tcf2Enforcement');
    });

    it('can extend cleanup rules from server side', () => {
      auction.adUnits[0].bidsReceived = [{
        'bidderCode': 'appnexus',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '99e7838aa7f1c4f',
        'requestId': '21e0b32208ee9a',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.020601,
        'creativeId': 209272535,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'user-728',
        'appnexus': {
          'buyerMemberId': 11563
        },
        'meta': {
          'advertiserId': 4388779
        },
        'ad': 'stuff i am not interested in',
        'originalCpm': 0.020601,
        'originalCurrency': 'USD',
        'auctionId': 'c7694dbb-a583-4a73-a933-b16f1f821ba4'
      }];
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}", "additionalCleanupRules": {"auctionEnd": [{"match":["adUnits", "*", "bidsReceived", "*", "requestId"],"apply":"erase"}]} }`
      ]);
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(3);
      const body = JSON.parse(server.requests[2].requestBody);
      expect(body.event).to.equal('auctionEnd');
      expect(body.payload.adUnits[0].bidsReceived[0].requestId).to.equal(undefined);
      expect(body.payload.adUnits[0].bidsReceived[0].bidderCode).to.equal('appnexus');
    });
  });
});
