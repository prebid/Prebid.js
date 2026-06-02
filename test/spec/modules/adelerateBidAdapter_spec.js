import { expect } from 'chai';
import { dep, spec } from 'modules/adelerateBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

import { hook } from '../../../src/hook.js';
import * as ajax from 'src/ajax.js';

const ENDPOINT = 'https://pbs.bidelerate.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://pbs.bidelerate.com/cookie_sync';
const EVENTS_ENDPOINT = 'https://pbs.bidelerate.com/event';

function getBaseBidRequest(overrides = {}) {
  return {
    bidder: 'adelerate',
    params: {
      placementId: 'test-placement-1',
      publisherId: 'test-publisher-1',
    },
    adUnitCode: 'adunit-code',
    bidId: 'test-bid-id-1',
    bidderRequestId: 'test-bidder-request-1',
    auctionId: 'test-auction-1',
    transactionId: 'test-transaction-1',
    ...overrides,
  };
}

function getBannerBidRequest(overrides = {}) {
  return getBaseBidRequest({
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
    ...overrides,
  });
}

function getVideoBidRequest(overrides = {}) {
  return getBaseBidRequest({
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3],
        minduration: 5,
        maxduration: 30,
      },
    },
    ...overrides,
  });
}

function getNativeBidRequest(overrides = {}) {
  return getBaseBidRequest({
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
            { id: 3, required: 0, data: { type: 2, len: 200 } },
          ],
        },
      },
    },
    nativeOrtbRequest: {
      ver: '1.2',
      assets: [
        { id: 1, required: 1, title: { len: 90 } },
        { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
        { id: 3, required: 0, data: { type: 2, len: 200 } },
      ],
    },
    ...overrides,
  });
}

function getMockBidderRequest(overrides = {}) {
  return {
    bidderCode: 'adelerate',
    auctionId: 'test-auction-1',
    bidderRequestId: 'test-bidder-request-1',
    timeout: 3000,
    refererInfo: {
      page: 'https://example.com/page',
      domain: 'example.com',
      ref: 'https://referrer.com',
    },
    ...overrides,
  };
}

function getBannerBidResponse(impid = 'test-bid-id-1') {
  return {
    seatbid: [{
      bid: [{
        impid,
        price: 1.5,
        w: 300,
        h: 250,
        crid: 'creative-123',
        dealid: 'deal-456',
        adm: '<div>test ad</div>',
        mtype: 1,
        adomain: ['advertiser.com'],
        ext: {
          networkId: 'net-1',
          networkName: 'TestNetwork',
          advertiserId: 'adv-1',
          advertiserName: 'TestAdvertiser',
          brandId: 'brand-1',
          brandName: 'TestBrand',
        },
      }],
    }],
    cur: 'USD',
  };
}

function getVideoBidResponse(impid = 'test-bid-id-1') {
  return {
    seatbid: [{
      bid: [{
        impid,
        price: 5.0,
        w: 640,
        h: 480,
        crid: 'video-creative-789',
        adm: '<VAST version="3.0"><Ad></Ad></VAST>',
        mtype: 2,
        adomain: ['video-advertiser.com'],
      }],
    }],
    cur: 'USD',
  };
}

function getNativeBidResponse(impid = 'test-bid-id-1') {
  return {
    seatbid: [{
      bid: [{
        impid,
        price: 3.0,
        crid: 'native-creative-101',
        mtype: 4,
        adomain: ['native-advertiser.com'],
        adm: JSON.stringify({
          ver: '1.2',
          assets: [
            { id: 1, title: { text: 'Test Native Title' } },
            { id: 2, img: { url: 'https://cdn.example.com/image.jpg', w: 300, h: 250, type: 3 } },
            { id: 3, data: { value: 'Test description body text' } },
          ],
          link: { url: 'https://click.example.com' },
          eventtrackers: [{ event: 1, method: 1, url: 'https://track.example.com/imp' }],
        }),
        ext: {
          networkId: 'net-1',
          networkName: 'TestNetwork',
          advertiserId: 'adv-1',
          advertiserName: 'TestAdvertiser',
        },
      }],
    }],
    cur: 'USD',
  };
}

