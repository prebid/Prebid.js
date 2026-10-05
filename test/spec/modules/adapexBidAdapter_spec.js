import { expect } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/adapexBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import * as utils from 'src/utils.js';
import 'modules/priceFloors.js';

describe('adapexBidAdapter', function () {
  const ENDPOINT = 'https://hb.adapex.io/pbjs?seat=Gmtb';

  const validBannerBid = {
    bidId: 'bid-1',
    bidder: 'adapex',
    adUnitCode: 'adunit-banner',
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    params: { seat: 'Gmtb' }
  };

  const validVideoBid = {
    bidId: 'bid-2',
    bidder: 'adapex',
    adUnitCode: 'adunit-video',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
        context: 'instream'
      }
    },
    params: { seat: 'Gmtb' }
  };

  const validNativeBid = {
    bidId: 'bid-3',
    bidder: 'adapex',
    adUnitCode: 'adunit-native',
    mediaTypes: {
      native: {
        image: { required: true, sizes: [150, 50] },
        title: { required: true, len: 80 }
      }
    },
    params: { seat: 'Gmtb' }
  };

  const bidderRequest = {
    bidderCode: 'adapex',
    auctionId: 'auction-123',
    timeout: 3000
  };

  describe('spec identity', function () {
    it('registers under the adapex bidder code', function () {
      expect(spec.code).to.equal('adapex');
    });

    it('declares IAB TCF vendor id 1609', function () {
      expect(spec.gvlid).to.equal(1609);
    });

    it('supports banner, video and native', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts banner, video and native bids with a seat', function () {
      expect(spec.isBidRequestValid(validBannerBid)).to.be.true;
      expect(spec.isBidRequestValid(validVideoBid)).to.be.true;
      expect(spec.isBidRequestValid(validNativeBid)).to.be.true;
    });

    it('rejects a missing, empty or non-string seat', function () {
      expect(spec.isBidRequestValid({ ...validBannerBid, params: {} })).to.be.false;
      expect(spec.isBidRequestValid({ ...validBannerBid, params: { seat: '' } })).to.be.false;
      expect(spec.isBidRequestValid({ ...validBannerBid, params: { seat: 123 } })).to.be.false;
    });

    it('rejects a bid without params', function () {
      expect(spec.isBidRequestValid({ bidId: 'x', mediaTypes: { banner: { sizes: [[300, 250]] } } })).to.be.false;
    });

    it('rejects an undefined bid', function () {
      expect(spec.isBidRequestValid(undefined)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('returns one POST request to the Adapex bid host', function () {
      const requests = spec.buildRequests([validBannerBid], bidderRequest);
      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT);
    });

    it('url-encodes the seat', function () {
      const bid = { ...validBannerBid, params: { seat: 'a b&c' } };
      expect(spec.buildRequests([bid], bidderRequest)[0].url).to.equal('https://hb.adapex.io/pbjs?seat=a%20b%26c');
    });

    it('ignores region and partner params: every seat routes to hb.adapex.io', function () {
      const bid = { ...validBannerBid, params: { seat: 'Gmtb', region: 'evil.com/', partner: 'other' } };
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.equal(ENDPOINT);
    });

    it('never targets a floxis.tech host', function () {
      const requests = spec.buildRequests([validBannerBid, validVideoBid], bidderRequest);
      requests.forEach((r) => expect(r.url).to.not.include('floxis.tech'));
    });

    it('returns an empty array for no bids', function () {
      expect(spec.buildRequests([], bidderRequest)).to.be.an('array').that.is.empty;
      expect(spec.buildRequests()).to.be.an('array').that.is.empty;
    });

    it('groups bids of one seat into one request', function () {
      const requests = spec.buildRequests([validBannerBid, validVideoBid], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
    });

    it('splits requests by seat', function () {
      const seat2 = { ...validVideoBid, params: { seat: 'Seat2', region: 'eu-w' } };
      const requests = spec.buildRequests([validBannerBid, seat2], bidderRequest);
      expect(requests.map((r) => r.url)).to.deep.equal([ENDPOINT, 'https://hb.adapex.io/pbjs?seat=Seat2']);
    });

    it('sets credentials, text/plain and endpoint compression', function () {
      const { options } = spec.buildRequests([validBannerBid], bidderRequest)[0];
      expect(options).to.deep.equal({ withCredentials: true, contentType: 'text/plain', endpointCompression: true });
    });

    it('produces an ORTB payload with first-price auction and adapter info', function () {
      const data = spec.buildRequests([validBannerBid], bidderRequest)[0].data;
      expect(data.imp).to.have.lengthOf(1);
      expect(data.at).to.equal(1);
      expect(data.ext.prebid.adapter).to.equal('adapex');
      expect(data.ext.prebid.version).to.equal('$prebid.version$');
      expect(data.tmax).to.equal(3000);
      expect(data.cur).to.deep.equal(['USD']);
    });

    it('keeps a publisher-supplied cur', function () {
      const data = spec.buildRequests([validBannerBid], { ...bidderRequest, ortb2: { cur: ['EUR'] } })[0].data;
      expect(data.cur).to.deep.equal(['EUR']);
    });

    it('builds a secure banner imp with tagid from the ad unit code', function () {
      const imp = spec.buildRequests([validBannerBid], bidderRequest)[0].data.imp[0];
      expect(imp.banner.format).to.be.an('array');
      expect(imp.secure).to.equal(1);
      expect(imp.tagid).to.equal('adunit-banner');
    });

    it('keeps publisher-supplied ortb2Imp.tagid and secure', function () {
      const bid = { ...validBannerBid, ortb2Imp: { tagid: 'placement-1', secure: 0 } };
      const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
      expect(imp.tagid).to.equal('placement-1');
      expect(imp.secure).to.equal(0);
    });

    it('leaves tagid unset when there is no ad unit code', function () {
      const bid = { ...validBannerBid, adUnitCode: undefined };
      expect(spec.buildRequests([bid], bidderRequest)[0].data.imp[0].tagid).to.be.undefined;
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp', function () {
        const imp = spec.buildRequests([validVideoBid], bidderRequest)[0].data.imp[0];
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3]);
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a native imp with the configured event trackers', function () {
        const bid = { ...validNativeBid, nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] } };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        const request = JSON.parse(imp.native.request);
        expect(request.assets).to.have.lengthOf(1);
        expect(request.eventtrackers).to.deep.equal([{ event: 1, methods: [1, 2] }]);
      });
    }

    describe('floors', function () {
      it('uses getFloor', function () {
        const bid = { ...validBannerBid, getFloor: () => ({ floor: 2.5, currency: 'EUR' }) };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(2.5);
        expect(imp.bidfloorcur).to.equal('EUR');
      });

      it('defaults the floor currency to USD', function () {
        const bid = { ...validBannerBid, getFloor: () => ({ floor: 1.5 }) };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(1.5);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('ignores a zero or throwing getFloor', function () {
        const zero = { ...validBannerBid, getFloor: () => ({ floor: 0, currency: 'USD' }) };
        const broken = { ...validBannerBid, getFloor: () => { throw new Error('floor error'); } };
        expect(spec.buildRequests([zero], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
        expect(spec.buildRequests([broken], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
      });

      it('falls back to params.bidFloor and bidFloorCur', function () {
        const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: 1.75, bidFloorCur: 'EUR' } };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(1.75);
        expect(imp.bidfloorcur).to.equal('EUR');
      });

      it('defaults params.bidFloorCur to USD', function () {
        const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: '0.5' } };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(0.5);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('sets no floor without getFloor or bidFloor', function () {
        expect(spec.buildRequests([validBannerBid], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
      });
    });

    describe('ortb2 passthrough', function () {
      it('forwards GDPR, USP, COPPA and GPP regs', function () {
        const req = {
          ...bidderRequest,
          ortb2: {
            regs: { coppa: 1, gpp: 'DBACNYA~xxx', gpp_sid: [7], ext: { gdpr: 1, us_privacy: '1YNN' } },
            user: { ext: { consent: 'consent-string-123' } }
          }
        };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.regs.ext.gdpr).to.equal(1);
        expect(data.regs.ext.us_privacy).to.equal('1YNN');
        expect(data.regs.coppa).to.equal(1);
        expect(data.regs.gpp).to.equal('DBACNYA~xxx');
        expect(data.regs.gpp_sid).to.deep.equal([7]);
        expect(data.user.ext.consent).to.equal('consent-string-123');
      });

      it('forwards eids and schain', function () {
        const eids = [{ source: 'id5-sync.com', uids: [{ id: 'ID5-x', atype: 1 }] }];
        const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'adapex.io', sid: '1', hp: 1 }] };
        const req = { ...bidderRequest, ortb2: { user: { ext: { eids } }, source: { ext: { schain } } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.eids).to.deep.equal(eids);
        expect(data.source.ext.schain).to.deep.equal(schain);
      });
    });

    describe('first-party fallback id', function () {
      const STUBBED_UUID = '11111111-1111-4111-8111-111111111111';
      const STORED_UUID = '22222222-2222-4222-8222-222222222222';
      const idBidderRequest = { ...bidderRequest, ortb2: { id: 'fixed-request-id' } };
      let sandbox, stubs;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        stubs = {
          localStorageIsEnabled: sandbox.stub(storage, 'localStorageIsEnabled').returns(true),
          cookiesAreEnabled: sandbox.stub(storage, 'cookiesAreEnabled').returns(true),
          getDataFromLocalStorage: sandbox.stub(storage, 'getDataFromLocalStorage').returns(null),
          getCookie: sandbox.stub(storage, 'getCookie').returns(null),
          generateUUID: sandbox.stub(utils, 'generateUUID').returns(STUBBED_UUID)
        };
        stubs.setDataInLocalStorage = sandbox.stub(storage, 'setDataInLocalStorage').callsFake((key, value) => {
          stubs.getDataFromLocalStorage.withArgs(key).returns(value);
        });
        stubs.setCookie = sandbox.stub(storage, 'setCookie').callsFake((key, value) => {
          stubs.getCookie.withArgs(key).returns(value);
        });
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('mints and persists an id under the Adapex storage key', function () {
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.floxisId).to.equal(STUBBED_UUID);
        expect(stubs.setDataInLocalStorage.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
        expect(stubs.setCookie.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
        expect(stubs.setDataInLocalStorage.calledWith('flx_uid')).to.be.false;
      });

      it('reuses a valid id from localStorage', function () {
        stubs.getDataFromLocalStorage.withArgs('adpx_uid').returns(STORED_UUID);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.floxisId).to.equal(STORED_UUID);
        expect(stubs.generateUUID.called).to.be.false;
      });

      it('falls back to the cookie', function () {
        stubs.getCookie.withArgs('adpx_uid').returns(STORED_UUID);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.floxisId).to.equal(STORED_UUID);
        expect(stubs.generateUUID.called).to.be.false;
      });

      it('uses the cookie alone when localStorage is disabled', function () {
        stubs.localStorageIsEnabled.returns(false);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.floxisId).to.equal(STUBBED_UUID);
        expect(stubs.setDataInLocalStorage.called).to.be.false;
        expect(stubs.setCookie.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
      });

      it('regenerates a malformed stored id', function () {
        stubs.getDataFromLocalStorage.returns('not-a-uuid');
        stubs.getCookie.returns('also-not-a-uuid');
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.floxisId).to.equal(STUBBED_UUID);
      });

      it('sends no id when storage is disallowed', function () {
        stubs.localStorageIsEnabled.returns(false);
        stubs.cookiesAreEnabled.returns(false);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user?.ext?.floxisId).to.be.undefined;
        expect(stubs.setCookie.called).to.be.false;
      });

      it('sends no id when the write does not persist', function () {
        stubs.setDataInLocalStorage.callsFake(() => {});
        stubs.setCookie.callsFake(() => {});
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user?.ext?.floxisId).to.be.undefined;
      });

      it('sends no id when a storage accessor throws', function () {
        stubs.getDataFromLocalStorage.throws(new Error('storage access error'));
        let data;
        expect(() => { data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data; }).to.not.throw();
        expect(data.user?.ext?.floxisId).to.be.undefined;
      });

      it('keeps an existing user.ext.floxisId', function () {
        const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: { floxisId: STORED_UUID } } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.floxisId).to.equal(STORED_UUID);
        expect(stubs.localStorageIsEnabled.called).to.be.false;
      });

      it('repairs a non-object user.ext', function () {
        const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: null } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.floxisId).to.equal(STUBBED_UUID);
      });

      it('resolves the id once per auction across seat groups', function () {
        const seat2 = { ...validBannerBid, bidId: 'bid-9', params: { seat: 'Seat2' } };
        const requests = spec.buildRequests([validBannerBid, seat2], idBidderRequest);
        expect(requests).to.have.lengthOf(2);
        requests.forEach((r) => expect(r.data.user.ext.floxisId).to.equal(STUBBED_UUID));
        expect(stubs.localStorageIsEnabled.calledOnce).to.be.true;
      });
    });
  });

  describe('interpretResponse', function () {
    const BURL = 'https://hb.adapex.io/wn?p=${AUCTION_PRICE}';

    function bannerResponse(bid) {
      return { body: { seatbid: [{ bid: [{ impid: validBannerBid.bidId, price: 1.23, w: 300, h: 250, crid: 'c1', adm: '<div>ad</div>', mtype: 1, ...bid }] }] } };
    }

    it('parses a banner bid', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      const bids = spec.interpretResponse(bannerResponse({ burl: BURL, adomain: ['adv.com'] }), request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.include({ cpm: 1.23, width: 300, height: 250, creativeId: 'c1', ad: '<div>ad</div>', requestId: 'bid-1', netRevenue: true, currency: 'USD', ttl: 300, mediaType: BANNER, burl: BURL });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['adv.com']);
      expect(bids[0].meta.mediaType).to.equal(BANNER);
    });

    if (FEATURES.VIDEO) {
      it('parses a video bid', function () {
        const request = spec.buildRequests([validVideoBid], bidderRequest)[0];
        const response = { body: { seatbid: [{ bid: [{ impid: 'bid-2', price: 5, w: 640, h: 480, crid: 'v1', adm: '<VAST></VAST>', mtype: 2 }] }] } };
        const bids = spec.interpretResponse(response, request);
        expect(bids[0].vastXml).to.equal('<VAST></VAST>');
        expect(bids[0].mediaType).to.equal(VIDEO);
      });
    }

    if (FEATURES.NATIVE) {
      it('parses a native bid', function () {
        const request = spec.buildRequests([validNativeBid], bidderRequest)[0];
        const adm = JSON.stringify({ ver: '1.2', link: { url: 'https://example.com/click' }, assets: [{ id: 1, title: { text: 'T' } }] });
        const response = { body: { seatbid: [{ bid: [{ impid: 'bid-3', price: 2.75, crid: 'n1', adm, mtype: 4 }] }] } };
        const bids = spec.interpretResponse(response, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
      });
    }

    it('drops a bid without mtype', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      expect(spec.interpretResponse(bannerResponse({ mtype: undefined }), request)).to.be.empty;
    });

    it('maps DSP ext fields into meta', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      const bids = spec.interpretResponse(bannerResponse({ ext: { dspid: 42, advertiser_name: 'AdvCo', agency_name: 'AgCo', agency_id: 'ag-7' } }), request);
      expect(bids[0].meta).to.include({ networkId: 42, advertiserName: 'AdvCo', agencyName: 'AgCo', agencyId: 'ag-7' });
    });

    it('returns no bids for an empty, null or missing response, or a missing request', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      expect(spec.interpretResponse({ body: {} }, request)).to.be.empty;
      expect(spec.interpretResponse({ body: null }, request)).to.be.empty;
      expect(spec.interpretResponse(undefined, request)).to.be.empty;
      expect(spec.interpretResponse(bannerResponse({}), undefined)).to.be.empty;
    });
  });

  describe('getUserSyncs', function () {
    function response({ header = null, sync } = {}) {
      return {
        body: sync ? { id: 'r', seatbid: [], ext: { sync } } : '',
        headers: { get: (name) => (name === 'x-floxis-sync' ? header : null) }
      };
    }
    const HEADER = 'seat=Gmtb&region=us-e';

    it('returns nothing when no sync type is enabled or there are no responses', function () {
      expect(spec.getUserSyncs({}, [response({ header: HEADER })])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, undefined)).to.be.empty;
    });

    it('builds an iframe sync to sync.adapex.io from the header', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [response({ header: HEADER })]);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb' }]);
    });

    it('builds an image sync when only pixels are enabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [response({ header: HEADER })]);
      expect(syncs).to.deep.equal([{ type: 'image', url: 'https://sync.adapex.io/sync?seat=Gmtb' }]);
    });

    it('keeps sync.adapex.io whatever region the server echoes', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [response({ header: 'seat=Gmtb&region=apac-sin' })]);
      expect(syncs[0].url).to.equal('https://sync.adapex.io/sync?seat=Gmtb');
    });

    it('appends consent params to a header sync', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [response({ header: HEADER })],
        { gdprApplies: true, consentString: 'CONSENT123' },
        '1YNN',
        { gppString: 'GPPSTR', applicableSections: [7, 8] }
      );
      expect(syncs[0].url).to.equal('https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&gdpr_consent=CONSENT123&us_privacy=1YNN&gpp=GPPSTR&gpp_sid=7%2C8');
    });

    it('omits gdpr when gdprApplies is not boolean, and gpp without sections', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [response({ header: HEADER })], { consentString: 'TC' }, '', { gppString: 'G', applicableSections: [] });
      expect(syncs[0].url).to.equal('https://sync.adapex.io/sync?seat=Gmtb&gdpr_consent=TC');
    });

    it('ignores an absent or malformed header', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [response()])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ header: 'seat=Gmtb&region=evil.com/x' })])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ header: 'region=us-e' })])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{ body: '' }])).to.be.empty;
    });

    it('emits one sync per seat and dedupes repeats', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
        response({ header: HEADER }),
        response({ header: 'seat=Seat2&region=us-e' }),
        response({ header: HEADER })
      ]);
      expect(syncs.map((s) => s.url)).to.deep.equal([
        'https://sync.adapex.io/sync?seat=Gmtb',
        'https://sync.adapex.io/sync?seat=Seat2'
      ]);
    });

    describe('body.ext.sync', function () {
      const SERVER_IFRAME = 'https://px-us-e.floxis.tech/sync?seat=Gmtb&gdpr=1&type=iframe';
      const SERVER_IMAGE = 'https://px-us-e.floxis.tech/sync?seat=Gmtb&gdpr=1&type=image';

      it('serves the server-baked sync from sync.adapex.io, keeping path and query', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, [response({ sync: [{ type: 'iframe', url: SERVER_IFRAME }, { type: 'image', url: SERVER_IMAGE }] })]);
        expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&type=iframe' }]);
      });

      it('picks the image entry when only pixels are enabled', function () {
        const syncs = spec.getUserSyncs({ pixelEnabled: true }, [response({ sync: [{ type: 'iframe', url: SERVER_IFRAME }, { type: 'image', url: SERVER_IMAGE }] })]);
        expect(syncs).to.deep.equal([{ type: 'image', url: 'https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&type=image' }]);
      });

      it('falls back to any enabled entry when the preferred type is absent', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [response({ sync: [{ type: 'image', url: SERVER_IMAGE }] })]);
        expect(syncs).to.deep.equal([{ type: 'image', url: 'https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&type=image' }]);
      });

      it('leaves an already-Adapex URL unchanged', function () {
        const url = 'https://sync.adapex.io/sync?seat=Gmtb';
        expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ sync: [{ type: 'iframe', url }] })])[0].url).to.equal(url);
      });

      it('prefers the body over the header', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, [response({ header: 'seat=Other&region=us-e', sync: [{ type: 'iframe', url: SERVER_IFRAME }] })]);
        expect(syncs).to.have.lengthOf(1);
        expect(syncs[0].url).to.include('seat=Gmtb');
      });

      it('falls through to the header for a disabled-type, empty or unparseable body entry', function () {
        [
          [{ type: 'image', url: SERVER_IMAGE }],
          [],
          [{ type: 'iframe', url: 'not a url' }],
          [null, { type: 'iframe', url: '' }]
        ].forEach((sync) => {
          const syncs = spec.getUserSyncs({ iframeEnabled: true }, [response({ header: HEADER, sync })]);
          expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb' }]);
        });
      });

      it('emits nothing for an unusable body entry and no header', function () {
        expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ sync: [{ type: 'iframe', url: 'not a url' }] })])).to.be.empty;
      });

      it('dedupes body syncs that rewrite to the same URL, and a header sync of the same URL', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
          response({ sync: [{ type: 'iframe', url: 'https://px-us-e.floxis.tech/sync?seat=Gmtb' }] }),
          response({ sync: [{ type: 'iframe', url: 'https://px-eu.floxis.tech/sync?seat=Gmtb' }] }),
          response({ header: HEADER })
        ]);
        expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb' }]);
      });

      it('never emits a floxis.tech sync', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [
          response({ sync: [{ type: 'iframe', url: SERVER_IFRAME }] }),
          response({ header: 'seat=Seat2&region=eu' })
        ]);
        expect(syncs).to.have.lengthOf(2);
        syncs.forEach((s) => expect(s.url).to.not.include('floxis'));
      });
    });
  });

  describe('onBidBillable', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('fires burl with the original cpm substituted', function () {
      spec.onBidBillable({ burl: 'https://example.com/b?p=${AUCTION_PRICE}', cpm: 0.9, originalCpm: 1.5 });
      expect(triggerPixelStub.calledOnceWith('https://example.com/b?p=1.5')).to.be.true;
    });

    it('falls back to cpm', function () {
      spec.onBidBillable({ burl: 'https://example.com/b?p=${AUCTION_PRICE}', cpm: 1.23 });
      expect(triggerPixelStub.calledOnceWith('https://example.com/b?p=1.23')).to.be.true;
    });

    it('fires nothing without burl', function () {
      spec.onBidBillable({ cpm: 1 });
      expect(triggerPixelStub.called).to.be.false;
    });
  });

  describe('telemetry', function () {
    let politeStub;

    beforeEach(function () {
      politeStub = sinon.stub(utils, 'politeTriggerPixel');
    });

    afterEach(function () {
      politeStub.restore();
    });

    describe('onTimeout', function () {
      it('beacons cookieless to sync.adapex.io', function () {
        spec.onTimeout([{ params: { seat: 'Gmtb', region: 'eu' }, timeout: 2000, auctionId: 'a1' }]);
        expect(politeStub.calledOnce).to.be.true;
        expect(politeStub.firstCall.args).to.deep.equal([
          'https://sync.adapex.io/event?event=timeout&seat=Gmtb&region=us-e&duration=2000&auctionId=a1',
          'omit'
        ]);
      });

      it('omits absent dimensions', function () {
        spec.onTimeout([{ params: { seat: 'Gmtb' } }]);
        expect(politeStub.firstCall.args[0]).to.equal('https://sync.adapex.io/event?event=timeout&seat=Gmtb&region=us-e');
      });

      it('dedupes per seat and skips entries without a seat', function () {
        spec.onTimeout([
          { params: { seat: 'Gmtb' }, timeout: 1 },
          { params: { seat: 'Gmtb' }, timeout: 1 },
          { params: { seat: 'Seat2' }, timeout: 1 },
          { params: {}, timeout: 1 },
          { timeout: 1 }
        ]);
        expect(politeStub.callCount).to.equal(2);
      });

      it('tolerates non-array input', function () {
        expect(() => spec.onTimeout(null)).to.not.throw();
        expect(() => spec.onTimeout([null])).to.not.throw();
        expect(politeStub.called).to.be.false;
      });
    });

    describe('onBidderError', function () {
      const bidderRequest = (overrides = {}) => ({
        auctionId: 'a1',
        bids: [{ params: { seat: 'Gmtb' } }],
        refererInfo: { page: 'https://pub.example.com/page?q=secret', domain: 'pub.example.com' },
        ...overrides
      });

      it('beacons cookieless to sync.adapex.io with status, timeout flag and publisher domain', function () {
        spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest: bidderRequest() });
        expect(politeStub.firstCall.args).to.deep.equal([
          'https://sync.adapex.io/event?event=bidder-error&seat=Gmtb&region=us-e&status=500&timedout=0&auctionId=a1&puburl=pub.example.com',
          'omit'
        ]);
      });

      it('flags a timed-out transport error and omits an absent status', function () {
        spec.onBidderError({ error: { timedOut: true }, bidderRequest: bidderRequest({ auctionId: undefined, refererInfo: undefined }) });
        expect(politeStub.firstCall.args[0]).to.equal('https://sync.adapex.io/event?event=bidder-error&seat=Gmtb&region=us-e&timedout=1');
      });

      it('appends consent params', function () {
        spec.onBidderError({
          error: {},
          bidderRequest: bidderRequest({ gdprConsent: { gdprApplies: false }, uspConsent: '1YNN', gppConsent: { gppString: 'G', applicableSections: [2] } })
        });
        expect(politeStub.firstCall.args[0]).to.match(/&gdpr=0&us_privacy=1YNN&gpp=G&gpp_sid=2$/);
      });

      it('dedupes per seat and skips bids without a seat', function () {
        spec.onBidderError({
          error: {},
          bidderRequest: bidderRequest({ bids: [{ params: { seat: 'Gmtb' } }, { params: { seat: 'Gmtb' } }, { params: { seat: 'Seat2' } }, { params: {} }] })
        });
        expect(politeStub.callCount).to.equal(2);
      });

      it('tolerates a missing bidder request or bids', function () {
        expect(() => spec.onBidderError({ error: {} })).to.not.throw();
        expect(() => spec.onBidderError({ error: {}, bidderRequest: { bids: [null] } })).to.not.throw();
        expect(politeStub.called).to.be.false;
      });
    });
  });
});
