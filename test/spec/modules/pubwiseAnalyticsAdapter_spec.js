import { expect } from 'chai';
import pubwiseAnalytics from 'modules/pubwiseAnalyticsAdapter.js';
import {server} from 'test/mocks/xhr.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('PubWise Prebid Analytics', function () {
  let requests;
  let sandbox;
  let xhr;
  let clock;
  let mock = {};

  mock.DEFAULT_PW_CONFIG = {
    provider: 'pubwiseanalytics',
    options: {
      site: ['test-test-test-test']
    }
  };
  mock.AUCTION_INIT = {auctionId: '53c35d77-bd62-41e7-b920-244140e30c77'};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(events, 'getEvents').returns([]);

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);

    pubwiseAnalytics.enableAnalytics(mock.DEFAULT_PW_CONFIG);
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
    pubwiseAnalytics.disableAnalytics();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      requests = [];
    });

    it('should catch all events', function () {
      sandbox.spy(pubwiseAnalytics, 'track');

      // sent
      events.emit(constants.EVENTS.AUCTION_INIT, mock.AUCTION_INIT);
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});
      events.emit(constants.EVENTS.AD_RENDER_FAILED, {});
      events.emit(constants.EVENTS.TCF2_ENFORCEMENT, {});
      events.emit(constants.EVENTS.BID_TIMEOUT, {});

      // forces flush
      events.emit(constants.EVENTS.AUCTION_END, {});

      // eslint-disable-next-line
      //console.log(requests);   

      /* testing for 6 calls, including the 2 we're not currently tracking */
      sandbox.assert.callCount(pubwiseAnalytics.track, 7);
    });

    it('should initialize the auction properly', function () {
      // sent
      events.emit(constants.EVENTS.AUCTION_INIT, mock.AUCTION_INIT);
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});
      // force flush
      clock.tick(500);

      /* check for critical values */
      let request = requests[0];
      let data = JSON.parse(request.requestBody);
      // eslint-disable-next-line
      // console.log(data.metaData.pbjs_version);            
      expect(data.metaData, 'metaData property').to.exist;
      expect(data.metaData.pbjs_version, 'pbjs version').to.equal('$prebid.version$')
      expect(data.metaData.session_id, 'session id').not.to.be.empty
      expect(data.metaData.activation_id, 'activation id').not.to.be.empty
    });
  });
});
