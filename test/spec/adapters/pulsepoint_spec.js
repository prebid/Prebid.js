import {expect} from 'chai';
import PulsePointAdapter from '../../../src/adapters/pulsepoint';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe("PulsePoint Adapter Tests", () => {

  let pulsepointAdapter = new PulsePointAdapter();
  let slotConfigs;
  let requests = [];
  let responses = {};

  function initPulsepointLib() {
    /* Mocked PulsePoint library */
    window.pp = {
      requestActions: {
        BID: 0
      }
    };
    /* Ad object*/
    window.pp.Ad = function(config) {
      this.display = function() {
        requests.push(config);
        config.callback(responses[config.ct]);
      };
    };
  }

  function resetPulsepointLib() {
    window.pp = undefined;
  }

  beforeEach(() => {
    initPulsepointLib();
    sinon.stub(bidManager, 'addBidResponse');
    sinon.stub(adLoader, 'loadScript');

    slotConfigs = {
      bids: [
        {
          placementCode: "/DfpAccount1/slot1", 
          bidder: "pulsepoint",
          bidId: 'bid12345',
          params: {
            cp: "p10000",
            ct: "t10000",
            cf: "300x250",
            param1: "value1",
            param2: 2
          }
        },{
          placementCode: "/DfpAccount2/slot2", 
          bidder: "pulsepoint",
          bidId: 'bid23456',
          params: {
            cp: "p20000",
            ct: "t20000",
            cf: "728x90"
          }
        }
      ]
    };
  });

  afterEach(() => {
    bidManager.addBidResponse.restore();
    adLoader.loadScript.restore();
    requests = [];
    responses = {};
  });

  it('Verify requests sent to PulsePoint library', () => {
    pulsepointAdapter.callBids(slotConfigs);
    expect(requests).to.have.length(2);
    //slot 1
    expect(requests[0].cp).to.equal('p10000');
    expect(requests[0].ct).to.equal('t10000');
    expect(requests[0].cf).to.equal('300x250');
    expect(requests[0].ca).to.equal(0);
    expect(requests[0].cn).to.equal(1);
    expect(requests[0].cu).to.equal('http://bid.contextweb.com/header/tag');
    expect(requests[0].adUnitId).to.equal('/DfpAccount1/slot1');
    expect(requests[0]).to.have.property('callback');
    expect(requests[0].param1).to.equal('value1');
    expect(requests[0].param2).to.equal(2);
    // //slot 2
    expect(requests[1].cp).to.equal('p20000');
    expect(requests[1].ct).to.equal('t20000');
    expect(requests[1].cf).to.equal('728x90');
    expect(requests[1].ca).to.equal(0);
    expect(requests[1].cn).to.equal(1);
    expect(requests[1].cu).to.equal('http://bid.contextweb.com/header/tag');
    expect(requests[1].adUnitId).to.equal('/DfpAccount2/slot2');
    expect(requests[1]).to.have.property('callback');
  });

  it('Verify bid', () => {
    responses['t10000'] = {
      html: 'This is an Ad',
      bidCpm: 1.25
    };
    pulsepointAdapter.callBids(slotConfigs);
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
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulsepoint');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
    expect(bid.adId).to.equal('bid12345');
  });

  it('Verify PulsePoint library is downloaded if nessesary', () => {
    resetPulsepointLib();
    pulsepointAdapter.callBids(slotConfigs);
    let libraryLoadCall = adLoader.loadScript.firstCall.args[0];
    let callback = adLoader.loadScript.firstCall.args[1];
    expect(libraryLoadCall).to.equal('http://tag-st.contextweb.com/getjs.static.js');
    expect(callback).to.be.a('function');
  });

  it('Verify Bids get processed after PulsePoint library downloads', () => {
    resetPulsepointLib();
    pulsepointAdapter.callBids(slotConfigs);
    let callback = adLoader.loadScript.firstCall.args[1];
    let bidCall = bidManager.addBidResponse.firstCall;
    expect(callback).to.be.a('function');
    expect(bidCall).to.be.a('null');
    //the library load should initialize pulsepoint lib
    initPulsepointLib();
    callback();
    expect(requests.length).to.equal(2);
    bidCall = bidManager.addBidResponse.firstCall;
    expect(bidCall).to.be.a('object');
    expect(bidCall.args[0]).to.equal('/DfpAccount1/slot1');
    expect(bidCall.args[1]).to.be.a('object');
  });

  //related to issue https://github.com/prebid/Prebid.js/issues/866
  it('Verify Passbacks when window.pp is not available', () => {
    window.pp = function() {};
    pulsepointAdapter.callBids(slotConfigs);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    //verify that we passed back without exceptions, should window.pp be already taken.
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulsepoint');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
    expect(bid.adId).to.equal('bid12345');
  });

});
