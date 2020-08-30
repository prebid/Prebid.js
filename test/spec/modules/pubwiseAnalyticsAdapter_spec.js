import { expect } from 'chai';
import pubwiseAnalytics from 'modules/pubwiseAnalyticsAdapter.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('PubWise Prebid Analytics', function () {
  let requests;
  let sandbox;
  let xhr;

  after(function () {
    pubwiseAnalytics.disableAnalytics();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('should catch all events', function () {
      sinon.spy(pubwiseAnalytics, 'track');

      adapterManager.registerAnalyticsAdapter({
        code: 'pubwiseanalytics',
        adapter: pubwiseAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'pubwiseanalytics',
        options: {
          site: ['test-test-test-test']
        }
      });

      // sent
      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});
      events.emit(constants.EVENTS.AD_RENDER_FAILED, {});
      events.emit(constants.EVENTS.TCF2_ENFORCEMENT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      // skipped
      events.emit(constants.EVENTS.BID_TIMEOUT, {});

      /* testing for 6 calls, including the 2 we're not currently tracking */
      sinon.assert.callCount(pubwiseAnalytics.track, 7);

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
