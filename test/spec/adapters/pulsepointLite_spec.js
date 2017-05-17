import {expect} from 'chai';
import PulsePointAdapter from 'src/adapters/pulsepointLite';
import bidManager from 'src/bidmanager';
import * as ajax from 'src/ajax';
import {parse as parseURL} from 'src/url';

describe('PulsePoint Lite Adapter Tests', () => {
  let pulsepointAdapter = new PulsePointAdapter();
  let slotConfigs;
  let ajaxStub;

  beforeEach(() => {
    sinon.stub(bidManager, 'addBidResponse');
    ajaxStub = sinon.stub(ajax, 'ajax');

    slotConfigs = {
      bids: [
        {
          placementCode: '/DfpAccount1/slot1',
          bidder: 'pulsepoint',
          bidId: 'bid12345',
          params: {
            cp: 'p10000',
            ct: 't10000',
            cf: '300x250'
          }
        }, {
          placementCode: '/DfpAccount2/slot2',
          bidder: 'pulsepoint',
          bidId: 'bid23456',
          params: {
            cp: 'p20000',
            ct: 't20000',
            cf: '728x90'
          }
        }
      ]
    };
  });

  afterEach(() => {
    bidManager.addBidResponse.restore();
    ajaxStub.restore();
  });

  it('Verify requests sent to PulsePoint', () => {
    pulsepointAdapter.callBids(slotConfigs);
    var call = parseURL(ajaxStub.firstCall.args[0]).search;
    // slot 1
    // expect(call.cp).to.equal('p10000');
    // expect(call.ct).to.equal('t10000');
    // expect(call.cf).to.equal('300x250');
    expect(call.ca).to.equal('BID');
    expect(call.cn).to.equal('1');
    // slot 2
    call = parseURL(ajaxStub.secondCall.args[0]).search;
    // expect(call.cp).to.equal('p20000');
    // expect(call.ct).to.equal('t20000');
    // expect(call.cf).to.equal('728x90');
    expect(call.ca).to.equal('BID');
    expect(call.cn).to.equal('1');
  });

  it('Verify bid', () => {
    pulsepointAdapter.callBids(slotConfigs);
    // trigger a mock ajax callback with bid.
    ajaxStub.firstCall.args[1](JSON.stringify({
      html: 'This is an Ad',
      bidCpm: 1.25
    }));
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulsepoint');
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('This is an Ad');
    expect(bid.width).to.equal('300');
    expect(bid.height).to.equal('250');
    expect(bid.adId).to.equal('bid12345');
  });

  it('Verify passback', () => {
    pulsepointAdapter.callBids(slotConfigs);
    // trigger a mock ajax callback with no bid.
    ajaxStub.firstCall.args[1](null);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulsepoint');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
    expect(bid.adId).to.equal('bid12345');
  });

  it('Verify passback when ajax call fails', () => {
    ajaxStub.throws();
    pulsepointAdapter.callBids(slotConfigs);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulsepoint');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
    expect(bid.adId).to.equal('bid12345');
  });
});
