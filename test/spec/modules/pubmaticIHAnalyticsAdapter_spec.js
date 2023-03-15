import pubmaticIHAnalyticsAdapter, { getMetadata } from 'modules/pubmaticIHAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';

let events = require('src/events');
let utils = require('src/utils');

window.IHPWT = window.IHPT || {};
window.IHPWT.ihAnalyticsAdapterExpiry = 7;

const {
  EVENTS: {
    IH_INIT
  }
} = CONSTANTS;

describe('pubmatic analytics adapter', function () {
  let sandbox;
  let xhr;
  let requests;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);

    sandbox.stub(events, 'getEvents').returns([]);

    clock = sandbox.useFakeTimers(1519767013781);
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should require publisherId', function () {
    sandbox.stub(utils, 'logError');
    pubmaticIHAnalyticsAdapter.enableAnalytics({
      options: {}
    });
    expect(utils.logError.called).to.equal(true);
  });

  /* describe('when handling events', function() {
    beforeEach(function () {
      requests = [];
      sandbox = sinon.sandbox.create();
      sandbox.stub('executeIHLoggerCall').returns({});
      pubmaticIHAnalyticsAdapter.enableAnalytics({
        options: {
          publisherId: 9999,
          profileId: 1111,
          profileVersionId: 20,
          identityOnly: 1
        }
      });
    });

    afterEach(function () {
      window.PWT = {};
      pubmaticIHAnalyticsAdapter.disableAnalytics();
    });

    it('IH_INIT: Logger fired when identity hub initialises', function() {
      events.emit(IH_INIT, {});

      expect(executeIHLoggerCall.called).to.equal(true);
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
    });
  }); */
});
