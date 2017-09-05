import { expect } from 'chai';
import urlParse from 'url-parse';

import Adapter from 'modules/hiromediaBidAdapter';
import bidmanager from 'src/bidmanager';
import { STATUS } from 'src/constants';
import * as utils from 'src/utils';

describe('hiromedia adapter', function () {
  const BIDDER_CODE = 'hiromedia';
  const DEFAULT_ENDPOINT = 'https://hb-rtb.ktdpublishers.com/bid/get';

  let adapter;
  let sandbox;
  let xhr;
  let addBidResponseStub;
  let hasValidBidRequestSpy;
  let placementId = 0;

  window.$$PREBID_GLOBAL$$ = window.$$PREBID_GLOBAL$$ || {};

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();

    // Used to spy on bid requests
    xhr = sandbox.useFakeXMLHttpRequest();

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
    expect(xhr.requests.length).to.be.equal(0);
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
        placementCode: 'div-gpt-ad-12345-1',
        selectedSize: '300x250'
      }, {
        placementCode: 'div-gpt-ad-12345-2',
        selectedSize: '728x90'
      }, {
        placementCode: 'div-gpt-ad-12345-3',
        selectedSize: '300x250'
      }];

      const params = {
        bids: [tilePlacement(), leaderPlacement(), tilePlacement()]
      };

      adapter.callBids(params);
      expect(xhr.requests.length).to.equal(3);
      sinon.assert.notCalled(addBidResponseStub);
      sinon.assert.calledThrice(hasValidBidRequestSpy);

      expectedRequests.forEach(function(request, index) {
        expect(hasValidBidRequestSpy.returnValues[index]).to.be.equal(true);

        // validate request
        const bidRequest = xhr.requests[index].url;
        const defaultBidUrl = urlParse(DEFAULT_ENDPOINT);
        const bidUrl = urlParse(bidRequest, true);
        const query = bidUrl.query;

        expect(bidUrl.hostname).to.equal(defaultBidUrl.hostname);
        expect(bidUrl.pathname).to.equal(defaultBidUrl.pathname);

        expect(query).to.have.property('adapterVersion').and.to.equal('3');
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
      expect(xhr.requests.length).to.be.equal(1);

      const bidRequest = xhr.requests[0].url;
      const bidUrl = urlParse(bidRequest, true);
      const query = bidUrl.query;

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
      expect(xhr.requests.length).to.be.equal(0);
      sinon.assert.calledOnce(hasValidBidRequestSpy);
      sinon.assert.calledOnce(addBidResponseStub);

      expect(hasValidBidRequestSpy.returnValues[0]).to.be.equal(false);
      const placementCode = addBidResponseStub.getCall(0).args[0];
      const bidObject = addBidResponseStub.getCall(0).args[1];

      expect(placementCode).to.be.equal('div-gpt-ad-12345-1');
      expect(bidObject.getStatusCode()).to.be.equal(STATUS.NO_BID);
    });

    // Test `params.bidUrl`
    it('accepts a custom bid endpoint url', () => {
      const placement = tilePlacement();
      placement.params.bidUrl = DEFAULT_ENDPOINT + '?someparam=value';

      const params = {
        bids: [placement]
      };

      adapter.callBids(params);
      expect(xhr.requests.length).to.be.equal(1);

      const bidRequest = xhr.requests[0].url;
      const defaultBidUrl = urlParse(DEFAULT_ENDPOINT);
      const bidUrl = urlParse(bidRequest, true);
      const query = bidUrl.query;

      expect(bidUrl.hostname).to.equal(defaultBidUrl.hostname);
      expect(bidUrl.pathname).to.equal(defaultBidUrl.pathname);

      expect(query).to.have.property('someparam').and.to.equal('value');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sandbox.useFakeServer();
    });

    const assertSingleFailedBidResponse = () => {
      sinon.assert.calledOnce(addBidResponseStub);
      const placementCode = addBidResponseStub.getCall(0).args[0];
      const bidObject = addBidResponseStub.getCall(0).args[1];

      expect(placementCode).to.be.equal('div-gpt-ad-12345-1');
      expect(bidObject.getStatusCode()).to.be.equal(STATUS.NO_BID);
    };

    it('tolerates an empty response', () => {
      server.respondWith('');
      adapter.callBids({bids: [tilePlacement()]});
      server.respond();

      assertSingleFailedBidResponse();
    });

    it('tolerates a response error', () => {
      server.respondWith([500, {}, '']);
      adapter.callBids({bids: [tilePlacement()]});
      server.respond();

      assertSingleFailedBidResponse();
    });

    it('tolerates an invalid response', () => {
      server.respondWith('not json');
      adapter.callBids({bids: [tilePlacement()]});
      server.respond();

      assertSingleFailedBidResponse();
    });

    it('adds a bid reponse for each pending bid', () => {
      const responses = [{
        width: '300',
        height: '250',
        cpm: 0.4,
        ad: '<script src="ad.js"></script>'
      }, {
        width: '728',
        height: '90',
        cpm: 0.4,
        ad: '<script src="ad.js"></script>'
      }];

      let id = 0;
      server.respondWith((request) => {
        request.respond(200, {}, JSON.stringify(responses[id]));
        id += 1;
      });

      const params = {
        bids: [tilePlacement(), leaderPlacement()]
      };

      adapter.callBids(params);
      server.respond();

      expect(server.requests.length).to.be.equal(2);
      sinon.assert.calledTwice(addBidResponseStub);

      responses.forEach((expectedResponse, i) => {
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
        cpm: 0.4,
        chance: 0.25,
        ad: '<script src="ad.js"></script>'
      };

      // List of "random" values. We check that the first two pass and the last
      // one is skipped.
      const randomValues = [0.2, 0.3];
      let randomIndex = 0;

      server.respondWith((request) => {
        const mathRandomStub = sandbox.stub(Math, 'random', function () {
          const randomValue = randomValues[randomIndex];

          randomIndex += 1;
          mathRandomStub.restore(); // self destruct on call

          return randomValue;
        });

        request.respond(200, {}, JSON.stringify(response));

        mathRandomStub.restore();
      });

      const params = {
        bids: [tilePlacement()]
      };

      adapter.callBids(params);
      adapter.callBids(params);
      server.respond();

      sinon.assert.calledTwice(addBidResponseStub);

      const firstBidObject = addBidResponseStub.getCall(0).args[1];
      const secondBidObject = addBidResponseStub.getCall(1).args[1];

      expect(firstBidObject.getStatusCode()).to.be.equal(STATUS.GOOD);
      expect(secondBidObject.getStatusCode()).to.be.equal(STATUS.NO_BID);
    });
  });
});
