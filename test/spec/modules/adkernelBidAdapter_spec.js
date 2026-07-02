import { expect } from 'chai';
import { spec } from 'modules/adkernelBidAdapter';
import * as utils from 'src/utils';
import { NATIVE, BANNER, VIDEO } from 'src/mediaTypes';
import { config } from 'src/config';
import { parseDomain } from '../../../src/refererDetection.js';
import { mergeDeep } from "src/utils";

const UNIT_BANNER = {
  bidder: 'adkernel',
  params: { zoneId: 1, host: 'rtb.adkernel.com' },
  adUnitCode: 'ad-unit-1',
  bidId: 'Bid_01',
  bidderRequestId: 'req-001',
  auctionId: 'auc-001',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 200]],
      pos: 1
    }
  }
};
const UNIT_VIDEO = {
  bidder: 'adkernel',
  transactionId: 'transaction-id',
  bidId: 'Bid_01',
  bidderRequestId: 'req-001',
  auctionId: 'auc-001',
  params: { zoneId: 1, host: 'rtb.adkernel.com' },
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      api: [1, 2],
      placement: 1,
      plcmt: 1,
      skip: 1,
      pos: 1
    }
  },
  adUnitCode: 'ad-unit-1'
};
const UNIT_MULTIFORMAT = merge(UNIT_BANNER, UNIT_VIDEO);
const UNIT_NATIVE = {
  bidder: 'adkernel',
  params: { zoneId: 1, host: 'rtb.adkernel.com' },
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 80
      },
      body: {
        required: true
      },
      body2: {
        required: true
      },
      icon: {
        required: true,
        aspect_ratios: [{ min_width: 50, min_height: 50 }]
      },
      image: {
        required: true,
        sizes: [300, 200]
      },
      clickUrl: {
        required: true
      },
      rating: {
        required: false
      },
      price: {
        required: false
      },
      privacyLink: {
        required: false
      },
      cta: {
        required: false
      },
      sponsoredBy: {
        required: false
      },
      displayUrl: {
        required: false
      }
    }
  },
  nativeOrtbRequest: {
    ver: '1.2',
    assets: [
      {
        id: 0, required: 1, title: { len: 80 }
      }, { id: 1, required: 1, data: { type: 2 } },
      {
        id: 2, required: 1, data: { type: 10 }
      }, {
        id: 3, required: 1, img: { type: 1, wmin: 50, hmin: 50 }
      }, {
        id: 4, required: 1, img: { type: 3, w: 300, h: 200 }
      }, {
        id: 5, required: 0, data: { type: 3 }
      }, {
        id: 6, required: 0, data: { type: 6 }
      }, {
        id: 7, required: 0, data: { type: 12 }
      }, {
        id: 8, required: 0, data: { type: 1 }
      }, {
        id: 9, required: 0, data: { type: 11 }
      }
    ],
    privacy: 1
  },
  adUnitCode: 'ad-unit-1',
  transactionId: 'transaction-id',
  bidId: 'Bid_01',
  bidderRequestId: 'req-001',
  auctionId: 'auc-001'
};
const BID_BANNER = {
  id: '1',
  impid: 'Bid_01',
  crid: '100_001',
  price: 3.01,
  nurl: 'https://rtb.com/win?i=ZjKoPYSFI3Y_0',
  adm: '<!-- admarkup here -->',
  w: 300,
  h: 250,
  dealid: 'deal',
  mtype: 1
};
const BID_VIDEO_NURL = {
  id: 'sZSYq5zYMxo_0',
  impid: 'Bid_01',
  crid: '100_003',
  price: 0.00145,
  adid: '158801',
  nurl: 'https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl',
  cid: '16855',
  mtype: 2
};
const BID_VIDEO_ADM = {
  id: 'sZSYq5zYMxo_0',
  impid: 'Bid_01',
  crid: '100_003',
  price: 0.00145,
  adid: '158801',
  adm: '<VAST></VAST>',
  nurl: 'https://rtb.com/win?i=sZSYq5zYMxo_0',
  cid: '16855',
  mtype: 2
};
const BID_USER_SYNC_ONLY = {
  id: 'nobid1',
  ext: {
    adk_usersync: [{ type: 2, url: 'https://adk.sync.com/sync' }]
  }
};
const BID_NATIVE = {
  id: 'someid_01',
  impid: 'Bid_01',
  price: 2.25,
  adid: '4',
  adm: JSON.stringify({
    native: {
      assets: [
        { id: 0, title: { text: 'Title' } },
        { id: 3, data: { value: 'Description' } },
        { id: 4, data: { value: 'Additional description' } },
        { id: 1, img: { url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0&imgt=icon', w: 50, h: 50 } },
        { id: 2, img: { url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0', w: 300, h: 200 } },
        { id: 5, data: { value: 'Sponsor.com' } },
        { id: 14, data: { value: 'displayurl.com' } }
      ],
      link: { url: 'http://rtb.com/click?i=pTuOlf5KHUo_0' },
      imptrackers: ['http://rtb.com/win?i=pTuOlf5KHUo_0&f=imp']
    }
  }),
  adomain: ['displayurl.com'],
  mtype: 4,
  cid: '1',
  crid: '4'
};
const DEFAULT_BIDDER_REQUEST = buildBidderRequest();

describe('Adkernel adapter', function () {
  var sandbox;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('input parameters validation', function () {
    const BASE_ADUNIT = {
      bidder: 'adkernel',
      params: {},
      adUnitCode: 'ad-unit-1',
      bidId: 'Bid_W',
      bidderRequestId: 'req-002',
      auctionId: 'auc-002',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    };

    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid({
        bidderCode: 'adkernel'
      })).to.be.equal(false);
    });

    it('request without zone shouldn\'t issue a request', function () {
      expect(
        spec.isBidRequestValid(
          merge(BASE_ADUNIT, { params: { host: 'rtb-private.adkernel.com' } })
        )
      ).to.be.equal(false);
    });

    it('request without host shouldn\'t issue a request', function () {
      expect(spec.isBidRequestValid(
        merge(BASE_ADUNIT, { params: { zoneId: 1 } })
      )).to.be.equal(false);
    });

    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid(
        merge(BASE_ADUNIT, { params: { zoneId: 'wrong id', host: 'rtb.adkernel.com' } })
      )).to.be.equal(false);
    });

    it('valid requests should pass', () => {
      expect(spec.isBidRequestValid(
        merge(BASE_ADUNIT, { params: { zoneId: 10, host: 'rtb.adkernel.com' } })
      )).to.be.true;
    });
  });

  describe('banner request building', function () {
    let bidRequest, bidRequests;

    before(function () {
      [, bidRequests] = buildRequest([
        merge(UNIT_BANNER, {
          ortb2Imp: {
            battr: [6, 7, 9],
            pos: 2
          }
        })
      ]);
      bidRequest = bidRequests[0];
    });

    it('should be a first-price auction', function () {
      expect(bidRequest).to.have.property('at', 1);
    });

    it('should have banner object', function () {
      expect(bidRequest.imp[0]).to.have.property('banner');
    });

    it('should have id', function () {
      expect(bidRequest.imp[0]).to.have.property('id');
      expect(bidRequest.imp[0].id).to.be.eql('Bid_01');
    });

    it('should have w/h', function () {
      expect(bidRequest.imp[0].banner).to.have.property('format');
      expect(bidRequest.imp[0].banner.format).to.be.eql([{ w: 300, h: 250 }, { w: 300, h: 200 }]);
    });

    it('should respect secure connection', function () {
      expect(bidRequest.imp[0]).to.have.property('secure', 1);
    });

    it('should have tagid', function () {
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });

    it('should create proper site block', function () {
      expect(bidRequest.site).to.have.property('domain', 'example.com');
      expect(bidRequest.site).to.have.property('page', 'https://example.com/index.html');
    });

    it('should fill device with caller macro', function () {
      expect(bidRequest).to.have.property('device');
      expect(bidRequest.device).to.have.property('ip', 'caller');
      expect(bidRequest.device).to.have.property('ipv6', 'caller');
      expect(bidRequest.device).to.have.property('ua', 'caller');
    });

    it('should copy FPD to imp.banner', function() {
      expect(bidRequest.imp[0].banner).to.have.property('battr');
      expect(bidRequest.imp[0].banner.battr).to.be.eql([6, 7, 9]);
    });

    it('should respect mediatypes attributes over FPD', function() {
      expect(bidRequest.imp[0].banner).to.have.property('pos');
      expect(bidRequest.imp[0].banner.pos).to.be.eql(1);
    });

    it('shouldn\'t contain gdpr nor ccpa information for default request', function () {
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests[0]).to.not.have.property('regs');
      expect(bidRequests[0]).to.not.have.property('user');
    });

    it('should contain gdpr-related information if consent is configured', function () {
      const [, bidRequests] = buildRequest([UNIT_BANNER],
        buildBidderRequest('https://example.com/index.html', {
          gdprConsent: { gdprApplies: true, consentString: 'test-consent-string', vendorData: {} },
          uspConsent: '1YNN',
          gppConsent: { gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA', applicableSections: [2] }
        }
        ));
      const bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs.ext).to.be.eql({ 'gdpr': 1, 'us_privacy': '1YNN' });
      expect(bidRequest.regs.gpp).to.be.eql('DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(bidRequest.regs.gpp_sid).to.be.eql([2]);
      expect(bidRequest).to.have.property('user');
      expect(bidRequest.user.ext).to.be.eql({ 'consent': 'test-consent-string' });
    });

    it('should contain coppa if configured', function () {
      config.setConfig({ coppa: true });
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      const bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs).to.have.property('coppa', 1);
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      const [, bidRequests] = buildRequest([UNIT_BANNER], buildBidderRequest('https://example.com/index.html', { gdprConsent: { gdprApplies: false } }));
      const bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs.ext).to.be.eql({ 'gdpr': 0 });
      expect(bidRequest).to.not.have.property('user');
    });

    it('should forward default bidder timeout', function() {
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests[0]).to.have.property('tmax', 3000);
    });

    it('should set bidfloor if configured', function() {
      const bid = merge(UNIT_BANNER, {
        getFloor: function() {
          return {
            currency: 'USD',
            floor: 0.145
          };
        }
      });
      const [, bidRequests] = buildRequest([bid]);
      expect(bidRequests[0].imp[0]).to.have.property('bidfloor', 0.145);
    });

    it('should forward user ids if available', function() {
      const bid = merge(UNIT_BANNER, {
        userIdAsEids: [{
          source: 'crwdcntrl.net',
          uids: [{ atype: 1, id: '97d09fbba28542b7acbb6317c9534945a702b74c5993c352f332cfe83f40cdd9' }]
        }]
      });
      const [, bidRequests] = buildRequest([bid]);
      expect(bidRequests[0]).to.have.property('user');
      expect(bidRequests[0].user).to.have.property('ext');
      expect(bidRequests[0].user.ext).to.have.property('eids');
      expect(bidRequests[0].user.ext.eids).to.be.an('array').that.is.not.empty;
      expect(bidRequests[0].user.ext.eids[0]).to.have.property('source');
      expect(bidRequests[0].user.ext.eids[0]).to.have.property('uids');
    });
  });

  describe('video request building', function () {
    let bidRequests;
    before(function () {
      [, bidRequests] = buildRequest([UNIT_VIDEO]);
    });

    it('should have video object', function () {
      expect(bidRequests[0].imp[0]).to.have.property('video');
    });

    it('should have h/w', function () {
      expect(bidRequests[0].imp[0].video).to.have.property('w', 640);
      expect(bidRequests[0].imp[0].video).to.have.property('h', 480);
    });

    it('should have tagid', function () {
      expect(bidRequests[0].imp[0]).to.have.property('tagid', 'ad-unit-1');
    });

    it('should have openrtb video impression parameters', function() {
      const video = bidRequests[0].imp[0].video;
      expect(video).to.have.property('api');
      expect(video.api).to.be.eql([1, 2]);
      expect(video.placement).to.be.eql(1);
      expect(video.plcmt).to.be.eql(1);
      expect(video.skip).to.be.eql(1);
      expect(video.pos).to.be.eql(1);
    });
  });

  describe('multiformat request building', function () {
    let pbRequests, bidRequests;
    before(() => {
      [pbRequests, bidRequests] = buildRequest([UNIT_MULTIFORMAT]);
    });
    it('should contain single request', function () {
      expect(bidRequests).to.have.length(1);
    });
    it('should contain both impression', function () {
      expect(bidRequests[0].imp).to.have.length(2);
      expect(bidRequests[0].imp[0]).to.have.property('banner');
      expect(bidRequests[0].imp[1]).to.have.property('video');
      // check that splitted imps do not share same impid
      expect(bidRequests[0].imp[0].id).to.be.not.eql('Bid_01');
      expect(bidRequests[0].imp[1].id).to.be.not.eql('Bid_01');
      expect(bidRequests[0].imp[1].id).to.be.not.eql(bidRequests[0].imp[0].id);
    });
    it('should collect ads back to same requestId', function() {
      const bids = spec.interpretResponse({
        body: createRtbBidResponse(
          [
            merge(BID_BANNER, { impid: 'Bid_01b__mf' }),
            merge(BID_VIDEO_NURL, { impid: 'Bid_01v__mf' })
          ])
      }, pbRequests[0]);
      expect(bids).to.have.length(2);
      expect(bids[0].requestId).to.be.eql('Bid_01');
      expect(bids[0].mediaType).to.be.eql('banner');
      expect(bids[1].requestId).to.be.eql('Bid_01');
      expect(bids[1].mediaType).to.be.eql('video');
    });
  });

  describe('requests routing', function () {
    // let banner_unit_otherzone = extend(banner_unit, {params: extend(banner_unit.params, {zone: 2})});

    it('should issue a request for each host', function () {
      const banner_unit_otherhost = merge(UNIT_BANNER, { params: { host: 'otherhost.com' } });
      const [pbRequests] = buildRequest([UNIT_BANNER, banner_unit_otherhost]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`https://${UNIT_BANNER.params.host}/`);
      expect(pbRequests[1].url).to.have.string(`https://${banner_unit_otherhost.params.host}/`);
    });

    it('should issue a request for each zone', function () {
      const banner_unit_otherzone = merge(UNIT_BANNER, { params: { zoneId: 2 } });
      const [pbRequests] = buildRequest([UNIT_BANNER, banner_unit_otherzone]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.include(`zone=${UNIT_BANNER.params.zoneId}`);
      expect(pbRequests[1].url).to.include(`zone=${banner_unit_otherzone.params.zoneId}`);
    });
  });

  describe('User sync request signals', function() {
    it('should respect syncEnabled option', function() {
      config.setConfig({
        userSync: {
          syncEnabled: false,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0]).to.not.have.property('ext');
    });

    it('should respect all config node', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0].ext).to.have.property('adk_usersync', 1);
    });

    it('should respect exclude filter', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            },
            iframe: {
              bidders: ['adkernel'],
              filter: 'exclude'
            }
          }
        }
      });
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0].ext).to.have.property('adk_usersync', 2);
    });

    it('should respect total exclusion', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: ['adkernel'],
              filter: 'exclude'
            },
            iframe: {
              bidders: ['adkernel'],
              filter: 'exclude'
            }
          }
        }
      });
      const [, bidRequests] = buildRequest([UNIT_BANNER]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0]).to.not.have.property('ext');
    });
  });

  describe('responses processing', function () {
    it('should return fully-initialized banner bid-response', function () {
      const [pbRequests] = buildRequest([UNIT_BANNER]);
      const resp = spec.interpretResponse({ body: createRtbBidResponse(BID_BANNER) }, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp).to.have.property('cpm', 3.01);
      expect(resp).to.have.property('width', 300);
      expect(resp).to.have.property('height', 250);
      expect(resp).to.have.property('creativeId', '100_001');
      expect(resp).to.have.property('currency');
      expect(resp).to.have.property('ttl');
      expect(resp).to.have.property('mediaType', BANNER);
      expect(resp).to.have.property('ad');
      expect(resp).to.have.property('dealId', 'deal');
      expect(resp.ad).to.have.string('<!-- admarkup here -->');
      expect(resp).to.not.have.property('nurl');
    });

    it('should return fully-initialized video bid-response', function () {
      const [pbRequests] = buildRequest([UNIT_VIDEO]);
      const resp = spec.interpretResponse({ body: createRtbBidResponse(BID_VIDEO_NURL) }, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp.mediaType).to.equal(VIDEO);
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.vastUrl).to.equal('https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl');
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
    });

    it('should support vast xml in adm', function () {
      const [pbRequests] = buildRequest([UNIT_VIDEO]);
      const resp = spec.interpretResponse({ body: createRtbBidResponse(BID_VIDEO_ADM) }, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp.mediaType).to.equal(VIDEO);
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.vastXml).to.equal('<VAST></VAST>');
      expect(resp.nurl).to.equal('https://rtb.com/win?i=sZSYq5zYMxo_0');
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
    });

    it('should fill ad meta', () => {
      const [pbRequests] = buildRequest([UNIT_BANNER]);
      const resp = spec.interpretResponse({
        body: createRtbBidResponse(BID_BANNER, {
          adomain: ['displayurl.com'],
          cat: ['IAB1-4', 'IAB8-16', 'IAB25-5'],
          ext: {
            advertiser_id: 777,
            advertiser_name: 'advertiser',
            agency_name: 'agency',
          }
        })
      }, pbRequests[0])[0];
      expect(resp.meta.advertiserId).to.be.eql(777);
      expect(resp.meta.advertiserName).to.be.eql('advertiser');
      expect(resp.meta.agencyName).to.be.eql('agency');
      expect(resp.meta.advertiserDomains).to.be.eql(['displayurl.com']);
      expect(resp.meta.secondaryCatIds).to.be.eql(['IAB1-4', 'IAB8-16', 'IAB25-5']);
    });

    it('should add nurl as pixel for banner response', function () {
      const [pbRequests] = buildRequest([UNIT_BANNER]);
      const resp = spec.interpretResponse({ body: createRtbBidResponse(BID_BANNER) }, pbRequests[0])[0];
      const expectedNurl = BID_BANNER.nurl + '&px=1';
      expect(resp.ad).to.have.string(expectedNurl);
    });

    it('should handle bidresponse with user-sync only', function () {
      const [pbRequests] = buildRequest([UNIT_BANNER]);
      const resp = spec.interpretResponse({ body: BID_USER_SYNC_ONLY }, pbRequests[0]);
      expect(resp).to.have.length(0);
    });

    it('should perform usersync', function () {
      let bidResp = createRtbBidResponse(BID_BANNER, undefined, {
        ext: {
          adk_usersync: [{ type: 1, url: 'https://adk.sync.com/sync' }]
        }
      });
      let syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [{ body: bidResp }]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [{ body: bidResp }]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'https://adk.sync.com/sync');
      syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [{ body: BID_USER_SYNC_ONLY }]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url', 'https://adk.sync.com/sync');
    });
  });

  describe('adapter configuration', () => {
    it('should have aliases', () => {
      expect(spec.aliases).to.be.an('array').that.is.not.empty;
    });
  });

  describe('native support', () => {
    let bidRequests;
    before(function () {
      [, bidRequests] = buildRequest([UNIT_NATIVE]);
    });

    it('native request building', () => {
      expect(bidRequests[0].imp).to.have.length(1);
      expect(bidRequests[0].imp[0]).to.have.property('native');
      expect(bidRequests[0].imp[0].native).to.have.property('request');
      const request = JSON.parse(bidRequests[0].imp[0].native.request);
      expect(request).to.have.property('ver', '1.2');
      expect(request.assets).to.have.length(10);
      expect(request.assets[0]).to.be.eql({ id: 0, required: 1, title: { len: 80 } });
      expect(request.assets[1]).to.be.eql({ id: 1, required: 1, data: { type: 2 } });
      expect(request.assets[2]).to.be.eql({ id: 2, required: 1, data: { type: 10 } });
      expect(request.assets[3]).to.be.eql({ id: 3, required: 1, img: { wmin: 50, hmin: 50, type: 1 } });
      expect(request.assets[4]).to.be.eql({ id: 4, required: 1, img: { w: 300, h: 200, type: 3 } });
      expect(request.assets[5]).to.be.eql({ id: 5, required: 0, data: { type: 3 } });
      expect(request.assets[6]).to.be.eql({ id: 6, required: 0, data: { type: 6 } });
      expect(request.assets[7]).to.be.eql({ id: 7, required: 0, data: { type: 12 } });
      expect(request.assets[8]).to.be.eql({ id: 8, required: 0, data: { type: 1 } });
      expect(request.assets[9]).to.be.eql({ id: 9, required: 0, data: { type: 11 } });
    });

    it('native response processing', () => {
      const [pbRequests] = buildRequest([UNIT_NATIVE]);
      const resp = spec.interpretResponse({ body: createRtbBidResponse(BID_NATIVE, undefined, { cur: 'EUR' }) }, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp).to.have.property('cpm', 2.25);
      expect(resp).to.have.property('currency', 'EUR');
      expect(resp).to.have.property('meta');
      expect(resp).to.have.property('mediaType', NATIVE);
      expect(resp).to.have.property('native');
      expect(resp.native).to.have.property('ortb');

      expect(resp.native.ortb).to.be.eql({
        assets: [
          { id: 0, title: { text: 'Title' } },
          { id: 3, data: { value: 'Description' } },
          { id: 4, data: { value: 'Additional description' } },
          { id: 1, img: { url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0&imgt=icon', w: 50, h: 50 } },
          { id: 2, img: { url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0', w: 300, h: 200 } },
          { id: 5, data: { value: 'Sponsor.com' } },
          { id: 14, data: { value: 'displayurl.com' } }
        ],
        link: { url: 'http://rtb.com/click?i=pTuOlf5KHUo_0' },
        imptrackers: ['http://rtb.com/win?i=pTuOlf5KHUo_0&f=imp']
      });
    });
  });

  describe('onBidWon', () => {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('should trigger pixel for nurl', () => {
      const [pbRequests] = buildRequest([UNIT_VIDEO]);
      const bid = spec.interpretResponse({ body: createRtbBidResponse(BID_VIDEO_ADM) }, pbRequests[0])[0];
      spec.onBidWon(bid);
      expect(utils.triggerPixel.callCount).to.equal(1);
    });
  });

  describe('DSA feature', () => {
    it('should fill dsa pub info and parse advertiser info', () => {
      const bid = merge(UNIT_BANNER);
      const [pbRequests, rtbRequest] = buildRequest([bid],
        buildBidderRequest('https://example.com/index.html',
          {
            ortb2: {
              regs: {
                ext: {
                  dsa: {
                    dsarequired: 1,
                    pubrender: 0,
                    datatopub: 1,
                    transparency: [
                      { domain: 'good-domain', dsaparams: [1, 2] },
                      { domain: 'bad-setup', dsaparams: ['1', 3] }
                    ]
                  }
                }
              }
            }
          }));
      let dsa = rtbRequest[0].regs.ext.dsa;
      expect(dsa).to.be.an('object');
      expect(dsa.dsarequired).to.be.eql(1);
      expect(dsa.pubrender).to.be.eql(0);
      expect(dsa.datatopub).to.be.eql(1);
      expect(dsa.transparency).to.be.an('array').with.lengthOf(1);
      expect(dsa.transparency[0].domain).to.be.eql('good-domain');
      expect(dsa.transparency[0].dsaparams).to.be.eql([1, 2]);

      const resp = spec.interpretResponse({
        body: createRtbBidResponse(BID_BANNER, {
          ext: {
            dsa: {
              behalf: 'Advertiser',
              paid: 'Advertiser',
              adrender: 1,
              transparency: [
                { domain: 'dsp1domain.com', dsaparams: [1, 2] }
              ]
            }
          }
        })
      }, pbRequests[0])[0];

      dsa = resp.meta.dsa;
      expect(dsa).to.be.an('object');
      expect(dsa.behalf).to.be.eql('Advertiser');
      expect(dsa.paid).to.be.eql('Advertiser');
      expect(dsa.adrender).to.be.eql(1);
      expect(dsa.transparency).to.be.an('array').with.lengthOf(1);
      expect(dsa.transparency[0]).to.be.an('object');
      expect(dsa.transparency[0].domain).to.be.eql('dsp1domain.com');
      expect(dsa.transparency[0].dsaparams).to.be.eql([1, 2]);
    });
  });
});

function merge(obj, ext = {}) {
  return mergeDeep({}, obj, ext);
}

function buildBidderRequest(url = 'https://example.com/index.html', params = {}) {
  return merge(params, {
    refererInfo: { page: url, domain: parseDomain(url), reachedTop: true },
    timeout: 3000,
    bidderCode: 'adkernel'
  });
}

function buildRequest(adUnits, bidderRequest = DEFAULT_BIDDER_REQUEST) {
  bidderRequest = {
    ...bidderRequest,
    bids: adUnits
  };
  const pbRequests = spec.buildRequests(adUnits, bidderRequest);
  const rtbRequests = pbRequests.map(r => JSON.parse(r.data));
  return [pbRequests, rtbRequests];
}

function createRtbBidResponse(baseBid, extBid = undefined, respExt = {}) {
  if (!Array.isArray(baseBid)) {
    baseBid = [baseBid];
  }
  if (extBid === undefined) {
    extBid = Array(baseBid.length).fill({});
  } else if (!Array.isArray(extBid)) {
    extBid = [extBid];
  }
  if (baseBid.length !== extBid.length) {
    throw new Error('baseBid and extBid arrays should have the same length');
  }
  const bids = baseBid.map((bid, index) => merge(bid, extBid[index]));
  return Object.assign({
    id: 'xxx-xxx-xxx-xxx',
    seatbid: [{
      bid: bids
    }],
    bidid: 'some-bid-id',
    cur: 'USD'
  }, respExt);
}
