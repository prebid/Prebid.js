import { expect } from 'chai';
import sinon from 'sinon';
import { config } from 'src/config.js';
import { isValid, newBidder } from 'src/adapters/bidderFactory.js';
import adapterManager from 'src/adapterManager.js';
import { hook } from 'src/hook.js';
import { registerActivityControl } from 'src/activities/rules.js';
import { ACTIVITY_TRANSMIT_EIDS, ACTIVITY_TRANSMIT_UFPD, ACTIVITY_TRANSMIT_TID } from 'src/activities/activities.js';
import { spec, storage } from 'modules/adapexBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import * as utils from 'src/utils.js';
import { continueAuction, handleSetFloorsConfig } from 'modules/priceFloors.js';
import { stubAuctionIndex } from '../../helpers/indexStub.js';

describe('adapexBidAdapter', function () {
  before(() => hook.ready());
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
    adUnitId: 'native-unit',
    mediaTypes: {
      native: {
        image: { required: true, sizes: [150, 50] },
        title: { required: true, len: 80 }
      }
    },
    params: { seat: 'Gmtb' },
    nativeOrtbRequest: {
      ver: '1.2',
      assets: [{ id: 1, required: 1, title: { len: 80 } }, { id: 2, required: 1, img: { type: 3, w: 150, h: 50 } }]
    }
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

    it('preserves all enabled formats on one multiformat impression', function () {
      const bid = {
        ...validBannerBid,
        mediaTypes: { banner: validBannerBid.mediaTypes.banner, video: validVideoBid.mediaTypes.video, native: validNativeBid.mediaTypes.native },
        nativeOrtbRequest: validNativeBid.nativeOrtbRequest
      };
      const imps = spec.buildRequests([bid], bidderRequest)[0].data.imp;
      expect(imps).to.have.lengthOf(1);
      expect(imps[0].banner.format).to.have.lengthOf(2);
      if (FEATURES.VIDEO) {
        expect(imps[0].video.mimes).to.deep.equal(['video/mp4']);
      } else {
        expect(imps[0].video).to.be.undefined;
      }
      if (FEATURES.NATIVE) {
        expect(JSON.parse(imps[0].native.request).assets).to.deep.equal(validNativeBid.nativeOrtbRequest.assets);
      } else {
        expect(imps[0].native).to.be.undefined;
      }
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
      it('honors floors and suppression from the real Floors auction hook', function () {
        const data = { currency: 'USD', schema: { fields: ['mediaType'] }, values: { '*': 2.5 } };
        const scenarios = [
          { data, expected: 2.5 },
          { data, enforcement: { noFloorSignalBidders: ['adapex'] } },
          { data, skipRate: 100 },
          { expected: 5 }
        ];
        try {
          scenarios.forEach(({ expected, ...floors }, i) => {
            handleSetFloorsConfig({ enabled: true, enforcement: { bidAdjustment: false }, ...floors });
            const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: 5 } };
            const adUnits = [{ code: bid.adUnitCode, mediaTypes: bid.mediaTypes, bids: [bid] }];
            const nextFn = sinon.stub();
            const auctionId = `adapex-floors-${i}`;
            continueAuction({ reqBidsConfigObj: { auctionId, adUnits }, nextFn });
            expect(nextFn.calledOnce).to.be.true;
            const imp = spec.buildRequests([bid], { ...bidderRequest, auctionId })[0].data.imp[0];
            expect(imp.bidfloor).to.equal(expected);
          });
        } finally {
          handleSetFloorsConfig({ enabled: false });
        }
      });

      it('leaves the wildcard floor lookup to the core processor', function () {
        const getFloor = sinon.stub().returns({ floor: 0, currency: 'USD' });
        const bid = { ...validBannerBid, getFloor };
        spec.buildRequests([bid], bidderRequest);
        expect(getFloor.withArgs({ currency: 'USD', mediaType: '*', size: '*' }).callCount).to.equal(1);
      });

      it('does not signal a static floor when the Floors module suppresses it', function () {
        [{ noFloorSignaled: true }, { skipped: true, skippedReason: 'random' }].forEach((floorData) => {
          const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: 5 }, floorData };
          expect(spec.buildRequests([bid], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
        });
      });

      it('keeps the static fallback when Floors data is unavailable', function () {
        const bid = {
          ...validBannerBid,
          params: { seat: 'Gmtb', bidFloor: 5 },
          floorData: { skipped: true, skippedReason: 'not_found' }
        };
        expect(spec.buildRequests([bid], bidderRequest)[0].data.imp[0].bidfloor).to.equal(5);
      });

      it('uses getFloor', function () {
        const bid = { ...validBannerBid, getFloor: () => ({ floor: 2.5, currency: 'EUR' }) };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(2.5);
        expect(imp.bidfloorcur).to.equal('EUR');
      });

      it('leaves a floor without currency unsignaled, as core requires', function () {
        const bid = { ...validBannerBid, getFloor: () => ({ floor: 1.5 }) };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.be.undefined;
        expect(imp.bidfloorcur).to.be.undefined;
      });

      it('ignores a zero or throwing getFloor', function () {
        const zero = { ...validBannerBid, getFloor: () => ({ floor: 0, currency: 'USD' }) };
        const broken = { ...validBannerBid, getFloor: () => { throw new Error('floor error'); } };
        expect(spec.buildRequests([zero], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
        expect(spec.buildRequests([broken], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
      });

      it('does not replace a Floors module decision with a static floor', function () {
        [() => ({ floor: 0, currency: 'USD' }), () => ({}), () => { throw new Error('floor error'); }].forEach((getFloor) => {
          const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: 5 }, getFloor };
          expect(spec.buildRequests([bid], bidderRequest)[0].data.imp[0].bidfloor).to.be.undefined;
        });
      });

      it('preserves an explicit zero floor from ortb2Imp', function () {
        const bid = { ...validBannerBid, params: { seat: 'Gmtb', bidFloor: 5 }, ortb2Imp: { bidfloor: 0, bidfloorcur: 'EUR' } };
        const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
        expect(imp.bidfloor).to.equal(0);
        expect(imp.bidfloorcur).to.equal('EUR');
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

      it('forwards publisher first-party data and impression deal definitions', function () {
        const site = { domain: 'publisher.example', content: { language: 'en' } };
        const userData = [{ name: 'publisher.example', segment: [{ id: 'sports' }] }];
        const pmp = { private_auction: 1, deals: [{ id: 'deal-1', bidfloor: 0.5, bidfloorcur: 'USD' }] };
        const bid = { ...validBannerBid, ortb2Imp: { pmp } };
        const request = { ...bidderRequest, ortb2: { site, user: { data: userData } } };
        const data = spec.buildRequests([bid], request)[0].data;
        expect(data.site).to.deep.include(site);
        expect(data.user.data).to.deep.equal(userData);
        expect(data.imp[0].pmp).to.deep.equal(pmp);
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

      it('mints and persists an id under the Adapex storage key and sends it as user.ext.wlid', function () {
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
        expect(data.user.ext).to.not.have.property('floxisId');
        expect(stubs.setDataInLocalStorage.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
        expect(stubs.setCookie.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
        expect(stubs.setDataInLocalStorage.calledWith('flx_uid')).to.be.false;
      });

      it('reuses a valid id from localStorage', function () {
        stubs.getDataFromLocalStorage.withArgs('adpx_uid').returns(STORED_UUID);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STORED_UUID);
        expect(stubs.generateUUID.called).to.be.false;
      });

      it('falls back to the cookie', function () {
        stubs.getCookie.withArgs('adpx_uid').returns(STORED_UUID);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STORED_UUID);
        expect(stubs.generateUUID.called).to.be.false;
      });

      it('uses the cookie alone when localStorage is disabled', function () {
        stubs.localStorageIsEnabled.returns(false);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
        expect(stubs.setDataInLocalStorage.called).to.be.false;
        expect(stubs.setCookie.calledWith('adpx_uid', STUBBED_UUID)).to.be.true;
      });

      it('regenerates a malformed stored id', function () {
        stubs.getDataFromLocalStorage.returns('not-a-uuid');
        stubs.getCookie.returns('also-not-a-uuid');
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
      });

      it('replaces a 36-character value that is not a UUID', function () {
        stubs.getDataFromLocalStorage.returns('x'.repeat(36));
        stubs.getCookie.returns('x'.repeat(36));
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
      });

      it('sends no id when storage is disallowed', function () {
        stubs.localStorageIsEnabled.returns(false);
        stubs.cookiesAreEnabled.returns(false);
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user?.ext?.wlid).to.be.undefined;
        expect(stubs.setCookie.called).to.be.false;
      });

      it('sends no id when the write does not persist', function () {
        stubs.setDataInLocalStorage.callsFake(() => {});
        stubs.setCookie.callsFake(() => {});
        const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
        expect(data.user?.ext?.wlid).to.be.undefined;
      });

      it('sends no id when a storage accessor throws', function () {
        stubs.getDataFromLocalStorage.throws(new Error('storage access error'));
        let data;
        expect(() => { data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data; }).to.not.throw();
        expect(data.user?.ext?.wlid).to.be.undefined;
      });

      it('keeps an existing user.ext.wlid', function () {
        const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: { wlid: STORED_UUID } } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.wlid).to.equal(STORED_UUID);
        expect(stubs.localStorageIsEnabled.called).to.be.false;
      });

      [ACTIVITY_TRANSMIT_EIDS, ACTIVITY_TRANSMIT_UFPD].forEach((activity) => {
        it(`does not resolve or transmit a fallback id when ${activity} is denied`, function () {
          const unregister = registerActivityControl(activity, 'adapex test', (params) => {
            if (params.componentName === 'adapex') return { allow: false };
          });
          try {
            const data = spec.buildRequests([validBannerBid], idBidderRequest)[0].data;
            expect(data.user?.ext?.wlid).to.be.undefined;
            expect(stubs.localStorageIsEnabled.called).to.be.false;
            expect(stubs.cookiesAreEnabled.called).to.be.false;
            expect(stubs.generateUUID.called).to.be.false;
          } finally {
            unregister();
          }
          expect(spec.buildRequests([validBannerBid], idBidderRequest)[0].data.user.ext.wlid).to.equal(STUBBED_UUID);
        });

        it(`removes a publisher id when ${activity} is denied and restores it when allowed`, function () {
          const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: { wlid: STORED_UUID, floxisId: STORED_UUID, consent: 'consent' } } } };
          const unregister = registerActivityControl(activity, 'adapex test', (params) => {
            if (params.componentName === 'adapex') return { allow: false };
          });
          try {
            const data = spec.buildRequests([validBannerBid], req)[0].data;
            expect(data.user.ext).to.deep.equal({ consent: 'consent' });
            expect(stubs.localStorageIsEnabled.called).to.be.false;
            expect(stubs.generateUUID.called).to.be.false;
          } finally {
            unregister();
          }
          expect(spec.buildRequests([validBannerBid], req)[0].data.user.ext.wlid).to.equal(STORED_UUID);
        });

        it(`uses the alias identity for ${activity} controls`, function () {
          const unregister = registerActivityControl(activity, 'adapex alias test', (params) => {
            if (params.componentName === 'adapex_alias') return { allow: false };
          });
          try {
            const data = spec.buildRequests([validBannerBid], { ...idBidderRequest, bidderCode: 'adapex_alias' })[0].data;
            expect(data.user?.ext?.wlid).to.be.undefined;
            expect(stubs.localStorageIsEnabled.called).to.be.false;
            expect(spec.buildRequests([validBannerBid], idBidderRequest)[0].data.user.ext.wlid).to.equal(STUBBED_UUID);
          } finally {
            unregister();
          }
        });
      });

      it('still sends wlid when publisher ortb2 carries a floxisId', function () {
        const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: { floxisId: STORED_UUID } } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
      });

      it('repairs a non-object user.ext', function () {
        const req = { ...idBidderRequest, ortb2: { ...idBidderRequest.ortb2, user: { ext: null } } };
        const data = spec.buildRequests([validBannerBid], req)[0].data;
        expect(data.user.ext.wlid).to.equal(STUBBED_UUID);
      });

      it('resolves the id once per auction across seat groups', function () {
        const seat2 = { ...validBannerBid, bidId: 'bid-9', params: { seat: 'Seat2' } };
        const requests = spec.buildRequests([validBannerBid, seat2], idBidderRequest);
        expect(requests).to.have.lengthOf(2);
        requests.forEach((r) => expect(r.data.user.ext.wlid).to.equal(STUBBED_UUID));
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
        const native = { ver: '1.2', link: { url: 'https://example.com/click' }, assets: [{ id: 1, title: { text: 'T' } }, { id: 2, img: { url: 'https://example.com/image.jpg', w: 150, h: 50 } }] };
        const adm = JSON.stringify(native);
        const response = { body: { seatbid: [{ bid: [{ impid: 'bid-3', price: 2.75, crid: 'n1', adm, mtype: 4 }] }] } };
        const bids = spec.interpretResponse(response, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(JSON.parse(request.data.imp[0].native.request).assets).to.deep.equal(validNativeBid.nativeOrtbRequest.assets);
        expect(bids[0].native.ortb).to.deep.equal(native);
        const bid = { ...bids[0], adUnitId: validNativeBid.adUnitId };
        const index = stubAuctionIndex({ bidRequests: [validNativeBid], adUnits: [{ ...validNativeBid }] });
        expect(isValid(validNativeBid.adUnitCode, bid, { index })).to.be.true;
        const incomplete = { ...bid, native: { ortb: { ...native, assets: [native.assets[0]] } } };
        expect(isValid(validNativeBid.adUnitCode, incomplete, { index })).to.be.false;
      });
    }

    it('retains a valid banner among unsupported, unknown and malformed responses', function () {
      const request = spec.buildRequests([validBannerBid, validNativeBid], bidderRequest)[0];
      const good = { impid: validBannerBid.bidId, price: 1.23, w: 300, h: 250, crid: 'good', adm: '<div>ad</div>', mtype: 1 };
      const invalid = [{ ...good, impid: 'unknown' }, { ...good, mtype: 3 }];
      if (FEATURES.NATIVE) invalid.push({ ...good, impid: validNativeBid.bidId, mtype: 4, adm: 'not JSON' });
      const response = { body: { seatbid: [{ bid: [good, ...invalid] }] } };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.include({ requestId: validBannerBid.bidId, creativeId: 'good', mediaType: BANNER });
    });

    it('keeps split requests from concurrent auctions independent when responses arrive out of order', function () {
      const compression = sinon.stub(utils, 'isGzipCompressionSupported').returns(false);
      const pending = [];
      const ajax = (url, callbacks, payload) => pending.push({ url, callbacks, payload: JSON.parse(payload) });
      const received = [sinon.stub(), sinon.stub()];
      const completed = [sinon.stub(), sinon.stub()];
      const snapshots = [];
      try {
        for (let i = 0; i < 2; i++) {
          const bids = [0, 1].map((seat) => ({ ...validBannerBid, bidId: `auction-${i}-bid-${seat}`, adUnitCode: `auction-${i}-unit-${seat}`, params: { seat: `Seat${seat}` } }));
          const request = { ...bidderRequest, auctionId: `auction-${i}`, bids };
          snapshots.push(JSON.stringify(request));
          newBidder(spec).callBids(request, received[i], completed[i], ajax, sinon.stub(), config.callbackWithBidder('adapex'));
          expect(JSON.stringify(request)).to.equal(snapshots[i]);
        }
        expect(pending).to.have.lengthOf(4);
        expect(completed.every((done) => !done.called)).to.be.true;
        [3, 0, 2, 1].forEach((i) => {
          const { callbacks, payload } = pending[i];
          callbacks.success(JSON.stringify({ seatbid: [{ bid: [{ impid: payload.imp[0].id, price: i + 1, w: 300, h: 250, crid: `creative-${i}`, adm: '<div>ad</div>', mtype: 1 }] }] }), { getResponseHeader: () => null });
        });
        completed.forEach((done) => expect(done.calledOnce).to.be.true);
        received.forEach((addBid, auction) => {
          expect(addBid.callCount).to.equal(2);
          addBid.getCalls().forEach(({ args: [adUnitCode, bid] }) => {
            expect(adUnitCode).to.match(new RegExp(`^auction-${auction}-unit-`));
            expect(bid.requestId).to.match(new RegExp(`^auction-${auction}-bid-`));
            expect(bid.originalCpm).to.equal(bid.cpm);
          });
        });
      } finally {
        compression.restore();
      }
    });

    it('drops a bid without mtype', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      expect(spec.interpretResponse(bannerResponse({ mtype: undefined }), request)).to.be.empty;
    });

    it('preserves deal IDs on returned bids', function () {
      const request = spec.buildRequests([validBannerBid], bidderRequest)[0];
      const bids = spec.interpretResponse(bannerResponse({ dealid: 'deal-1' }), request);
      expect(bids[0].dealId).to.equal('deal-1');
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
    const SERVER_IFRAME = 'https://px-us-e.floxis.tech/sync?seat=Gmtb&gdpr=1&type=iframe';
    const SERVER_IMAGE = 'https://px-us-e.floxis.tech/sync?seat=Gmtb&gdpr=1&type=image';
    const BOTH = [{ type: 'iframe', url: SERVER_IFRAME }, { type: 'image', url: SERVER_IMAGE }];
    let headerReads;

    beforeEach(function () {
      headerReads = 0;
    });

    function response({ sync, header = 'seat=Other&region=us-e' } = {}) {
      return {
        body: sync ? { id: 'r', seatbid: [], ext: { sync } } : '',
        headers: { get: () => { headerReads++; return header; } }
      };
    }

    it('returns nothing when no sync type is enabled or there are no responses', function () {
      expect(spec.getUserSyncs({}, [response({ sync: BOTH })])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.empty;
      expect(spec.getUserSyncs({ iframeEnabled: true }, undefined)).to.be.empty;
    });

    it('serves the server-baked iframe sync from sync.adapex.io, keeping path and query', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [response({ sync: BOTH })]);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&type=iframe' }]);
    });

    it('picks the image entry when only pixels are enabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [response({ sync: BOTH })]);
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

    it('never reads the sync header: a no-bid without body sync emits nothing', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [response(), { body: '' }])).to.be.empty;
      expect(headerReads).to.equal(0);
    });

    it('emits nothing for a disabled-type, empty or unusable body entry', function () {
      [
        [{ type: 'image', url: SERVER_IMAGE }],
        [],
        [{ type: 'iframe', url: 'not a url' }],
        [null, { type: 'iframe', url: '' }]
      ].forEach((sync) => {
        expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ sync })])).to.be.empty;
      });
      expect(headerReads).to.equal(0);
    });

    it('rejects non-HTTPS sync URLs before pinning the origin', function () {
      ['javascript:alert(1)', 'data:text/plain,hello', 'http://px-us-e.floxis.tech/sync'].forEach((url) => {
        expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ sync: [{ type: 'iframe', url }] })])).to.be.empty;
      });
    });

    it('uses the next usable sync when the preferred entry has an invalid URL', function () {
      const sync = [{ type: 'iframe', url: 'not a url' }, ...BOTH];
      expect(spec.getUserSyncs({ iframeEnabled: true }, [response({ sync })])).to.deep.equal([
        { type: 'iframe', url: 'https://sync.adapex.io/sync?seat=Gmtb&gdpr=1&type=iframe' }
      ]);
    });

    it('syncs on a no-bid that carries ext.sync', function () {
      const noBid = { body: { id: 'r', seatbid: [], cur: 'USD', ext: { sync: BOTH } } };
      expect(spec.getUserSyncs({ iframeEnabled: true }, [noBid])).to.have.lengthOf(1);
    });

    it('emits one sync per seat and dedupes URLs that rewrite to the same Adapex URL', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
        response({ sync: [{ type: 'iframe', url: 'https://px-us-e.floxis.tech/sync?seat=Gmtb' }] }),
        response({ sync: [{ type: 'iframe', url: 'https://px-eu.floxis.tech/sync?seat=Gmtb' }] }),
        response({ sync: [{ type: 'iframe', url: 'https://px-us-e.floxis.tech/sync?seat=Seat2' }] })
      ]);
      expect(syncs.map((s) => s.url)).to.deep.equal([
        'https://sync.adapex.io/sync?seat=Gmtb',
        'https://sync.adapex.io/sync?seat=Seat2'
      ]);
    });

    it('never emits a floxis.tech sync', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [response({ sync: BOTH })]);
      syncs.forEach((s) => expect(s.url).to.not.include('floxis'));
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
      config.setConfig({ adapex: { enableTelemetry: true } });
    });

    afterEach(function () {
      politeStub.restore();
      config.resetConfig();
    });

    it('sends no telemetry when the publisher disables it', function () {
      config.setConfig({ adapex: { enableTelemetry: false } });
      spec.onTimeout([{ params: { seat: 'Gmtb' }, timeout: 2000 }]);
      spec.onBidderError({ error: { status: 500 }, bidderRequest: { bids: [validBannerBid] } });
      expect(politeStub.called).to.be.false;
      expect(spec.buildRequests([validBannerBid], bidderRequest)).to.have.lengthOf(1);
    });

    it('sends no telemetry without explicit publisher opt-in', function () {
      config.resetConfig();
      spec.onTimeout([{ params: { seat: 'Gmtb' }, timeout: 2000 }]);
      spec.onBidderError({ error: { status: 500 }, bidderRequest: { bids: [validBannerBid] } });
      expect(politeStub.called).to.be.false;
    });

    [false, true].forEach((enableTIDs) => {
      ['timeout', 'error'].forEach((event) => {
        it(`keeps raw auction ids out of core ${event} hooks with enableTIDs=${enableTIDs}`, function () {
          config.setConfig({ enableTIDs });
          const unregister = registerActivityControl(ACTIVITY_TRANSMIT_TID, 'adapex test', () => ({ allow: false }));
          const rawId = 'private-auction-id';
          try {
            if (event === 'timeout') {
              adapterManager.callTimedOutBidders([{ code: validBannerBid.adUnitCode, bids: [{ bidder: 'adapex', params: validBannerBid.params }] }],
                [{ bidder: 'adapex', adUnitCode: validBannerBid.adUnitCode, auctionId: rawId }], 2000);
            } else {
              adapterManager.callBidderError('adapex', { status: 500 }, { auctionId: rawId, bids: [validBannerBid] });
            }
            expect(politeStub.calledOnce).to.be.true;
            expect(politeStub.firstCall.args[0]).not.to.include(rawId);
            expect(politeStub.firstCall.args[0]).not.to.match(/[?&]auctionId=/);
          } finally {
            unregister();
          }
        });
      });
    });

    describe('onTimeout', function () {
      it('reports each timed-out seat from core ad unit params once across ad units', function () {
        const adUnits = [
          {
            code: 'timeout-unit-1',
            bids: [
              { bidder: 'adapex', params: { seat: 'Gmtb' } },
              { bidder: 'adapex', params: { seat: 'Gmtb' } },
              { bidder: 'adapex', params: { seat: 'Seat2' } },
              { bidder: 'adapex', params: {} },
              { bidder: 'other', params: { seat: 'unrelated' } }
            ]
          },
          { code: 'timeout-unit-2', bids: [{ bidder: 'adapex', params: { seat: 'Seat2' } }] }
        ];
        adapterManager.callTimedOutBidders(adUnits, adUnits.map(({ code }) => ({ bidder: 'adapex', adUnitCode: code, auctionId: 'private-auction' })), 2000);
        expect(politeStub.getCalls().map(({ args }) => args)).to.deep.equal([
          ['https://sync.adapex.io/event?event=timeout&seat=Gmtb&region=us-e&duration=2000', 'omit'],
          ['https://sync.adapex.io/event?event=timeout&seat=Seat2&region=us-e&duration=2000', 'omit']
        ]);
      });

      it('beacons cookieless to sync.adapex.io', function () {
        spec.onTimeout([{ params: { seat: 'Gmtb', region: 'eu' }, timeout: 2000, auctionId: 'a1' }]);
        expect(politeStub.calledOnce).to.be.true;
        expect(politeStub.firstCall.args).to.deep.equal([
          'https://sync.adapex.io/event?event=timeout&seat=Gmtb&region=us-e&duration=2000',
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

      it('reports only the failing seat when another seat request succeeds', function () {
        const request = bidderRequest({ bids: [validBannerBid, { ...validVideoBid, params: { seat: 'Seat2' } }] });
        const bridge = sinon.stub(adapterManager, 'callBidderError').callsFake((code, error, bidderRequest) => spec.onBidderError({ error, bidderRequest }));
        const compression = sinon.stub(utils, 'isGzipCompressionSupported').returns(false);
        const ajax = sinon.stub().callsFake((url, callbacks) => {
          if (url === ENDPOINT) {
            callbacks.error('server error', { status: 500, responseURL: url });
          } else {
            callbacks.success('{"seatbid":[]}', { getResponseHeader: () => null });
          }
        });
        const done = sinon.stub();
        try {
          newBidder(spec).callBids(request, sinon.stub(), done, ajax, sinon.stub(), config.callbackWithBidder('adapex'));
          expect(ajax.callCount).to.equal(2);
          expect(done.calledOnce).to.be.true;
          expect(politeStub.callCount).to.equal(1);
          expect(politeStub.firstCall.args[0]).to.include('seat=Gmtb&');
        } finally {
          compression.restore();
          bridge.restore();
        }
      });

      it('does not attribute an unidentified split-request error to healthy seats', function () {
        spec.onBidderError({
          error: { status: 0 },
          bidderRequest: bidderRequest({ bids: [validBannerBid, { ...validVideoBid, params: { seat: 'Seat2' } }] })
        });
        expect(politeStub.called).to.be.false;
      });

      it('identifies compressed requests with encoded seats', function () {
        spec.onBidderError({
          error: { status: 503, responseURL: 'https://hb.adapex.io/pbjs?seat=a+b%26c&gzip=1' },
          bidderRequest: bidderRequest({ bids: [validBannerBid, { ...validVideoBid, params: { seat: 'a b&c' } }] })
        });
        expect(politeStub.calledOnce).to.be.true;
        expect(politeStub.firstCall.args[0]).to.include('seat=a%20b%26c&');
      });

      it('does not report split errors for an unrecognized or malformed URL', function () {
        ['not a URL', 'https://other.example/pbjs?seat=Gmtb', 'https://hb.adapex.io/other?seat=Gmtb'].forEach((responseURL) => {
          spec.onBidderError({
            error: { status: 500, responseURL },
            bidderRequest: bidderRequest({ bids: [validBannerBid, { ...validVideoBid, params: { seat: 'Seat2' } }] })
          });
        });
        expect(politeStub.called).to.be.false;
      });

      it('beacons cookieless to sync.adapex.io with status, timeout flag and publisher domain', function () {
        spec.onBidderError({ error: { status: 500, timedOut: false }, bidderRequest: bidderRequest() });
        expect(politeStub.firstCall.args).to.deep.equal([
          'https://sync.adapex.io/event?event=bidder-error&seat=Gmtb&region=us-e&status=500&timedout=0&puburl=pub.example.com',
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
          bidderRequest: bidderRequest({ bids: [{ params: { seat: 'Gmtb' } }, { params: { seat: 'Gmtb' } }, { params: {} }] })
        });
        expect(politeStub.callCount).to.equal(1);
      });

      it('tolerates a missing bidder request or bids', function () {
        expect(() => spec.onBidderError({ error: {} })).to.not.throw();
        expect(() => spec.onBidderError({ error: {}, bidderRequest: { bids: [null] } })).to.not.throw();
        expect(politeStub.called).to.be.false;
      });
    });
  });
});
