import {expect} from 'chai';
import PulsePointAdapter from 'modules/pulsepointLiteBidAdapter';
import bidManager from 'src/bidmanager';
import {getTopWindowLocation} from 'src/utils';
import * as ajax from 'src/ajax';

describe('PulsePoint Lite Adapter Tests', () => {
  let pulsepointAdapter = new PulsePointAdapter();
  let slotConfigs;
  let nativeSlotConfig;
  let ajaxStub;

  beforeEach(() => {
    sinon.stub(bidManager, 'addBidResponse');
    ajaxStub = sinon.stub(ajax, 'ajax');

    slotConfigs = {
      bidderCode: 'pulseLite',
      bids: [
        {
          placementCode: '/DfpAccount1/slot1',
          bidId: 'bid12345',
          params: {
            cp: 'p10000',
            ct: 't10000',
            cf: '300x250'
          }
        }, {
          placementCode: '/DfpAccount2/slot2',
          bidId: 'bid23456',
          params: {
            cp: 'p10000',
            ct: 't20000',
            cf: '728x90'
          }
        }
      ]
    };
    nativeSlotConfig = {
      bidderCode: 'pulseLite',
      bids: [
        {
          placementCode: '/DfpAccount1/slot3',
          bidId: 'bid12345',
          nativeParams: {
            title: { required: true, len: 200 },
            image: { wmin: 100 },
            sponsoredBy: { }
          },
          params: {
            cp: 'p10000',
            ct: 't10000'
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
    expect(ajaxStub.callCount).to.equal(1);
    expect(ajaxStub.firstCall.args[0]).to.equal('http://bid.contextweb.com/header/ortb');
    const ortbRequest = JSON.parse(ajaxStub.firstCall.args[2]);
    // site object
    expect(ortbRequest.site).to.not.equal(null);
    expect(ortbRequest.site.publisher).to.not.equal(null);
    expect(ortbRequest.site.publisher.id).to.equal('p10000');
    expect(ortbRequest.site.ref).to.equal(window.top.document.referrer);
    expect(ortbRequest.site.page).to.equal(getTopWindowLocation().href);
    expect(ortbRequest.imp).to.have.lengthOf(2);
    // device object
    expect(ortbRequest.device).to.not.equal(null);
    expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
    // slot 1
    expect(ortbRequest.imp[0].tagid).to.equal('t10000');
    expect(ortbRequest.imp[0].banner).to.not.equal(null);
    expect(ortbRequest.imp[0].banner.w).to.equal(300);
    expect(ortbRequest.imp[0].banner.h).to.equal(250);
    // slot 2
    expect(ortbRequest.imp[1].tagid).to.equal('t20000');
    expect(ortbRequest.imp[1].banner).to.not.equal(null);
    expect(ortbRequest.imp[1].banner.w).to.equal(728);
    expect(ortbRequest.imp[1].banner.h).to.equal(90);
  });

  it('Verify bid', () => {
    pulsepointAdapter.callBids(slotConfigs);
    // trigger a mock ajax callback with bid.
    const ortbRequest = JSON.parse(ajaxStub.firstCall.args[2]);
    ajaxStub.firstCall.args[1](JSON.stringify({
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad'
        }]
      }]
    }));
    expect(bidManager.addBidResponse.callCount).to.equal(2);
    // verify first bid
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulseLite');
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('This is an Ad');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.adId).to.equal('bid12345');
    // verify passback on 2nd impression.
    placement = bidManager.addBidResponse.secondCall.args[0];
    bid = bidManager.addBidResponse.secondCall.args[1];
    expect(placement).to.equal('/DfpAccount2/slot2');
    expect(bid.adId).to.equal('bid23456');
    expect(bid.bidderCode).to.equal('pulseLite');
    expect(bid.cpm).to.be.undefined;
  });

  it('Verify full passback', () => {
    pulsepointAdapter.callBids(slotConfigs);
    // trigger a mock ajax callback with no bid.
    ajaxStub.firstCall.args[1](null);
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot1');
    expect(bid.bidderCode).to.equal('pulseLite');
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
    expect(bid.bidderCode).to.equal('pulseLite');
    expect(bid).to.not.have.property('ad');
    expect(bid).to.not.have.property('cpm');
    expect(bid.adId).to.equal('bid12345');
  });

  it('Verify Native request', () => {
    pulsepointAdapter.callBids(nativeSlotConfig);
    expect(ajaxStub.callCount).to.equal(1);
    expect(ajaxStub.firstCall.args[0]).to.equal('http://bid.contextweb.com/header/ortb');
    const ortbRequest = JSON.parse(ajaxStub.firstCall.args[2]);
    // native impression
    expect(ortbRequest.imp[0].tagid).to.equal('t10000');
    expect(ortbRequest.imp[0].banner).to.equal(null);
    expect(ortbRequest.imp[0].native).to.not.equal(null);
    expect(ortbRequest.imp[0].native.ver).to.equal('1.1');
    expect(ortbRequest.imp[0].native.request).to.not.equal(null);
    // native request assets
    const nativeRequest = JSON.parse(ortbRequest.imp[0].native.request);
    expect(nativeRequest).to.not.equal(null);
    expect(nativeRequest.assets).to.have.lengthOf(3);
    // title asset
    expect(nativeRequest.assets[0].id).to.equal(1);
    expect(nativeRequest.assets[0].required).to.equal(1);
    expect(nativeRequest.assets[0].title).to.not.equal(null);
    expect(nativeRequest.assets[0].title.len).to.equal(200);
    // data asset
    expect(nativeRequest.assets[1].id).to.equal(2);
    expect(nativeRequest.assets[1].required).to.equal(0);
    expect(nativeRequest.assets[1].title).to.be.undefined;
    expect(nativeRequest.assets[1].data).to.not.equal(null);
    expect(nativeRequest.assets[1].data.type).to.equal(1);
    expect(nativeRequest.assets[1].data.len).to.equal(50);
    // image asset
    expect(nativeRequest.assets[2].id).to.equal(3);
    expect(nativeRequest.assets[2].required).to.equal(0);
    expect(nativeRequest.assets[2].title).to.be.undefined;
    expect(nativeRequest.assets[2].img).to.not.equal(null);
    expect(nativeRequest.assets[2].img.wmin).to.equal(100);
    expect(nativeRequest.assets[2].img.hmin).to.equal(150);
    expect(nativeRequest.assets[2].img.type).to.equal(3);
  });

  it('Verify Native response', () => {
    pulsepointAdapter.callBids(nativeSlotConfig);
    expect(ajaxStub.callCount).to.equal(1);
    expect(ajaxStub.firstCall.args[0]).to.equal('http://bid.contextweb.com/header/ortb');
    const ortbRequest = JSON.parse(ajaxStub.firstCall.args[2]);
    const nativeResponse = {
      native: {
        assets: [
          { title: { text: 'Ad Title'} },
          { data: { type: 1, value: 'Sponsored By: Brand' }},
          { img: { type: 3, url: 'http://images.cdn.brand.com/123' } }
        ],
        link: { url: 'http://brand.clickme.com/' },
        imptrackers: [ 'http://imp1.trackme.com/', 'http://imp1.contextweb.com/' ]
      }
    };
    ajaxStub.firstCall.args[1](JSON.stringify({
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: JSON.stringify(nativeResponse)
        }]
      }]
    }));
    // verify bid
    let placement = bidManager.addBidResponse.firstCall.args[0];
    let bid = bidManager.addBidResponse.firstCall.args[1];
    expect(placement).to.equal('/DfpAccount1/slot3');
    expect(bid.bidderCode).to.equal('pulseLite');
    expect(bid.cpm).to.equal(1.25);
    expect(bid.adId).to.equal('bid12345');
    expect(bid.ad).to.be.undefined;
    expect(bid.mediaType).to.equal('native');
    expect(bid.native).to.not.equal(null);
    expect(bid.native.title).to.equal('Ad Title');
    expect(bid.native.sponsoredBy).to.equal('Sponsored By: Brand');
    expect(bid.native.image).to.equal('http://images.cdn.brand.com/123');
    expect(bid.native.clickUrl).to.equal(encodeURIComponent('http://brand.clickme.com/'));
    expect(bid.native.impressionTrackers).to.have.lengthOf(2);
    expect(bid.native.impressionTrackers[0]).to.equal('http://imp1.trackme.com/');
    expect(bid.native.impressionTrackers[1]).to.equal('http://imp1.contextweb.com/');
  });

  it('Verify createNew', function () {
    const adapter = PulsePointAdapter.createNew();
    expect(adapter).to.have.property('callBids');
  });
});
