/*jslint white: true, es6: true, single: true*/
/*jshint esversion:6*/

import { expect } from 'chai';
import querystringify from 'querystringify';
import urlParse from 'url-parse';

import adloader from 'src/adloader';
import Adapter from 'src/adapters/hiromedia';
import bidmanager from 'src/bidmanager';
import { STATUS } from 'src/constants';
import * as utils from 'src/utils';

describe('hiromedia adapter', function () {

  const BIDDER_CODE = 'hiromedia';
  const DEFAULT_CALLBACK_NAME = 'hiromedia_callback';
  const DEFAULT_ENDPOINT = 'https://hb-rtb.ktdpublishers.com/bid/get';

  let adapter;
  let sandbox;
  let loadScriptStub;
  let addBidResponseStub;
  let hasValidBidRequestSpy;
  let placementId = 0;

  window.$$PREBID_GLOBAL$$ = window.$$PREBID_GLOBAL$$ || {};

  beforeEach(() => {

    adapter = new Adapter();
    sandbox = sinon.sandbox.create();

    // Used to spy on bid requests
    loadScriptStub = sandbox.stub(adloader, 'loadScript');

    // Used to spy on bid responses
    addBidResponseStub = sandbox.stub(bidmanager, 'addBidResponse');

    // Used to spy on bid validation
    hasValidBidRequestSpy = sandbox.spy(utils, 'hasValidBidRequest');

    placementId = 0;

  });

  afterEach(() => {
    sandbox.restore();
  });

  // Helper function that asserts that no bidding activity (requests nor responses)
  // was made during a test.
  const assertNoBids = () => {

    sinon.assert.notCalled(loadScriptStub);
    sinon.assert.notCalled(addBidResponseStub);

  };

  // Helper function to generate a 'mock' bid object
  const makePlacement = (size) => {

    placementId += 1;

    return {
      bidder: BIDDER_CODE,
      sizes: [size],
      params: {
        accountId: '1337'
      },
      placementCode: 'div-gpt-ad-12345-' + placementId
    };

  };

  // 300x250 are in the allowed size by default
  const tilePlacement = () => makePlacement([300, 250]);

  // anything else should have no bid by default
  const leaderPlacement = () => makePlacement([728, 90]);

  describe('callbids', () => {

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('tolerates empty arguments', () => {
      expect(adapter.callBids).to.not.throw(Error);
      assertNoBids();
    });

    it('tolerates empty params', () => {
      expect(adapter.callBids.bind(adapter, {})).to.not.throw(Error);
      assertNoBids();
    });

    it('tolerates empty bids', () => {
      expect(adapter.callBids.bind(adapter, {bids: []})).to.not.throw(Error);
      assertNoBids();
    });

    it('invokes a bid request per placement', () => {

      const expectedRequests = [{
        batchKey: [DEFAULT_ENDPOINT,'1337','300x250',''].join('-'),
        placementCode: 'div-gpt-ad-12345-1',
        selectedSize: '300x250'
      }, {
        batchKey: [DEFAULT_ENDPOINT,'1337','728x90',''].join('-'),
        placementCode: 'div-gpt-ad-12345-2',
        selectedSize: '728x90'
      }];

      const params = {
        bids: [tilePlacement(), leaderPlacement()]
      };

      adapter.callBids(params);
      sinon.assert.calledTwice(loadScriptStub);
      sinon.assert.notCalled(addBidResponseStub);
      sinon.assert.calledTwice(hasValidBidRequestSpy);

      expectedRequests.forEach(function(request, index) {

        expect(hasValidBidRequestSpy.returnValues[index]).to.be.equal(true);

        // validate request
        const bidRequest = loadScriptStub.getCall(index).args[0];
        const defaultBidUrl = urlParse(DEFAULT_ENDPOINT);
        const bidUrl = urlParse(bidRequest);
        const query = querystringify.parse(bidUrl.query);

        expect(bidUrl.hostname).to.equal(defaultBidUrl.hostname);
        expect(bidUrl.pathname).to.equal(defaultBidUrl.pathname);

        expect(query).to.have.property('adapterVersion').and.to.equal('3');
        expect(query).to.have.property('callback').and.to.equal('$$PREBID_GLOBAL$$.' + DEFAULT_CALLBACK_NAME);
        expect(query).to.have.property('batchKey').and.to.equal(request.batchKey);
        expect(query).to.have.property('placementCode').and.to.equal(request.placementCode);
        expect(query).to.have.property('accountId').and.to.equal('1337');
        expect(query).to.have.property('selectedSize').and.to.equal(request.selectedSize);
        expect(query).to.not.have.property('additionalSizes');
        expect(query).to.have.property('domain').and.to.equal(window.top.location.hostname);

      });

    });

    // Test additionalSizes parameter
    it('attaches multiple sizes to additionalSizes', () => {

      const placement = tilePlacement();

      // Append additional
      placement.sizes.push([300, 600]);
      placement.sizes.push([300, 900]);

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

      const bidRequest = loadScriptStub.getCall(0).args[0];
      const bidUrl = urlParse(bidRequest);
      const query = querystringify.parse(bidUrl.query);

      expect(query).to.have.property('selectedSize').and.to.equal('300x250');
      expect(query).to.have.property('additionalSizes').and.to.equal('300x600,300x900');

    });

    // Test `params.accountId` validation
    it('invalidates bids with no id', () => {

      const placement = tilePlacement();
      delete placement.params;

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.notCalled(loadScriptStub);
      sinon.assert.calledOnce(hasValidBidRequestSpy);
      expect(hasValidBidRequestSpy.returnValues[0]).to.be.equal(false);

    });

    // Test `params.bidUrl`
    it('accepts a custom bid endpoint url', () => {

      const placement = tilePlacement();
      placement.params.bidUrl = DEFAULT_ENDPOINT + '?someparam=value';

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

      const bidRequest = loadScriptStub.getCall(0).args[0];
      const defaultBidUrl = urlParse(DEFAULT_ENDPOINT);
      const bidUrl = urlParse(bidRequest);
      const query = querystringify.parse(bidUrl.query);

      expect(bidUrl.hostname).to.equal(defaultBidUrl.hostname);
      expect(bidUrl.pathname).to.equal(defaultBidUrl.pathname);

      expect(query).to.have.property('someparam').and.to.equal('value');

    });

    it('batches similar bid requests for similar sized placements', () => {

      const params = {
        bids: [tilePlacement(), tilePlacement()]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub); // and only once!

    });

  });

  describe('global response handler', () => {

    const getPbjs = () => window.$$PREBID_GLOBAL$$;
    const getResponseHandler = () => window.$$PREBID_GLOBAL$$[DEFAULT_CALLBACK_NAME];

    it('exists and is a function', () => {
      expect(getResponseHandler()).to.exist.and.to.be.a('function');
    });

    it('tolerates empty arguments', () => {
      expect(getResponseHandler()).to.not.throw(Error);
    });

    it('tolerates an empty response', () => {
      expect(getResponseHandler().bind(getPbjs(), {})).to.not.throw(Error);
    });

    // This test is coupled with `callBids`, this is done
    // to ensure that the response handler is able to
    // add bid responses for each placement with the same
    // batch key.
    // To do this, we have to have the internal state of
    // the adapter set up correctly.
    it('adds a bid reponse for each pending bid', () => {

      const expectedResponses = [{
        batchKey: [DEFAULT_ENDPOINT,'1337','300x250',''].join('-'),
        width: '300',
        height: '250',
        cpm: 0.4,
        ad: '<script src="ad.js"></script>'
      }, {
        batchKey: [DEFAULT_ENDPOINT,'1337','728x90',''].join('-'),
        width: '728',
        height: '90',
        cpm: 0.4,
        ad: '<script src="ad.js"></script>'
      }];


      // Instead of the dead stub defined in the top scope, we'll use
      // one that mocks a response.
      loadScriptStub.restore();
      let id = 0;
      const activeLoadScriptStub = sandbox.stub(adloader, 'loadScript', (url) => {
        const handler = getResponseHandler();
        handler(expectedResponses[id]);
        id += 1;
      });

      const params = {
        bids: [tilePlacement(), leaderPlacement()]
      };

      adapter.callBids(params);

      sinon.assert.calledTwice(activeLoadScriptStub);
      sinon.assert.calledTwice(addBidResponseStub);

      expectedResponses.forEach((expectedResponse, i) => {

        const placementCode = addBidResponseStub.getCall(i).args[0];
        const bidObject = addBidResponseStub.getCall(i).args[1];

        expect(placementCode).to.be.equal('div-gpt-ad-12345-' + (i + 1));

        expect(bidObject.getStatusCode()).to.be.equal(STATUS.GOOD);
        expect(bidObject).to.have.property('cpm').and.to.equal(expectedResponse.cpm);
        expect(bidObject).to.have.property('ad').and.to.equal(expectedResponse.ad);
        expect(bidObject).to.have.property('width').and.to.equal(expectedResponse.width);
        expect(bidObject).to.have.property('height').and.to.equal(expectedResponse.height);

      });

    });

    // We want to check that responses are added according to a sampling value,
    // this is possible by stubbing `Math.random`, to ensure the effect is
    // limited to the area we check, we create a self destructing stub which
    // restores itself once called.
    it('adds responses according to the sampling defined in the response', () => {

      const response = {
        batchKey: [DEFAULT_ENDPOINT,'1337','300x250',''].join('-'),
        cpm: 0.4,
        chance: 0.25,
        ad: '<script src="ad.js"></script>'
      };

      // List of "random" values. We check that the first two pass and the last
      // one is skipped.
      const randomValues = [0.2, 0.3];
      let randomIndex = 0;

      loadScriptStub.restore();
      const activeLoadScriptStub = sandbox.stub(adloader, 'loadScript', (url) => {
        const handler = getResponseHandler();

        const mathRandomStub = sandbox.stub(Math, 'random', function () {

          const randomValue = randomValues[randomIndex];

          randomIndex += 1;
          mathRandomStub.restore(); // self destruct on call

          return randomValue;

        });

        handler(response);

        mathRandomStub.restore();

      });

      const params = {
        bids: [tilePlacement()]
      };

      adapter.callBids(params);
      adapter.callBids(params);

      sinon.assert.calledTwice(addBidResponseStub);

      const firstBidObject = addBidResponseStub.getCall(0).args[1];
      const secondBidObject = addBidResponseStub.getCall(1).args[1];

      expect(firstBidObject.getStatusCode()).to.be.equal(STATUS.GOOD);
      expect(secondBidObject.getStatusCode()).to.be.equal(STATUS.NO_BID);

    });

  });

});
