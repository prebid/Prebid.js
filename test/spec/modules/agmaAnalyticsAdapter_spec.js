import adapterManager from '../../../src/adapterManager.js';
import agmaAnalyticsAdapter, {
  getTiming,
  getOrtb2Data,
  getPayload,
} from '../../../modules/agmaAnalyticsAdapter.js';
import { gdprDataHandler } from '../../../src/adapterManager.js';
import { expect } from 'chai';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { generateUUID } from '../../../src/utils.js';
import { server } from '../../mocks/xhr.js';
import { config } from 'src/config.js';

const INGEST_URL = 'https://pbc.agma-analytics.de/v1';
const extendedKey = [
  'auctionIds',
  'code',
  'domain',
  'extended',
  'gdprApplies',
  'gdprConsentString',
  'language',
  'ortb2',
  'pageUrl',
  'pageViewId',
  'prebidVersion',
  'referrer',
  'screenHeight',
  'screenWidth',
  'deviceWidth',
  'deviceHeight',
  'scriptVersion',
  'timestamp',
  'timezoneOffset',
  'timing',
  'triggerEvent',
  'userIdsAsEids',
];
const nonExtendedKey = [
  'auctionIds',
  'code',
  'domain',
  'gdprApplies',
  'ortb2',
  'pageUrl',
  'pageViewId',
  'prebidVersion',
  'scriptVersion',
  'timing',
  'triggerEvent',
];

