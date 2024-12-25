import symitriAnalyticsAdapter from 'modules/symitriAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';

let events = require('src/events');

describe('symitri analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
  });

  describe('track', function () {
    let initOptionsValid = {
      apiAuthToken: 'TOKEN1234'
    };
    let initOptionsInValid = {
    };

    let bidWon = {
      'bidderCode': 'appnexus',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '393976d8770041',
      'requestId': '263efc09896d0c',
      'mediaType': 'banner',
      'source': 'client',
      'cpm': 0.5,
      'creativeId': 96846035,
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 300,
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'originalCpm': 0.5,
      'originalCurrency': 'USD',
      'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
      'responseTimestamp': 1576823894050,
      'requestTimestamp': 1576823893838,
      'bidder': 'appnexus',
      'timeToRespond': 212,
      'status': 'rendered'
    };

    adapterManager.registerAnalyticsAdapter({
      code: 'symitri',
      adapter: symitriAnalyticsAdapter
    });

    afterEach(function () {
      symitriAnalyticsAdapter.disableAnalytics();
    });

    it('Test with valid apiAuthToken', function () {
      adapterManager.enableAnalytics({
        provider: 'symitri',
        options: initOptionsValid
      });
      events.emit(EVENTS.BID_WON, bidWon);
      expect(server.requests.length).to.equal(1);
    });

    it('Test with missing apiAuthToken', function () {
      adapterManager.enableAnalytics({
        provider: 'symitri',
        options: initOptionsInValid
      });
      events.emit(EVENTS.BID_WON, bidWon);
      expect(server.requests.length).to.equal(0);
    });

    it('Test correct winning bid is sent to server', function () {
      adapterManager.enableAnalytics({
        provider: 'symitri',
        options: initOptionsValid
      });
      events.emit(EVENTS.BID_WON, bidWon);
      expect(server.requests.length).to.equal(1);
      let winEventData = JSON.parse(server.requests[0].requestBody);
      expect(winEventData).to.deep.equal(bidWon);
      let authToken = server.requests[0].requestHeaders['Authorization'];
      expect(authToken).to.equal(initOptionsValid.apiAuthToken);
    });
  });
});
