import {expect} from 'chai';
import {spec} from 'modules/platformioBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('Platform.io Adapter Tests', function () {
  const slotConfigs = [{
    placementCode: '/DfpAccount1/slot1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bidId: 'bid12345',
    mediaType: 'banner',
    params: {
      pubId: '29521',
      siteId: '26047',
      placementId: '123',
      bidFloor: '0.001',
      ifa: 'IFA',
      latitude: '40.712775',
      longitude: '-74.005973'
    }
  }, {
    placementCode: '/DfpAccount2/slot2',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]]
      }
    },
    bidId: 'bid23456',
    mediaType: 'banner',
    params: {
      pubId: '29521',
      siteId: '26047',
      placementId: '1234',
      bidFloor: '0.000001',
    }
  }];
  const nativeSlotConfig = [{
    placementCode: '/DfpAccount1/slot3',
    bidId: 'bid12345',
    mediaType: 'native',
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
  const videoSlotConfig = [{
    placementCode: '/DfpAccount1/slot4',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]]
      }
    },
    bidId: 'bid12345678',
    mediaType: 'video',
    video: {
      skippable: true
    },
    params: {
      pubId: '29521',
      placementId: '1234567',
      siteId: '26047',
    }
  }];
  const appSlotConfig = [{
    placementCode: '/DfpAccount1/slot5',
    bidId: 'bid12345',
    params: {
      pubId: '29521',
      placementId: '1234',
      app: {
        id: '1111',
        name: 'app name',
        bundle: 'io.platform.apps',
        storeUrl: 'https://platform.io/apps',
        domain: 'platform.io'
      }
    }
  }];

  it('Verify build request', function () {
    const request = spec.buildRequests(slotConfigs);
    expect(request.url).to.equal('https://piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // site object
    expect(ortbRequest.site).to.not.equal(null);
    expect(ortbRequest.site.publisher).to.not.equal(null);
    expect(ortbRequest.site.publisher.id).to.equal('29521');
    expect(ortbRequest.site.ref).to.equal(window.top.document.referrer);
    expect(ortbRequest.site.page).to.equal(window.location.href);
    expect(ortbRequest.imp).to.have.lengthOf(2);
    // device object
    expect(ortbRequest.device).to.not.equal(null);
    expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
    expect(ortbRequest.device.ifa).to.equal('IFA');
    expect(ortbRequest.device.geo.lat).to.equal('40.712775');
    expect(ortbRequest.device.geo.lon).to.equal('-74.005973');
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

  it('Verify parse response', function () {
    const request = spec.buildRequests(slotConfigs);
    const ortbRequest = JSON.parse(request.data);
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad',
          w: 300,
          h: 250
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

  it('Verify full passback', function () {
    const request = spec.buildRequests(slotConfigs);
    const bids = spec.interpretResponse({ body: null }, request)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verify Native request', function () {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('https://piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // native impression
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

  it('Verify Native response', function () {
    const request = spec.buildRequests(nativeSlotConfig);
    expect(request.url).to.equal('https://piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    const nativeResponse = {
      'native': {
        assets: [
          { id: 1, title: { text: 'Ad Title' } },
          { id: 2, data: { value: 'Test description' } },
          { id: 3, data: { value: 'Brand' } },
          { id: 4, img: { url: 'https://adx1public.s3.amazonaws.com/creatives_icon.png', w: 100, h: 100 } },
          { id: 5, img: { url: 'https://adx1public.s3.amazonaws.com/creatives_image.png', w: 300, h: 300 } }
        ],
        link: { url: 'https://brand.com/' }
      }
    };
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          nurl: 'https://rtb.adx1.com/log',
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
    expect(nativeBid.icon.url).to.equal('https://adx1public.s3.amazonaws.com/creatives_icon.png');
    expect(nativeBid.image.url).to.equal('https://adx1public.s3.amazonaws.com/creatives_image.png');
    expect(nativeBid.image.width).to.equal(300);
    expect(nativeBid.image.height).to.equal(300);
    expect(nativeBid.icon.width).to.equal(100);
    expect(nativeBid.icon.height).to.equal(100);
    expect(nativeBid.clickUrl).to.equal(encodeURIComponent('https://brand.com/'));
    expect(nativeBid.impressionTrackers).to.have.lengthOf(1);
    expect(nativeBid.impressionTrackers[0]).to.equal('https://rtb.adx1.com/log');
  });

  it('Verify Video request', function () {
    const request = spec.buildRequests(videoSlotConfig);
    expect(request.url).to.equal('https://piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const videoRequest = JSON.parse(request.data);
    // site object
    expect(videoRequest.site).to.not.equal(null);
    expect(videoRequest.site.publisher.id).to.equal('29521');
    expect(videoRequest.site.ref).to.equal(window.top.document.referrer);
    expect(videoRequest.site.page).to.equal(window.location.href);
    // device object
    expect(videoRequest.device).to.not.equal(null);
    expect(videoRequest.device.ua).to.equal(navigator.userAgent);
    // slot 1
    expect(videoRequest.imp[0].tagid).to.equal('1234567');
    expect(videoRequest.imp[0].video).to.not.equal(null);
    expect(videoRequest.imp[0].video.w).to.equal(640);
    expect(videoRequest.imp[0].video.h).to.equal(480);
    expect(videoRequest.imp[0].banner).to.equal(null);
    expect(videoRequest.imp[0].native).to.equal(null);
  });

  it('Verify parse video response', function () {
    const request = spec.buildRequests(videoSlotConfig);
    const videoRequest = JSON.parse(request.data);
    const videoResponse = {
      seatbid: [{
        bid: [{
          impid: videoRequest.imp[0].id,
          price: 1.90,
          adm: 'https://vid.example.com/9876',
          crid: '510511_754567308'
        }]
      }],
      cur: 'USD'
    };
    const bids = spec.interpretResponse({ body: videoResponse }, request);
    expect(bids).to.have.lengthOf(1);
    // verify first bid
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.90);
    expect(bid.vastUrl).to.equal('https://vid.example.com/9876');
    expect(bid.crid).to.equal('510511_754567308');
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.adId).to.equal('bid12345678');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(360);
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('platformio');
  });

  it('Verifies supported media types', function () {
    expect(spec.supportedMediaTypes).to.have.lengthOf(3);
    expect(spec.supportedMediaTypes[0]).to.equal('banner');
    expect(spec.supportedMediaTypes[1]).to.equal('native');
    expect(spec.supportedMediaTypes[2]).to.equal('video');
  });

  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(slotConfigs[0])).to.equal(true);
    expect(spec.isBidRequestValid(slotConfigs[1])).to.equal(true);
    expect(spec.isBidRequestValid(nativeSlotConfig[0])).to.equal(true);
    expect(spec.isBidRequestValid(videoSlotConfig[0])).to.equal(true);
  });

  it('Verify app requests', function () {
    const request = spec.buildRequests(appSlotConfig);
    const ortbRequest = JSON.parse(request.data);
    expect(ortbRequest.site).to.equal(null);
    expect(ortbRequest.app).to.not.be.null;
    expect(ortbRequest.app.publisher).to.not.equal(null);
    expect(ortbRequest.app.publisher.id).to.equal('29521');
    expect(ortbRequest.app.id).to.equal('1111');
    expect(ortbRequest.app.name).to.equal('app name');
    expect(ortbRequest.app.bundle).to.equal('io.platform.apps');
    expect(ortbRequest.app.storeurl).to.equal('https://platform.io/apps');
    expect(ortbRequest.app.domain).to.equal('platform.io');
  });

  it('Verify GDPR', function () {
    const bidderRequest = {
      gdprConsent: {
        gdprApplies: true,
        consentString: 'serialized_gpdr_data'
      }
    };
    const request = spec.buildRequests(slotConfigs, bidderRequest);
    expect(request.url).to.equal('https://piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    expect(ortbRequest.user).to.not.equal(null);
    expect(ortbRequest.user.ext).to.not.equal(null);
    expect(ortbRequest.user.ext.consent).to.equal('serialized_gpdr_data');
    expect(ortbRequest.regs).to.not.equal(null);
    expect(ortbRequest.regs.ext).to.not.equal(null);
    expect(ortbRequest.regs.ext.gdpr).to.equal(1);
  });
});
