import { expect } from 'chai';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import NanointeractiveBidAdapter from 'modules/nanointeractiveBidAdapter';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

describe('nanointeractive adapter tests', function () {
  const BIDDER_CODE = 'nanointeractive';
  const SEARCH_QUERY = 'rumpelstiltskin';
  const WIDTH = 300;
  const HEIGHT = 250;
  const SIZES = [[WIDTH, HEIGHT]];
  const AD = '<script type="text/javascript" src="https://trc.audiencemanager.de/ad/?pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"></script> <noscript> <a href="https://trc.audiencemanager.de/ad/?t=c&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"> <img src="https://trc.audiencemanager.de/ad/?t=i&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}" alt="Click Here" border="0"> </a> </noscript>';
  const CPM = 1;

  const REQUEST = function (secParam, nameParam, nqParam) {
    return {
      bidderCode: BIDDER_CODE,
      requestId: 'ac15bb68-4ef0-477f-93f4-de91c47f00a9',
      bidderRequestId: '189135372acd55',
      bids: [
        {
          bidder: BIDDER_CODE,
          params: (function () {
            return {
              sec: secParam === true ? 'sec1' : null,
              dpid: 'dpid1',
              pid: 'pid1',
              nq: nqParam === false ? null : SEARCH_QUERY,
              name: nameParam === true ? 'nq' : null
            }
          })(),
          placementCode: 'div-gpt-ad-1460505748561-0',
          transactionId: 'ee335735-ddd3-41f2-b6c6-e8aa99f81c0f',
          sizes: SIZES,
          bidId: '24a1c9ec270973',
          bidderRequestId: '189135372acd55',
          requestId: 'ac15bb68-4ef0-477f-93f4-de91c47f00a9'
        }
      ],
      start: 1503482467787,
      auctionStart: 1503482467785,
      timeout: 3000
    };
  };

  const VALID_RESPONSE = {
    cpm: CPM,
    ad: AD,
    width: WIDTH,
    height: HEIGHT,
    bidderCode: BIDDER_CODE,
  };

  const INVALID_RESPONSE = {
    cpm: null,
    ad: AD,
    width: WIDTH,
    height: HEIGHT,
    bidderCode: BIDDER_CODE,
  };

  function createAjaxSuccessStub(response) {
    return sinon.stub(ajax, 'ajax', (url, callbacks) => {
      callbacks.success(
        JSON.stringify(response)
      );
    });
  }

  function createAjaxErrorStub() {
    return sinon.stub(ajax, 'ajax', (url, callbacks) => {
      callbacks.error('Error');
    });
  }

  describe('NanoAdapter', () => {
    let nanoBidAdapter;
    let addBidResponse;

    let getTopWindowLocation = sinon.stub(utils, 'getTopWindowLocation');
    getTopWindowLocation.onFirstCall().returns({href: 'test?nq=TEST'});
    getTopWindowLocation.returns({href: 'test'});

    beforeEach(() => {
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      nanoBidAdapter = new NanointeractiveBidAdapter();
    });
    afterEach(() => {
      addBidResponse.restore();
    });

    it('exists and is a function', () => {
      expect(nanoBidAdapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('Params', () => {
      it('Test invalid sec params', function () {
        let addNoBidResponseSinon = sinon.stub(nanoBidAdapter, 'addNoBidResponse');
        nanoBidAdapter.callBids(REQUEST(false));
        sinon.assert.calledOnce(addNoBidResponseSinon);
      });

      it('Test without nq param', function () {
        let callEngineSinon = sinon.stub(nanoBidAdapter, 'callEngine');
        nanoBidAdapter.callBids(REQUEST(true, false, false));
        sinon.assert.calledOnce(callEngineSinon);
      });

      it('Test valid bid params', function () {
        let callEngineSinon = sinon.stub(nanoBidAdapter, 'callEngine');
        nanoBidAdapter.callBids(REQUEST(true));
        sinon.assert.calledOnce(callEngineSinon);
      });

      it('Test name bid param', function () {
        let getQueryParamSinon = sinon.stub(nanoBidAdapter, 'getQueryParam');
        nanoBidAdapter.callBids(REQUEST(false, true));
        sinon.assert.calledOnce(getQueryParamSinon);
      });
    });

    describe('Methods', () => {
      it('Test getQueryParam() with valid param', function () {
        nanoBidAdapter.QUERY_PARAMS = ['testParam=TEST2', 'nq=TEST'];
        expect(nanoBidAdapter.getQueryParam('nq')).to.equal('TEST')
      });

      it('Test getQueryParam() with invalid param', function () {
        nanoBidAdapter.QUERY_PARAMS = ['nq='];
        expect(nanoBidAdapter.getQueryParam('nq')).to.equal(null)
      });

      it('Test getQueryParam() without params', function () {
        nanoBidAdapter.QUERY_PARAMS = [];
        expect(nanoBidAdapter.getQueryParam('nq')).to.equal(null)
      });

      it('Test getEndpoint() without category', function () {
        const endpoint = 'https://www.audiencemanager.de/ad?type=js' +
          '&sec=sec1' +
          '&dpid=dpid1' +
          '&pid=pid1' +
          '&size[]=300x250' +
          '&size[]=728x90' +
          '&nq[]=auto' +
          '&alg=r' +
          '&hb=true' +
          '&hbid=testBidId' +
          '&dirCall=1';
        expect(nanoBidAdapter.getEndpoint('sec1', 'dpid1', 'pid1', 'auto', 'r', undefined, ['300x250', '728x90'], 'testBidId')).to.equal(endpoint)
      });

      it('Test getEndpoint() with category', function () {
        const endpoint = 'https://www.audiencemanager.de/ad?type=js' +
          '&sec=sec1' +
          '&dpid=dpid1' +
          '&pid=pid1' +
          '&size[]=300x250' +
          '&size[]=728x90' +
          '&nq[]=auto' +
          '&alg=r' +
          '&nq=AUTO' +
          '&hb=true' +
          '&hbid=testBidId' +
          '&dirCall=1';
        expect(nanoBidAdapter.getEndpoint('sec1', 'dpid1', 'pid1', 'auto', 'r', 'AUTO', ['300x250', '728x90'], 'testBidId')).to.equal(endpoint)
      });

      it('Test formatSizes()', function () {
        const sizes = ['300x250', '728x90'];
        const sizesFormatted = '&size[]=300x250&size[]=728x90';
        expect(nanoBidAdapter.formatSizes(sizes)).to.equal(sizesFormatted)
      });

      it('Test successCallback() with valid response', function () {
        let handleEngineResponseSinon = sinon.stub(nanoBidAdapter, 'handleEngineResponse');
        nanoBidAdapter.successCallback(REQUEST(true).bids[0], JSON.stringify(VALID_RESPONSE));
        sinon.assert.calledOnce(handleEngineResponseSinon);
      });

      it('Test successCallback() with invalid response', function () {
        let handleEngineResponseErrorSinon = sinon.stub(nanoBidAdapter, 'handleEngineResponseError');
        nanoBidAdapter.successCallback(REQUEST(true).bids[0], null);
        sinon.assert.calledOnce(handleEngineResponseErrorSinon);
      });

      it('Test handleEngineResponse() with valid response', function () {
        let addBidResponseSinon = sinon.stub(nanoBidAdapter, 'addBidResponse');
        nanoBidAdapter.handleEngineResponse(REQUEST(true).bids[0], VALID_RESPONSE);
        sinon.assert.calledOnce(addBidResponseSinon);
      });

      it('Test handleEngineResponse() with invalid response', function () {
        let addNoBidResponseSinon = sinon.stub(nanoBidAdapter, 'addNoBidResponse');
        nanoBidAdapter.handleEngineResponse(REQUEST(true).bids[0], INVALID_RESPONSE);
        sinon.assert.calledOnce(addNoBidResponseSinon);
      });

      it('Test handleEngineResponseError()', function () {
        let addNoBidResponseSinon = sinon.stub(nanoBidAdapter, 'addNoBidResponse');
        let logErrorSinon = sinon.stub(utils, 'logError');
        nanoBidAdapter.handleEngineResponseError(REQUEST(true).bids[0], 'Error');
        sinon.assert.calledOnce(addNoBidResponseSinon);
        sinon.assert.calledOnce(logErrorSinon);
      });

      it('Test isEngineResponseValid() with valid response', function () {
        expect(nanoBidAdapter.isEngineResponseValid(VALID_RESPONSE)).to.equal(true);
      });

      it('Test isEngineResponseValid() with invalid response', function () {
        expect(nanoBidAdapter.isEngineResponseValid(INVALID_RESPONSE)).to.equal(false);
      });

      it('Test addBidResponse()', function () {
        nanoBidAdapter.addBidResponse(REQUEST(true).bids[0], VALID_RESPONSE);
        let arg = addBidResponse.firstCall.args[1];
        expect(arg.bidderCode).to.equal(BIDDER_CODE);
        expect(arg.width).to.equal(WIDTH);
        expect(arg.height).to.equal(HEIGHT);
        expect(arg.cpm).to.equal(CPM);
        expect(arg.ad).to.equal(AD);
        expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      });

      it('Test addNoBidResponse()', function () {
        nanoBidAdapter.addNoBidResponse(REQUEST(true).bids[0]);
        sinon.assert.calledOnce(addBidResponse);
      });
    });

    describe('Ajax success request', () => {
      it('Test success Ajax call', function () {
        let stubAjaxSuccess = createAjaxSuccessStub(VALID_RESPONSE);
        nanoBidAdapter.callBids(REQUEST(true));
        sinon.assert.calledOnce(stubAjaxSuccess);
        stubAjaxSuccess.restore();

        let arg = addBidResponse.firstCall.args[1];
        expect(arg.bidderCode).to.equal(BIDDER_CODE);
        expect(arg.width).to.equal(WIDTH);
        expect(arg.height).to.equal(HEIGHT);
        expect(arg.cpm).to.equal(CPM);
        expect(arg.ad).to.equal(AD);
        expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      });
    });

    describe('Ajax error request', () => {
      it('Test error Ajax call', function () {
        let stubAjaxError = createAjaxErrorStub();
        nanoBidAdapter.callBids(REQUEST(true));
        sinon.assert.calledOnce(stubAjaxError);
        stubAjaxError.restore();

        let arg = addBidResponse.firstCall.args[1];
        expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      });
    });

    describe('Bid timeout', () => {
      it('Test timeout response', function () {
        nanoBidAdapter.timeoutResponse(REQUEST(true).bids[0], 0);
        setTimeout(() => {
          let addNoBidResponseSinon = sinon.stub(nanoBidAdapter, 'addNoBidResponse');
          sinon.assert.calledOnce(addNoBidResponseSinon);
        })
      });
    });
  });
});
