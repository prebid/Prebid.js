import adapterManager from '../../../src/adapterManager.js';
import hadronAnalyticsAdapter from '../../../modules/hadronAnalyticsAdapter.js';
import { expect } from 'chai';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { generateUUID } from '../../../src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('Hadron analytics adapter', () => {
  beforeEach(() => {
    hadronAnalyticsAdapter.enableAnalytics({
      options: {
        partnerId: 12349,
        eventsToTrack: ['auctionInit', 'auctionEnd', 'bidWon',
          'bidderDone', 'requestBids', 'addAdUnits', 'setTargeting', 'adRenderFailed',
          'bidResponse', 'bidTimeout', 'bidRequested', 'bidAdjustment', 'nonExistingEvent'
        ],
      }
    });
  });

  afterEach(() => {
    hadronAnalyticsAdapter.disableAnalytics();
  });

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('hadronAnalytics');
    expect(adapter).to.exist;
    expect(adapter.gvlid).to.be.a('number');
    expect(adapter.adapter).to.equal(hadronAnalyticsAdapter);
  });

  it('tolerates undefined or empty config', () => {
    hadronAnalyticsAdapter.enableAnalytics(undefined);
    hadronAnalyticsAdapter.enableAnalytics({});
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
    assert(eventTypes.indexOf(EVENTS.AUCTION_END) > -1);
    hadronAnalyticsAdapter.disableAnalytics();
  });
});
