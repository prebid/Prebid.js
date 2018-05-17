import {expect} from 'chai';
import RealVuAdapter from '../../../modules/realvuBidAdapter';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
const utils = require('src/utils.js');

describe('RealVu Adapter Test', () => {
  let adapter;
  const REQUEST = {
    bidderCode: 'realvu',
    requestId: '0d67ddab-1502-4897-a7bf-e8078e983405',
    bidderRequestId: '1b5e314fe79b1d',
    bids: [
      {
        bidId: '2d86a04312d95d',
        bidder: 'realvu',
        bidderRequestId: '1b5e314fe79b1d',
        // mediaType:undefined,
        params: {
          partnerId: '1Y',
          publisherId: '5a6a0bd18daf1461e29c2581',
          placementId: '59f8e4a69b39f6483c880c30',
        },
        placementCode: 'ad_container_1',
        sizes: [[300, 250]],
        transactionId: '0d67ddab-1502-4897-a7bf-e8078e983405'
      }
    ],
    start: 1504628062271
  };
  const RESPONSE = {
    'tag': '<!-- test -->',
    'price': 1.2345,
    'bid_id': '3caa71408cf47f',
    'nurl': '',
    'cid': 'campaign_peHnbyF3K2kNqagbqgmDzCUDcjGyWL',
    'aid': 'ad_UhBv3ts9lNAd9vlxBNrySw6f6g66s'
  }
  let bidResponseStub;
  let adloaderStub;
  beforeEach(function() {
    bidResponseStub = sinon.stub(bidmanager, 'addBidResponse');
    adloaderStub = sinon.stub(adloader, 'loadScript');
  });
  afterEach(function() {
    adloaderStub.restore();
    bidResponseStub.restore();
  });
  adapter = new RealVuAdapter();
  it('load boost', () => {
    adapter.callBids(REQUEST);
    expect(adloaderStub.getCall(0).args[0]).to.contain('realvu_boost.js');
  });
  it('callBid "yes"', () => {
    adapter.boostCall({realvu: 'yes', pin: {pbjs_bid: REQUEST.bids[0]}});
    expect(adloaderStub.getCall(0).args[0]).to.contain('placementId=59f8e4a69b39f6483c880c30');
  });
  it('callBid "no"', () => {
    // adapter.boostCall({realvu: 'no', pin: {pbjs_bid: REQUEST.bids[0]}});
    // expect(bidResponseStub.getCall(0).args[1].getStatusCode()).to.equal(2);
    adapter.boostCall({realvu: 'no', pin: {pbjs_bid: REQUEST.bids[0]}});
    expect(adloaderStub.getCall(0).args[0]).to.contain('realvu=no');
  });
  it('handle callback', () => {
    let stab = sinon.stub(utils, 'getBidRequest', function() {
      return {
        bidId: '3caa71408cf47f',
        bidder: 'realvu',
        bidderRequestId: '12a0d1b93e491e',
        placementCode: 'ad_container_2'
      }
    });
    $$PREBID_GLOBAL$$.handleRvCallback(RESPONSE);
    expect(bidResponseStub.getCall(0).args[1].cpm).to.equal(1.2345);
    stab.restore();
  });
});
