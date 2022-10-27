import {newBidder, registerBidder, preloadBidderMappingFile, storage, isValid} from 'src/adapters/bidderFactory.js';
import adapterManager from 'src/adapterManager.js';
import * as ajax from 'src/ajax.js';
import { expect } from 'chai';
import { userSync } from 'src/userSync.js'
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import CONSTANTS from 'src/constants.json';
import * as events from 'src/events.js';
import {hook} from '../../../../src/hook.js';
import {auctionManager} from '../../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../../helpers/indexStub.js';
import { bidderSettings } from '../../../../src/bidderSettings.js';
import {decorateAdUnitsWithNativeParams} from '../../../../src/native.js';

const CODE = 'sampleBidder';
const MOCK_BIDS_REQUEST = {
  bids: [
    {
      bidId: 1,
      auctionId: 'first-bid-id',
      adUnitCode: 'mock/placement',
      params: {
        param: 5
      }
    },
    {
      bidId: 2,
      auctionId: 'second-bid-id',
      adUnitCode: 'mock/placement2',
      params: {
        badParam: 6
      }
    }
  ]
}

function onTimelyResponseStub() {

}

before(() => {
  hook.ready();
});

let wrappedCallback = config.callbackWithBidder(CODE);

describe('bidders created by newBidder', function () {
  let spec;
  let bidder;
  let addBidResponseStub;
  let doneStub;

  beforeEach(function () {
    spec = {
      code: CODE,
      isBidRequestValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub(),
      getUserSyncs: sinon.stub()
    };

    addBidResponseStub = sinon.stub();
    addBidResponseStub.reject = sinon.stub();
    doneStub = sinon.stub();
  });

  describe('when the ajax response is irrelevant', function () {
    let ajaxStub;
    let getConfigSpy;
    let aliasRegistryStub, aliasRegistry;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajax, 'ajax');
      addBidResponseStub.reset();
      getConfigSpy = sinon.spy(config, 'getConfig');
      doneStub.reset();
      aliasRegistry = {};
      aliasRegistryStub = sinon.stub(adapterManager, 'aliasRegistry');
      aliasRegistryStub.get(() => aliasRegistry);
    });

    afterEach(function () {
      ajaxStub.restore();
      getConfigSpy.restore();
      aliasRegistryStub.restore();
    });

    it('should let registerSyncs run with invalid alias and aliasSync enabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: true
        }
      });
      spec.code = 'fakeBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should let registerSyncs run with valid alias and aliasSync enabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: true
        }
      });
      spec.code = 'aliasBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should let registerSyncs run with invalid alias and aliasSync disabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: false
        }
      });
      spec.code = 'fakeBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should not let registerSyncs run with valid alias and aliasSync disabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: false
        }
      });
      spec.code = 'aliasBidder';
      const bidder = newBidder(spec);
      aliasRegistry = {[spec.code]: CODE};
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(false);
    });

    it('should handle bad bid requests gracefully', function () {
      const bidder = newBidder(spec);

      spec.getUserSyncs.returns([]);

      bidder.callBids({});
      bidder.callBids({ bids: 'nothing useful' }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.called).to.equal(false);
      expect(spec.buildRequests.called).to.equal(false);
      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should call buildRequests(bidRequest) the params are valid', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
    });

    it('should not call buildRequests the params are invalid', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.called).to.equal(false);
    });

    it('should filter out invalid bids before calling buildRequests', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.onFirstCall().returns(true);
      spec.isBidRequestValid.onSecondCall().returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
    });

    it('should make no server requests if the spec doesn\'t return any', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
    });

    it('should make the appropriate POST request', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'text/plain',
        withCredentials: true
      });
    });

    it('should make the appropriate POST request when options are passed', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      const options = { contentType: 'application/json' };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: url,
        data: data,
        options: options
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'application/json',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'GET',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request when options are passed', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      const opt = { withCredentials: false }
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'GET',
        url: url,
        data: data,
        options: opt
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: false
      });
    });

    it('should make multiple calls if the spec returns them', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([
        {
          method: 'POST',
          url: url,
          data: data
        },
        {
          method: 'GET',
          url: url,
          data: data
        }
      ]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledTwice).to.equal(true);
    });

    it('should not add bids for each placement code if no requests are given', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.callCount).to.equal(0);
    });

    it('should emit BEFORE_BIDDER_HTTP events before network requests', function () {
      const bidder = newBidder(spec);
      const req = {
        method: 'POST',
        url: 'test.url.com',
        data: { arg: 2 }
      };

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([req, req]);

      const eventEmitterSpy = sinon.spy(events, 'emit');
      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledTwice).to.equal(true);
      expect(eventEmitterSpy.getCalls()
        .filter(call => call.args[0] === CONSTANTS.EVENTS.BEFORE_BIDDER_HTTP)
      ).to.length(2);

      eventEmitterSpy.restore();
    });
  });

  describe('when the ajax call succeeds', function () {
    let ajaxStub;
    let userSyncStub;
    let logErrorSpy;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', { getResponseHeader: fakeResponse });
      });
      addBidResponseStub.reset();
      doneStub.resetBehavior();
      userSyncStub = sinon.stub(userSync, 'registerSync')
      logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(function () {
      ajaxStub.restore();
      userSyncStub.restore();
      utils.logError.restore();
    });

    it('should call spec.interpretResponse() with the response content', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.interpretResponse.calledOnce).to.equal(true);
      const response = spec.interpretResponse.firstCall.args[0]
      expect(response.body).to.equal('response body')
      expect(response.headers.get('some-header')).to.equal('headerContent');
      expect(spec.interpretResponse.firstCall.args[1]).to.deep.equal({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should call spec.interpretResponse() once for each request made', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([
        {
          method: 'POST',
          url: 'test.url.com',
          data: {}
        },
        {
          method: 'POST',
          url: 'test.url.com',
          data: {}
        },
      ]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.interpretResponse.calledTwice).to.equal(true);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should only add bids for valid adUnit code into the auction, even if the bidder doesn\'t bid on all of them', function () {
      const bidder = newBidder(spec);

      const bid = {
        creativeId: 'creative-id',
        requestId: '1',
        ad: 'ad-url.com',
        cpm: 0.5,
        height: 200,
        width: 300,
        adUnitCode: 'mock/placement',
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        bidderCode: 'sampleBidder',
        sampleBidder: {advertiserId: '12345', networkId: '111222'}
      };
      const bidderRequest = Object.assign({}, MOCK_BIDS_REQUEST);
      bidderRequest.bids[0].bidder = 'sampleBidder';
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(bidderRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      let bidObject = addBidResponseStub.firstCall.args[1];
      // checking the fields added by our code
      expect(bidObject.originalCpm).to.equal(bid.cpm);
      expect(bidObject.originalCurrency).to.equal(bid.currency);
      expect(doneStub.calledOnce).to.equal(true);
      expect(logErrorSpy.callCount).to.equal(0);
      expect(bidObject.meta).to.exist;
      expect(bidObject.meta).to.deep.equal({advertiserId: '12345', networkId: '111222'});
    });

    it('should call spec.getUserSyncs() with the response', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1].length).to.equal(1);
      expect(spec.getUserSyncs.firstCall.args[1][0].body).to.equal('response body');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers).to.have.property('get');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers.get).to.be.a('function');
    });

    it('should register usersync pixels', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);
      spec.getUserSyncs.returns([{
        type: 'iframe',
        url: 'usersync.com'
      }]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(userSyncStub.called).to.equal(true);
      expect(userSyncStub.firstCall.args[0]).to.equal('iframe');
      expect(userSyncStub.firstCall.args[1]).to.equal(spec.code);
      expect(userSyncStub.firstCall.args[2]).to.equal('usersync.com');
    });

    it('should logError and reject bid when required bid response params are missing', function () {
      const bidder = newBidder(spec);

      const bid = {
        requestId: '1',
        ad: 'ad-url.com',
        cpm: 0.5,
        height: 200,
        width: 300,
        placementCode: 'mock/placement'
      };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(logErrorSpy.calledOnce).to.equal(true);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
    });

    it('should logError and reject bid when required response params are undefined', function () {
      const bidder = newBidder(spec);

      const bid = {
        'ad': 'creative',
        'cpm': '1.99',
        'width': 300,
        'height': 250,
        'requestId': '1',
        'creativeId': 'some-id',
        'currency': undefined,
        'netRevenue': true,
        'ttl': 360
      };

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(logErrorSpy.calledOnce).to.equal(true);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
    });

    it('should require requestId from interpretResponse', () => {
      const bidder = newBidder(spec);
      const bid = {
        'ad': 'creative',
        'cpm': '1.99',
        'creativeId': 'some-id',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 360
      };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);
      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.be.false;
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
    });
  });

  describe('when the ajax call fails', function () {
    let ajaxStub;
    let callBidderErrorStub;
    let eventEmitterStub;
    let xhrErrorMock = {
      status: 500,
      statusText: 'Internal Server Error'
    };

    beforeEach(function () {
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        callbacks.error('ajax call failed.', xhrErrorMock);
      });
      callBidderErrorStub = sinon.stub(adapterManager, 'callBidderError');
      eventEmitterStub = sinon.stub(events, 'emit');
      addBidResponseStub.reset();
      doneStub.reset();
    });

    afterEach(function () {
      ajaxStub.restore();
      callBidderErrorStub.restore();
      eventEmitterStub.restore();
    });

    it('should not spec.interpretResponse()', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.interpretResponse.called).to.equal(false);
      expect(doneStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
      expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
      expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
      sinon.assert.calledWith(eventEmitterStub, CONSTANTS.EVENTS.BIDDER_ERROR, {
        error: xhrErrorMock,
        bidderRequest: MOCK_BIDS_REQUEST
      });
    });

    it('should not add bids for each adunit code into the auction', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.callCount).to.equal(0);
      expect(doneStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
      expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
      expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
      sinon.assert.calledWith(eventEmitterStub, CONSTANTS.EVENTS.BIDDER_ERROR, {
        error: xhrErrorMock,
        bidderRequest: MOCK_BIDS_REQUEST
      });
    });

    it('should call spec.getUserSyncs() with no responses', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
      expect(doneStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
      expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
      expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
      sinon.assert.calledWith(eventEmitterStub, CONSTANTS.EVENTS.BIDDER_ERROR, {
        error: xhrErrorMock,
        bidderRequest: MOCK_BIDS_REQUEST
      });
    });

    it('should call spec.getUserSyncs() with no responses', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
      expect(doneStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.calledOnce).to.equal(true);
      expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
      expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
      expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
      sinon.assert.calledWith(eventEmitterStub, CONSTANTS.EVENTS.BIDDER_ERROR, {
        error: xhrErrorMock,
        bidderRequest: MOCK_BIDS_REQUEST
      });
    });
  });
});

