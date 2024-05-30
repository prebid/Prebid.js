import kargoAnalyticsAdapter from 'modules/kargoAnalyticsAdapter.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
let events = require('src/events');

describe('Kargo Analytics Adapter', function () {
  const adapterConfig = {
    provider: 'kargoAnalytics',
  };

  after(function () {
    kargoAnalyticsAdapter.disableAnalytics();
  });

  describe('main test flow', function () {
    beforeEach(function () {
      kargoAnalyticsAdapter.enableAnalytics(adapterConfig);
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('bid response data should send one request with auction ID, auction timeout, and response time', function() {
      const bidResponse = {
        bidder: 'kargo',
        auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f',
        timeToRespond: 192,
      };

      events.emit(EVENTS.AUCTION_INIT, {
        timeout: 1000
      });
      events.emit(EVENTS.BID_RESPONSE, bidResponse);

      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://krk.kargo.com/api/v1/event/auction-data?aid=66529d4c-8998-47c2-ab3e-5b953490b98f&ato=1000&rt=192&it=0');
    });
  });
});
