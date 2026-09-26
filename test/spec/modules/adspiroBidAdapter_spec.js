import { expect } from 'chai';
import { spec } from '../../../modules/adspiroBidAdapter.ts';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import '../../../modules/priceFloors.js';
import { dep } from '../../../src/ajax.js';
import * as utils from '../../../src/utils.js';
import { server } from '../../mocks/xhr.js';

const AUCTION_URL = 'https://rtb.adspiro.io/pbjs';
const IFRAME_SYNC_URL = 'https://rtb.adspiro.io/u/iframe';
const IMAGE_SYNC_URL = 'https://rtb.adspiro.io/u/sync';

const VIDEO = { context: 'instream', playerSize: [640, 480], mimes: ['video/mp4'], protocols: [2, 3, 5, 6] };
const AUDIO = { context: 'instream', mimes: ['audio/mp4', 'audio/mpeg'], minduration: 5, maxduration: 30 };
const NATIVE_REQUEST = {
  ver: '1.2',
  assets: [
    { id: 1, required: 1, title: { len: 90 } },
    { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } },
    { id: 3, required: 1, data: { type: 1 } },
  ],
};

function makeBid(overrides = {}) {
  return {
    bidder: 'adspiro',
    bidId: 'bid-1',
    adUnitCode: 'div-1',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    params: { publisherId: 'pub-1' },
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ...overrides,
  };
}

function buildRequests(bids, bidderRequestOverrides = {}) {
  return spec.buildRequests(bids, {
    bidderCode: 'adspiro',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    timeout: 1500,
    bids,
    ortb2: {},
    ...bidderRequestOverrides,
  });
}

function ortbResponse(bids, extra = { cur: 'USD' }) {
  return { body: { id: 'response-1', ...extra, seatbid: [{ seat: 'adspiro', bid: bids }] } };
}

