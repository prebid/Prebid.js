import adapterManager from 'src/adapterManager.js';
import id5AnalyticsAdapter from 'modules/id5AnalyticsAdapter';
import { expect } from 'chai';
import events from 'src/events';
import constants from 'src/constants.json';

const CONFIG_URL = 'https://127.0.0.1:8443/analytics/12349/pbjs';
const INGEST_URL = 'https://test.me/ingest';

describe('ID5 analytics adapter', () => {
  let server;
  let config;

  beforeEach(() => {
    server = sinon.createFakeServer();
    config = {
      options: {
        partnerId: 12349,
      }
    };
  });

  afterEach(() => {
    server.restore();
  });

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('id5Analytics');
    expect(adapter).to.exist;
    expect(adapter.gvlid).to.be.a('number');
    expect(adapter.adapter).to.equal(id5AnalyticsAdapter);
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

      id5AnalyticsAdapter.enableAnalytics(config);

      auction = {
        auctionId: '32b5b820-5ddc-4b60-a9b1-d19e86b26bdf',
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

    it.only('sends auction init and auction end events to the backend', () => {
      server.respondWith('GET', INGEST_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        ''
      ]);
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      // Why 3? 1: config, 2: auctionEnd, 3: tcfEnforcement
      expect(server.requests).to.have.length(3);

      // You don't believe me? Here is the proof
      const body1 = JSON.parse(server.requests[1].requestBody);
      expect(body1.event).to.equal('pbjs_auctionEnd');
      expect(body1.partnerId).to.equal(12349);
      expect(body1.meta).to.be.a('object');
      expect(body1.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body1.meta.sampling).to.equal(1);
      expect(body1.meta.tz).to.be.a('number');

      const body2 = JSON.parse(server.requests[2].requestBody);
      expect(body2.event).to.equal('pbjs_tcf2Enforcement');
      expect(body2.partnerId).to.equal(12349);
      expect(body2.meta).to.be.a('object');
      expect(body2.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body2.meta.sampling).to.equal(1);
      expect(body2.meta.tz).to.be.a('number');
    });

    it('filters unwanted IDs from the events it sends', () => {
      // TODO
    });
  });
});