describe('registerBidder', function () {
  let registerBidAdapterStub;
  let aliasBidAdapterStub;

  beforeEach(function () {
    registerBidAdapterStub = sinon.stub(adapterManager, 'registerBidAdapter');
    aliasBidAdapterStub = sinon.stub(adapterManager, 'aliasBidAdapter');
  });

  afterEach(function () {
    registerBidAdapterStub.restore();
    aliasBidAdapterStub.restore();
  });

  function newEmptySpec() {
    return {
      code: CODE,
      isBidRequestValid: function() { },
      buildRequests: function() { },
      interpretResponse: function() { },
    };
  }

  it('should register a bidder with the adapterManager', function () {
    registerBidder(newEmptySpec());
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[0]).to.have.property('callBids');
    expect(registerBidAdapterStub.firstCall.args[0].callBids).to.be.a('function');

    expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
    expect(registerBidAdapterStub.firstCall.args[2]).to.be.undefined;
  });

  it('should register a bidder with the appropriate mediaTypes', function () {
    const thisSpec = Object.assign(newEmptySpec(), { supportedMediaTypes: ['video'] });
    registerBidder(thisSpec);
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[2]).to.deep.equal({supportedMediaTypes: ['video']});
  });

  it('should register bidders with the appropriate aliases', function () {
    const thisSpec = Object.assign(newEmptySpec(), { aliases: ['foo', 'bar'] });
    registerBidder(thisSpec);

    expect(registerBidAdapterStub.calledThrice).to.equal(true);

    // Make sure our later calls don't override the bidder code from previous calls.
    expect(registerBidAdapterStub.firstCall.args[0].getBidderCode()).to.equal(CODE);
    expect(registerBidAdapterStub.secondCall.args[0].getBidderCode()).to.equal('foo')
    expect(registerBidAdapterStub.thirdCall.args[0].getBidderCode()).to.equal('bar')

    expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
    expect(registerBidAdapterStub.secondCall.args[1]).to.equal('foo')
    expect(registerBidAdapterStub.thirdCall.args[1]).to.equal('bar')
  });

  it('should register alias with their gvlid', function() {
    const aliases = [
      {
        code: 'foo',
        gvlid: 1
      },
      {
        code: 'bar',
        gvlid: 2
      },
      {
        code: 'baz'
      }
    ]
    const thisSpec = Object.assign(newEmptySpec(), { aliases: aliases });
    registerBidder(thisSpec);

    expect(registerBidAdapterStub.getCall(1).args[0].getSpec().gvlid).to.equal(1);
    expect(registerBidAdapterStub.getCall(2).args[0].getSpec().gvlid).to.equal(2);
    expect(registerBidAdapterStub.getCall(3).args[0].getSpec().gvlid).to.equal(undefined);
  })

  it('should register alias with skipPbsAliasing', function() {
    const aliases = [
      {
        code: 'foo',
        skipPbsAliasing: true
      },
      {
        code: 'bar',
        skipPbsAliasing: false
      },
      {
        code: 'baz'
      }
    ]
    const thisSpec = Object.assign(newEmptySpec(), { aliases: aliases });
    registerBidder(thisSpec);

    expect(registerBidAdapterStub.getCall(1).args[0].getSpec().skipPbsAliasing).to.equal(true);
    expect(registerBidAdapterStub.getCall(2).args[0].getSpec().skipPbsAliasing).to.equal(false);
    expect(registerBidAdapterStub.getCall(3).args[0].getSpec().skipPbsAliasing).to.equal(undefined);
  })
})