describe('adspiroBidAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('spec', function () {
    it('registers the adspiro bidder for every media type, without a GVL ID or aliases', function () {
      expect(spec.code).to.equal('adspiro');
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native', 'audio']);
      expect(spec).to.not.have.property('gvlid');
      expect(spec).to.not.have.property('aliases');
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a non-empty string publisherId', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: 'test' } }))).to.equal(true);
    });

    it('rejects a bid without params', function () {
      expect(spec.isBidRequestValid(makeBid({ params: undefined }))).to.equal(false);
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('rejects a missing publisherId', function () {
      expect(spec.isBidRequestValid(makeBid({ params: {} }))).to.equal(false);
    });

    it('rejects an empty publisherId', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: '' } }))).to.equal(false);
    });

    it('rejects a publisherId that is not a string', function () {
      [123, null, true, ['pub-1'], { id: 'pub-1' }].forEach((publisherId) => {
        expect(spec.isBidRequestValid(makeBid({ params: { publisherId } }))).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    it('sends one POST to the Prebid.js endpoint with the publisherId in the URL', function () {
      const requests = buildRequests([makeBid()]);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(`${AUCTION_URL}?pid=pub-1`);
    });

    it('asks for gzip and keeps the default text/plain body and credentials', function () {
      const [request] = buildRequests([makeBid()]);
      expect(request.options).to.deep.equal({ endpointCompression: true });
    });

    it('URL-encodes the publisherId', function () {
      const [request] = buildRequests([makeBid({ params: { publisherId: 'a b&c/d?e' } })]);
      expect(request.url).to.equal(`${AUCTION_URL}?pid=a%20b%26c%2Fd%3Fe`);
    });

    it('sends one request per publisherId, in first-seen order', function () {
      const requests = buildRequests([
        makeBid({ bidId: 'bid-1', params: { publisherId: '407' } }),
        makeBid({ bidId: 'bid-2', params: { publisherId: '92' } }),
        makeBid({ bidId: 'bid-3', params: { publisherId: '407' } }),
      ]);
      expect(requests.map((request) => request.url)).to.deep.equal([`${AUCTION_URL}?pid=407`, `${AUCTION_URL}?pid=92`]);
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1', 'bid-3']);
      expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-2']);
    });

    it('builds a banner imp with every ad unit size', function () {
      const [request] = buildRequests([makeBid()]);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].id).to.equal('bid-1');
      expect(request.data.imp[0].secure).to.equal(1);
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    it('sets tmax from the bidder timeout', function () {
      const [request] = buildRequests([makeBid()], { timeout: 800 });
      expect(request.data.tmax).to.equal(800);
    });

    it('passes first-party data, user IDs, schain and privacy signals through', function () {
      const ortb2 = {
        site: { page: 'https://news.example/article', domain: 'news.example' },
        user: { ext: { eids: [{ source: 'pubcid.org', uids: [{ id: 'uid-1', atype: 1 }] }] } },
        source: { ext: { schain: { ver: '1.0', complete: 1, nodes: [{ asi: 'news.example', sid: 'pub-1', hp: 1 }] } } },
        regs: { coppa: 1, gpp: 'DBABTA~1YNN', gpp_sid: [7], ext: { us_privacy: '1YNN', gpc: '1' } },
      };
      const [request] = buildRequests([makeBid()], { ortb2 });
      expect(request.data.site).to.deep.include(ortb2.site);
      expect(request.data.user.ext.eids).to.deep.equal(ortb2.user.ext.eids);
      expect(request.data.source.ext.schain).to.deep.equal(ortb2.source.ext.schain);
      expect(request.data.regs).to.deep.equal(ortb2.regs);
    });

    describe('currency', function () {
      beforeEach(function () {
        setCurrencyConfig({});
      });

      afterEach(function () {
        setCurrencyConfig({});
      });

      it('asks for bids in USD without the currency module', function () {
        const [request] = buildRequests([makeBid()]);
        expect(request.data.cur).to.deep.equal(['USD']);
      });

      it('asks for bids in USD when the ad server currency is EUR', function () {
        setCurrencyConfig({ adServerCurrency: 'EUR', rates: { USD: { EUR: 0.9 } } });
        const [request] = buildRequests([makeBid()]);
        expect(request.data.cur).to.deep.equal(['USD']);
      });

      it('asks for bids in USD when first-party data sets another currency', function () {
        const [request] = buildRequests([makeBid()], { ortb2: { cur: ['EUR'] } });
        expect(request.data.cur).to.deep.equal(['USD']);
      });
    });

    describe('floors', function () {
      it('requests the floor in USD and keeps a USD floor', function () {
        const getFloor = sinon.stub().returns({ currency: 'USD', floor: 1.25 });
        const [request] = buildRequests([makeBid({ getFloor })]);
        expect(getFloor.calledWith(sinon.match({ currency: 'USD' }))).to.equal(true);
        expect(request.data.imp[0]).to.include({ bidfloor: 1.25, bidfloorcur: 'USD' });
      });

      it('removes a floor in another currency', function () {
        const [request] = buildRequests([makeBid({ getFloor: () => ({ currency: 'EUR', floor: 1.25 }) })]);
        expect(request.data.imp[0]).to.not.have.any.keys('bidfloor', 'bidfloorcur');
      });

      it('keeps a floor that has no currency', function () {
        const [request] = buildRequests([makeBid({ ortb2Imp: { bidfloor: 0.5 } })]);
        expect(request.data.imp[0].bidfloor).to.equal(0.5);
      });
    });

    describe('dropped media types', function () {
      let logWarn;

      beforeEach(function () {
        logWarn = sandbox.stub(utils, 'logWarn');
      });

      it('drops an imp that has no media type left', function () {
        const [request] = buildRequests([
          makeBid({ bidId: 'bid-1' }),
          makeBid({ bidId: 'bid-2', mediaTypes: { video: { context: 'instream', playerSize: [640, 480] } } }),
        ]);
        expect(request.data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1']);
      });

      it('does not send a request whose imps were all dropped', function () {
        const requests = buildRequests([
          makeBid({ bidId: 'bid-1', params: { publisherId: 'pub-1' } }),
          makeBid({ bidId: 'bid-2', params: { publisherId: 'pub-2' }, mediaTypes: { video: { playerSize: [640, 480] } } }),
        ]);
        expect(requests.map((request) => request.url)).to.deep.equal([`${AUCTION_URL}?pid=pub-1`]);
        expect(buildRequests([makeBid({ mediaTypes: { video: { playerSize: [640, 480] } } })])).to.deep.equal([]);
      });

      if (FEATURES.VIDEO) {
        it('removes video without mimes and keeps the rest of the imp', function () {
          [undefined, []].forEach((mimes) => {
            const video = { context: 'instream', playerSize: [640, 480], mimes };
            const [request] = buildRequests([makeBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, video } })]);
            expect(request.data.imp[0].banner).to.exist;
            expect(request.data.imp[0]).to.not.have.property('video');
          });
          expect(logWarn.calledWith(sinon.match('video without mimes removed from ad unit div-1'))).to.equal(true);
        });
      }

      if (FEATURES.AUDIO) {
        it('removes audio without mimes and keeps the rest of the imp', function () {
          const audio = { context: 'instream', maxduration: 30 };
          const [request] = buildRequests([makeBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, audio } })]);
          expect(request.data.imp[0].banner).to.exist;
          expect(request.data.imp[0]).to.not.have.property('audio');
          expect(logWarn.calledWith(sinon.match('audio without mimes removed from ad unit div-1'))).to.equal(true);
        });
      }
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp', function () {
        const [request] = buildRequests([makeBid({ mediaTypes: { video: VIDEO } })]);
        expect(request.data.imp[0].video).to.deep.include({ mimes: ['video/mp4'], protocols: [2, 3, 5, 6], w: 640, h: 480 });
        expect(request.data.imp[0]).to.not.have.property('banner');
      });
    }

    if (FEATURES.AUDIO) {
      it('builds an audio imp', function () {
        const [request] = buildRequests([makeBid({ mediaTypes: { audio: AUDIO } })]);
        expect(request.data.imp[0].audio).to.deep.include({ mimes: ['audio/mp4', 'audio/mpeg'], minduration: 5, maxduration: 30 });
        expect(request.data.imp[0]).to.not.have.property('banner');
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a native imp from the ORTB native request', function () {
        const bid = makeBid({ mediaTypes: { native: { ortb: NATIVE_REQUEST } }, nativeOrtbRequest: NATIVE_REQUEST });
        const [request] = buildRequests([bid]);
        const { native } = request.data.imp[0];
        expect(native.ver).to.equal('1.2');
        expect(JSON.parse(native.request)).to.deep.equal(NATIVE_REQUEST);
      });
    }
  });

  describe('interpretResponse', function () {
    it('maps a banner bid', function () {
      const [request] = buildRequests([makeBid()]);
      const bids = spec.interpretResponse(ortbResponse([{
        id: 'seat-bid-1',
        impid: 'bid-1',
        price: 0.5,
        adm: '<div>ad</div>',
        crid: 'creative-1',
        w: 300,
        h: 250,
        mtype: 1,
        adomain: ['advertiser.example'],
        dealid: 'deal-1',
        burl: 'https://rtb.adspiro.io/billing?id=1',
        exp: 120,
      }]), request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: 'bid-1',
        cpm: 0.5,
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        creativeId: 'creative-1',
        dealId: 'deal-1',
        burl: 'https://rtb.adspiro.io/billing?id=1',
        width: 300,
        height: 250,
        mediaType: 'banner',
        ad: '<div>ad</div>',
      });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('defaults ttl to 300 seconds and currency to USD', function () {
      const [request] = buildRequests([makeBid()]);
      const response = ortbResponse([{ impid: 'bid-1', price: 0.5, adm: '<div>ad</div>', crid: 'creative-1', mtype: 1 }], {});
      const [bid] = spec.interpretResponse(response, request);
      expect(bid.ttl).to.equal(300);
      expect(bid.currency).to.equal('USD');
    });

    it('skips a bid whose mtype is missing or unknown', function () {
      const logError = sandbox.stub(utils, 'logError');
      const [request] = buildRequests([makeBid()]);
      const bids = spec.interpretResponse(ortbResponse([
        { impid: 'bid-1', price: 0.5, adm: '<div>1</div>', crid: 'creative-1', mtype: 1 },
        { impid: 'bid-1', price: 0.6, adm: '<div>2</div>', crid: 'creative-2' },
        { impid: 'bid-1', price: 0.7, adm: '<div>3</div>', crid: 'creative-3', mtype: 5 },
      ]), request);
      expect(bids.map((bid) => bid.creativeId)).to.deep.equal(['creative-1']);
      expect(logError.callCount).to.equal(2);
    });

    it('returns no bids for an empty or non-object body', function () {
      const [request] = buildRequests([makeBid()]);
      ['', null, undefined, 'Bad Request', []].forEach((body) => {
        expect(spec.interpretResponse({ body }, request)).to.deep.equal([]);
      });
      expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
    });

    if (FEATURES.VIDEO) {
      it('maps a video bid to VAST XML', function () {
        const [request] = buildRequests([makeBid({ mediaTypes: { video: VIDEO } })]);
        const [bid] = spec.interpretResponse(ortbResponse([
          { impid: 'bid-1', price: 0.5, adm: '<VAST version="4.2"></VAST>', crid: 'creative-1', mtype: 2 },
        ]), request);
        expect(bid).to.deep.include({
          mediaType: 'video',
          vastXml: '<VAST version="4.2"></VAST>',
          playerWidth: 640,
          playerHeight: 480,
        });
      });
    }

    if (FEATURES.NATIVE) {
      it('maps a native bid', function () {
        const bidRequest = makeBid({ mediaTypes: { native: { ortb: NATIVE_REQUEST } }, nativeOrtbRequest: NATIVE_REQUEST });
        const [request] = buildRequests([bidRequest]);
        const nativeResponse = {
          ver: '1.2',
          assets: [
            { id: 1, title: { text: 'Adspiro test ad' } },
            { id: 2, img: { url: 'https://adspiro.io/prebid/test-native-1200x627.png', w: 1200, h: 627 } },
            { id: 3, data: { value: 'Adspiro' } },
          ],
          link: { url: 'https://adspiro.io' },
        };
        const [bid] = spec.interpretResponse(ortbResponse([
          { impid: 'bid-1', price: 0.5, adm: JSON.stringify(nativeResponse), crid: 'creative-1', mtype: 4 },
        ]), request);
        expect(bid.mediaType).to.equal('native');
        expect(bid.native.ortb).to.deep.equal(nativeResponse);
      });
    }

    if (FEATURES.AUDIO) {
      it('maps an audio bid (mtype 3) to VAST XML', function () {
        const [request] = buildRequests([makeBid({ mediaTypes: { audio: AUDIO } })]);
        const [bid] = spec.interpretResponse(ortbResponse([
          { impid: 'bid-1', price: 0.5, adm: '<VAST version="4.2"></VAST>', crid: 'creative-1', mtype: 3 },
        ]), request);
        expect(bid).to.deep.include({ mediaType: 'audio', vastXml: '<VAST version="4.2"></VAST>' });
      });

      it('maps audio for one bid without changing the next bid on the same imp', function () {
        const [request] = buildRequests([makeBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, audio: AUDIO } })]);
        const bids = spec.interpretResponse(ortbResponse([
          { impid: 'bid-1', price: 0.5, adm: '<VAST version="4.2"></VAST>', crid: 'creative-1', mtype: 3 },
          { impid: 'bid-1', price: 0.4, adm: '<div>ad</div>', crid: 'creative-2', w: 300, h: 250, mtype: 1 },
        ]), request);
        expect(bids.map((bid) => bid.mediaType)).to.deep.equal(['audio', 'banner']);
      });
    }
  });

  describe('getUserSyncs', function () {
    const ALL_SYNCS = { iframeEnabled: true, pixelEnabled: true };

    it('prefers an iframe sync', function () {
      expect(spec.getUserSyncs(ALL_SYNCS, [], null, null, null, false)).to.deep.equal([
        { type: 'iframe', url: IFRAME_SYNC_URL },
      ]);
    });

    it('falls back to an image sync', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [], null, null, null, false)).to.deep.equal([
        { type: 'image', url: IMAGE_SYNC_URL },
      ]);
    });

    it('returns no sync when neither type is allowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], null, null, null, false)).to.deep.equal([]);
    });

    it('returns no sync under COPPA', function () {
      expect(spec.getUserSyncs(ALL_SYNCS, [], null, '1YNN', null, true)).to.deep.equal([]);
    });

    it('adds every privacy signal that is present', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'CONSENT' };
      const gppConsent = { gppString: 'DBABTA~1YNN', applicableSections: [7, 8] };
      expect(spec.getUserSyncs({ pixelEnabled: true }, [], gdprConsent, '1YNN', gppConsent, false)).to.deep.equal([{
        type: 'image',
        url: `${IMAGE_SYNC_URL}?gdpr=1&gdpr_consent=CONSENT&us_privacy=1YNN&gpp=DBABTA%7E1YNN&gpp_sid=7%2C8`,
      }]);
    });

    it('sends gdpr=0 when GDPR does not apply', function () {
      const [sync] = spec.getUserSyncs(ALL_SYNCS, [], { gdprApplies: false }, null, null, false);
      expect(sync.url).to.equal(`${IFRAME_SYNC_URL}?gdpr=0`);
    });

    it('leaves out gdpr when gdprApplies is not a boolean', function () {
      const [sync] = spec.getUserSyncs(ALL_SYNCS, [], { consentString: 'CONSENT' }, null, null, false);
      expect(sync.url).to.equal(`${IFRAME_SYNC_URL}?gdpr_consent=CONSENT`);
    });

    it('sends the GPP string and sections independently', function () {
      const [withString] = spec.getUserSyncs(ALL_SYNCS, [], null, null, { gppString: 'DBABTA~1YNN' }, false);
      expect(new URL(withString.url).search).to.equal('?gpp=DBABTA%7E1YNN');
      const [withSections] = spec.getUserSyncs(ALL_SYNCS, [], null, null, { applicableSections: [7] }, false);
      expect(new URL(withSections.url).search).to.equal('?gpp_sid=7');
    });

    it('leaves out empty privacy signals', function () {
      const gdprConsent = { consentString: '' };
      const gppConsent = { gppString: '', applicableSections: [] };
      expect(spec.getUserSyncs(ALL_SYNCS, [], gdprConsent, '', gppConsent, false)).to.deep.equal([
        { type: 'iframe', url: IFRAME_SYNC_URL },
      ]);
    });
  });

  describe('onDataDeletionRequest', function () {
    const DELETION_URL = 'https://rtb.adspiro.io/u/delete';

    it('posts an empty keepalive request with credentials to the deletion endpoint', function () {
      spec.onDataDeletionRequest([], null);
      const requests = server.requests.filter((request) => request.url === DELETION_URL);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].requestBody).to.equal(undefined);
      expect(requests[0].fetch.request.keepalive).to.equal(true);
      // the sent request drops credentials until the release adds this module's metadata, so check what was asked for
      const [built] = dep.makeRequest.getCalls().filter(({ args }) => args[0] === DELETION_URL);
      expect(built.args[1].credentials).to.equal('include');
    });
  });
});