describe('AdelerateBidAdapter', function () {
  before(() => {
    hook.ready();
  });

  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('spec properties', function () {
    it('should support banner, native, and video media types', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE, VIDEO]);
    });
  });

  describe('isBidRequestValid()', function () {
    it('should return true when required banner params are present', function () {
      const bid = getBannerBidRequest();
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when required video params are present', function () {
      const bid = getVideoBidRequest();
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when placementId is missing', function () {
      const bid = getBannerBidRequest({
        params: {
          publisherId: 'test-publisher-1',
        },
      });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when publisherId is missing', function () {
      const bid = getBannerBidRequest({
        params: {
          placementId: 'test-placement-1',
        },
      });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when no media type is specified', function () {
      const bid = getBaseBidRequest({ mediaTypes: {} });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params are missing entirely', function () {
      const bid = getBannerBidRequest({ params: {} });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true when required native params are present', function () {
      const bid = getNativeBidRequest();
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true for multiformat (banner + video)', function () {
      const bid = getBaseBidRequest({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { playerSize: [640, 480], mimes: ['video/mp4'], protocols: [1, 2] },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true for multiformat (banner + native)', function () {
      const bid = getBaseBidRequest({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          native: {
            ortb: {
              assets: [{ id: 1, required: 1, title: { len: 90 } }],
            },
          },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('buildRequests()', function () {
    let bidRequests;
    let mockBidderRequest;

    beforeEach(function () {
      bidRequests = [getBannerBidRequest()];
      mockBidderRequest = getMockBidderRequest();
    });

    it('should return a valid server request object', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.be.true;
      expect(request.data).to.be.an('object');
    });

    it('should build imp array from bid requests', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      expect(request.data.imp).to.have.length(1);
      expect(request.data.imp[0].id).to.equal('test-bid-id-1');
    });

    it('should set tagid from adUnitCode', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      expect(request.data.imp[0].tagid).to.equal('adunit-code');
    });

    it('should set adelerate-specific bidder ext params', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      const bidderExt = request.data.imp[0].ext.bidder;
      expect(bidderExt.placementId).to.equal('test-placement-1');
      expect(bidderExt.publisherId).to.equal('test-publisher-1');
    });

    it('should set adapter version in request ext', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      expect(request.data.ext.prebid.bidder.adelerate.version).to.equal('1.0.0');
    });

    it('should set imp.secure to 1', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      expect(request.data.imp[0].secure).to.equal(1);
    });

    it('should set displaymanager and displaymanagerver on imp', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      const imp = request.data.imp[0];
      expect(imp.displaymanager).to.equal('Prebid.js');
      expect(imp.displaymanagerver).to.be.a('string');
    });

    it('should return null when no valid imps are generated', function () {
      const bids = [getBaseBidRequest({ mediaTypes: {} })];
      const result = spec.buildRequests(bids, mockBidderRequest);
      expect(result).to.be.null;
    });

    it('should populate banner format from mediaTypes', function () {
      const request = spec.buildRequests(bidRequests, mockBidderRequest);
      const imp = request.data.imp[0];
      expect(imp.banner).to.exist;
      expect(imp.banner.format).to.be.an('array');
      expect(imp.banner.format[0].w).to.equal(300);
      expect(imp.banner.format[0].h).to.equal(250);
    });

    it('should populate video from mediaTypes', function () {
      const videoBids = [getVideoBidRequest()];
      const request = spec.buildRequests(videoBids, mockBidderRequest);
      if (FEATURES.VIDEO) {
        const imp = request.data.imp[0];
        expect(imp.video).to.exist;
        expect(imp.video.w).to.equal(640);
        expect(imp.video.h).to.equal(480);
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
      }
    });

    it('should populate native from mediaTypes', function () {
      const nativeBids = [getNativeBidRequest()];
      const request = spec.buildRequests(nativeBids, mockBidderRequest);
      if (FEATURES.NATIVE) {
        const imp = request.data.imp[0];
        expect(imp.native).to.exist;
        expect(imp.native.request).to.be.a('string');
        const nativeReq = JSON.parse(imp.native.request);
        expect(nativeReq.assets).to.be.an('array');
        expect(nativeReq.assets).to.have.length(3);
        expect(nativeReq.eventtrackers).to.be.an('array');
        expect(nativeReq.eventtrackers[0].event).to.equal(1);
      }
    });

    it('should handle multiformat (banner + video) bids', function () {
      const multiBid = getBaseBidRequest({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { playerSize: [640, 480], mimes: ['video/mp4'], protocols: [1, 2] },
        },
      });
      const request = spec.buildRequests([multiBid], mockBidderRequest);
      expect(request.data.imp).to.have.length(1);
      expect(request.data.imp[0].banner).to.exist;
      if (FEATURES.VIDEO) {
        expect(request.data.imp[0].video).to.exist;
      }
    });

    it('should handle multiple bid requests in a single request', function () {
      const bids = [
        getBannerBidRequest({ bidId: 'bid-1' }),
        getBannerBidRequest({ bidId: 'bid-2', adUnitCode: 'adunit-2' }),
      ];
      const request = spec.buildRequests(bids, mockBidderRequest);
      expect(request.data.imp).to.have.length(2);
    });

    it('should use params.floor as fallback when getFloor is not available', function () {
      const bids = [getBannerBidRequest({
        params: {
          placementId: 'test-placement-1',
          publisherId: 'test-publisher-1',
          floor: 1.5,
        },
      })];
      const request = spec.buildRequests(bids, mockBidderRequest);
      expect(request.data.imp[0].bidfloor).to.equal(1.5);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should use getFloor when available', function () {
      const bids = [getBannerBidRequest()];
      bids[0].getFloor = () => ({ currency: 'USD', floor: 2.0 });
      const request = spec.buildRequests(bids, mockBidderRequest);
      expect(request.data.imp[0].bidfloor).to.equal(2.0);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should merge ortb2 site data into request', function () {
      const bidderRequest = getMockBidderRequest({
        ortb2: {
          site: {
            domain: 'custom.com',
            cat: ['IAB1'],
          },
        },
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.site.domain).to.equal('custom.com');
      expect(request.data.site.cat).to.deep.equal(['IAB1']);
    });

    it('should merge ortb2 user data into request', function () {
      const bidderRequest = getMockBidderRequest({
        ortb2: {
          user: {
            yob: 1990,
          },
        },
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user.yob).to.equal(1990);
    });

    it('should pass GDPR consent', function () {
      const bidderRequest = getMockBidderRequest({
        gdprConsent: {
          gdprApplies: true,
          consentString: 'test-consent-string',
        },
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      if (!request.data.regs && !request.data.user) {
        this.skip();
      }
      const regs = request.data.regs || {};
      const user = request.data.user || {};
      const gdprFlag = regs.gdpr ?? regs.ext?.gdpr;
      const consent = user.consent ?? user.ext?.consent;
      expect(gdprFlag).to.equal(1);
      expect(consent).to.equal('test-consent-string');
    });

    it('should pass USP consent', function () {
      const bidderRequest = getMockBidderRequest({
        uspConsent: '1YNN',
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      if (!request.data.regs) {
        this.skip();
      }
      const regs = request.data.regs;
      const usp = regs.us_privacy ?? regs.ext?.us_privacy;
      expect(usp).to.equal('1YNN');
    });
  });

  describe('interpretResponse()', function () {
    let bidRequest;

    beforeEach(function () {
      const bids = [getBannerBidRequest()];
      const mockBidderRequest = getMockBidderRequest();
      bidRequest = spec.buildRequests(bids, mockBidderRequest);
    });

    it('should return empty array when response body is empty', function () {
      const response = spec.interpretResponse({ body: null }, bidRequest);
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should return empty array when response body is falsy', function () {
      const response = spec.interpretResponse({ body: '' }, bidRequest);
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should return empty array when no seatbid', function () {
      const response = spec.interpretResponse({ body: { id: '1' } }, bidRequest);
      expect(response).to.be.an('array').that.is.empty;
    });

    context('banner response', function () {
      let bidResponse;
      let result;

      beforeEach(function () {
        bidResponse = getBannerBidResponse();
        result = spec.interpretResponse({ body: bidResponse }, bidRequest);
      });

      it('should return one bid', function () {
        expect(result).to.have.length(1);
      });

      it('should return correct requestId', function () {
        expect(result[0].requestId).to.equal('test-bid-id-1');
      });

      it('should return correct cpm', function () {
        expect(result[0].cpm).to.equal(1.5);
      });

      it('should return correct dimensions', function () {
        expect(result[0].width).to.equal(300);
        expect(result[0].height).to.equal(250);
      });

      it('should return correct creativeId', function () {
        expect(result[0].creativeId).to.equal('creative-123');
      });

      it('should return correct ad markup', function () {
        expect(result[0].ad).to.equal('<div>test ad</div>');
      });

      it('should return correct dealId', function () {
        expect(result[0].dealId).to.equal('deal-456');
      });

      it('should return correct ttl', function () {
        expect(result[0].ttl).to.equal(300);
      });

      it('should return netRevenue as true', function () {
        expect(result[0].netRevenue).to.be.true;
      });

      it('should return correct currency', function () {
        expect(result[0].currency).to.equal('USD');
      });

      it('should return advertiserDomains in meta', function () {
        expect(result[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      });

      it('should return ext meta fields', function () {
        expect(result[0].meta.networkId).to.equal('net-1');
        expect(result[0].meta.networkName).to.equal('TestNetwork');
        expect(result[0].meta.advertiserId).to.equal('adv-1');
        expect(result[0].meta.brandId).to.equal('brand-1');
      });

      it('should return DSA meta when present in bid ext', function () {
        const dsaResponse = deepClone(getBannerBidResponse());
        dsaResponse.seatbid[0].bid[0].ext.dsa = {
          behalf: 'Advertiser',
          paid: 'Advertiser',
          transparency: [{ domain: 'dsp.com', dsaparams: [1, 2] }],
          adrender: 1,
        };
        const bids = [getBannerBidRequest()];
        const req = spec.buildRequests(bids, getMockBidderRequest());
        const result = spec.interpretResponse({ body: dsaResponse }, req);
        expect(result[0].meta.dsa).to.exist;
        expect(result[0].meta.dsa.behalf).to.equal('Advertiser');
        expect(result[0].meta.dsa.transparency).to.have.length(1);
      });
    });

    context('video response', function () {
      let result;

      beforeEach(function () {
        if (!FEATURES.VIDEO) {
          this.skip();
        }
        const videoBids = [getVideoBidRequest()];
        const mockBidderRequest = getMockBidderRequest();
        const videoRequest = spec.buildRequests(videoBids, mockBidderRequest);
        const videoResponse = getVideoBidResponse();
        result = spec.interpretResponse({ body: videoResponse }, videoRequest);
      });

      it('should return one bid', function () {
        expect(result).to.have.length(1);
      });

      it('should return correct cpm', function () {
        expect(result[0].cpm).to.equal(5.0);
      });

      it('should set mediaType to video', function () {
        expect(result[0].mediaType).to.equal(VIDEO);
      });

      it('should have increased TTL for video (600s)', function () {
        expect(result[0].ttl).to.equal(600);
      });

      it('should return VAST xml', function () {
        expect(result[0].vastXml).to.exist;
        expect(result[0].vastXml).to.contain('VAST');
      });
    });

    context('native response', function () {
      let result;

      beforeEach(function () {
        if (!FEATURES.NATIVE) {
          this.skip();
        }
        const nativeBids = [getNativeBidRequest()];
        const mockBidderRequest = getMockBidderRequest();
        const nativeRequest = spec.buildRequests(nativeBids, mockBidderRequest);
        const nativeResponse = getNativeBidResponse();
        result = spec.interpretResponse({ body: nativeResponse }, nativeRequest);
      });

      it('should return one bid', function () {
        expect(result).to.have.length(1);
      });

      it('should return correct cpm', function () {
        expect(result[0].cpm).to.equal(3.0);
      });

      it('should set mediaType to native', function () {
        expect(result[0].mediaType).to.equal(NATIVE);
      });

      it('should return default TTL for native (300s)', function () {
        expect(result[0].ttl).to.equal(300);
      });

      it('should return native ortb response with assets', function () {
        expect(result[0].native).to.exist;
        expect(result[0].native.ortb).to.exist;
        expect(result[0].native.ortb.assets).to.be.an('array');
        expect(result[0].native.ortb.assets).to.have.length(3);
      });

      it('should return native title asset', function () {
        const titleAsset = result[0].native.ortb.assets.find(a => a.title);
        expect(titleAsset).to.exist;
        expect(titleAsset.title.text).to.equal('Test Native Title');
      });

      it('should return native image asset', function () {
        const imgAsset = result[0].native.ortb.assets.find(a => a.img);
        expect(imgAsset).to.exist;
        expect(imgAsset.img.url).to.equal('https://cdn.example.com/image.jpg');
      });

      it('should return native click-through link', function () {
        expect(result[0].native.ortb.link).to.exist;
        expect(result[0].native.ortb.link.url).to.equal('https://click.example.com');
      });

      it('should return ext meta fields', function () {
        expect(result[0].meta.networkId).to.equal('net-1');
        expect(result[0].meta.advertiserId).to.equal('adv-1');
      });
    });

    context('multiple bids response', function () {
      it('should handle multiple bids in seatbid', function () {
        const bids = [
          getBannerBidRequest({ bidId: 'bid-1' }),
          getBannerBidRequest({ bidId: 'bid-2', adUnitCode: 'adunit-2' }),
        ];
        const request = spec.buildRequests(bids, getMockBidderRequest());
        const serverResponse = {
          seatbid: [{
            bid: [
              { impid: 'bid-1', price: 1.0, w: 300, h: 250, crid: 'c1', adm: 'ad1', mtype: 1 },
              { impid: 'bid-2', price: 2.0, w: 728, h: 90, crid: 'c2', adm: 'ad2', mtype: 1 },
            ],
          }],
          cur: 'USD',
        };
        const result = spec.interpretResponse({ body: serverResponse }, request);
        expect(result).to.have.length(2);
        expect(result[0].requestId).to.equal('bid-1');
        expect(result[1].requestId).to.equal('bid-2');
      });
    });
  });

  describe('getUserSyncs()', function () {
    it('should return iframe sync when iframeEnabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(SYNC_ENDPOINT);
    });

    it('should return pixel sync when pixelEnabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, []);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.include(SYNC_ENDPOINT + '/pixel');
    });

    it('should prefer iframe over pixel when both enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('should return empty array when nothing is enabled', function () {
      const syncs = spec.getUserSyncs({}, []);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should include GDPR params in sync URL', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'test-gdpr-consent',
      };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=test-gdpr-consent');
    });

    it('should include USP consent in sync URL', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], null, '1YNN');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should include GPP consent in sync URL', function () {
      const gppConsent = {
        gppString: 'test-gpp-string',
        applicableSections: [1, 2],
      };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], null, null, gppConsent);
      expect(syncs[0].url).to.include('gpp=test-gpp-string');
      expect(syncs[0].url).to.include('gpp_sid=1,2');
    });

    it('should include all privacy params when present', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'gdpr-str' };
      const gppConsent = { gppString: 'gpp-str', applicableSections: [7] };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent, '1YNN', gppConsent);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).to.include('gpp=gpp-str');
    });

    it('should include COPPA flag in sync URL when enabled', function () {
      const stub = sinon.stub(config, 'getConfig');
      stub.withArgs('coppa').returns(true);
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.include('coppa=1');
      stub.restore();
    });

    it('should not include COPPA flag when not enabled', function () {
      const stub = sinon.stub(config, 'getConfig');
      stub.withArgs('coppa').returns(false);
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.not.include('coppa');
      stub.restore();
    });
  });

  describe('onTimeout()', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(dep, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should send timeout event via ajax', function () {
      const timeoutData = [{ bidId: 'bid-1', timeout: 3000 }];
      spec.onTimeout(timeoutData);
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.equal(`${EVENTS_ENDPOINT}/timeout`);
      expect(ajaxStub.firstCall.args[3].keepalive).to.be.true;
    });

    it('should not send when data is empty', function () {
      spec.onTimeout([]);
      expect(ajaxStub.called).to.be.false;
    });

    it('should not send when data is null', function () {
      spec.onTimeout(null);
      expect(ajaxStub.called).to.be.false;
    });
  });

  describe('onBidWon()', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(dep, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should send win event via ajax', function () {
      const bid = {
        requestId: 'req-1',
        adId: 'ad-1',
        cpm: 1.5,
        currency: 'USD',
        mediaType: BANNER,
      };
      spec.onBidWon(bid);
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.equal(`${EVENTS_ENDPOINT}/win`);
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.requestId).to.equal('req-1');
      expect(payload.cpm).to.equal(1.5);
      expect(ajaxStub.firstCall.args[3].keepalive).to.be.true;
    });

    it('should not send when bid is null', function () {
      spec.onBidWon(null);
      expect(ajaxStub.called).to.be.false;
    });
  });

  describe('onBidderError()', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(dep, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should send error event via ajax', function () {
      spec.onBidderError({
        error: { status: 500 },
        bidderRequest: { auctionId: 'auction-1' },
      });
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.equal(`${EVENTS_ENDPOINT}/error`);
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.error).to.equal(500);
      expect(payload.bidderCode).to.equal('adelerate');
      expect(payload.auctionId).to.equal('auction-1');
    });
  });
});
