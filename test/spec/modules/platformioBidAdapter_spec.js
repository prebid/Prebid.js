import {expect} from 'chai';
import {spec} from 'modules/platformioBidAdapter';
import {getTopWindowLocation} from 'src/utils';
import {newBidder} from 'src/adapters/bidderFactory';

describe('Platform.io Adapter Tests', () => {
  const slotConfigs = [{
    placementCode: '/DfpAccount1/slot1',
    bidId: 'bid12345',
    params: {
      pubId: '29521',
      siteId: '26047',
      placementId: '123',
      size: '300x250',
      bidFloor: '0.001'
    }
  }, {
    placementCode: '/DfpAccount2/slot2',
    bidId: 'bid23456',
    params: {
      pubId: '29521',
      siteId: '26047',
      placementId: '1234',
      size: '728x90',
      bidFloor: '0.000001'
    }
  }];
  const nativeSlotConfig = [{
    placementCode: '/DfpAccount1/slot3',
    bidId: 'bid12345',
    nativeParams: {
      title: { required: true, len: 200 },
      body: {},
      image: { wmin: 100 },
      sponsoredBy: { },
      icon: { }
    },
    params: {
      pubId: '29521',
      placementId: '123',
      siteId: '26047'
    }
  }];

  it('Verify build request', () => {
    const request = spec.buildRequests(slotConfigs);
    expect(request.url).to.equal('//piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // site object
    expect(ortbRequest.site).to.not.equal(null);
    expect(ortbRequest.site.publisher).to.not.equal(null);
    expect(ortbRequest.site.publisher.id).to.equal('29521');
    expect(ortbRequest.site.ref).to.equal(window.top.document.referrer);
    expect(ortbRequest.site.page).to.equal(getTopWindowLocation().href);
    expect(ortbRequest.imp).to.have.lengthOf(2);
    // device object
    expect(ortbRequest.device).to.not.equal(null);
    expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
    // slot 1
    expect(ortbRequest.imp[0].tagid).to.equal('123');
    expect(ortbRequest.imp[0].banner).to.not.equal(null);
    expect(ortbRequest.imp[0].banner.w).to.equal(300);
    expect(ortbRequest.imp[0].banner.h).to.equal(250);
    expect(ortbRequest.imp[0].bidfloor).to.equal('0.001');
    // slot 2
    expect(ortbRequest.imp[1].tagid).to.equal('1234');
    expect(ortbRequest.imp[1].banner).to.not.equal(null);
    expect(ortbRequest.imp[1].banner.w).to.equal(728);
    expect(ortbRequest.imp[1].banner.h).to.equal(90);
    expect(ortbRequest.imp[1].bidfloor).to.equal('0.000001');
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
      }],
      cur: 'USD'
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
    expect(bid.creativeId).to.equal('bid12345');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(360);
  });

  it('Verify full passback', () => {
    const request = spec.buildRequests(slotConfigs);
    const bids = spec.interpretResponse({ body: null }, request)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verify Native request', () => {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // // native impression
    expect(ortbRequest.imp[0].tagid).to.equal('123');
    const nativePart = ortbRequest.imp[0]['native'];
    expect(nativePart).to.not.equal(null);
    expect(nativePart.ver).to.equal('1.1');
    expect(nativePart.request).to.not.equal(null);
    // native request assets
    const nativeRequest = JSON.parse(ortbRequest.imp[0]['native'].request);
    expect(nativeRequest).to.not.equal(null);
    expect(nativeRequest.assets).to.have.lengthOf(5);
    expect(nativeRequest.assets[0].id).to.equal(1);
    expect(nativeRequest.assets[1].id).to.equal(2);
    expect(nativeRequest.assets[2].id).to.equal(3);
    expect(nativeRequest.assets[3].id).to.equal(4);
    expect(nativeRequest.assets[4].id).to.equal(5);
    expect(nativeRequest.assets[0].required).to.equal(1);
    expect(nativeRequest.assets[0].title).to.not.equal(null);
    expect(nativeRequest.assets[0].title.len).to.equal(200);
    expect(nativeRequest.assets[1].title).to.be.undefined;
    expect(nativeRequest.assets[1].data).to.not.equal(null);
    expect(nativeRequest.assets[1].data.type).to.equal(2);
    expect(nativeRequest.assets[1].data.len).to.equal(200);
    expect(nativeRequest.assets[2].required).to.equal(0);
    expect(nativeRequest.assets[3].img).to.not.equal(null);
    expect(nativeRequest.assets[3].img.wmin).to.equal(50);
    expect(nativeRequest.assets[3].img.hmin).to.equal(50);
    expect(nativeRequest.assets[3].img.type).to.equal(1);
    expect(nativeRequest.assets[4].img).to.not.equal(null);
    expect(nativeRequest.assets[4].img.wmin).to.equal(100);
    expect(nativeRequest.assets[4].img.hmin).to.equal(150);
    expect(nativeRequest.assets[4].img.type).to.equal(3);
  });

  it('Verify Native response', () => {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('//piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    const nativeResponse = {
      'native': {
        assets: [
          { id: 1, title: { text: 'Ad Title' } },
          { id: 2, data: { value: 'Test description' } },
          { id: 3, data: { value: 'Brand' } },
          { id: 4, img: { url: 'https://s3.amazonaws.com/adx1public/creatives_icon.png' } },
          { id: 5, img: { url: 'https://s3.amazonaws.com/adx1public/creatives_image.png' } }
        ],
        link: { url: 'http://brand.com/' }
      }
    };
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          nurl: 'http://rtb.adx1.com/log',
          adm: JSON.stringify(nativeResponse)
        }]
      }],
      cur: 'USD',
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
    expect(nativeBid.sponsoredBy).to.equal('Brand');
    expect(nativeBid.icon).to.equal('https://s3.amazonaws.com/adx1public/creatives_icon.png');
    expect(nativeBid.image).to.equal('https://s3.amazonaws.com/adx1public/creatives_image.png');
    expect(nativeBid.clickUrl).to.equal(encodeURIComponent('http://brand.com/'));
    expect(nativeBid.impressionTrackers).to.have.lengthOf(1);
    expect(nativeBid.impressionTrackers[0]).to.equal('http://rtb.adx1.com/log');
  });

  it('Verifies bidder code', () => {
    expect(spec.code).to.equal('platformio');
  });

  it('Verifies supported media types', () => {
    expect(spec.supportedMediaTypes).to.have.lengthOf(1);
    expect(spec.supportedMediaTypes[0]).to.equal('native');
  });

  it('Verifies if bid request valid', () => {
    expect(spec.isBidRequestValid(slotConfigs[0])).to.equal(true);
    expect(spec.isBidRequestValid(slotConfigs[1])).to.equal(true);
  });
});
