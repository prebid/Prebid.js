import {expect} from 'chai';
import {spec} from 'modules/pulsepointLiteBidAdapter';
import bidManager from 'src/bidmanager';
import {getTopWindowLocation} from 'src/utils';
import {newBidder} from 'src/adapters/bidderFactory';

describe('PulsePoint Lite Adapter Tests', () => {
  let slotConfigs;
  let nativeSlotConfig;

  beforeEach(() => {
    slotConfigs = [{
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
    }];
    nativeSlotConfig = [{
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
    }];
  });

  it('Verify build request', () => {
    const request = spec.buildRequests(slotConfigs);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
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

  it('Verify parse response', () => {
    const request = spec.buildRequests(slotConfigs);
    const ortbRequest = JSON.parse(request.data);
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad'
        }]
      }]
    };
    const bids = spec.interpretResponse(ortbResponse, request);
    expect(bids).to.have.lengthOf(1);
    // verify first bid
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('This is an Ad');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.adId).to.equal('bid12345');
  });

  it('Verify full passback', () => {
    const request = spec.buildRequests(slotConfigs);
    const bids = spec.interpretResponse(null, request)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verify Native request', () => {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
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
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
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
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: JSON.stringify(nativeResponse)
        }]
      }]
    };
    const bids = spec.interpretResponse(ortbResponse, request);
    // verify bid
    const bid = bids[0];
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
});
