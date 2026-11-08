import { expect } from 'chai';
import {
  spec,
  ENDPOINT_URL,
  endpointFor,
  SYNC_URL,
  normalizeOrtbResponse,
  resolveMediaType
} from 'modules/amlimediaBidAdapter.js';
import 'modules/priceFloors.js';
import { config } from 'src/config.js';
import { getGlobal } from 'src/prebidGlobal.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('amlimediaBidAdapter', function () {
  const NATIVE_ORTB_REQUEST = {
    ver: '1.2',
    assets: [
      { id: 1, required: 1, title: { len: 80 } },
      { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }
    ]
  };
  const NATIVE_ORTB_RESPONSE = {
    ver: '1.2',
    link: { url: 'https://advertiser.example/landing' },
    assets: [
      { id: 1, title: { text: 'Amli headline' } },
      { id: 2, img: { url: 'https://cdn.example/creative.jpg', w: 300, h: 250 } }
    ]
  };
  const VAST = '<?xml version="1.0"?><VAST version="4.2"><Ad id="1"><InLine></InLine></Ad></VAST>';
  const AUDIO_VAST = '<VAST version="4.2"><Ad><InLine><Creatives><Creative><Linear><MediaFiles>' +
    '<MediaFile type="audio/mpeg" delivery="progressive">https://cdn.example/a.mp3</MediaFile>' +
    '</MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>';

  function makeBid(overrides = {}) {
    return {
      bidder: 'amlimedia',
      bidId: 'bid-banner',
      adUnitCode: 'div-banner',
      auctionId: 'auction-1',
      params: { pid: 'amli-123' },
      mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
      ...overrides
    };
  }

  function makeBidderRequest(overrides = {}) {
    return {
      bidderCode: 'amlimedia',
      auctionId: 'auction-1',
      timeout: 1200,
      refererInfo: { page: 'https://publisher.example/article', ref: 'https://google.com/', domain: 'publisher.example' },
      ortb2: {
        site: { page: 'https://publisher.example/article', domain: 'publisher.example' },
        device: { ua: 'Mozilla/5.0 test', w: 1920, h: 1080, language: 'en' }
      },
      ...overrides
    };
  }

  function build(bids = [makeBid()], bidderRequest = makeBidderRequest()) {
    return spec.buildRequests(bids, bidderRequest)[0];
  }

  function respond(request, bids, extra = {}) {
    return {
      body: {
        id: request.data.id,
        seatbid: [{ seat: 'amli', bid: bids }],
        ...extra
      }
    };
  }

  afterEach(function () {
    config.resetConfig();
  });

  describe('spec', function () {
    it('registers the amlimedia code with every supported media type', function () {
      expect(spec.code).to.equal('amlimedia');
      expect(spec.supportedMediaTypes).to.have.members(['banner', 'video', 'native', 'audio']);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a string pid', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });

    it('accepts a numeric pid', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { pid: 4521 } }))).to.equal(true);
    });

    it('accepts test 0, 1 and their string forms', function () {
      [0, 1, '0', '1'].forEach(test => {
        expect(spec.isBidRequestValid(makeBid({ params: { pid: 'amli-123', test } }))).to.equal(true);
      });
    });

    it('rejects a missing, empty or malformed pid', function () {
      [undefined, null, '', '   ', NaN, {}, []].forEach(pid => {
        expect(spec.isBidRequestValid(makeBid({ params: { pid } }))).to.equal(false);
      });
    });

    it('rejects a bid without params', function () {
      expect(spec.isBidRequestValid(makeBid({ params: undefined }))).to.equal(false);
    });

    it('rejects a test flag other than 0 or 1', function () {
      [2, -1, 'yes', true].forEach(test => {
        expect(spec.isBidRequestValid(makeBid({ params: { pid: 'amli-123', test } }))).to.equal(false);
      });
    });

    it('rejects a negative or non-numeric bidfloor', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { pid: 'amli-123', bidfloor: -1 } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { pid: 'amli-123', bidfloor: '1.5' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { pid: 'amli-123', bidfloor: 1.5 } }))).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('returns nothing when there are no valid bids', function () {
      expect(spec.buildRequests([], makeBidderRequest())).to.deep.equal([]);
    });

    it('posts with credentials to the placement URL', function () {
      const request = build();
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://rtb.amlimedia.com/?intg=pbjs&pid=amli-123');
      expect(request.url).to.equal(endpointFor('amli-123'));
      expect(request.url.indexOf(ENDPOINT_URL)).to.equal(0);
      expect(request.options).to.deep.equal({ withCredentials: true });
    });

    it('builds the URL from a dashboard pid', function () {
      const request = build([makeBid({ params: { pid: '0a1b2c3d4e5f60718293a4b5c6d7e8' } })]);
      expect(request.url).to.equal('https://rtb.amlimedia.com/?intg=pbjs&pid=0a1b2c3d4e5f60718293a4b5c6d7e8');
    });

    it('trims and URL-encodes the pid', function () {
      const request = build([makeBid({ params: { pid: ' a b&c ' } })]);
      expect(request.url).to.equal('https://rtb.amlimedia.com/?intg=pbjs&pid=a%20b%26c');
      expect(request.data.imp[0].tagid).to.equal('a b&c');
    });

    it('sends every ad unit as its own single-imp request, even when ad units share a pid', function () {
      const bids = [
        makeBid(),
        makeBid({ bidId: 'bid-2', adUnitCode: 'div-2', params: { pid: 'amli-456' } }),
        makeBid({ bidId: 'bid-3', adUnitCode: 'div-3', params: { pid: 'amli-123' } })
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest());
      expect(requests.map(request => request.url)).to.deep.equal([
        'https://rtb.amlimedia.com/?intg=pbjs&pid=amli-123',
        'https://rtb.amlimedia.com/?intg=pbjs&pid=amli-456',
        'https://rtb.amlimedia.com/?intg=pbjs&pid=amli-123'
      ]);
      expect(requests.map(request => request.data.imp.map(imp => imp.id))).to.deep.equal([['bid-banner'], ['bid-2'], ['bid-3']]);
      expect(new Set(requests.map(request => request.data.id)).size).to.equal(3);
    });

    it('sends a numeric pid and its string form to the same placement URL', function () {
      const bids = [makeBid({ params: { pid: 4521 } }), makeBid({ bidId: 'bid-2', params: { pid: '4521' } })];
      const requests = spec.buildRequests(bids, makeBidderRequest());
      expect(requests.map(request => request.url)).to.deep.equal([
        'https://rtb.amlimedia.com/?intg=pbjs&pid=4521',
        'https://rtb.amlimedia.com/?intg=pbjs&pid=4521'
      ]);
    });

    it('reads each response against its own request', function () {
      const bids = [makeBid(), makeBid({ bidId: 'bid-2', adUnitCode: 'div-2', params: { pid: 'amli-456' } })];
      const [first, second] = spec.buildRequests(bids, makeBidderRequest());
      const ortbBid = (impid) => ({ impid, price: 1, adm: '<div></div>', w: 300, h: 250, crid: 'c', mtype: 1 });
      expect(spec.interpretResponse(respond(second, [ortbBid('bid-2')]), second).map(bid => bid.requestId)).to.deep.equal(['bid-2']);
      expect(spec.interpretResponse(respond(first, [ortbBid('bid-2')]), first)).to.deep.equal([]);
    });

    it('carries the pid on tagid and the imp extension', function () {
      const imp = build([makeBid({ params: { pid: 4521 } })]).data.imp[0];
      expect(imp.id).to.equal('bid-banner');
      expect(imp.tagid).to.equal('4521');
      expect(imp.ext.amlimedia).to.deep.equal({ pid: '4521', test: 0, adUnitCode: 'div-banner' });
      expect(imp.secure).to.equal(1);
      expect(imp.displaymanager).to.equal('Prebid.js');
      expect(imp.displaymanagerver).to.be.a('string');
    });

    it('builds a banner imp with every size', function () {
      const imp = build().data.imp[0];
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    it('keeps impression level first party data such as gpid and instl', function () {
      const bid = makeBid({ ortb2Imp: { instl: 1, ext: { gpid: '/1234/home/top', data: { pbadslot: '/1234/home/top' } } } });
      const imp = build([bid]).data.imp[0];
      expect(imp.instl).to.equal(1);
      expect(imp.ext.gpid).to.equal('/1234/home/top');
      expect(imp.ext.amlimedia.pid).to.equal('amli-123');
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp from mediaTypes.video', function () {
        const bid = makeBid({
          mediaTypes: {
            video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3, 7], plcmt: 1 }
          }
        });
        const imp = build([bid]).data.imp[0];
        expect(imp.video).to.include({ w: 640, h: 480, plcmt: 1 });
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3, 7]);
        expect(imp.banner).to.equal(undefined);
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a native imp from the ORTB native request', function () {
        const bid = makeBid({ mediaTypes: { native: { ortb: NATIVE_ORTB_REQUEST } }, nativeOrtbRequest: NATIVE_ORTB_REQUEST });
        const imp = build([bid]).data.imp[0];
        expect(JSON.parse(imp.native.request).assets).to.deep.equal(NATIVE_ORTB_REQUEST.assets);
        expect(imp.native.ver).to.equal('1.2');
      });
    }

    if (FEATURES.AUDIO) {
      it('builds an audio imp from mediaTypes.audio', function () {
        const bid = makeBid({
          mediaTypes: { audio: { mimes: ['audio/mpeg'], protocols: [2, 3], minduration: 5, maxduration: 30 } }
        });
        const imp = build([bid]).data.imp[0];
        expect(imp.audio).to.deep.include({ mimes: ['audio/mpeg'], minduration: 5, maxduration: 30 });
        expect(imp.banner).to.equal(undefined);
      });
    }

    if (FEATURES.VIDEO && FEATURES.NATIVE) {
      it('keeps every format of a multi-format ad unit on one imp', function () {
        const bid = makeBid({
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] },
            native: { ortb: NATIVE_ORTB_REQUEST }
          },
          nativeOrtbRequest: NATIVE_ORTB_REQUEST
        });
        const imp = build([bid]).data.imp[0];
        expect(imp.banner).to.exist;
        expect(imp.video).to.exist;
        expect(imp.native).to.exist;
      });
    }

    it('uses the floors module through getFloor', function () {
      const bid = makeBid({
        params: { pid: 'amli-123', bidfloor: 0.1 },
        getFloor: sinon.stub().returns({ floor: 1.75, currency: 'USD' })
      });
      const imp = build([bid]).data.imp[0];
      expect(bid.getFloor.called).to.equal(true);
      expect(bid.getFloor.firstCall.args[0].currency).to.equal('USD');
      expect(imp.bidfloor).to.equal(1.75);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('asks the floors module for USD floors even when the ad server currency differs', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      const bid = makeBid({ getFloor: sinon.stub().returns({ floor: 2, currency: 'USD' }) });
      build([bid]);
      expect(bid.getFloor.firstCall.args[0].currency).to.equal('USD');
    });

    it('falls back to the bidfloor param, in USD, when no floor is available', function () {
      const imp = build([makeBid({ params: { pid: 'amli-123', bidfloor: 0.4 } })]).data.imp[0];
      expect(imp.bidfloor).to.equal(0.4);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    describe('floors in another currency', function () {
      let originalConvert;
      beforeEach(function () {
        originalConvert = getGlobal().convertCurrency;
      });
      afterEach(function () {
        if (originalConvert) {
          getGlobal().convertCurrency = originalConvert;
        } else {
          delete getGlobal().convertCurrency;
        }
      });

      it('converts the floor to USD through the currency module', function () {
        getGlobal().convertCurrency = (amount, from, to) => (from === 'EUR' && to === 'USD' ? amount * 1.1 : amount);
        const imp = build([makeBid({ ortb2Imp: { bidfloor: 2, bidfloorcur: 'eur' } })]).data.imp[0];
        expect(imp.bidfloor).to.equal(2.2);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('drops a floor that cannot be converted rather than send a currency the exchange rejects', function () {
        getGlobal().convertCurrency = () => { throw new Error('no conversion rates'); };
        const warnStub = sinon.stub(utils, 'logWarn');
        try {
          const imp = build([makeBid({ ortb2Imp: { bidfloor: 2, bidfloorcur: 'EUR' } })]).data.imp[0];
          expect(imp.bidfloor).to.equal(undefined);
          expect(imp.bidfloorcur).to.equal(undefined);
        } finally {
          warnStub.restore();
        }
      });

      it('labels a floor without a currency as USD', function () {
        const imp = build([makeBid({ ortb2Imp: { bidfloor: 1.5 } })]).data.imp[0];
        expect(imp.bidfloor).to.equal(1.5);
        expect(imp.bidfloorcur).to.equal('USD');
      });
    });

    it('leaves test off by default', function () {
      const data = build().data;
      expect(data.test).to.equal(0);
    });

    it('turns test mode on only for the ad unit that sets test: 1', function () {
      const logStub = sinon.stub(utils, 'logInfo');
      try {
        const bids = [makeBid(), makeBid({ bidId: 'bid-2', params: { pid: 'amli-9', test: '1' } })];
        const [live, test] = spec.buildRequests(bids, makeBidderRequest());
        expect(live.data.test).to.equal(0);
        expect(live.data.imp[0].ext.amlimedia.test).to.equal(0);
        expect(test.data.test).to.equal(1);
        expect(test.data.imp[0].ext.amlimedia.test).to.equal(1);
      } finally {
        logStub.restore();
      }
    });

    it('keeps test mode separate for ad units sharing a pid', function () {
      const logStub = sinon.stub(utils, 'logInfo');
      try {
        const bids = [makeBid(), makeBid({ bidId: 'bid-2', params: { pid: 'amli-123', test: 1 } })];
        const requests = spec.buildRequests(bids, makeBidderRequest());
        expect(requests.map(request => request.data.test)).to.deep.equal([0, 1]);
      } finally {
        logStub.restore();
      }
    });

    it('sets the request id, tmax, currency and adapter extension', function () {
      const data = build().data;
      expect(data.id).to.be.a('string').and.not.be.empty;
      expect(data.tmax).to.equal(1200);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.ext.prebid.channel.name).to.equal('pbjs');
      expect(data.ext.amlimedia.adapterVersion).to.equal('1.0.0');
    });

    it('always asks for USD bids, whatever the ad server currency or first party data says', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      const bidderRequest = makeBidderRequest();
      bidderRequest.ortb2.cur = ['GBP'];
      expect(build([makeBid()], bidderRequest).data.cur).to.deep.equal(['USD']);
    });

    describe('device and geo', function () {
      it('adds device details the browser did not provide through first party data', function () {
        const device = build().data.device;
        expect(device.ua).to.equal('Mozilla/5.0 test');
        expect(device.w).to.equal(1920);
        expect(device.h).to.equal(1080);
        expect(device.language).to.equal('en');
        expect(device.js).to.equal(1);
        expect([2, 4, 5]).to.include(device.devicetype);
        expect(device.os).to.be.a('string');
        expect(device.pxratio).to.equal(undefined);
      });

      it('never overrides device values present in first party data', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.device = {
          ua: 'Custom UA',
          devicetype: 3,
          os: 'Tizen',
          osv: '7',
          js: 0,
          pxratio: 3,
          connectiontype: 2,
          geo: { lat: 52.52, lon: 13.4, country: 'DEU', type: 1 },
          ext: { timezone: 'Europe/Berlin' }
        };
        const device = build([makeBid()], bidderRequest).data.device;
        expect(device).to.deep.include({ ua: 'Custom UA', devicetype: 3, os: 'Tizen', osv: '7', js: 0, pxratio: 3, connectiontype: 2 });
        expect(device.geo).to.deep.equal({ lat: 52.52, lon: 13.4, country: 'DEU', type: 1 });
        expect(device.ext.timezone).to.equal('Europe/Berlin');
      });

      it('reads OS details from user agent client hints', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.device.sua = { platform: { brand: 'Android', version: ['14', '0'] }, mobile: 1 };
        const device = build([makeBid()], bidderRequest).data.device;
        expect(device.os).to.equal('Android');
        expect(device.osv).to.equal('14.0');
      });

      it('copies user.geo to device.geo when only the user location is known', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.user = { geo: { country: 'IND', region: 'MH', city: 'Mumbai', type: 2 } };
        const data = build([makeBid()], bidderRequest).data;
        expect(data.device.geo).to.deep.equal({ country: 'IND', region: 'MH', city: 'Mumbai', type: 2 });
        expect(data.user.geo).to.deep.equal({ country: 'IND', region: 'MH', city: 'Mumbai', type: 2 });
      });

      it('creates a device object when first party data has none', function () {
        const bidderRequest = makeBidderRequest({ ortb2: {} });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.device.js).to.equal(1);
      });
    });

    describe('site and app', function () {
      it('falls back to refererInfo for the page and referrer', function () {
        const data = build([makeBid()], makeBidderRequest({ ortb2: {} })).data;
        expect(data.site.page).to.equal('https://publisher.example/article');
        expect(data.site.ref).to.equal('https://google.com/');
      });

      it('merges site, content and blocking first party data', function () {
        const bidderRequest = makeBidderRequest();
        Object.assign(bidderRequest.ortb2, {
          bcat: ['IAB25'],
          badv: ['blocked.example'],
          site: { page: 'https://publisher.example/article', cat: ['IAB1'], content: { language: 'en' }, publisher: { id: 'pub-1' } }
        });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.bcat).to.deep.equal(['IAB25']);
        expect(data.badv).to.deep.equal(['blocked.example']);
        expect(data.site.cat).to.deep.equal(['IAB1']);
        expect(data.site.content.language).to.equal('en');
        expect(data.site.publisher.id).to.equal('pub-1');
      });

      it('does not add a site to an app request', function () {
        const bidderRequest = makeBidderRequest({ ortb2: { app: { bundle: 'com.example.app', name: 'Example' } } });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.app.bundle).to.equal('com.example.app');
        expect(data.site).to.equal(undefined);
      });
    });

    describe('privacy signals', function () {
      it('sends GDPR applies and the consent string in both 2.5 and 2.6 locations', function () {
        const bidderRequest = makeBidderRequest({ gdprConsent: { gdprApplies: true, consentString: 'TCF_STRING' } });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.regs.gdpr).to.equal(1);
        expect(data.regs.ext.gdpr).to.equal(1);
        expect(data.user.consent).to.equal('TCF_STRING');
        expect(data.user.ext.consent).to.equal('TCF_STRING');
      });

      it('sends gdpr 0 when GDPR does not apply', function () {
        const bidderRequest = makeBidderRequest({ gdprConsent: { gdprApplies: false } });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.regs.gdpr).to.equal(0);
        expect(data.regs.ext.gdpr).to.equal(0);
      });

      it('mirrors consent written by the consent modules into ortb2', function () {
        const bidderRequest = makeBidderRequest();
        Object.assign(bidderRequest.ortb2, {
          regs: { ext: { gdpr: 1, us_privacy: '1YNN' }, gpp: 'GPP_STRING', gpp_sid: [7, 8] },
          user: { ext: { consent: 'FPD_TCF' } }
        });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.regs).to.deep.include({ gdpr: 1, us_privacy: '1YNN', gpp: 'GPP_STRING', gpp_sid: [7, 8] });
        expect(data.regs.ext).to.deep.include({ gdpr: 1, us_privacy: '1YNN', gpp: 'GPP_STRING', gpp_sid: [7, 8] });
        expect(data.user.consent).to.equal('FPD_TCF');
      });

      it('takes US Privacy and GPP from the bidder request', function () {
        const bidderRequest = makeBidderRequest({
          uspConsent: '1YYN',
          gppConsent: { gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB', applicableSections: [2] }
        });
        const data = build([makeBid()], bidderRequest).data;
        expect(data.regs.us_privacy).to.equal('1YYN');
        expect(data.regs.ext.us_privacy).to.equal('1YYN');
        expect(data.regs.gpp).to.equal('DBABMA~CPXxRfAPXxRfAAfKABENB');
        expect(data.regs.gpp_sid).to.deep.equal([2]);
      });

      it('sends an empty gpp_sid list when GPP has no applicable sections', function () {
        const data = build([makeBid()], makeBidderRequest({ gppConsent: { gppString: 'GPP' } })).data;
        expect(data.regs.gpp_sid).to.deep.equal([]);
      });

      it('passes COPPA, GPC and DSA through', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.regs = { coppa: 1, ext: { gpc: '1', dsa: { dsarequired: 2, pubrender: 0 } } };
        const regs = build([makeBid()], bidderRequest).data.regs;
        expect(regs.coppa).to.equal(1);
        expect(regs.ext.gpc).to.equal('1');
        expect(regs.ext.dsa).to.deep.equal({ dsarequired: 2, pubrender: 0 });
      });

      it('sends no privacy fields when there are no signals', function () {
        const data = build().data;
        expect(data.regs).to.equal(undefined);
        expect(data.user).to.equal(undefined);
      });
    });

    describe('user ids and supply chain', function () {
      const EIDS = [
        { source: 'pubcid.org', uids: [{ id: 'pubcid-1', atype: 1 }] },
        { source: 'uidapi.com', uids: [{ id: 'uid2-1', atype: 3 }] }
      ];
      const SCHAIN = { ver: '1.0', complete: 1, nodes: [{ asi: 'amlimedia.com', sid: 'pub-1', hp: 1 }] };

      it('sends every user id from ortb2 as eids in both locations', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.user = { ext: { eids: EIDS } };
        const user = build([makeBid()], bidderRequest).data.user;
        expect(user.ext.eids).to.deep.equal(EIDS);
        expect(user.eids).to.deep.equal(EIDS);
      });

      it('falls back to userIdAsEids on the bid request', function () {
        const user = build([makeBid({ userIdAsEids: EIDS })]).data.user;
        expect(user.eids).to.deep.equal(EIDS);
        expect(user.ext.eids).to.deep.equal(EIDS);
      });

      it('sends the supply chain in both locations', function () {
        const bidderRequest = makeBidderRequest();
        bidderRequest.ortb2.source = { schain: SCHAIN };
        const source = build([makeBid()], bidderRequest).data.source;
        expect(source.schain).to.deep.equal(SCHAIN);
        expect(source.ext.schain).to.deep.equal(SCHAIN);
      });

      it('reads a 2.5 style supply chain from the bid request', function () {
        const bid = makeBid({ ortb2: { source: { ext: { schain: SCHAIN } } } });
        const source = build([bid]).data.source;
        expect(source.schain).to.deep.equal(SCHAIN);
      });
    });
  });

  describe('interpretResponse', function () {
    it('returns nothing for empty, no-bid and malformed responses', function () {
      const request = build();
      [
        undefined,
        {},
        { body: null },
        { body: '' },
        { body: 'not json' },
        { body: 42 },
        { body: {} },
        { body: { seatbid: [] } },
        { body: { seatbid: [{ bid: [] }] } },
        { body: { seatbid: [{ bid: 'oops' }, null] } },
        { body: { id: 'x', nbr: 2 } },
        { body: { openrtb: { ver: '3.0' } } }
      ].forEach(serverResponse => {
        expect(spec.interpretResponse(serverResponse, request)).to.deep.equal([]);
      });
    });

    it('returns nothing when the request was not built by the adapter', function () {
      expect(spec.interpretResponse({ body: { seatbid: [{ bid: [{ impid: '1', price: 1 }] }] } }, {})).to.deep.equal([]);
    });

    it('maps an OpenRTB 2.6 banner bid', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{
        id: 'b1',
        impid: 'bid-banner',
        price: 1.25,
        adm: '<div>ad</div>',
        crid: 'cr-1',
        w: 300,
        h: 250,
        mtype: 1,
        adomain: ['brand.example'],
        cat: ['IAB3'],
        dealid: 'deal-7',
        exp: 600
      }], { cur: 'EUR' }), request);
      expect(bid).to.deep.include({
        requestId: 'bid-banner',
        cpm: 1.25,
        currency: 'EUR',
        width: 300,
        height: 250,
        ad: '<div>ad</div>',
        creativeId: 'cr-1',
        dealId: 'deal-7',
        ttl: 600,
        netRevenue: true,
        mediaType: 'banner'
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.example']);
      expect(bid.meta.primaryCatId).to.equal('IAB3');
      expect(bid.meta.mediaType).to.equal('banner');
    });

    it('defaults currency to USD, ttl to 300 and advertiserDomains to an empty list', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-banner', price: 1, adm: '<div></div>', crid: 'c', w: 300, h: 250 }]), request);
      expect(bid.currency).to.equal('USD');
      expect(bid.ttl).to.equal(300);
      expect(bid.meta.advertiserDomains).to.deep.equal([]);
    });

    it('detects a 2.5 banner bid from its markup and fills a missing size from the imp', function () {
      const request = build([makeBid({ mediaTypes: { banner: { sizes: [[320, 50]] } } })]);
      const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-banner', price: '0.85', adm: '<script>render()</script>', crid: 'c' }]), request);
      expect(bid.mediaType).to.equal('banner');
      expect(bid.cpm).to.equal(0.85);
      expect(bid.width).to.equal(320);
      expect(bid.height).to.equal(50);
    });

    it('reads numeric impids', function () {
      const request = build([makeBid({ bidId: '12345' })]);
      const [bid] = spec.interpretResponse(respond(request, [{ impid: 12345, price: 1, adm: '<div></div>', w: 300, h: 250, crid: 'c' }]), request);
      expect(bid.requestId).to.equal('12345');
    });

    it('skips bids without a positive price', function () {
      const request = build();
      const bids = spec.interpretResponse(respond(request, [
        { impid: 'bid-banner', price: 0, adm: '<div></div>', w: 300, h: 250, crid: 'a' },
        { impid: 'bid-banner', adm: '<div></div>', w: 300, h: 250, crid: 'b' },
        { impid: 'bid-banner', price: 'free', adm: '<div></div>', w: 300, h: 250, crid: 'c' }
      ]), request);
      expect(bids).to.deep.equal([]);
    });

    it('skips a bid that carries neither markup nor a URL to load it from', function () {
      const request = build();
      const warnStub = sinon.stub(utils, 'logWarn');
      try {
        const bids = spec.interpretResponse(respond(request, [
          { id: 'empty', impid: 'bid-banner', price: 1, w: 300, h: 250, crid: 'c', mtype: 1 },
          { id: 'blank', impid: 'bid-banner', price: 1, adm: '', nurl: '', w: 300, h: 250, crid: 'c', mtype: 1 }
        ]), request);
        expect(bids).to.deep.equal([]);
      } finally {
        warnStub.restore();
      }
    });

    it('skips bids for an imp that was never requested', function () {
      const request = build();
      const bids = spec.interpretResponse(respond(request, [{ impid: 'unknown', price: 1, adm: '<div></div>', w: 300, h: 250, crid: 'c' }]), request);
      expect(bids).to.deep.equal([]);
    });

    it('renders the banner win notice with the creative instead of firing it on win', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{
        impid: 'bid-banner',
        price: 1,
        adm: '<div>creative</div>',
        w: 300,
        h: 250,
        crid: 'c',
        mtype: 1,
        nurl: 'https://win.amlimedia.com/n',
        burl: 'https://bill.amlimedia.com/b?p=${AUCTION_PRICE}'
      }]), request);
      expect(bid.ad).to.contain('https://win.amlimedia.com/n');
      expect(bid.ad).to.contain('<div>creative</div>');
      expect(bid.nurl).to.equal(undefined);
      expect(bid.burl).to.equal('https://bill.amlimedia.com/b?p=${AUCTION_PRICE}');
    });

    it('uses nurl as the ad URL of a banner bid without markup', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{
        impid: 'bid-banner', price: 1, nurl: 'https://ad.amlimedia.com/serve', w: 300, h: 250, crid: 'c'
      }]), request);
      expect(bid.mediaType).to.equal('banner');
      expect(bid.adUrl).to.equal('https://ad.amlimedia.com/serve');
      expect(bid.nurl).to.equal(undefined);
    });

    it('copies network and brand metadata', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{
        impid: 'bid-banner',
        price: 1,
        adm: '<div></div>',
        w: 300,
        h: 250,
        crid: 'c',
        mtype: 1,
        ext: { networkId: 77, brandName: 'Brand', dsa: { behalf: 'Brand', paid: 'Brand' } }
      }]), request);
      expect(bid.meta.networkId).to.equal(77);
      expect(bid.meta.brandName).to.equal('Brand');
      expect(bid.meta.dsa).to.deep.equal({ behalf: 'Brand', paid: 'Brand' });
    });

    it('ignores an mtype the imp did not ask for and uses the markup instead', function () {
      const request = build();
      const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-banner', price: 1, adm: '<div></div>', w: 300, h: 250, crid: 'c', mtype: 2 }]), request);
      expect(bid.mediaType).to.equal('banner');
    });

    it('accepts the response as a JSON string', function () {
      const request = build();
      const body = JSON.stringify(respond(request, [{ impid: 'bid-banner', price: 2, adm: '<div></div>', w: 300, h: 250, crid: 'c', mtype: 1 }]).body);
      const [bid] = spec.interpretResponse({ body }, request);
      expect(bid.cpm).to.equal(2);
    });

    it('accepts a flat bids array, a single seatbid and a wrapped body', function () {
      const request = build();
      const ortbBid = { impid: 'bid-banner', price: 2, adm: '<div></div>', w: 300, h: 250, crid: 'c', mtype: 1 };
      [
        { bids: [ortbBid] },
        { seat: 'amli', bid: [ortbBid] },
        [ortbBid],
        [{ seat: 'amli', bid: [ortbBid] }],
        { body: { seatbid: [{ bid: [ortbBid] }] } }
      ].forEach(body => {
        const bids = spec.interpretResponse({ body }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].cpm).to.equal(2);
      });
    });

    it('reads bids from several seats', function () {
      const request = build();
      const bids = spec.interpretResponse({
        body: {
          seatbid: [
            { seat: 'a', bid: [{ impid: 'bid-banner', price: 1, adm: '<div></div>', w: 300, h: 250, crid: 'a', mtype: 1 }] },
            { seat: 'b', bid: [{ impid: 'bid-banner', price: 2, adm: '<div></div>', w: 728, h: 90, crid: 'b', mtype: 1 }] }
          ]
        }
      }, request);
      expect(bids.map(bid => bid.creativeId)).to.deep.equal(['a', 'b']);
    });

    it('converts an OpenRTB 3.0 display bid', function () {
      const request = build();
      const [bid] = spec.interpretResponse({
        body: {
          openrtb: {
            ver: '3.0',
            response: {
              id: request.data.id,
              cur: 'USD',
              seatbid: [{
                seat: 'amli',
                bid: [{
                  id: 'r3',
                  item: 'bid-banner',
                  price: 3.1,
                  deal: 'deal-3',
                  purl: 'https://win.amlimedia.com/3',
                  media: { ad: { id: 'ad-3', adomain: ['brand3.example'], display: { w: 300, h: 250, adm: '<div>v3</div>' } } }
                }]
              }]
            }
          }
        }
      }, request);
      expect(bid).to.deep.include({ cpm: 3.1, width: 300, height: 250, creativeId: 'ad-3', dealId: 'deal-3', mediaType: 'banner' });
      expect(bid.ad).to.contain('<div>v3</div>');
      expect(bid.ad).to.contain('https://win.amlimedia.com/3');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand3.example']);
    });

    if (FEATURES.VIDEO) {
      describe('video', function () {
        const videoBid = () => makeBid({
          bidId: 'bid-video',
          mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } }
        });

        it('maps an inline VAST bid and keeps nurl as a win notice', function () {
          const request = build([videoBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{
            impid: 'bid-video', price: 6, adm: VAST, crid: 'v1', mtype: 2, nurl: 'https://win.amlimedia.com/v', w: 640, h: 480, dur: 15
          }]), request);
          expect(bid.mediaType).to.equal('video');
          expect(bid.vastXml).to.equal(VAST);
          expect(bid.vastUrl).to.equal(undefined);
          expect(bid.nurl).to.equal('https://win.amlimedia.com/v');
          expect(bid.playerWidth).to.equal(640);
          expect(bid.playerHeight).to.equal(480);
          expect(bid.duration).to.equal(15);
        });

        it('detects VAST markup without mtype', function () {
          const request = build([videoBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-video', price: 6, adm: VAST, crid: 'v1' }]), request);
          expect(bid.mediaType).to.equal('video');
        });

        it('treats nurl as the VAST location when there is no markup', function () {
          const request = build([videoBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-video', price: 6, nurl: 'https://vast.amlimedia.com/tag', crid: 'v1' }]), request);
          expect(bid.mediaType).to.equal('video');
          expect(bid.vastUrl).to.equal('https://vast.amlimedia.com/tag');
          expect(bid.nurl).to.equal(undefined);
        });

        it('honours the Prebid Server style ext.prebid.type', function () {
          const request = build([makeBid({
            mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } }
          })]);
          const [bid] = spec.interpretResponse(respond(request, [{
            impid: 'bid-banner', price: 2, adm: '<div>wrapped</div>', crid: 'c', ext: { prebid: { type: 'video' } }
          }]), request);
          expect(bid.mediaType).to.equal('video');
        });

        it('converts an OpenRTB 3.0 video bid', function () {
          const request = build([videoBid()]);
          const [bid] = spec.interpretResponse({
            body: { openrtb: { response: { seatbid: [{ bid: [{ item: 'bid-video', price: 4, media: { ad: { id: 'v3', video: { adm: VAST } } } }] }] } } }
          }, request);
          expect(bid.mediaType).to.equal('video');
          expect(bid.vastXml).to.equal(VAST);
        });
      });
    }

    if (FEATURES.NATIVE) {
      describe('native', function () {
        const nativeBid = () => makeBid({
          bidId: 'bid-native',
          mediaTypes: { native: { ortb: NATIVE_ORTB_REQUEST } },
          nativeOrtbRequest: NATIVE_ORTB_REQUEST
        });

        it('maps an OpenRTB Native 1.2 response', function () {
          const request = build([nativeBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{
            impid: 'bid-native', price: 1.5, adm: JSON.stringify(NATIVE_ORTB_RESPONSE), crid: 'n1', mtype: 4
          }]), request);
          expect(bid.mediaType).to.equal('native');
          expect(bid.native.ortb).to.deep.equal(NATIVE_ORTB_RESPONSE);
        });

        it('keeps nurl for the win notification', function () {
          const request = build([nativeBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{
            impid: 'bid-native', price: 1.5, adm: JSON.stringify(NATIVE_ORTB_RESPONSE), crid: 'n1', mtype: 4, nurl: 'https://win.amlimedia.com/native'
          }]), request);
          expect(bid.nurl).to.equal('https://win.amlimedia.com/native');
        });

        it('skips a bid whose format cannot be told apart on a multi-format imp', function () {
          const bid = makeBid({
            mediaTypes: { banner: { sizes: [[300, 250]] }, native: { ortb: NATIVE_ORTB_REQUEST } },
            nativeOrtbRequest: NATIVE_ORTB_REQUEST
          });
          const request = build([bid]);
          const warnStub = sinon.stub(utils, 'logWarn');
          try {
            const bids = spec.interpretResponse(respond(request, [{ id: 'x', impid: 'bid-banner', price: 1, adm: { foo: 1 }, crid: 'c' }]), request);
            expect(bids).to.deep.equal([]);
          } finally {
            warnStub.restore();
          }
        });

        it('unwraps an OpenRTB Native 1.0 response', function () {
          const request = build([nativeBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{
            impid: 'bid-native', price: 1.5, adm: JSON.stringify({ native: NATIVE_ORTB_RESPONSE }), crid: 'n1'
          }]), request);
          expect(bid.mediaType).to.equal('native');
          expect(bid.native.ortb.assets).to.deep.equal(NATIVE_ORTB_RESPONSE.assets);
        });

        it('accepts native markup as an object', function () {
          const request = build([nativeBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-native', price: 1.5, adm: NATIVE_ORTB_RESPONSE, crid: 'n1' }]), request);
          expect(bid.native.ortb).to.deep.equal(NATIVE_ORTB_RESPONSE);
        });

        it('skips a native bid without assets', function () {
          const request = build([nativeBid()]);
          const bids = spec.interpretResponse(respond(request, [{ impid: 'bid-native', price: 1.5, adm: '{"link":{}}', crid: 'n1', mtype: 4 }]), request);
          expect(bids).to.deep.equal([]);
        });

        it('converts an OpenRTB 3.0 native bid', function () {
          const request = build([nativeBid()]);
          const [bid] = spec.interpretResponse({
            body: { openrtb: { response: { seatbid: [{ bid: [{ item: 'bid-native', price: 1, media: { ad: { display: { native: NATIVE_ORTB_RESPONSE } } } }] }] } } }
          }, request);
          expect(bid.mediaType).to.equal('native');
        });
      });
    }

    if (FEATURES.AUDIO) {
      describe('audio', function () {
        const audioBid = () => makeBid({ bidId: 'bid-audio', mediaTypes: { audio: { mimes: ['audio/mpeg'] } } });

        it('maps an audio bid by mtype', function () {
          const request = build([audioBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-audio', price: 2.2, adm: AUDIO_VAST, crid: 'a1', mtype: 3 }]), request);
          expect(bid.mediaType).to.equal('audio');
          expect(bid.vastXml).to.equal(AUDIO_VAST);
        });

        it('detects audio VAST without mtype', function () {
          const request = build([audioBid()]);
          const [bid] = spec.interpretResponse(respond(request, [{ impid: 'bid-audio', price: 2.2, adm: AUDIO_VAST, crid: 'a1' }]), request);
          expect(bid.mediaType).to.equal('audio');
        });

        it('converts an OpenRTB 3.0 audio bid', function () {
          const request = build([audioBid()]);
          const [bid] = spec.interpretResponse({
            body: { openrtb: { response: { seatbid: [{ bid: [{ item: 'bid-audio', price: 1, media: { ad: { audio: { adm: AUDIO_VAST } } } }] }] } } }
          }, request);
          expect(bid.mediaType).to.equal('audio');
        });
      });
    }
  });

  describe('resolveMediaType', function () {
    const imp = { banner: {}, video: {}, native: {}, audio: {} };

    it('prefers mtype, then ext type, then markup', function () {
      expect(resolveMediaType({ mtype: 4, adm: '<div></div>' }, imp)).to.equal('native');
      expect(resolveMediaType({ ext: { prebid: { type: 'display' } }, adm: VAST }, imp)).to.equal('banner');
      expect(resolveMediaType({ ext: { mediaType: 'AUDIO' } }, imp)).to.equal('audio');
      expect(resolveMediaType({ adm: VAST }, imp)).to.equal('video');
      expect(resolveMediaType({ adm: AUDIO_VAST }, imp)).to.equal('audio');
      expect(resolveMediaType({ adm: '{"assets":[]}' }, imp)).to.equal('native');
      expect(resolveMediaType({ adm: '<div></div>' }, imp)).to.equal('banner');
    });

    it('treats VAST as audio when the imp only asked for audio', function () {
      expect(resolveMediaType({ adm: VAST }, { audio: {} })).to.equal('audio');
    });

    it('falls back to the only format the imp offered', function () {
      expect(resolveMediaType({ adm: '{"not":"native"}' }, { banner: {} })).to.equal('banner');
      expect(resolveMediaType({}, { native: {} })).to.equal('native');
    });

    it('gives up when nothing identifies the bid', function () {
      expect(resolveMediaType({}, { banner: {}, native: {} })).to.equal(undefined);
      expect(resolveMediaType({ adm: { foo: 1 } }, { banner: {}, video: {} })).to.equal(undefined);
    });

    it('uses the nurl of a markup-less bid as a hint for VAST formats', function () {
      expect(resolveMediaType({ nurl: 'https://vast' }, { banner: {}, video: {} })).to.equal('video');
    });
  });

  describe('normalizeOrtbResponse', function () {
    it('keeps response level fields', function () {
      const normalized = normalizeOrtbResponse({ id: 'r', cur: 'EUR', bidid: 'x', seatbid: [{ bid: [{ impid: 1, price: 1 }] }] });
      expect(normalized).to.deep.include({ id: 'r', cur: 'EUR', bidid: 'x' });
      expect(normalized.seatbid[0].bid[0].impid).to.equal('1');
    });

    it('drops non-object bids', function () {
      const normalized = normalizeOrtbResponse({ seatbid: [{ bid: [null, 'x', { impid: 'a', price: 1 }] }] });
      expect(normalized.seatbid[0].bid).to.deep.equal([{ impid: 'a', price: 1 }]);
    });

    it('logs the no-bid reason', function () {
      const logStub = sinon.stub(utils, 'logInfo');
      try {
        expect(normalizeOrtbResponse({ nbr: 8 })).to.equal(null);
      } finally {
        logStub.restore();
      }
    });

    it('maps OpenRTB 3.0 bid fields to their 2.x names', function () {
      const normalized = normalizeOrtbResponse({
        openrtb: {
          response: {
            id: 'r3',
            seatbid: [{
              seat: 's',
              bid: [{ id: 'b', item: 'i', price: 1, burl: 'https://b', lurl: 'https://l', cid: 'camp', exp: 90, media: { ad: { id: 'ad', cat: ['IAB1'], attr: [1], display: { adm: '<a></a>', w: 1, h: 2 } } } }]
            }, { bid: 'bad' }, null]
          }
        }
      });
      expect(normalized.id).to.equal('r3');
      expect(normalized.seatbid).to.have.lengthOf(1);
      expect(normalized.seatbid[0].bid[0]).to.deep.equal({
        id: 'b', impid: 'i', price: 1, adm: '<a></a>', mtype: 1, burl: 'https://b', lurl: 'https://l', cid: 'camp', crid: 'ad', cat: ['IAB1'], attr: [1], w: 1, h: 2, exp: 90
      });
    });

    it('drops non-object OpenRTB 3.0 bid entries without losing their siblings', function () {
      const normalized = normalizeOrtbResponse({
        openrtb: { response: { seatbid: [{ bid: [null, 'x', { item: 'i', price: 1, media: { ad: { display: { adm: '<a></a>' } } } }] }] } }
      });
      expect(normalized.seatbid[0].bid).to.have.lengthOf(1);
      expect(normalized.seatbid[0].bid[0]).to.deep.include({ impid: 'i', price: 1, adm: '<a></a>', mtype: 1 });
    });

    it('keeps an OpenRTB 3.0 bid without media for media type detection later', function () {
      const normalized = normalizeOrtbResponse({ openrtb: { response: { seatbid: [{ bid: [{ item: 'i', price: 1 }] }] } } });
      expect(normalized.seatbid[0].bid[0]).to.deep.equal({ impid: 'i', price: 1 });
    });
  });

  describe('getUserSyncs', function () {
    const GDPR = { gdprApplies: true, consentString: 'TCF STRING' };
    const GPP = { gppString: 'DBABMA~X', applicableSections: [7, 8] };

    it('returns nothing when syncing is disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [])).to.deep.equal([]);
      expect(spec.getUserSyncs(undefined, [])).to.deep.equal([]);
    });

    it('prefers the iframe sync', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://rtb.amlimedia.com/?type=u_sync&intg=pbjs&f=iframe' }]);
      expect(SYNC_URL).to.equal('https://rtb.amlimedia.com/?type=u_sync&intg=pbjs');
    });

    it('falls back to the image pixel', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(syncs).to.deep.equal([{ type: 'image', url: 'https://rtb.amlimedia.com/?type=u_sync&intg=pbjs&f=image' }]);
    });

    it('builds the full sync URL in a fixed order', function () {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true }, [], GDPR, '1YNN', GPP, true);
      expect(sync.url).to.equal(
        'https://rtb.amlimedia.com/?type=u_sync&intg=pbjs&f=iframe' +
        '&gdpr=1&gdpr_consent=TCF%20STRING&us_privacy=1YNN&gpp=DBABMA~X&gpp_sid=7%2C8&coppa=1'
      );
    });

    it('appends every consent signal to the sync URL', function () {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true }, [], GDPR, '1YNN', GPP, true);
      const url = new URL(sync.url);
      expect(url.origin + url.pathname).to.equal('https://rtb.amlimedia.com/');
      expect(url.searchParams.get('type')).to.equal('u_sync');
      expect(url.searchParams.get('intg')).to.equal('pbjs');
      expect(url.searchParams.get('f')).to.equal('iframe');
      expect(url.searchParams.get('gdpr')).to.equal('1');
      expect(url.searchParams.get('gdpr_consent')).to.equal('TCF STRING');
      expect(url.searchParams.get('us_privacy')).to.equal('1YNN');
      expect(url.searchParams.get('gpp')).to.equal('DBABMA~X');
      expect(url.searchParams.get('gpp_sid')).to.equal('7,8');
      expect(url.searchParams.get('coppa')).to.equal('1');
    });

    it('sends gdpr=0 when GDPR does not apply', function () {
      const [sync] = spec.getUserSyncs({ pixelEnabled: true }, [], { gdprApplies: false });
      const url = new URL(sync.url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.has('gdpr_consent')).to.equal(false);
      expect(url.searchParams.has('coppa')).to.equal(false);
    });

    it('adds the syncs the endpoint asked for, filtered by what is allowed', function () {
      const responses = [
        {
          body: {
            ext: {
              usersync: [
                { type: 'iframe', url: 'https://partner-a.example/sync' },
                { type: 'image', url: 'https://partner-b.example/px?x=1' },
                { type: 'redirect', url: 'https://partner-c.example/r' },
                { type: 'image', url: 'http://insecure.example/px' },
                { type: 'script', url: 'https://partner-d.example/s.js' },
                { type: 'image' },
                null
              ]
            }
          }
        },
        { body: { ext: { usersync: { amlimedia: { syncs: [{ type: 'img', url: 'https://partner-e.example/px' }] } } } } },
        { body: { ext: { usersync: { syncs: [{ type: 'pixel', url: 'https://partner-f.example/px' }] } } } },
        { body: JSON.stringify({ openrtb: { response: { ext: { usersync: [{ type: 'image', url: 'https://partner-g.example/px' }] } } } }) },
        { body: { ext: { usersync: [{ type: 'image', url: 'https://partner-b.example/px?x=1' }] } } },
        { body: { ext: { usersync: 'nope' } } },
        {}
      ];
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses, undefined, '1YNN');
      expect(syncs.map(sync => sync.url)).to.deep.equal([
        `${SYNC_URL}&f=image&us_privacy=1YNN`,
        'https://partner-b.example/px?x=1&us_privacy=1YNN',
        'https://partner-c.example/r?us_privacy=1YNN',
        'https://partner-e.example/px?us_privacy=1YNN',
        'https://partner-f.example/px?us_privacy=1YNN',
        'https://partner-g.example/px?us_privacy=1YNN'
      ]);
      expect(syncs.every(sync => sync.type === 'image')).to.equal(true);
    });

    it('keeps iframe syncs from the endpoint when iframes are allowed', function () {
      const responses = [{ body: { ext: { usersync: [{ type: 'iframe', url: 'https://partner-a.example/sync' }] } } }];
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses);
      expect(syncs).to.deep.equal([
        { type: 'iframe', url: `${SYNC_URL}&f=iframe` },
        { type: 'iframe', url: 'https://partner-a.example/sync' }
      ]);
    });
  });

  describe('win and billing notifications', function () {
    it('fires nurl on win with the price filled in', function () {
      spec.onBidWon({ nurl: 'https://win.amlimedia.com/n?price=${AUCTION_PRICE}', cpm: 1.5, originalCpm: 1.25 });
      const request = server.requests[server.requests.length - 1];
      expect(request.url).to.equal('https://win.amlimedia.com/n?price=1.25');
      expect(request.method).to.equal('GET');
    });

    it('fires burl when the bid becomes billable', function () {
      spec.onBidBillable({ burl: 'https://bill.amlimedia.com/b?price=${AUCTION_PRICE}', cpm: 2 });
      const request = server.requests[server.requests.length - 1];
      expect(request.url).to.equal('https://bill.amlimedia.com/b?price=2');
    });

    it('does nothing without a tracker URL', function () {
      const before = server.requests.length;
      spec.onBidWon({ cpm: 1 });
      spec.onBidBillable({ cpm: 1, burl: '' });
      expect(server.requests.length).to.equal(before);
    });
  });
});
