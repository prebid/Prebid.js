import { expect } from 'chai';
import TrionAdapter from 'modules/trionBidAdapter';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
const CONSTANTS = require('src/constants.json');
const adloader = require('src/adloader');

const PLACEMENT_CODE = 'ad-tag';
const BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest?';
const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.js';

const TRION_BID_REQUEST = {
  bidderCode: 'trion',
  bids: [
    {
      bidder: 'trion',
      params: {
        pubId: '1',
        sectionId: '2'
      },
      placementCode: PLACEMENT_CODE,
      sizes: [[300, 250], [300, 600]],
      bidId: 'test-bid-id'
    }
  ]
};

const TRION_BID_RESPONSE = {
  bidId: 'test-bid-id',
  sizes: [[300, 250], [300, 600]],
  result: {
    cpm: 100,
    placeBid: true,
    height: '250',
    width: '300',
    ad: 'test',
    msg: 'response messaging'
  }

};

describe('Trion adapter tests', () => {
  let adapter;

  beforeEach(() => {
    adapter = new TrionAdapter();
    sinon.stub(document.body, 'appendChild');
  });

  afterEach(() => document.body.appendChild.restore());

  it('should exist and be a function', function () {
    expect($$PREBID_GLOBAL$$.handleTrionCB).to.exist.and.to.be.a('function');
  });

  describe('request function', () => {
    let spyLoadScript;

    beforeEach(() => {
      spyLoadScript = sinon.spy(adloader, 'loadScript');
      window.TRION_INT = {
        int_t: -1
      };
    });

    afterEach(() => {
      spyLoadScript.restore();
      delete window.TRION_INT;
    });

    it('callBids exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('should not call loadscript when inputting with empty params', function () {
      adapter.callBids({});
      sinon.assert.notCalled(spyLoadScript);
    });

    it('should include the base bidrequest url', function () {
      adapter.callBids(TRION_BID_REQUEST);

      sinon.assert.calledOnce(spyLoadScript);

      let bidUrl = spyLoadScript.getCall(0).args[0];
      expect(bidUrl).to.include(BID_REQUEST_BASE_URL);
    });

    it('should call loadscript with the correct required params', function () {
      adapter.callBids(TRION_BID_REQUEST);

      sinon.assert.calledOnce(spyLoadScript);

      let bidUrl = spyLoadScript.getCall(0).args[0];
      expect(bidUrl).to.include('pubId=1');
      expect(bidUrl).to.include('sectionId=2');
      expect(bidUrl).to.include('sizes=300x250,300x600');
    });

    it('should call loadscript with the correct optional params', function () {
      let params = TRION_BID_REQUEST.bids[0].params;
      params.re = 1;

      adapter.callBids(TRION_BID_REQUEST);

      sinon.assert.calledOnce(spyLoadScript);

      let bidUrl = spyLoadScript.getCall(0).args[0];
      expect(bidUrl).to.include('re=1');
      expect(bidUrl).to.include(utils.getTopWindowUrl());
      expect(bidUrl).to.include('slot=' + PLACEMENT_CODE);
      delete params.re;
    });

    describe('user sync', () => {
      beforeEach(() => {
        delete window.TRION_INT;
        delete window.TR_INT_T;
      });

      it('user sync is called', () => {
        adapter.callBids(TRION_BID_REQUEST);
        sinon.assert.calledWith(spyLoadScript, USER_SYNC_URL);
      });

      it('user sync tag is included in bid url', () => {
        window.TRION_INT = {
          campaigns: [
            'campaign1',
            'campaign2'
          ],
          int_t: 'int_t'
        };
        let userTag = encodeURIComponent(JSON.stringify(window.TRION_INT));
        adapter.callBids(TRION_BID_REQUEST);

        let bidUrl = spyLoadScript.getCall(0).args[0];
        expect(bidUrl).to.include(userTag);
      });

      it('user sync tag is included in bid url and includes the correct int_t', () => {
        window.TRION_INT = {
          campaigns: [
            'campaign1',
            'campaign2'
          ]
        };
        let int_t = 'test';
        let expectedObject = {
          campaigns: [
            'campaign1',
            'campaign2'
          ],
          int_t: int_t
        };
        window.TR_INT_T = int_t;
        let userTag = encodeURIComponent(JSON.stringify(expectedObject));
        adapter.callBids(TRION_BID_REQUEST);

        let bidUrl = spyLoadScript.getCall(0).args[0];
        expect(bidUrl).to.include(userTag);
      });

      it('user sync tag variable int_t cannot be changed once set', () => {
        window.TRION_INT = {
          campaigns: [
            'campaign1',
            'campaign2'
          ]
        };
        let int_t = 'test';
        let expectedObject = {
          campaigns: [
            'campaign1',
            'campaign2'
          ],
          int_t: int_t
        };
        window.TR_INT_T = int_t;
        let userTag = encodeURIComponent(JSON.stringify(expectedObject));
        adapter.callBids(TRION_BID_REQUEST);
        window.TR_INT_T = 'bad';
        let bidUrl = spyLoadScript.getCall(0).args[0];

        expect(bidUrl).to.include(userTag);
        expect(bidUrl).to.not.include('bad');
      });
    });
  });

  describe('response handler', () => {
    beforeEach(() => {
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      bidmanager.addBidResponse.restore();
    });

    it('when there is no response do not bid', function () {
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB();
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    });

    it('when place bid is returned as false', function () {
      TRION_BID_RESPONSE.result.placeBid = false;
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      TRION_BID_RESPONSE.result.placeBid = true;
    });

    it('when no cpm is in the response', function () {
      TRION_BID_RESPONSE.result.cpm = 0;
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      TRION_BID_RESPONSE.result.cpm = 1;
    });

    it('when no ad is in the response', function () {
      TRION_BID_RESPONSE.result.ad = null;
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      TRION_BID_RESPONSE.result.ad = 'test';
    });

    it('bid response is formatted correctly', function () {
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      const placementCode = bidmanager.addBidResponse.firstCall.args[0];
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(placementCode).to.equal(PLACEMENT_CODE);
      expect(response.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(response.bidderCode).to.equal('trion');
    });

    it('height and width are appropriately set', function () {
      let bidWidth = '1';
      let bidHeight = '2';
      TRION_BID_RESPONSE.result.width = bidWidth;
      TRION_BID_RESPONSE.result.height = bidHeight;
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      const placementCode = bidmanager.addBidResponse.firstCall.args[0];
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.width).to.equal(bidWidth);
      expect(response.height).to.equal(bidHeight);
      TRION_BID_RESPONSE.result.width = '300';
      TRION_BID_RESPONSE.result.height = '250';
    });

    it('cpm is properly set and transformed to cents', function () {
      let bidCpm = 2;
      TRION_BID_RESPONSE.result.cpm = bidCpm * 100;
      $$PREBID_GLOBAL$$._bidsRequested.push(TRION_BID_REQUEST);
      $$PREBID_GLOBAL$$.handleTrionCB(TRION_BID_RESPONSE);
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response.cpm).to.equal(bidCpm);
      TRION_BID_RESPONSE.result.cpm = 100;
    });
  });
});
