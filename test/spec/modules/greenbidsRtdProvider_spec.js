import { expect } from 'chai';
import sinon from 'sinon';
import {
  deepClone,
} from '../../../src/utils.js';
import {
  greenbidsSubmodule
} from 'modules/greenbidsRtdProvider.js';

describe('greenbidsRtdProvider', () => {
  let server;

  beforeEach(() => {
    server = sinon.createFakeServer();
  });

  afterEach(() => {
    server.restore();
  });

  const endPoint = 'europe-west1-greenbids-357713.cloudfunctions.net';

  const SAMPLE_MODULE_CONFIG = {
    params: {
      pbuid: '12345',
      timeout: 200,
      targetTPR: 0.95
    }
  };

  const SAMPLE_REQUEST_BIDS_CONFIG_OBJ = {
    adUnits: [
      {
        code: 'adUnit1',
        bids: [
          { bidder: 'appnexus', params: {} },
          { bidder: 'rubicon', params: {} },
          { bidder: 'ix', params: {} }
        ]
      },
      {
        code: 'adUnit2',
        bids: [
          { bidder: 'appnexus', params: {} },
          { bidder: 'rubicon', params: {} },
          { bidder: 'openx', params: {} }
        ]
      }]
  };

  const SAMPLE_RESPONSE_ADUNITS = [
    {
      code: 'adUnit1',
      bidders: {
        'appnexus': true,
        'rubicon': false,
        'ix': true
      }
    },
    {
      code: 'adUnit2',
      bidders: {
        'appnexus': false,
        'rubicon': true,
        'openx': true
      }
    }];

  describe('init', () => {
    it('should return true and set rtdOptions if pbuid is present', () => {
      const result = greenbidsSubmodule.init(SAMPLE_MODULE_CONFIG);
      expect(result).to.be.true;
    });

    it('should return false if pbuid is not present', () => {
      const result = greenbidsSubmodule.init({ params: {} });
      expect(result).to.be.false;
    });
  });

  describe('updateAdUnitsBasedOnResponse', () => {
    it('should update ad units based on response', () => {
      const adUnits = JSON.parse(JSON.stringify(SAMPLE_REQUEST_BIDS_CONFIG_OBJ.adUnits));
      greenbidsSubmodule.updateAdUnitsBasedOnResponse(adUnits, SAMPLE_RESPONSE_ADUNITS);

      expect(adUnits[0].bids).to.have.length(2);
      expect(adUnits[1].bids).to.have.length(2);
    });
  });

  describe('findMatchingAdUnit', () => {
    it('should find matching ad unit by code', () => {
      const matchingAdUnit = greenbidsSubmodule.findMatchingAdUnit(SAMPLE_RESPONSE_ADUNITS, 'adUnit1');
      expect(matchingAdUnit).to.deep.equal(SAMPLE_RESPONSE_ADUNITS[0]);
    });
    it('should return undefined if no matching ad unit is found', () => {
      const matchingAdUnit = greenbidsSubmodule.findMatchingAdUnit(SAMPLE_RESPONSE_ADUNITS, 'nonexistent');
      expect(matchingAdUnit).to.be.undefined;
    });
  });

  describe('removeFalseBidders', () => {
    it('should remove bidders with false value', () => {
      const adUnit = JSON.parse(JSON.stringify(SAMPLE_REQUEST_BIDS_CONFIG_OBJ.adUnits[0]));
      const matchingAdUnit = SAMPLE_RESPONSE_ADUNITS[0];
      greenbidsSubmodule.removeFalseBidders(adUnit, matchingAdUnit);
      expect(adUnit.bids).to.have.length(2);
      expect(adUnit.bids.map((bid) => bid.bidder)).to.not.include('rubicon');
    });
  });

  describe('getFalseBidders', () => {
    it('should return an array of false bidders', () => {
      const bidders = {
        appnexus: true,
        rubicon: false,
        ix: true,
        openx: false
      };
      const falseBidders = greenbidsSubmodule.getFalseBidders(bidders);
      expect(falseBidders).to.have.length(2);
      expect(falseBidders).to.include('rubicon');
      expect(falseBidders).to.include('openx');
    });
  });

  describe('getBidRequestData', () => {
    it('Callback is called if the server responds a 200 within the time limit', (done) => {
      let requestBids = deepClone(SAMPLE_REQUEST_BIDS_CONFIG_OBJ);
      let callback = sinon.stub();

      greenbidsSubmodule.getBidRequestData(requestBids, callback, SAMPLE_MODULE_CONFIG);

      setTimeout(() => {
        server.requests[0].respond(
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(SAMPLE_RESPONSE_ADUNITS)
        );
        done();
      }, 50);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.adUnits[0].bids).to.have.length(2);
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.not.include('rubicon');
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.include('ix');
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.include('appnexus');
        expect(requestBids.adUnits[1].bids).to.have.length(2);
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.not.include('appnexus');
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.include('rubicon');
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.include('openx');
        expect(callback.calledOnce).to.be.true;
      }, 60);
    });
  });

  describe('getBidRequestData', () => {
    it('Nothing changes if the server times out but still the callback is called', (done) => {
      let requestBids = deepClone(SAMPLE_REQUEST_BIDS_CONFIG_OBJ);
      let callback = sinon.stub();

      greenbidsSubmodule.getBidRequestData(requestBids, callback, SAMPLE_MODULE_CONFIG);

      setTimeout(() => {
        server.requests[0].respond(
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(SAMPLE_RESPONSE_ADUNITS)
        );
        done();
      }, 300);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.adUnits[0].bids).to.have.length(3);
        expect(requestBids.adUnits[1].bids).to.have.length(3);
        expect(callback.calledOnce).to.be.true;
      }, 200);
    });
  });

  describe('getBidRequestData', () => {
    it('callback is called if the server responds a 500 error within the time limit and no changes are made', (done) => {
      let requestBids = deepClone(SAMPLE_REQUEST_BIDS_CONFIG_OBJ);
      let callback = sinon.stub();

      greenbidsSubmodule.getBidRequestData(requestBids, callback, SAMPLE_MODULE_CONFIG);

      setTimeout(() => {
        server.requests[0].respond(
          500,
          {'Content-Type': 'application/json'},
          JSON.stringify({'failure': 'fail'})
        );
        done();
      }, 50);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.adUnits[0].bids).to.have.length(3);
        expect(requestBids.adUnits[1].bids).to.have.length(3);
        expect(callback.calledOnce).to.be.true;
      }, 60);
    });
  });
});
