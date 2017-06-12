import {expect} from 'chai';
import FeatureForwardAdapter from 'src/adapters/featureforward.js';
import bidManager from 'src/bidmanager';
import * as ajax from 'src/ajax';
import {parse as parseURL} from 'src/url';

describe('FeatureForward Adapter Tests', () => {
  let featureForwardAdapter = new FeatureForwardAdapter();
  let slotConfigs;
  let ajaxStub;
  beforeEach(() => {
    sinon.stub(bidManager, 'addBidResponse');
    ajaxStub = sinon.stub(ajax, 'ajax');
    slotConfigs = {
      bids: [
        {
	  sizes: [[300, 250]],
          bidder: 'featureforward',
	  placementCode: 'test1_placement',
          params: {
            pubId: '001',
            siteId: '111',
            placementId: '1',
          }
        }]
    };
  });

  afterEach(() => {
    bidManager.addBidResponse.restore();
    ajaxStub.restore();
  });

  it('Verify requests sent to FeatureForward', () => {
    featureForwardAdapter.callBids(slotConfigs);
    var call = ajaxStub.firstCall.args[0];
    var request = JSON.parse(ajaxStub.args[0][2]);
    var creds = ajaxStub.args[0][3];
    expect(call).to.equal('http://prmbdr.featureforward.com/newbidder/bidder1_prm.php?');
    expect(request.ca).to.equal('BID');
    expect(request.pubId).to.equal('001');
    expect(request.siteId).to.equal('111');
    expect(request.placementId).to.equal('1');
    expect(request.size[0]).to.equal(300);
    expect(request.size[1]).to.equal(250);
    expect(creds.method).to.equal('POST');
  });

  it('Verify bid', () => {
    featureForwardAdapter.callBids(slotConfigs);
    ajaxStub.firstCall.args[1](JSON.stringify({
      html: 'FF Test Ad',
      bidCpm: 0.555,
      width: 300,
      height: 250
    }));
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(bid.bidderCode).to.equal('featureforward');
    expect(bid.cpm).to.equal(0.555);
    expect(bid.ad).to.equal('FF Test Ad');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
  });

  it('Verify passback', () => {
    featureForwardAdapter.callBids(slotConfigs);
    // trigger a mock ajax callback with no bid.
    ajaxStub.firstCall.args[1](null);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('test1_placement');
    expect(bid.bidderCode).to.equal('featureforward');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
  });

  it('Verify passback when ajax call fails', () => {
    ajaxStub.throws();
    featureForwardAdapter.callBids(slotConfigs);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('test1_placement');
    expect(bid.bidderCode).to.equal('featureforward');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
  });
});