describe('validate bid response: ', function () {
  let spec;
  let indexStub, adUnits, bidderRequests;
  let addBidResponseStub;
  let doneStub;
  let ajaxStub;
  let logErrorSpy;

  let bids = [{
    'ad': 'creative',
    'cpm': '1.99',
    'width': 300,
    'height': 250,
    'requestId': '1',
    'creativeId': 'some-id',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 360
  }];

  beforeEach(function () {
    spec = {
      code: CODE,
      isBidRequestValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub(),
    };

    spec.isBidRequestValid.returns(true);
    spec.buildRequests.returns({
      method: 'POST',
      url: 'test.url.com',
      data: {}
    });

    addBidResponseStub = sinon.stub();
    addBidResponseStub.reject = sinon.stub();
    doneStub = sinon.stub();
    ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
      const fakeResponse = sinon.stub();
      fakeResponse.returns('headerContent');
      callbacks.success('response body', { getResponseHeader: fakeResponse });
    });
    logErrorSpy = sinon.spy(utils, 'logError');
    indexStub = sinon.stub(auctionManager, 'index');
    adUnits = [];
    bidderRequests = [];
    indexStub.get(() => stubAuctionIndex({adUnits: adUnits, bidderRequests: bidderRequests}))
  });

  afterEach(function () {
    ajaxStub.restore();
    logErrorSpy.restore();
    indexStub.restore;
  });

  if (FEATURES.NATIVE) {
    it('should add native bids that do have required assets', function () {
      adUnits = [{
        transactionId: 'au',
        nativeParams: {
          title: {'required': true},
        }
      }]
      decorateAdUnitsWithNativeParams(adUnits);
      let bidRequest = {
        bids: [{
          bidId: '1',
          auctionId: 'first-bid-id',
          adUnitCode: 'mock/placement',
          transactionId: 'au',
          params: {
            param: 5
          },
          mediaType: 'native',
        }]
      };

      let bids1 = Object.assign({},
        bids[0],
        {
          'mediaType': 'native',
          'native': {
            'title': 'Native Creative',
            'clickUrl': 'https://www.link.example',
          }
        }
      );

      const bidder = newBidder(spec);

      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should not add native bids that do not have required assets', function () {
      adUnits = [{
        transactionId: 'au',
        nativeParams: {
          title: {'required': true},
        },
      }];
      decorateAdUnitsWithNativeParams(adUnits);
      let bidRequest = {
        bids: [{
          bidId: '1',
          auctionId: 'first-bid-id',
          adUnitCode: 'mock/placement',
          transactionId: 'au',
          params: {
            param: 5
          },
          mediaType: 'native',
        }]
      };
      let bids1 = Object.assign({},
        bids[0],
        {
          bidderCode: CODE,
          mediaType: 'native',
          native: {
            title: undefined,
            clickUrl: 'https://www.link.example',
          }
        }
      );

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
      expect(logErrorSpy.calledWithMatch('Ignoring bid: Native bid missing some required properties.')).to.equal(true);
    });
  }

  it('should add bid when renderer is present on outstream bids', function () {
    adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {context: 'outstream'}
      }
    }]
    let bidRequest = {
      bids: [{
        bidId: '1',
        auctionId: 'first-bid-id',
        transactionId: 'au',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
      }]
    };

    let bids1 = Object.assign({},
      bids[0],
      {
        bidderCode: CODE,
        mediaType: 'video',
        renderer: {render: () => true, url: 'render.js'},
      }
    );

    const bidder = newBidder(spec);

    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  it('should add banner bids that have no width or height but single adunit size', function () {
    let bidRequest = {
      bids: [{
        bidder: CODE,
        bidId: '1',
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
        sizes: [[300, 250]],
      }]
    };
    bidderRequests = [bidRequest];
    let bids1 = Object.assign({},
      bids[0],
      {
        width: undefined,
        height: undefined
      }
    );

    const bidder = newBidder(spec);

    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  describe(' Check for alternateBiddersList ', function() {
    let bidRequest;
    let bids1;
    let logWarnSpy;
    let bidderSettingStub, aliasRegistryStub;
    let aliasRegistry;

    beforeEach(function () {
      bidRequest = {
        bids: [{
          bidId: '1',
          bidder: CODE,
          auctionId: 'first-bid-id',
          adUnitCode: 'mock/placement',
          transactionId: 'au',
        }]
      };

      bids1 = Object.assign({},
        bids[0],
        {
          bidderCode: 'validalternatebidder',
          adapterCode: 'knownadapter1'
        }
      );
      logWarnSpy = sinon.spy(utils, 'logWarn');
      bidderSettingStub = sinon.stub(bidderSettings, 'get');
      aliasRegistry = {};
      aliasRegistryStub = sinon.stub(adapterManager, 'aliasRegistry');
      aliasRegistryStub.get(() => aliasRegistry);
    });

    afterEach(function () {
      logWarnSpy.restore();
      bidderSettingStub.restore();
      aliasRegistryStub.restore();
    });

    it('should log warning when bidder is unknown and allowAlternateBidderCodes flag is false', function () {
      bidderSettingStub.returns(false);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
      expect(logWarnSpy.callCount).to.equal(1);
    });

    it('should reject the bid, when allowAlternateBidderCodes flag is undefined (default should be false)', function () {
      bidderSettingStub.returns(undefined);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
    });

    it('should log warning when the particular bidder is not specified in allowedAlternateBidderCodes and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['invalidAlternateBidder02']);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
      expect(logWarnSpy.callCount).to.equal(1);
    });

    it('should accept the bid, when allowedAlternateBidderCodes is empty and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns();

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(0);
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should accept the bid, when allowedAlternateBidderCodes is marked as * and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['*']);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(0);
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should accept the bid, when allowedAlternateBidderCodes is marked as * (with space) and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns([' * ']);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(0);
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should not accept the bid, when allowedAlternateBidderCodes is marked as empty array and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns([]);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
      expect(logWarnSpy.callCount).to.equal(1);
    });

    it('should accept the bid, when allowedAlternateBidderCodes contains bidder name and allowAlternateBidderCodes flag is true', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
      bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['validAlternateBidder']);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(0);
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should not accept the bid, when bidder is an alias but bidderSetting is missing for the bidder. It should fallback to standard setting and reject the bid', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(false);
      aliasRegistry = {'validAlternateBidder': CODE};

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(logWarnSpy.callCount).to.equal(1);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
    });

    it('should not accept the bid, when bidderSetting is missing for the bidder. It should fallback to standard setting and reject the bid', function () {
      bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(false);

      const bidder = newBidder(spec);
      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.called).to.equal(false);
      expect(addBidResponseStub.reject.calledOnce).to.be.true;
      expect(logWarnSpy.callCount).to.equal(1);
    });
  });

  describe('when interpretResponse returns BidderAuctionResponse', function() {
    const bidRequest = {
      bids: [{
        bidId: '1',
        bidder: CODE,
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        transactionId: 'au',
      }]
    };
    const fledgeAuctionConfig = {
      bidId: '1',
    }
    describe('when response has FLEDGE auction config', function() {
      let logInfoSpy;

      beforeEach(function () {
        logInfoSpy = sinon.spy(utils, 'logInfo');
      });

      afterEach(function () {
        logInfoSpy.restore();
      });

      it('should unwrap bids', function() {
        const bidder = newBidder(spec);
        spec.interpretResponse.returns({
          bids: bids,
          fledgeAuctionConfigs: []
        });
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      });

      it('should call fledgeManager with FLEDGE configs', function() {
        const bidder = newBidder(spec);
        spec.interpretResponse.returns({
          bids: bids,
          fledgeAuctionConfigs: [fledgeAuctionConfig]
        });
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(logInfoSpy.calledOnce).to.equal(true);
        expect(logInfoSpy.firstCall.args[1]).to.equal(fledgeAuctionConfig);
        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      })

      it('should call fledgeManager with FLEDGE configs even if no bids returned', function() {
        const bidder = newBidder(spec);
        spec.interpretResponse.returns({
          bids: [],
          fledgeAuctionConfigs: [fledgeAuctionConfig]
        });
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(logInfoSpy.calledOnce).to.equal(true);
        expect(logInfoSpy.firstCall.args[1]).to.equal(fledgeAuctionConfig);
        expect(addBidResponseStub.calledOnce).to.equal(false);
      })
    })
  })
});

