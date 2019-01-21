/* eslint dot-notation:0, quote-props:0 */
import {expect} from 'chai';
import {spec} from 'modules/pulsepointBidAdapter';
import {getTopWindowLocation} from 'src/utils';
import {newBidder} from 'src/adapters/bidderFactory';

describe('PulsePoint Adapter Tests', function () {
  const slotConfigs = [{
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
  const nativeSlotConfig = [{
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
  const appSlotConfig = [{
    placementCode: '/DfpAccount1/slot3',
    bidId: 'bid12345',
    params: {
      cp: 'p10000',
      ct: 't10000',
      app: {
        bundle: 'com.pulsepoint.apps',
        storeUrl: 'http://pulsepoint.com/apps',
        domain: 'pulsepoint.com',
      }
    }
  }];

  it('Verify build request', function () {
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

  it('Verify parse response', function () {
    const request = spec.buildRequests(slotConfigs);
    const ortbRequest = JSON.parse(request.data);
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad',
          crid: 'Creative#123'
        }]
      }]
    };
    const bids = spec.interpretResponse({ body: ortbResponse }, request);
    expect(bids).to.have.lengthOf(1);
    // verify first bid
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('This is an Ad');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.adId).to.equal('bid12345');
    expect(bid.creative_id).to.equal('Creative#123');
    expect(bid.creativeId).to.equal('Creative#123');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(20);
  });

  it('Verify use ttl in ext', function () {
    const request = spec.buildRequests(slotConfigs);
    const ortbRequest = JSON.parse(request.data);
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad',
          ext: {
            ttl: 30,
            netRevenue: false,
            currency: 'INR'
          }
        }]
      }]
    };
    const bids = spec.interpretResponse({ body: ortbResponse }, request);
    expect(bids).to.have.lengthOf(1);
    // verify first bid
    const bid = bids[0];
    expect(bid.ttl).to.equal(30);
    expect(bid.netRevenue).to.equal(false);
    expect(bid.currency).to.equal('INR');
  });

  it('Verify full passback', function () {
    const request = spec.buildRequests(slotConfigs);
    const bids = spec.interpretResponse({ body: null }, request)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verify Native request', function () {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // native impression
    expect(ortbRequest.imp[0].tagid).to.equal('t10000');
    expect(ortbRequest.imp[0].banner).to.equal(null);
    const nativePart = ortbRequest.imp[0]['native'];
    expect(nativePart).to.not.equal(null);
    expect(nativePart.ver).to.equal('1.1');
    expect(nativePart.request).to.not.equal(null);
    // native request assets
    const nativeRequest = JSON.parse(ortbRequest.imp[0]['native'].request);
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

  it('Verify Native response', function () {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    const nativeResponse = {
      'native': {
        assets: [
          { title: { text: 'Ad Title' } },
          { data: { type: 1, value: 'Sponsored By: Brand' } },
          { img: { type: 3, url: 'http://images.cdn.brand.com/123' } }
        ],
        link: { url: 'http://brand.clickme.com/' },
        imptrackers: ['http://imp1.trackme.com/', 'http://imp1.contextweb.com/']
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
    const bids = spec.interpretResponse({ body: ortbResponse }, request);
    // verify bid
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.25);
    expect(bid.adId).to.equal('bid12345');
    expect(bid.ad).to.be.undefined;
    expect(bid.mediaType).to.equal('native');
    const nativeBid = bid['native'];
    expect(nativeBid).to.not.equal(null);
    expect(nativeBid.title).to.equal('Ad Title');
    expect(nativeBid.sponsoredBy).to.equal('Sponsored By: Brand');
    expect(nativeBid.image).to.equal('http://images.cdn.brand.com/123');
    expect(nativeBid.clickUrl).to.equal(encodeURIComponent('http://brand.clickme.com/'));
    expect(nativeBid.impressionTrackers).to.have.lengthOf(2);
    expect(nativeBid.impressionTrackers[0]).to.equal('http://imp1.trackme.com/');
    expect(nativeBid.impressionTrackers[1]).to.equal('http://imp1.contextweb.com/');
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('pulsepoint');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(2);
    expect(spec.aliases[0]).to.equal('pulseLite');
    expect(spec.aliases[1]).to.equal('pulsepointLite');
  });

  it('Verifies supported media types', function () {
    expect(spec.supportedMediaTypes).to.have.lengthOf(2);
    expect(spec.supportedMediaTypes[1]).to.equal('native');
  });

  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(slotConfigs[0])).to.equal(true);
    expect(spec.isBidRequestValid(slotConfigs[1])).to.equal(true);
    expect(spec.isBidRequestValid(nativeSlotConfig[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { ct: 123 } })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { cp: 123 } })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { ct: 123, cp: 234 } })).to.equal(true);
  });

  it('Verifies sync options', function () {
    expect(spec.getUserSyncs({})).to.be.undefined;
    expect(spec.getUserSyncs({ iframeEnabled: false })).to.be.undefined;
    const options = spec.getUserSyncs({ iframeEnabled: true });
    expect(options).to.not.be.undefined;
    expect(options).to.have.lengthOf(1);
    expect(options[0].type).to.equal('iframe');
    expect(options[0].url).to.equal('//bh.contextweb.com/visitormatch');
  });

  it('Verifies image pixel sync', function () {
    const options = spec.getUserSyncs({ pixelEnabled: true });
    expect(options).to.not.be.undefined;
    expect(options).to.have.lengthOf(1);
    expect(options[0].type).to.equal('image');
    expect(options[0].url).to.equal('//bh.contextweb.com/visitormatch/prebid');
  });

  it('Verify app requests', function () {
    const request = spec.buildRequests(appSlotConfig);
    const ortbRequest = JSON.parse(request.data);
    // site object
    expect(ortbRequest.site).to.equal(null);
    expect(ortbRequest.app).to.not.be.null;
    expect(ortbRequest.app.publisher).to.not.equal(null);
    expect(ortbRequest.app.publisher.id).to.equal('p10000');
    expect(ortbRequest.app.bundle).to.equal('com.pulsepoint.apps');
    expect(ortbRequest.app.storeurl).to.equal('http://pulsepoint.com/apps');
    expect(ortbRequest.app.domain).to.equal('pulsepoint.com');
  });

  it('Verify GDPR', function () {
    const bidderRequest = {
      gdprConsent: {
        gdprApplies: true,
        consentString: 'serialized_gpdr_data'
      }
    };
    const request = spec.buildRequests(slotConfigs, bidderRequest);
    expect(request.url).to.equal('//bid.contextweb.com/header/ortb');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // user object
    expect(ortbRequest.user).to.not.equal(null);
    expect(ortbRequest.user.ext).to.not.equal(null);
    expect(ortbRequest.user.ext.consent).to.equal('serialized_gpdr_data');
    // regs object
    expect(ortbRequest.regs).to.not.equal(null);
    expect(ortbRequest.regs.ext).to.not.equal(null);
    expect(ortbRequest.regs.ext.gdpr).to.equal(1);
  });
});