describe('AGMA Analytics Adapter', () => {
  let agmaConfig, sandbox, clock;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(events, 'getEvents').returns([]);
    agmaConfig = {
      options: {
        code: 'test',
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('configuration', () => {
    it('registers itself with the adapter manager', () => {
      const adapter = adapterManager.getAnalyticsAdapter('agma');
      expect(adapter).to.exist;
      expect(adapter.gvlid).to.equal(1122);
    });
  });

  describe('getPayload', () => {
    it('should use non extended payload with no consent info', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => null)
      const payload = getPayload([generateUUID()], {
        code: 'test',
      });

      expect(payload).to.have.all.keys([...nonExtendedKey, 'debug']);
    });

    it('should use non extended payload when agma is not in  the TC String', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => ({
        vendorData: {
          vendor: {
            consents: {
              1122: false,
            },
          },
        },
      }));
      const payload = getPayload([generateUUID()], {
        code: 'test',
      });
      expect(payload).to.have.all.keys([...nonExtendedKey, 'debug']);
    });

    it('should use extended payload when agma is in the TC String', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => ({
        vendorData: {
          vendor: {
            consents: {
              1122: true,
            },
          },
        },
      }));
      const payload = getPayload([generateUUID()], {
        code: 'test',
      });
      expect(payload).to.have.all.keys([...extendedKey, 'debug']);
    });
  });

  describe('getTiming', () => {
    let originalPerformance;
    let originalWindowPerformanceNow;

    beforeEach(() => {
      originalPerformance = global.performance;
      originalWindowPerformanceNow = window.performance.now;
    });

    afterEach(() => {
      global.performance = originalPerformance;
      window.performance.now = originalWindowPerformanceNow;
    });

    it('returns TTFB using Timing API V2', () => {
      global.performance = {
        getEntriesByType: sinon
          .stub()
          .returns([{ responseStart: 100, startTime: 50 }]),
        now: sinon.stub().returns(150),
      };

      const result = getTiming();

      expect(result).to.deep.equal({ ttfb: 50, elapsedTime: 150 });
    });

    it('returns TTFB using Timing API V1 when V2 is not available', () => {
      global.performance = {
        getEntriesByType: sinon.stub().throws(),
        timing: { responseStart: 150, fetchStart: 50 },
        now: sinon.stub().returns(200),
      };

      const result = getTiming();

      expect(result).to.deep.equal({ ttfb: 100, elapsedTime: 200 });
    });

    it('returns null when Timing API is not available', () => {
      global.performance = {
        getEntriesByType: sinon.stub().throws(),
        timing: undefined,
      };

      const result = getTiming();

      expect(result).to.be.null;
    });

    it('returns ttfb as 0 if calculated value is negative', () => {
      global.performance = {
        getEntriesByType: sinon
          .stub()
          .returns([{ responseStart: 50, startTime: 150 }]),
        now: sinon.stub().returns(200),
      };

      const result = getTiming();

      expect(result).to.deep.equal({ ttfb: 0, elapsedTime: 200 });
    });

    it('returns ttfb as 0 if calculated value exceeds performance.now()', () => {
      global.performance = {
        getEntriesByType: sinon
          .stub()
          .returns([{ responseStart: 50, startTime: 0 }]),
        now: sinon.stub().returns(40),
      };

      const result = getTiming();

      expect(result).to.deep.equal({ ttfb: 0, elapsedTime: 40 });
    });
  });

  describe('getOrtb2Data', () => {
    it('returns site and user from options when available', () => {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        return {};
      });

      const ortb2 = {
        user: 'user',
        site: 'site',
      };

      const result = getOrtb2Data({
        ortb2,
      });

      expect(result).to.deep.equal(ortb2);
    });

    it('returns a combination of data from options and pGlobal.readConfig', () => {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        return {
          ortb2: {
            site: {
              foo: 'bar',
            },
          },
        };
      });

      const ortb2 = {
        user: 'user',
      };
      const result = getOrtb2Data({
        ortb2,
      });

      expect(result).to.deep.equal({
        site: {
          foo: 'bar',
        },
        user: 'user',
      });
    });
  });

  describe('Event Payload', () => {
    beforeEach(() => {
      agmaAnalyticsAdapter.enableAnalytics({
        ...agmaConfig,
      });
      server.respondWith('POST', INGEST_URL, [
        200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        '',
      ]);
    });

    afterEach(() => {
      agmaAnalyticsAdapter.auctionIds = [];
      if (agmaAnalyticsAdapter.timer) {
        clearTimeout(agmaAnalyticsAdapter.timer);
      }
      agmaAnalyticsAdapter.disableAnalytics();
    });

    it('should only send once per minute', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => ({
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendor: {
            consents: {
              1122: true,
            },
          },
        },
      }));
      const auction = {
        auctionId: generateUUID(),
      };

      events.emit(EVENTS.AUCTION_INIT, {
        auctionId: generateUUID('1'),
        auction,
      });

      clock.tick(200);

      events.emit(EVENTS.AUCTION_INIT, {
        auctionId: generateUUID('2'),
        auction,
      });
      events.emit(EVENTS.AUCTION_INIT, {
        auctionId: generateUUID('3'),
        auction,
      });
      events.emit(EVENTS.AUCTION_INIT, {
        auctionId: generateUUID('4'),
        auction,
      });

      clock.tick(900);

      const [request] = server.requests;
      const requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.equal(INGEST_URL);
      expect(requestBody).to.have.all.keys(extendedKey);
      expect(requestBody.triggerEvent).to.equal(EVENTS.AUCTION_INIT);
      expect(server.requests).to.have.length(1);
    });

    it('should send the extended payload with consent', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => ({
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendor: {
            consents: {
              1122: true,
            },
          },
        },
      }));
      const auction = {
        auctionId: generateUUID(),
      };

      events.emit(EVENTS.AUCTION_INIT, auction);
      clock.tick(1100);

      const [request] = server.requests;
      const requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.equal(INGEST_URL);
      expect(requestBody).to.have.all.keys(extendedKey);
      expect(requestBody.triggerEvent).to.equal(EVENTS.AUCTION_INIT);
      expect(requestBody.deviceWidth).to.equal(screen.width);
      expect(requestBody.deviceHeight).to.equal(screen.height);
      expect(server.requests).to.have.length(1);
      expect(agmaAnalyticsAdapter.auctionIds).to.have.length(0);
    });

    it('should send the non extended payload with no explicit consent', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => ({
        gdprApplies: true,
        consentString: 'consentDataString',
      }));

      const auction = {
        auctionId: generateUUID(),
      };

      events.emit(EVENTS.AUCTION_INIT, auction);
      clock.tick(1000);

      const [request] = server.requests;
      const requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.equal(INGEST_URL);
      expect(requestBody.triggerEvent).to.equal(EVENTS.AUCTION_INIT);
      expect(server.requests).to.have.length(1);
      expect(agmaAnalyticsAdapter.auctionIds).to.have.length(0);
    });

    it('should set the trigger Event', () => {
      sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => null);
      agmaAnalyticsAdapter.disableAnalytics();
      agmaAnalyticsAdapter.enableAnalytics({
        provider: 'agma',
        options: {
          code: 'test',
          triggerEvent: EVENTS.AUCTION_END
        },
      });
      const auction = {
        auctionId: generateUUID(),
      };

      events.emit(EVENTS.AUCTION_INIT, auction);
      events.emit(EVENTS.AUCTION_END, auction);
      clock.tick(1000);

      const [request] = server.requests;
      const requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.equal(INGEST_URL);
      expect(requestBody.auctionIds).to.have.length(1);
      expect(requestBody.triggerEvent).to.equal(EVENTS.AUCTION_END);
      expect(server.requests).to.have.length(1);
      expect(agmaAnalyticsAdapter.auctionIds).to.have.length(0);
    });
  });
});
