import adapterManager from '../../../src/adapterManager.js';
import growthCodeAnalyticsAdapter from '../../../modules/growthCodeAnalyticsAdapter.js';
import { expect } from 'chai';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { generateUUID } from '../../../src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('growthCode analytics adapter', () => {
  beforeEach(() => {
    growthCodeAnalyticsAdapter.enableAnalytics({
      provider: 'growthCodeAnalytics',
      options: {
        pid: 'TEST01',
        trackEvents: [
          'auctionInit',
          'auctionEnd',
          'bidAdjustment',
          'bidTimeout',
          'bidTimeout',
          'bidRequested',
          'bidResponse',
          'setTargeting',
          'requestBids',
          'addAdUnits',
          'noBid',
          'bidWon',
          'bidderDone']
      }
    });
  });

  afterEach(() => {
    growthCodeAnalyticsAdapter.disableAnalytics();
  });

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('growthCodeAnalytics');
    expect(adapter).to.exist;
    expect(adapter.adapter).to.equal(growthCodeAnalyticsAdapter);
  });

  it('tolerates undefined or empty config', () => {
    growthCodeAnalyticsAdapter.enableAnalytics(undefined);
    growthCodeAnalyticsAdapter.enableAnalytics({});
  });

  it('sends auction end events to the backend', () => {
    const auction = {
      auctionId: generateUUID(),
      adUnits: [{
        code: 'usr1234',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600], [728, 90]]
          }
        },
        adUnitCodes: ['usr1234']
      }],
    };
    events.emit(EVENTS.AUCTION_END, auction);
    assert(server.requests.length > 0)
    const body = JSON.parse(server.requests[0].requestBody);
    var eventTypes = [];
    body.events.forEach(e => eventTypes.push(e.eventType));
    assert(eventTypes.length > 0)
    growthCodeAnalyticsAdapter.disableAnalytics();
  });
});
