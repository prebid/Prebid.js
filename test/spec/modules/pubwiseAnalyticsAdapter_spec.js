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
      site: ['b1ccf317-a6fc-428d-ba69-0c9c208aa61c'],
      custom: {'c_script_type': 'test-script-type', 'c_host': 'test-host', 'c_slot1': 'test-slot1', 'c_slot2': 'test-slot2', 'c_slot3': 'test-slot3', 'c_slot4': 'test-slot4'}
    }
  };
  mock.AUCTION_INIT = {auctionId: '53c35d77-bd62-41e7-b920-244140e30c77'};
  mock.AUCTION_INIT_EXTRAS = {
    auctionId: '53c35d77-bd62-41e7-b920-244140e30c77',
    adUnitCodes: 'not empty',
    adUnits: '',
    bidderRequests: ['0'],
    bidsReceived: '0',
    config: {test: 'config'},
    noBids: 'no bids today',
    winningBids: 'winning bids',
    extraProp: 'extraProp retained'
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(events, 'getEvents').returns([]);

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);
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
      pubwiseAnalytics.enableAnalytics(mock.DEFAULT_PW_CONFIG);

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
      pubwiseAnalytics.enableAnalytics(mock.DEFAULT_PW_CONFIG);

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
      // console.log(data.metaData);            
      expect(data.metaData, 'metaData property').to.exist;
      expect(data.metaData.pbjs_version, 'pbjs version').to.equal('$prebid.version$')
      expect(data.metaData.session_id, 'session id').not.to.be.empty
      expect(data.metaData.activation_id, 'activation id').not.to.be.empty

      // check custom metadata slots
      expect(data.metaData.c_script_type, 'c_script_type property').to.exist;
      expect(data.metaData.c_script_type, 'c_script_type').not.to.be.empty
      expect(data.metaData.c_script_type).to.equal('test-script-type');

      expect(data.metaData.c_host, 'c_host property').to.exist;
      expect(data.metaData.c_host, 'c_host').not.to.be.empty
      expect(data.metaData.c_host).to.equal('test-host');

      expect(data.metaData.c_slot1, 'c_slot1 property').to.exist;
      expect(data.metaData.c_slot1, 'c_slot1').not.to.be.empty
      expect(data.metaData.c_slot1).to.equal('test-slot1');

      expect(data.metaData.c_slot2, 'c_slot1 property').to.exist;
      expect(data.metaData.c_slot2, 'c_slot1').not.to.be.empty
      expect(data.metaData.c_slot2).to.equal('test-slot2');

      expect(data.metaData.c_slot3, 'c_slot1 property').to.exist;
      expect(data.metaData.c_slot3, 'c_slot1').not.to.be.empty
      expect(data.metaData.c_slot3).to.equal('test-slot3');

      expect(data.metaData.c_slot4, 'c_slot1 property').to.exist;
      expect(data.metaData.c_slot4, 'c_slot1').not.to.be.empty
      expect(data.metaData.c_slot4).to.equal('test-slot4');

      // check for version info too
      expect(data.metaData.pw_version, 'pw_version property').to.exist;
      expect(data.metaData.pbjs_version, 'pbjs_version property').to.exist;
    });

    it('should remove extra data on init', function () {
      pubwiseAnalytics.enableAnalytics(mock.DEFAULT_PW_CONFIG);

      // sent
      events.emit(constants.EVENTS.AUCTION_INIT, mock.AUCTION_INIT_EXTRAS);
      // force flush
      clock.tick(500);

      /* check for critical values */
      let request = requests[0];
      let data = JSON.parse(request.requestBody);

      // check the basics
      expect(data.eventList, 'eventList property').to.exist;
      expect(data.eventList[0], 'eventList property').to.exist;
      expect(data.eventList[0].args, 'eventList property').to.exist;

      // eslint-disable-next-line
      // console.log(data.eventList[0].args);

      let eventArgs = data.eventList[0].args;
      // the props we want removed should go away
      expect(eventArgs.adUnitCodes, 'adUnitCodes property').not.to.exist;
      expect(eventArgs.bidderRequests, 'adUnitCodes property').not.to.exist;
      expect(eventArgs.bidsReceived, 'adUnitCodes property').not.to.exist;
      expect(eventArgs.config, 'adUnitCodes property').not.to.exist;
      expect(eventArgs.noBids, 'adUnitCodes property').not.to.exist;
      expect(eventArgs.winningBids, 'adUnitCodes property').not.to.exist;

      // the extra prop should still exist
      expect(eventArgs.extraProp, 'adUnitCodes property').to.exist;
    });
  });
});
