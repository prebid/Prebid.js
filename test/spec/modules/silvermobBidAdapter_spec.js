import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { spec } from '../../../modules/silvermobBidAdapter.js';
import 'modules/priceFloors.js';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from '../../../src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';

import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

const SIMPLE_BID_REQUEST = {
  bidder: 'silvermob',
  params: {
    zoneid: '0',
    host: 'us',
  },
  mediaTypes: {
    banner: {
      sizes: [
        [320, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: 'div-gpt-ad-1499748733608-0',
  transactionId: 'f183e871-fbed-45f0-a427-c8a63c4c01eb',
  bidId: '33e9500b21129f',
  bidderRequestId: '2772c1e566670b',
  auctionId: '192721e36a0239',
  sizes: [[300, 250], [160, 600]],
  gdprConsent: {
    apiVersion: 2,
    consentString: 'CONSENT',
    vendorData: { purpose: { consents: { 1: true } } },
    gdprApplies: true,
    addtlConsent: '1~1.35.41.101',
  },
};

const BANNER_BID_REQUEST = {
  bidder: 'silvermob',
  params: {
    zoneid: '0',
    host: 'us',
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  code: 'banner_example',
  timeout: 1000,
};

const VIDEO_BID_REQUEST = {
  placementCode: '/DfpAccount1/slotVideo',
  bidId: 'test-bid-id-2',
  mediaTypes: {
    video: {
      playerSize: [400, 300],
      w: 400,
      h: 300,
      minduration: 5,
      maxduration: 10,
      startdelay: 0,
      skip: 1,
      minbitrate: 200,
      protocols: [1, 2, 4]
    }
  },
  bidder: 'silvermob',
  params: {
    zoneid: '0',
    host: 'us',
  },
  adUnitCode: '/adunit-code/test-path',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  timeout: 1000,
};

const NATIVE_BID_REQUEST = {
  code: 'native_example',
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 800
      },
      image: {
        required: true,
        len: 80
      },
      sponsoredBy: {
        required: true
      },
      clickUrl: {
        required: true
      },
      privacyLink: {
        required: false
      },
      body: {
        required: true
      },
      icon: {
        required: true,
        sizes: [50, 50]
      }
    }
  },
  nativeOrtbRequest: {
    ver: '1.2',
    assets: [
      { id: 1, required: 1, title: { len: 800 } },
      { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
      { id: 3, required: 1, data: { type: 1 } }
    ]
  },
  bidder: 'silvermob',
  params: {
    zoneid: '0',
    host: 'us',
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  timeout: 1000,
  uspConsent: 'uspConsent'
};

const bidderRequest = {
  refererInfo: {
    page: 'https://publisher.com/home',
    ref: 'https://referrer'
  }
};

const gdprConsent = {
  apiVersion: 2,
  consentString: 'CONSENT',
  vendorData: { purpose: { consents: { 1: true } } },
  gdprApplies: true,
  addtlConsent: '1~1.35.41.101',
};

describe('silvermobAdapter', function () {
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('with user privacy regulations', function () {
    it('should send the Coppa "required" flag set to "1" in the request', async function () {
      sinon.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);
      const [serverRequest] = spec.buildRequests([SIMPLE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(serverRequest.data.regs.coppa).to.equal(1);
      config.getConfig.restore();
    });

    it('should send the GDPR Consent data in the request', async function () {
      const [serverRequest] = spec.buildRequests([SIMPLE_BID_REQUEST], await addFPDToBidderRequest({
        ...bidderRequest,
        gdprConsent
      }));
      expect(serverRequest.data.regs.ext.gdpr).to.exist.and.to.equal(1);
      expect(serverRequest.data.user.ext.consent).to.equal('CONSENT');
    });

    it('should send the CCPA data in the request', async function () {
      const [serverRequest] = spec.buildRequests([SIMPLE_BID_REQUEST], await addFPDToBidderRequest({ ...bidderRequest, ...{ uspConsent: '1YYY' } }));
      expect(serverRequest.data.regs.ext.us_privacy).to.equal('1YYY');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it('should accept a numeric zoneid and no host', function () {
      const localbid = { ...BANNER_BID_REQUEST, params: { zoneid: 3011 } };
      expect(spec.isBidRequestValid(localbid)).to.equal(true);
    });

    it('should return false when zoneid is missing', function () {
      const localbid = { ...BANNER_BID_REQUEST, params: { host: 'us' } };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it('should return false when zoneid is not numeric or empty', function () {
      expect(spec.isBidRequestValid({ ...BANNER_BID_REQUEST, params: { zoneid: '' } })).to.equal(false);
      expect(spec.isBidRequestValid({ ...BANNER_BID_REQUEST, params: { zoneid: 'abc' } })).to.equal(false);
    });

    it('should return false when host is malformed', function () {
      const localbid = { ...BANNER_BID_REQUEST, params: { zoneid: '0', host: 'evil.com/' } };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it('should return false when bidId is missing', function () {
      const localbid = { ...BANNER_BID_REQUEST };
      delete localbid.bidId;
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });
  });

  describe('build request', function () {
    it('should return an empty array when no bid requests', async function () {
      const bidRequest = spec.buildRequests([], await addFPDToBidderRequest(bidderRequest));
      expect(bidRequest).to.be.an('array');
      expect(bidRequest.length).to.equal(0);
    });

    it('should return a valid bid request object', async function () {
      const requests = spec.buildRequests([SIMPLE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(requests).to.be.an('array').with.lengthOf(1);
      const request = requests[0];
      expect(request.data).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://us.silvermob.com/marketplace/api/dsp/prebidjs/0');

      expect(request.data.site.page).to.equal('https://publisher.com/home');
      expect(request.data.imp[0].ext.silvermob).to.deep.equal({ zoneid: '0', host: 'us' });
      expect(request.data.cur).to.deep.equal(['USD']);
      expect(request.data).to.have.property('id');
      expect(request.data).to.have.property('imp');
      expect(request.data).to.have.property('device');
    });

    it('should default the host to "us"', async function () {
      const localbid = { ...SIMPLE_BID_REQUEST, params: { zoneid: '7' } };
      const [request] = spec.buildRequests([localbid], await addFPDToBidderRequest(bidderRequest));
      expect(request.url).to.equal('https://us.silvermob.com/marketplace/api/dsp/prebidjs/7');
      expect(request.data.imp[0].ext.silvermob.host).to.equal('us');
    });

    it('should keep imp.ext set by other modules', async function () {
      const localbid = { ...SIMPLE_BID_REQUEST, ortb2Imp: { ext: { gpid: '/123/slot', tid: 'tid-1' } } };
      const [request] = spec.buildRequests([localbid], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0].ext.gpid).to.equal('/123/slot');
      expect(request.data.imp[0].ext.silvermob.zoneid).to.equal('0');
    });

    it('should group ad units by host and zone into separate requests', async function () {
      const zoneA = { ...BANNER_BID_REQUEST, bidId: 'a', params: { zoneid: '1', host: 'us' } };
      const zoneA2 = { ...BANNER_BID_REQUEST, bidId: 'a2', params: { zoneid: '1', host: 'us' } };
      const zoneB = { ...BANNER_BID_REQUEST, bidId: 'b', params: { zoneid: '2', host: 'us' } };
      const zoneC = { ...BANNER_BID_REQUEST, bidId: 'c', params: { zoneid: '1', host: 'eu' } };
      const requests = spec.buildRequests([zoneA, zoneB, zoneA2, zoneC], await addFPDToBidderRequest(bidderRequest));
      expect(requests).to.have.lengthOf(3);
      expect(requests.map((r) => r.url)).to.deep.equal([
        'https://us.silvermob.com/marketplace/api/dsp/prebidjs/1',
        'https://us.silvermob.com/marketplace/api/dsp/prebidjs/2',
        'https://eu.silvermob.com/marketplace/api/dsp/prebidjs/1',
      ]);
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['a', 'a2']);
      expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal(['b']);
      expect(requests[2].data.imp.map((imp) => imp.id)).to.deep.equal(['c']);
    });

    it('should return a valid bid BANNER request object', async function () {
      const [request] = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format[0].w).to.be.an('number');
      expect(request.data.imp[0].banner.format[0].h).to.be.an('number');
    });

    if (FEATURES.VIDEO) {
      it('should return a valid bid VIDEO request object', async function () {
        const [request] = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.w).to.be.an('number');
        expect(request.data.imp[0].video.h).to.be.an('number');
      });
    }

    if (FEATURES.NATIVE) {
      it('should return a valid bid NATIVE request object', async function () {
        const [request] = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        expect(request.data.imp[0].native).to.be.an('object');
        expect(JSON.parse(request.data.imp[0].native.request).assets).to.have.lengthOf(3);
      });
    }

    it('should set the test flag from debug config', async function () {
      sinon.stub(config, 'getConfig').withArgs('debug').returns(true);
      const [request] = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      config.getConfig.restore();
      expect(request.data.test).to.equal(1);
    });
  });

  describe('interpretResponse', function () {
    const ad = '<div>test creative</div>';
    const vast = '<?xml version="1.0"?><VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>';

    function bannerResponse(extra = {}) {
      return {
        body: {
          id: 'bid-response',
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'bid-1',
              impid: 'test-bid-id-1',
              price: 97,
              adm: ad,
              w: 300,
              h: 250,
              crid: 'creative0',
              adomain: ['advertiser.com'],
              ...extra
            }]
          }]
        }
      };
    }

    it('Empty response must return empty array', function () {
      const response = spec.interpretResponse(null, BANNER_BID_REQUEST);
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should interpret a banner response that carries mtype', async function () {
      const [request] = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(bannerResponse({ mtype: 1 }), request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      const bid = bids[0];
      expect(bid.mediaType).to.equal('banner');
      expect(bid.currency).to.equal('USD');
      expect(bid.cpm).to.equal(97);
      expect(bid.ad).to.equal(ad);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('creative0');
      expect(bid.requestId).to.equal('test-bid-id-1');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should interpret a banner response without mtype', async function () {
      const [request] = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(bannerResponse(), request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].ad).to.equal(ad);
    });

    it('should keep the win notice and billing URLs for onBidWon', async function () {
      const [request] = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(bannerResponse({
        nurl: 'https://us.silvermob.com/marketplace/api/dsp/notify/1?wp=${AUCTION_PRICE}',
        burl: 'https://us.silvermob.com/marketplace/api/dsp/burl?wp=${AUCTION_PRICE}'
      }), request);
      expect(bids[0].nurl).to.equal('https://us.silvermob.com/marketplace/api/dsp/notify/1?wp=${AUCTION_PRICE}');
      expect(bids[0].burl).to.equal('https://us.silvermob.com/marketplace/api/dsp/burl?wp=${AUCTION_PRICE}');
      expect(bids[0].vastUrl).to.be.undefined;
    });

    if (FEATURES.VIDEO) {
      it('should interpret a video response without mtype', async function () {
        const [request] = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const response = bannerResponse({ impid: 'test-bid-id-2', adm: vast, w: 400, h: 300 });
        const bids = spec.interpretResponse(response, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('video');
        expect(bids[0].vastXml).to.equal(vast);
      });

      it('should not treat an inline-VAST win notice as vastUrl', async function () {
        const [request] = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const nurl = 'https://us.silvermob.com/marketplace/api/dsp/notify/1?wp=${AUCTION_PRICE}';
        const response = bannerResponse({ impid: 'test-bid-id-2', adm: vast, w: 400, h: 300, nurl });
        const bids = spec.interpretResponse(response, request);
        expect(bids[0].vastXml).to.equal(vast);
        expect(bids[0].vastUrl).to.be.undefined;
        expect(bids[0].nurl).to.equal(nurl);
      });

      it('should pick the media type from the markup on multi-format ad units', async function () {
        const multi = {
          ...BANNER_BID_REQUEST,
          mediaTypes: { ...BANNER_BID_REQUEST.mediaTypes, video: VIDEO_BID_REQUEST.mediaTypes.video }
        };
        const [request] = spec.buildRequests([multi], await addFPDToBidderRequest(bidderRequest));
        expect(request.data.imp[0].banner).to.exist;
        expect(request.data.imp[0].video).to.exist;
        const videoBids = spec.interpretResponse(bannerResponse({ adm: vast }), request);
        expect(videoBids[0].mediaType).to.equal('video');
        const bannerBids = spec.interpretResponse(bannerResponse(), request);
        expect(bannerBids[0].mediaType).to.equal('banner');
      });
    }

    if (FEATURES.NATIVE) {
      it('should interpret a native response without mtype', async function () {
        const [request] = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const adm = JSON.stringify({
          native: {
            link: { url: 'https://advertiser.com' },
            assets: [
              { id: 1, title: { text: 'Title' } },
              { id: 2, img: { url: 'https://advertiser.com/img.png', w: 300, h: 250 } },
              { id: 3, data: { value: 'Sponsor' } }
            ]
          }
        });
        const bids = spec.interpretResponse(bannerResponse({ adm }), request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('native');
        expect(bids[0].native.ortb.link.url).to.equal('https://advertiser.com');
        expect(bids[0].native.ortb.assets).to.have.lengthOf(3);
      });

      it('should accept an unwrapped native response with mtype', async function () {
        const [request] = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const adm = JSON.stringify({
          link: { url: 'https://advertiser.com' },
          assets: [{ id: 1, title: { text: 'Title' } }]
        });
        const bids = spec.interpretResponse(bannerResponse({ adm, mtype: 4 }), request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('native');
        expect(bids[0].native.ortb.assets).to.have.lengthOf(1);
      });
    }
  });

  describe('getUserSyncs', function () {
    beforeEach(async function () {
      const eu = { ...BANNER_BID_REQUEST, bidId: 'eu', params: { zoneid: '42', host: 'eu' } };
      spec.buildRequests([BANNER_BID_REQUEST, eu], await addFPDToBidderRequest(bidderRequest));
    });

    it('should return nothing when syncs are disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [])).to.deep.equal([]);
    });

    it('should prefer an iframe sync and register one per host', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.have.lengthOf(2);
      syncs.forEach((sync) => expect(sync.type).to.equal('iframe'));
      expect(syncs[0].url).to.equal('https://us.silvermob.com/marketplace/api/dsp/prebidjs/sync?zoneid=0&host=us');
      expect(syncs[1].url).to.equal('https://eu.silvermob.com/marketplace/api/dsp/prebidjs/sync?zoneid=42&host=eu');
    });

    it('should fall back to a pixel sync', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(syncs).to.have.lengthOf(2);
      syncs.forEach((sync) => expect(sync.type).to.equal('image'));
    });

    it('should forward GDPR, USP and GPP consent', function () {
      const [sync] = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT' },
        '1YNN',
        { gppString: 'GPP', applicableSections: [7, 8] }
      );
      expect(sync.url).to.include('gdpr=1');
      expect(sync.url).to.include('gdpr_consent=CONSENT');
      expect(sync.url).to.include('us_privacy=1YNN');
      expect(sync.url).to.include('gpp=GPP');
      expect(sync.url).to.include('gpp_sid=7%2C8');
    });

    it('should send gdpr=0 when GDPR does not apply', function () {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: false });
      expect(sync.url).to.include('gdpr=0');
      expect(sync.url).to.include('gdpr_consent=');
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;
    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('should fire burl and nurl with the auction price substituted', function () {
      spec.onBidWon({
        cpm: 1.5,
        originalCpm: 2.25,
        burl: 'https://us.silvermob.com/burl?wp=${AUCTION_PRICE}',
        nurl: 'https://us.silvermob.com/nurl?wp=${AUCTION_PRICE}'
      });
      expect(triggerPixelStub.calledTwice).to.equal(true);
      expect(triggerPixelStub.firstCall.args[0]).to.equal('https://us.silvermob.com/burl?wp=2.25');
      expect(triggerPixelStub.secondCall.args[0]).to.equal('https://us.silvermob.com/nurl?wp=2.25');
    });

    it('should do nothing without notice URLs', function () {
      spec.onBidWon({ cpm: 1.5 });
      expect(triggerPixelStub.called).to.equal(false);
    });
  });
});
