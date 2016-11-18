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
  const placement = (size) => {

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
  const allowedPlacement = () => placement([300, 250]);

  // anything else should have no bid by default
  const unallowedPlacement = () => placement([728, 90]);

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

    it('responds with status `NO_BID` for placements that are not in the allowed size', () => {

      const params = {
        bids: [unallowedPlacement()]
      };

      adapter.callBids(params);
      sinon.assert.notCalled(loadScriptStub);
      sinon.assert.calledOnce(addBidResponseStub);

      const placementCode = addBidResponseStub.getCall(0).args[0];
      const bidObject = addBidResponseStub.getCall(0).args[1];
      expect(placementCode).to.be.equal('div-gpt-ad-12345-1');
      expect(bidObject.getStatusCode()).to.be.equal(STATUS.NO_BID);

    });

    it('invokes a single bid request for a single valid placement', () => {

      const params = {
        bids: [allowedPlacement()]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);
      sinon.assert.notCalled(addBidResponseStub);
      sinon.assert.calledOnce(hasValidBidRequestSpy);

      expect(hasValidBidRequestSpy.returnValues[0]).to.be.equal(true);

      // validate request
      const bidRequest = loadScriptStub.getCall(0).args[0];
      const defaultBidUrl = urlParse(DEFAULT_ENDPOINT);
      const bidUrl = urlParse(bidRequest);
      const query = querystringify.parse(bidUrl.query);

      expect(bidUrl.hostname).to.equal(defaultBidUrl.hostname);
      expect(bidUrl.pathname).to.equal(defaultBidUrl.pathname);

      // adapter version
      expect(query).to.have.property('adapterVersion');

      // callback
      expect(query).to.have.property('callback').and.to.equal('$$PREBID_GLOBAL$$.' + DEFAULT_CALLBACK_NAME);

      // batch key
      expect(query).to.have.property('batchKey').and.to.equal([DEFAULT_ENDPOINT,'1337','300x250'].join('-'));

      // placementCode
      expect(query).to.have.property('placementCode').and.to.equal('div-gpt-ad-12345-1');

      // account id
      expect(query).to.have.property('accountId').and.to.equal('1337');

      // selectedSize
      expect(query).to.have.property('selectedSize').and.to.equal('300x250');

      // bid request size list
      expect(query).to.have.property('placementSizes').and.to.equal('300x250');

      // page url domain (hostname)
      expect(query).to.have.property('domain').and.to.equal(window.top.location.hostname);

    });

    // Test `params.allowedSize` default
    it('finds an allowed size in a placement with multiple sizes', () => {

      const placement = allowedPlacement();

      // add an non-allowed size, should be skipped
      placement.sizes.unshift([300, 600]);

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

      const bidRequest = loadScriptStub.getCall(0).args[0];
      const bidUrl = urlParse(bidRequest);
      const query = querystringify.parse(bidUrl.query);

      expect(query).to.have.property('placementSizes').and.to.equal('300x600,300x250');

    });

    // Test `params.sizeTolerance` default
    it('tolerates sizes in default size tolerance range', () => {

      const placement = unallowedPlacement();
      placement.sizes.unshift([305, 245]);

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

      const bidRequest = loadScriptStub.getCall(0).args[0];
      const bidUrl = urlParse(bidRequest);
      const query = querystringify.parse(bidUrl.query);

      expect(query).to.have.property('selectedSize').and.to.equal('305x245');

    });

    // Test `params.allowedSize` negative match
    it('accepts a custom allowed size per placement which makes no bid if no match is found', () => {

      const placement = allowedPlacement();
      placement.params.allowedSize = [728, 90];

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.notCalled(loadScriptStub);

    });

    // Test `params.allowedSize` match
    it('accepts a custom allowed size per placement which bids if a match is found', () => {

      const placement = unallowedPlacement();
      placement.params.allowedSize = [728, 90];

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

    });

    // Test `params.sizeTolerance` negative match
    it('accepts a custom size tolerance which makes no bid if no match is found', () => {

      const placement = unallowedPlacement();
      placement.sizes.unshift([280, 270]);
      placement.params.sizeTolerance = 10;

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.notCalled(loadScriptStub);

    });

    // Test `params.sizeTolerance` match
    it('accepts a custom size tolerance which makes a bid if a match is found', () => {

      const placement = unallowedPlacement();
      placement.sizes.unshift([280, 270]);
      placement.params.sizeTolerance = 20;

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      sinon.assert.calledOnce(loadScriptStub);

    });

    // Test `params.accountId` validation
    it('invalidates bids with no id', () => {

      const placement = allowedPlacement();
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

      const placement = allowedPlacement();
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
        bids: [allowedPlacement(), allowedPlacement()]
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

      const response = {
        batchKey: [DEFAULT_ENDPOINT,'1337','300x250'].join('-'),
        cpm: 0.4,
        ad: '<script src="ad.js"></script>'
      };

      // Instead of the dead stub defined in the top scope, we'll use
      // one that mocks a response.
      loadScriptStub.restore();
      const activeLoadScriptStub = sandbox.stub(adloader, 'loadScript', (url) => {
        const handler = getResponseHandler();
        handler(response);
      });

      const params = {
        bids: [allowedPlacement(), allowedPlacement()]
      };

      adapter.callBids(params);

      // single request but two responses
      sinon.assert.calledOnce(activeLoadScriptStub);
      sinon.assert.calledTwice(addBidResponseStub);

      const placementCode = addBidResponseStub.getCall(0).args[0];
      const secondPlacementCode = addBidResponseStub.getCall(1).args[0];

      const bidObject = addBidResponseStub.getCall(0).args[1];
      const secondBidObject = addBidResponseStub.getCall(1).args[1];

      expect(placementCode).to.be.equal('div-gpt-ad-12345-1');
      expect(secondPlacementCode).to.be.equal('div-gpt-ad-12345-2');

      expect(bidObject.getStatusCode()).to.be.equal(STATUS.GOOD);
      expect(bidObject).to.have.property('cpm').and.to.equal(0.4);
      expect(bidObject).to.have.property('ad').and.to.equal('<script src="ad.js"></script>');
      expect(bidObject).to.have.property('width').and.to.equal('300');
      expect(bidObject).to.have.property('height').and.to.equal('250');

      expect(secondBidObject.getStatusCode()).to.be.equal(STATUS.GOOD);
      expect(secondBidObject).to.have.property('cpm').and.to.equal(0.4);
      expect(secondBidObject).to.have.property('ad').and.to.equal('<script src="ad.js"></script>');
      expect(secondBidObject).to.have.property('width').and.to.equal('300');
      expect(secondBidObject).to.have.property('height').and.to.equal('250');

    });

    // We want to check that responses are added according to a sampling value,
    // this is possible by stubbing `Math.random`, to ensure the effect is
    // limited to the area we check, we create a self destructing stub which
    // restores itself once called.
    it('adds responses according to the sampling defined in the response', () => {

      const response = {
        batchKey: [DEFAULT_ENDPOINT,'1337','300x250'].join('-'),
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
        bids: [allowedPlacement()]
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
