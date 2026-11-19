import { expect } from 'chai';
import { spec, storage } from 'modules/nexverseBidAdapter.js';
import { config } from 'src/config.js';
import * as winDimensions from 'src/utils/winDimensions.js';
import { getDeviceModel, buildEndpointUrl, parseNativeResponse } from '../../../libraries/nexverseUtils/index.js';
import { getOsVersion } from '../../../libraries/advangUtils/index.js';

const BIDDER_ENDPOINT = 'https://rtb.nexverse.ai';

describe('nexverseBidAdapterTests', () => {
  let userAgentDescriptor;

  beforeEach(() => {
    userAgentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  });

  afterEach(() => {
    if (userAgentDescriptor) {
      Object.defineProperty(navigator, 'userAgent', userAgentDescriptor);
    } else {
      delete navigator.userAgent;
    }
  });

  describe('auction requests and responses', () => {
    let sandbox;
    let bid;
    let bidderRequest;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(storage, 'getCookie').returns('publisher-user');
      sandbox.stub(storage, 'setCookie');
      sandbox.stub(config, 'getConfig').withArgs('debug').returns(false);
      sandbox.stub(winDimensions, 'getWinDimensions').returns({ innerWidth: 1000, innerHeight: 1000 });
      bid = {
        bidId: 'bid-1',
        adUnitCode: 'nexverse-test-unit',
        sizes: [[300, 250], [320, 50]],
        mediaTypes: { banner: {} },
        params: { uid: 'publisher', pubId: '123', pubEpid: '456', bidFloor: 0.75 }
      };
      bidderRequest = {
        auctionId: 'auction-1',
        auctionStart: 123456,
        refererInfo: { page: 'https://publisher.example/article', domain: 'publisher.example' }
      };
    });

    afterEach(() => sandbox.restore());

    function payload() {
      return JSON.parse(spec.buildRequests([bid], bidderRequest)[0].data);
    }

    function responseBid(overrides = {}) {
      return Object.assign({ impid: 'bid-1', id: 'creative-1', price: 1.25, adm: '<div>Ad</div>', cat: ['IAB1', 'IAB2'] }, overrides);
    }

    function interpret(bids, extra = {}) {
      return spec.interpretResponse({ body: Object.assign({ seatbid: [{ bid: bids }] }, extra) });
    }

    it('builds a POST request with banner sizes, auction context, and a persistent user ID', () => {
      const [request] = spec.buildRequests([bid], bidderRequest);
      const data = JSON.parse(request.data);
      expect(request).to.include({ method: 'POST', bidRequest: bid, url: `${BIDDER_ENDPOINT}?uid=publisher&pub_id=123&pub_epid=456` });
      expect(data.id).to.equal('auction-1');
      expect(data.site).to.deep.equal({ page: 'https://publisher.example/article', domain: 'publisher.example', ref: '' });
      expect(data.imp).to.deep.equal([{
        id: 'bid-1',
        banner: { format: [{ w: 300, h: 250 }, { w: 320, h: 50 }], w: 300, h: 250 },
        secure: window.location.protocol === 'https:' ? 1 : 0,
        metric: [{ type: 'viewability', value: 0, vendor: 'nexverse.ai' }],
        ext: { gpid: 'nexverse-test-unit' },
        bidFloor: 0.75
      }]);
      expect(data.user).to.include({ id: 'publisher-user', buyeruid: '', yob: null, gender: '', keywords: '' });
      expect(data.user.ext.consent).to.equal(null);
      expect(data.regs.ext.gdpr).to.equal(0);
      expect(data.ext.prebid.auctiontimestamp).to.equal(123456);
      expect(data.test).to.equal(0);
      expect(storage.setCookie.calledOnce).to.equal(true);
    });

    it('preserves one request per bid and drops bids without auction context', () => {
      const second = Object.assign({}, bid, { bidId: 'bid-2' });
      const requests = spec.buildRequests([bid, second], bidderRequest);
      expect(requests.map(request => JSON.parse(request.data).imp[0].id)).to.deep.equal(['bid-1', 'bid-2']);
      expect(spec.buildRequests([bid], null)).to.deep.equal([]);
      expect(spec.buildRequests([], bidderRequest)).to.deep.equal([]);
    });

    it('builds video and native impressions alongside banner and requests media-specific floors', () => {
      bid.mediaTypes.video = { mimes: ['video/webm'], protocols: [3], maxduration: 15, linearity: 2, playbackmethod: [1] };
      bid.mediaTypes.native = { title: { required: true }, image: { required: true } };
      bid.getFloor = sandbox.stub().callsFake(({ mediaType }) => ({ floor: { banner: 1, video: 2, native: 3 }[mediaType] }));
      const { imp } = payload();
      expect(imp).to.have.length(3);
      expect(imp[1].video).to.deep.equal({ w: 300, h: 250, mimes: ['video/webm'], protocols: [3], maxduration: 15, linearity: 2, playbackmethod: [1] });
      expect(JSON.parse(imp[2].native.request)).to.deep.equal(bid.mediaTypes.native);
      expect(imp.map(impression => impression.bidFloor)).to.deep.equal([1, 2, 3]);
      expect(bid.getFloor.getCalls().map(call => call.args[0])).to.deep.equal(['banner', 'video', 'native'].map(mediaType => ({ currency: 'USD', mediaType, size: '*' })));
    });

    it('uses video defaults for an otherwise unconfigured video impression', () => {
      bid.mediaTypes = { video: {} };
      expect(payload().imp[0].video).to.deep.equal({ w: 300, h: 250, mimes: ['video/mp4'], protocols: [2, 3, 5, 6], maxduration: 30, linearity: 1, playbackmethod: [2] });
    });

    it('includes user demographics, consent, referrer, and app details', () => {
      Object.assign(bid.params, { yob: '1980', gender: 'F', keywords: 'news', geoLat: 10, geoLon: 20 });
      Object.assign(bidderRequest, {
        userId: 'buyer-user',
        gdprConsent: { gdprApplies: true, consentString: 'gdpr-consent' },
        uspConsent: '1YNN',
        app: { id: 'app-1', name: 'Example', bundle: 'example.app', domain: 'app.example', storeUrl: 'https://store.example/app', cat: ['IAB1'] }
      });
      bidderRequest.refererInfo.ref = 'https://search.example/';
      const data = payload();
      expect(data.user).to.deep.equal({ id: 'publisher-user', buyeruid: 'buyer-user', yob: 1980, gender: 'F', keywords: 'news', ext: { consent: 'gdpr-consent' } });
      expect(data.device.geo).to.deep.equal({ lat: 10, lon: 20 });
      expect(data.regs.ext).to.deep.equal({ gdpr: 1, us_privacy: '1YNN' });
      expect(data.site.ref).to.equal('https://search.example/');
      expect(data.app).to.deep.equal({ id: 'app-1', name: 'Example', bundle: 'example.app', domain: 'app.example', storeurl: 'https://store.example/app', cat: ['IAB1'] });
    });

    it('generates an auction ID, defaults app categories, and supports per-bid debug mode', () => {
      delete bidderRequest.auctionId;
      bidderRequest.app = { id: 'app-1' };
      bid.isDebug = true;
      const data = payload();
      expect(data.id).to.match(/^[0-9a-f-]{36}$/i);
      expect(data.app.cat).to.deep.equal([]);
      expect(data.test).to.equal(1);
    });

    it('measures the visible share of a clipped ad unit', () => {
      bid.element = { getBoundingClientRect: () => ({ top: -125, bottom: 125, left: 0, right: 300, width: 300, height: 250 }) };
      expect(payload().imp[0].metric[0].value).to.equal(0.5);
    });

    it('reports zero viewability for an ad outside the viewport', () => {
      bid.element = { getBoundingClientRect: () => ({ top: 1100, bottom: 1350, left: 0, right: 300, width: 300, height: 250 }) };
      expect(payload().imp[0].metric[0].value).to.equal(0);
    });

    it('returns no bids for no-content and invalid auction responses', () => {
      expect(spec.interpretResponse({ status: 204 })).to.deep.equal([]);
      [undefined, {}, { seatbid: {} }].forEach(body => {
        expect(spec.interpretResponse({ body })).to.deep.equal([]);
      });
      expect(interpret([])).to.deep.equal([]);
    });

    it('maps banner responses and advertiser metadata to Prebid bids', () => {
      const [result] = interpret([responseBid({ crid: 'creative-id', w: 300, h: 250, adomain: ['advertiser.example'], attr: [1], nurl: 'https://tracker.example/win' })], { cur: 'EUR' });
      expect(result).to.deep.equal({
        requestId: 'bid-1',
        cpm: 1.25,
        currency: 'EUR',
        width: 300,
        height: 250,
        creativeId: 'creative-id',
        ttl: 300,
        netRevenue: true,
        mediaType: 'banner',
        ad: '<div>Ad</div>',
        nurl: 'https://tracker.example/win',
        meta: { advertiserDomains: ['advertiser.example'], attr: [1], primaryCatId: ['IAB1', 'IAB2'], secondaryCatIds: ['IAB2'] }
      });
    });

    it('applies response defaults and handles bids from multiple seats', () => {
      const bids = spec.interpretResponse({
        body: {
          seatbid: [
            { bid: [responseBid({ adm: undefined, bundle: 'advertiser.app' })] },
            { bid: [responseBid({ id: 'creative-2', impid: 'bid-2', ext: { mediaType: 'video' } })] }
          ]
        }
      });
      expect(bids).to.have.length(2);
      expect(bids[0]).to.include({ currency: 'USD', width: 0, height: 0, creativeId: 'creative-1', mediaType: 'banner', ad: '' });
      expect(bids[0].meta).to.include({ advertiserDomains: 'advertiser.app' });
      expect(bids[0].meta.attr).to.deep.equal([]);
      expect(bids[1]).to.include({ requestId: 'bid-2', mediaType: 'video' });
    });

    it('recognizes VAST markup as video', () => {
      const vastXml = '<VAST version="3.0"></VAST>';
      expect(interpret([responseBid({ adm: vastXml })])[0]).to.include({ mediaType: 'video', vastXml });
    });

    it('parses native responses into Prebid native assets', () => {
      const adm = JSON.stringify({ native: { assets: [{ id: 1, title: { text: 'Native headline' } }], link: { url: 'https://advertiser.example/' } } });
      const [result] = interpret([responseBid({ adm })]);
      expect(result.mediaType).to.equal('native');
      expect(result.native).to.include({ title: 'Native headline', clickUrl: 'https://advertiser.example/' });
    });

    it('includes supported consent strings and the stored ID in iframe syncs', () => {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'consent' }, { consentString: '1YNN' }, { gppString: 'gpp-consent', applicableSections: [7, 8] }, true);
      expect(sync).to.deep.equal({ type: 'iframe', url: `${BIDDER_ENDPOINT}/iframe?pbjs=1&gdpr=1&gdpr_consent=consent&ccpa_consent=1YNN&gpp=gpp-consent&gpp_sid=7,8&coppa=1&uid=publisher-user` });
    });

    it('uses pixel syncs and defaults unspecified GDPR applicability to zero', () => {
      [undefined, false].forEach(gdprApplies => {
        const [sync] = spec.getUserSyncs({ pixelEnabled: true }, [], { gdprApplies, consentString: 'consent' }, null, { gppString: 'ignored', applicableSections: [] }, false);
        expect(sync).to.deep.equal({ type: 'image', url: `${BIDDER_ENDPOINT}/image?pbjs=1&gdpr=0&gdpr_consent=consent&coppa=0&uid=publisher-user` });
      });
    });
  });

  describe('getUserSyncs', () => {
    it('includes configured COPPA in the sync URL', () => {
      const [sync] = spec.getUserSyncs({ pixelEnabled: true }, [], null, null, null, true);
      expect(sync.url).to.include('&coppa=1');
    });

    it('reports COPPA as disabled in the sync URL', () => {
      const [sync] = spec.getUserSyncs({ pixelEnabled: true }, [], null, null, null, false);
      expect(sync.url).to.include('&coppa=0');
    });
  });

  describe('isBidRequestValid', function () {
    const sbid = {
      'adUnitCode': 'div',
      'bidder': 'nexverse',
      'params': {
        'uid': '77d4a2eb3d209ce6c7691dc79fcab358',
        'pubId': '24051'
      },
    };

    it('should not accept bid without required params', function () {
      const isValid = spec.isBidRequestValid(sbid);
      expect(isValid).to.equal(false);
    });

    it('should return false when params are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = { uid: '', pubId: '', pubEpid: '' };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.adUnitCode = '';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = { uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051' };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return true when valid params are passed as nums', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = { uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051', pubEpid: '34561' };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('getDeviceModel', () => {
    it('should return "iPhone" for iPhone userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', configurable: true });
      expect(getDeviceModel()).to.equal('iPhone');
    });

    it('should return "iPad" for iPad userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', configurable: true });
      expect(getDeviceModel()).to.equal('iPad');
    });

    it('should return the Android device name for Android userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10; Pixel 3 Build/QQ2A.200305.003) AppleWebKit/537.36', configurable: true });
      expect(getDeviceModel()).to.equal('Pixel 3');
    });

    it('should return "Unknown Android Device" if device name is missing in Android userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10;) AppleWebKit/537.36', configurable: true });
      expect(getDeviceModel()).to.equal('Unknown Android Device');
    });

    it('should return "Mac" for Mac userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', configurable: true });
      expect(getDeviceModel()).to.equal('Mac');
    });

    it('should return "Linux" for Linux userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (X11; Linux x86_64)', configurable: true });
      expect(getDeviceModel()).to.equal('Linux');
    });

    it('should return "Windows PC" for Windows userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', configurable: true });
      expect(getDeviceModel()).to.equal('Windows PC');
    });

    it('should return "Unknown Device" for an unrecognized userAgent', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Unknown OS)', configurable: true });
      expect(getDeviceModel()).to.equal('');
    });
  });

  describe('buildEndpointUrl', () => {
    it('should construct the URL with uid, pubId, and pubEpid', function () {
      const bid = {
        params: {
          uid: '12345',
          pubId: '67890',
          pubEpid: 'abcdef'
        },
        isDebug: false
      };
      const expectedUrl = `${BIDDER_ENDPOINT}?uid=12345&pub_id=67890&pub_epid=abcdef`;
      expect(buildEndpointUrl(BIDDER_ENDPOINT, bid)).to.equal(expectedUrl);
    });
  });

  describe('buildEndpointUrl', () => {
    it('should construct the test URL with uid, pubId, and pubEpid', function () {
      const bid = {
        params: {
          uid: '12345',
          pubId: '67890',
          pubEpid: 'abcdef'
        },
        isDebug: true
      };
      const expectedUrl = `${BIDDER_ENDPOINT}?uid=12345&pub_id=67890&pub_epid=abcdef&test=1`;
      expect(buildEndpointUrl(BIDDER_ENDPOINT, bid)).to.equal(expectedUrl);
    });
  });

  describe('parseNativeResponse', () => {
    it('should parse and return the empty json object from a invalid JSON string', function () {
      const adm = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Nexverse test ad</title></head></body></html>';
      const result = parseNativeResponse(adm);
      expect(result).to.deep.equal({});
    });
    it('should parse and return the native object from a valid JSON string', function () {
      const adm = '{"native":{"ver":"1.2","assets":[{"id":1,"required":1,"title":{"text":"Discover Amazing Products Today!"}},{"id":2,"required":1,"img":{"type":3,"url":"https://cdn.prod.website-files.com/64aabfa2adf7363205ea0135/67c168c650acb91b6ce4dfdf_%EC%8D%B8%EB%84%A4%EC%9D%BC_EN.webp","w":600,"h":315}},{"id":3,"data":{"label":"CTA","value":"Click Here To Visit Site","type":12}}],"link":{"url":"https://dailyhunt.in/news/india/english/for+you?launch=true&mode=pwa"},"imptrackers":["https://example.com/impression"]}}'; // JSON string
      const result = parseNativeResponse(adm);
      expect(result).to.deep.equal({
        clickTrackers: [],
        clickUrl:
          "https://dailyhunt.in/news/india/english/for+you?launch=true&mode=pwa",
        cta: "Click Here To Visit Site",
        image: {
          height: 315,
          url: "https://cdn.prod.website-files.com/64aabfa2adf7363205ea0135/67c168c650acb91b6ce4dfdf_%EC%8D%B8%EB%84%A4%EC%9D%BC_EN.webp",
          width: 600,
        },
        impressionTrackers: ["https://example.com/impression"],
        javascriptTrackers: [],
        title: "Discover Amazing Products Today!",
      });
    });
  });

  describe('getOsVersion', () => {
    it('should detect Android OS', function () {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10; Pixel 3 Build/QQ2A.200305.003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36', configurable: true });
      expect(getOsVersion()).to.equal('Android');
    });
    it('should detect iOS', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('iOS');
    });
    it('should detect Mac OS X', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Mac OS X');
    });
    it('should detect Windows 10', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Windows 10');
    });
    it('should detect Linux', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Linux');
    });
    it('should detect Windows 7', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Windows 7');
    });
    it('should detect Search Bot', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('Search Bot');
    });
    it('should return unknown for an unrecognized user agent', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Unknown OS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      expect(getOsVersion()).to.equal('unknown');
    });
  });
});