describe('preload mapping url hook', function() {
  let fakeTranslationServer;
  let getLocalStorageStub;
  let adapterManagerStub;
  let adUnits = [{
    code: 'midroll_1',
    mediaTypes: {
      video: {
        context: 'adpod'
      }
    },
    bids: [
      {
        bidder: 'sampleBidder1',
        params: {
          placementId: 14542875,
        }
      }
    ]
  }];

  beforeEach(function () {
    fakeTranslationServer = server;
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    adapterManagerStub = sinon.stub(adapterManager, 'getBidAdapter');
    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': true
      }
    });
    adapterManagerStub.withArgs('sampleBidder1').returns({
      getSpec: function() {
        return {
          'getMappingFileInfo': function() {
            return {
              url: 'http://sample.com',
              refreshInDays: 7,
              key: `sampleBidder1MappingFile`
            }
          }
        }
      }
    });
  });

  afterEach(function() {
    getLocalStorageStub.restore();
    adapterManagerStub.restore();
    config.resetConfig();
  });

  it('should preload mapping url file', function() {
    getLocalStorageStub.returns(null);
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(1);
  });

  it('should preload mapping url file for all bidders', function() {
    let adUnits = [{
      code: 'midroll_1',
      mediaTypes: {
        video: {
          context: 'adpod'
        }
      },
      bids: [
        {
          bidder: 'sampleBidder1',
          params: {
            placementId: 14542875,
          }
        },
        {
          bidder: 'sampleBidder2',
          params: {
            placementId: 123456,
          }
        }
      ]
    }];
    getLocalStorageStub.returns(null);
    adapterManagerStub.withArgs('sampleBidder2').returns({
      getSpec: function() {
        return {
          'getMappingFileInfo': function() {
            return {
              url: 'http://sample.com',
              refreshInDays: 7,
              key: `sampleBidder2MappingFile`
            }
          }
        }
      }
    });
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(2);

    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': false
      }
    });
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(2);
  });

  it('should make ajax call to update mapping file if data found in localstorage is expired', function() {
    let clock = sinon.useFakeTimers(utils.timestamp());
    getLocalStorageStub.returns(JSON.stringify({
      lastUpdated: utils.timestamp() - 8 * 24 * 60 * 60 * 1000,
      mapping: {
        'iab-1': '1'
      }
    }));
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(1);
    clock.restore();
  });

  it('should not make ajax call to update mapping file if data found in localstorage and is not expired', function () {
    let clock = sinon.useFakeTimers(utils.timestamp());
    getLocalStorageStub.returns(JSON.stringify({
      lastUpdated: utils.timestamp(),
      mapping: {
        'iab-1': '1'
      }
    }));
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(0);
    clock.restore();
  });
});

describe('bid response isValid', () => {
  describe('size check', () => {
    let req, index;

    beforeEach(() => {
      req = {
        ...MOCK_BIDS_REQUEST.bids[0],
        mediaTypes: {
          banner: {
            sizes: [[1, 2], [3, 4]]
          }
        }
      }
    });

    function mkResponse(width, height) {
      return {
        requestId: req.bidId,
        width,
        height,
        cpm: 1,
        ttl: 60,
        creativeId: '123',
        netRevenue: true,
        currency: 'USD',
        mediaType: 'banner',
      }
    }

    function checkValid(bid) {
      return isValid('au', bid, {index: stubAuctionIndex({bidRequests: [req]})});
    }

    it('should succeed when response has a size that was in request', () => {
      expect(checkValid(mkResponse(3, 4))).to.be.true;
    });
  })
});
