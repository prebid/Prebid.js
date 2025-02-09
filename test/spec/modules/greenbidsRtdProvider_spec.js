import { expect } from 'chai';
import sinon from 'sinon';
import {
  deepClone,
} from '../../../src/utils.js';
import {
  greenbidsSubmodule
} from 'modules/greenbidsRtdProvider.js';
import { server } from '../../mocks/xhr.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';

describe('greenbidsRtdProvider', () => {
  const endPoint = 't.greenbids.ai';

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

  const SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED = [
    {
      code: 'adUnit1',
      bidders: {
        'appnexus': true,
        'rubicon': false,
        'ix': true
      },
      isExploration: false
    },
    {
      code: 'adUnit2',
      bidders: {
        'appnexus': false,
        'rubicon': true,
        'openx': true
      },
      isExploration: false

    }];

  const SAMPLE_RESPONSE_ADUNITS_EXPLORED = [
    {
      code: 'adUnit1',
      bidders: {
        'appnexus': true,
        'rubicon': false,
        'ix': true
      },
      isExploration: true
    },
    {
      code: 'adUnit2',
      bidders: {
        'appnexus': false,
        'rubicon': true,
        'openx': true
      },
      isExploration: true

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
    it('should update ad units based on response if not exploring', () => {
      const adUnits = JSON.parse(JSON.stringify(SAMPLE_REQUEST_BIDS_CONFIG_OBJ.adUnits));
      greenbidsSubmodule.updateAdUnitsBasedOnResponse(adUnits, SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED);

      expect(adUnits[0].bids).to.have.length(2);
      expect(adUnits[1].bids).to.have.length(2);
    });

    it('should not update ad units based on response if exploring', () => {
      const adUnits = JSON.parse(JSON.stringify(SAMPLE_REQUEST_BIDS_CONFIG_OBJ.adUnits));
      greenbidsSubmodule.updateAdUnitsBasedOnResponse(adUnits, SAMPLE_RESPONSE_ADUNITS_EXPLORED);

      expect(adUnits[0].bids).to.have.length(3);
      expect(adUnits[1].bids).to.have.length(3);
      expect(adUnits[0].ortb2Imp.ext.greenbids.greenbidsId).to.be.a.string;
      expect(adUnits[1].ortb2Imp.ext.greenbids.greenbidsId).to.be.a.string;
      expect(adUnits[0].ortb2Imp.ext.greenbids.greenbidsId).to.equal(adUnits[0].ortb2Imp.ext.greenbids.greenbidsId);
      expect(adUnits[0].ortb2Imp.ext.greenbids.keptInAuction).to.deep.equal(SAMPLE_RESPONSE_ADUNITS_EXPLORED[0].bidders);
      expect(adUnits[1].ortb2Imp.ext.greenbids.keptInAuction).to.deep.equal(SAMPLE_RESPONSE_ADUNITS_EXPLORED[1].bidders);
      expect(adUnits[0].ortb2Imp.ext.greenbids.isExploration).to.equal(SAMPLE_RESPONSE_ADUNITS_EXPLORED[0].isExploration);
      expect(adUnits[1].ortb2Imp.ext.greenbids.isExploration).to.equal(SAMPLE_RESPONSE_ADUNITS_EXPLORED[1].isExploration);
    });
  });

  describe('findMatchingAdUnit', () => {
    it('should find matching ad unit by code', () => {
      const matchingAdUnit = greenbidsSubmodule.findMatchingAdUnit(SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED, 'adUnit1');
      expect(matchingAdUnit).to.deep.equal(SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED[0]);
    });
    it('should return undefined if no matching ad unit is found', () => {
      const matchingAdUnit = greenbidsSubmodule.findMatchingAdUnit(SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED, 'nonexistent');
      expect(matchingAdUnit).to.be.undefined;
    });
  });

  describe('removeFalseBidders', () => {
    it('should remove bidders with false value', () => {
      const adUnit = JSON.parse(JSON.stringify(SAMPLE_REQUEST_BIDS_CONFIG_OBJ.adUnits[0]));
      const matchingAdUnit = SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED[0];
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
          { 'Content-Type': 'application/json' },
          JSON.stringify(SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED)
        );
      }, 50);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.greenbidsId).to.be.a.string;
        expect(requestBids.adUnits[0].bids).to.have.length(2);
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.not.include('rubicon');
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.include('ix');
        expect(requestBids.adUnits[0].bids.map((bid) => bid.bidder)).to.include('appnexus');
        expect(requestBids.adUnits[1].bids).to.have.length(2);
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.not.include('appnexus');
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.include('rubicon');
        expect(requestBids.adUnits[1].bids.map((bid) => bid.bidder)).to.include('openx');
        expect(callback.calledOnce).to.be.true;
        done();
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
          { 'Content-Type': 'application/json' },
          JSON.stringify(SAMPLE_RESPONSE_ADUNITS_NOT_EXPLORED)
        );
        done();
      }, 300);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.greenbidsId).to.be.a.string;
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
          { 'Content-Type': 'application/json' },
          JSON.stringify({ 'failure': 'fail' })
        );
      }, 50);

      setTimeout(() => {
        const requestUrl = new URL(server.requests[0].url);
        expect(requestUrl.host).to.be.eq(endPoint);
        expect(requestBids.greenbidsId).to.be.a.string;
        expect(requestBids.adUnits[0].bids).to.have.length(3);
        expect(requestBids.adUnits[1].bids).to.have.length(3);
        expect(callback.calledOnce).to.be.true;
        done();
      }, 60);
    });
  });

  describe('stripAdUnits', function () {
    it('should strip all properties except bidder from each bid in adUnits', function () {
      const adUnits =
        [
          {
            bids: [
              { bidder: 'bidder1', otherProp: 'value1' },
              { bidder: 'bidder2', otherProp: 'value2' }
            ],
            mediaTypes: { 'banner': { prop: 'value3' } }
          }
        ];
      const expectedOutput = [
        {
          bids: [
            { bidder: 'bidder1' },
            { bidder: 'bidder2' }
          ],
          mediaTypes: { 'banner': { prop: 'value3' } }
        }
      ];

      // Perform the test
      const output = greenbidsSubmodule.stripAdUnits(adUnits);
      expect(output).to.deep.equal(expectedOutput);
    });

    it('should strip all properties except bidder from each bid in adUnits but keep ortb2Imp', function () {
      const adUnits =
        [
          {
            bids: [
              { bidder: 'bidder1', otherProp: 'value1' },
              { bidder: 'bidder2', otherProp: 'value2' }
            ],
            mediaTypes: { 'banner': { prop: 'value3' } },
            ortb2Imp: {
              ext: {
                greenbids: {
                  greenbidsId: 'test'
                }
              }
            }
          }
        ];
      const expectedOutput = [
        {
          bids: [
            { bidder: 'bidder1' },
            { bidder: 'bidder2' }
          ],
          mediaTypes: { 'banner': { prop: 'value3' } },
          ortb2Imp: {
            ext: {
              greenbids: {
                greenbidsId: 'test'
              }
            }
          }
        }
      ];

      // Perform the test
      const output = greenbidsSubmodule.stripAdUnits(adUnits);
      expect(output).to.deep.equal(expectedOutput);
    });
  });

  describe('onAuctionInitEvent', function () {
    it('should not emit billable event if greenbids hasn\'t set the adunit.ext value', function () {
      sinon.spy(events, 'emit');
      greenbidsSubmodule.onAuctionInitEvent({
        auctionId: 'test',
        adUnits: [
          {
            bids: [
              { bidder: 'bidder1', otherProp: 'value1' },
              { bidder: 'bidder2', otherProp: 'value2' }
            ],
            mediaTypes: { 'banner': { prop: 'value3' } },
          }
        ]
      });
      sinon.assert.callCount(events.emit, 0);
      events.emit.restore();
    });

    it('should  emit billable event if greenbids has set the adunit.ext value', function (done) {
      let counter = 0;
      events.on(EVENTS.BILLABLE_EVENT, function (event) {
        if (event.vendor === 'greenbidsRtdProvider' && event.type === 'auction') {
          counter += 1;
        }
        expect(counter).to.equal(1);
        done();
      });
      greenbidsSubmodule.onAuctionInitEvent({
        auctionId: 'test',
        adUnits: [
          {
            bids: [
              { bidder: 'bidder1', otherProp: 'value1' },
              { bidder: 'bidder2', otherProp: 'value2' }
            ],
            mediaTypes: { 'banner': { prop: 'value3' } },
            ortb2Imp: { ext: { greenbids: { greenbidsId: 'b0b39610-b941-4659-a87c-de9f62d3e13e' } } }
          }
        ]
      });
    });
  });
});
