import { expect } from 'chai';
import { sharethroughAdapterSpec, sharethroughInternal } from 'modules/sharethroughBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config';
import * as utils from 'src/utils';

const spec = newBidder(sharethroughAdapterSpec).getSpec();

describe('sharethrough adapter spec', function() {
  let protocolStub;
  let inIframeStub;

  beforeEach(() => {
    protocolStub = sinon.stub(sharethroughInternal, 'getProtocol').returns('https');
    inIframeStub = sinon.stub(utils, 'inIframe').returns(false);
  });

  afterEach(() => {
    protocolStub.restore();
    inIframeStub.restore();
  });

  describe('code', function() {
    it('should return a bidder code of sharethrough', function() {
      expect(spec.code).to.eql('sharethrough');
    });
  });

  describe('isBidRequestValid', function() {
    it('should return false if req has no pkey', function() {
      const invalidBidRequest = {
        bidder: 'sharethrough',
        params: {
          notPKey: 'abc123',
        },
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return false if req has wrong bidder code', function() {
      const invalidBidRequest = {
        bidder: 'notSharethrough',
        params: {
          pkey: 'abc123',
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return true if req is correct', function() {
      const validBidRequest = {
        bidder: 'sharethrough',
        params: {
          pkey: 'abc123',
        },
      };
      expect(spec.isBidRequestValid(validBidRequest)).to.eq(true);
    });
  });

  describe('open rtb', () => {
    let bidRequests, bidderRequest;

    beforeEach(() => {
      config.setConfig({
        bidderTimeout: 242,
        coppa: true,
      });

      bidRequests = [
        {
          bidder: 'sharethrough',
          bidId: 'bidId1',
          sizes: [[300, 250], [300, 600]],
          params: {
            pkey: 'aaaa1111',
            bcat: ['cat1', 'cat2'],
            badv: ['adv1', 'adv2'],
          },
          ortb2Imp: {
            ext: {
              data: {
                pbadslot: 'universal-id',
              },
            },
          },
          userId: {
            tdid: 'fake-tdid',
            pubcid: 'fake-pubcid',
            idl_env: 'fake-identity-link',
            id5id: {
              uid: 'fake-id5id',
              ext: {
                linkType: 2,
              },
            },
            lipb: {
              lipbid: 'fake-lipbid',
            },
            criteoId: 'fake-criteo',
            britepoolid: 'fake-britepool',
            intentiqid: 'fake-intentiq',
            lotamePanoramaId: 'fake-lotame',
            parrableId: {
              eid: 'fake-parrable',
            },
            netId: 'fake-netid',
            sharedid: {
              id: 'fake-sharedid',
            },
          },
          crumbs: {
            pubcid: 'fake-pubcid-in-crumbs-obj',
          },
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'directseller.com',
                sid: '00001',
                rid: 'BidRequest1',
                hp: 1,
              },
            ],
          },
          getFloor: () => ({ currency: 'USD', floor: 42 }),
        },
        {
          bidder: 'sharethrough',
          bidId: 'bidId2',
          sizes: [[600, 300]],
          params: {
            pkey: 'bbbb2222',
          },
          mediaTypes: {
            video: {
              skip: 1,
              linearity: 0,
              minduration: 10,
              maxduration: 30,
              playbackmethod: [1],
              api: [3],
              mimes: ['video/3gpp'],
              protocols: [2, 3],
              playerSize: [[640, 480]],
            },
          },
          getFloor: () => ({ currency: 'USD', floor: 42 }),
        },
      ];

      bidderRequest = {
        refererInfo: {
          referer: 'https://referer.com',
        },
      };
    });

    describe('buildRequests', function() {
      describe('top level object', () => {
        it('should build openRTB request', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);

          expect(builtRequest.method).to.equal('POST');
          expect(builtRequest.url).not.to.be.undefined;
          expect(builtRequest.options).to.deep.equal({
            contentType: 'application/json',
            withCredentials: false,
            crossOrigin: true,
          });
          expect(builtRequest.bidderRequest).to.deep.equal(bidderRequest);

          const openRtbReq = builtRequest.data;
          expect(openRtbReq.id).not.to.be.undefined;
          expect(openRtbReq.cur).to.deep.equal(['USD']);
          expect(openRtbReq.tmax).to.equal(242);

          expect(openRtbReq.site.domain).not.to.be.undefined;
          expect(openRtbReq.site.page).not.to.be.undefined;
          expect(openRtbReq.site.ref).to.equal('https://referer.com');

          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'liveramp.com', uids: [{ id: 'fake-identity-link', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({
            source: 'id5-sync.com',
            uids: [{ id: 'fake-id5id', atype: 1, ext: { linkType: 2 } }],
          });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'pubcid.org', uids: [{ id: 'fake-pubcid', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'adserver.org', uids: [{ id: 'fake-tdid', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'criteo.com', uids: [{ id: 'fake-criteo', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'britepool.com', uids: [{ id: 'fake-britepool', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'liveintent.com', uids: [{ id: 'fake-lipbid', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'intentiq.com', uids: [{ id: 'fake-intentiq', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'crwdcntrl.net', uids: [{ id: 'fake-lotame', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'parrable.com', uids: [{ id: 'fake-parrable', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'netid.de', uids: [{ id: 'fake-netid', atype: 1 }] });
          expect(openRtbReq.user.ext.eids).to.deep.include({ source: 'sharedid.org', uids: [{ id: 'fake-sharedid', atype: 1 }] });

          expect(openRtbReq.device.ua).to.equal(navigator.userAgent);
          expect(openRtbReq.regs.coppa).to.equal(1);

          expect(openRtbReq.source.ext.id).to.equal('WYu2BXv1');
          expect(openRtbReq.source.ext.version).not.to.be.undefined;
          expect(openRtbReq.source.ext.str).not.to.be.undefined;
          expect(openRtbReq.source.ext.schain).to.deep.equal(bidRequests[0].schain);

          expect(openRtbReq.bcat).to.deep.equal(bidRequests[0].params.bcat);
          expect(openRtbReq.badv).to.deep.equal(bidRequests[0].params.badv);

          expect(openRtbReq.imp).to.have.length(2);

          expect(openRtbReq.imp[0].id).to.equal('bidId1');
          expect(openRtbReq.imp[0].tagid).to.equal('aaaa1111');
          expect(openRtbReq.imp[0].secure).to.equal(1);
          expect(openRtbReq.imp[0].bidfloor).to.equal(42);

          expect(openRtbReq.imp[1].id).to.equal('bidId2');
          expect(openRtbReq.imp[1].tagid).to.equal('bbbb2222');
          expect(openRtbReq.imp[1].secure).to.equal(1);
          expect(openRtbReq.imp[1].bidfloor).to.equal(42);
        });
      });

      describe('regulation', () => {
        describe('gdpr', () => {
          it('should populate request accordingly when gdpr applies', () => {
            bidderRequest.gdprConsent = {
              gdprApplies: true,
              consentString: 'consent',
            };

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
            const openRtbReq = builtRequest.data;

            expect(openRtbReq.regs.ext.gdpr).to.equal(1);
            expect(openRtbReq.user.ext.consent).to.equal('consent');
          });

          it('should populate request accordingly when gdpr explicitly does not apply', () => {
            bidderRequest.gdprConsent = {
              gdprApplies: false,
            };

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
            const openRtbReq = builtRequest.data;

            expect(openRtbReq.regs.ext.gdpr).to.equal(0);
            expect(openRtbReq.user.ext.consent).to.be.undefined;
          });
        });

        describe('US privacy', () => {
          it('should populate request accordingly when us privacy applies', () => {
            bidderRequest.uspConsent = 'consent';

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
            const openRtbReq = builtRequest.data;

            expect(openRtbReq.regs.ext.us_privacy).to.equal('consent');
          });
        });

        describe('coppa', () => {
          it('should populate request accordingly when coppa does not apply', () => {
            config.setConfig({ coppa: false });

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
            const openRtbReq = builtRequest.data;

            expect(openRtbReq.regs.coppa).to.equal(0);
          });
        });
      });

      describe('universal id', () => {
        it('should include gpid when universal id is provided', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
          const openRtbReq = builtRequest.data;

          expect(openRtbReq.imp[0].ext.gpid).to.equal('universal-id');
          expect(openRtbReq.imp[1].ext?.gpid).to.be.undefined;
        });
      });

      describe('secure flag', () => {
        it('should be positive when protocol is https', () => {
          protocolStub.returns('https');
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
          const openRtbReq = builtRequest.data;

          expect(openRtbReq.imp[0].secure).to.equal(1);
          expect(openRtbReq.imp[1].secure).to.equal(1);
        });

        it('should be negative when protocol is http', () => {
          protocolStub.returns('http');
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
          const openRtbReq = builtRequest.data;

          expect(openRtbReq.imp[0].secure).to.equal(0);
          expect(openRtbReq.imp[1].secure).to.equal(0);
        });

        it('should be positive when protocol is neither http nor https', () => {
          protocolStub.returns('about');
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);
          const openRtbReq = builtRequest.data;

          expect(openRtbReq.imp[0].secure).to.equal(1);
          expect(openRtbReq.imp[1].secure).to.equal(1);
        });
      });

      describe('banner imp', () => {
        it('should generate open rtb banner imp', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);

          const bannerImp = builtRequest.data.imp[0].banner;
          expect(bannerImp.topframe).to.equal(1);
          expect(bannerImp.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
        });
      });

      describe('video imp', () => {
        it('should generate open rtb video imp', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);

          const videoImp = builtRequest.data.imp[1].video;
          expect(videoImp.topframe).to.equal(1);
          expect(videoImp.skip).to.equal(1);
          expect(videoImp.linearity).to.equal(0);
          expect(videoImp.minduration).to.equal(10);
          expect(videoImp.maxduration).to.equal(30);
          expect(videoImp.playbackmethod).to.deep.equal([1]);
          expect(videoImp.api).to.deep.equal([3]);
          expect(videoImp.mimes).to.deep.equal(['video/3gpp']);
          expect(videoImp.protocols).to.deep.equal([2, 3]);
          expect(videoImp.w).to.equal(640);
          expect(videoImp.h).to.equal(480);
        });

        it('should set defaults if no value provided', () => {
          delete bidRequests[1].mediaTypes.video.skip;
          delete bidRequests[1].mediaTypes.video.linearity;
          delete bidRequests[1].mediaTypes.video.minduration;
          delete bidRequests[1].mediaTypes.video.maxduration;
          delete bidRequests[1].mediaTypes.video.playbackmethod;
          delete bidRequests[1].mediaTypes.video.api;
          delete bidRequests[1].mediaTypes.video.mimes;
          delete bidRequests[1].mediaTypes.video.protocols;

          const builtRequest = spec.buildRequests(bidRequests, bidderRequest);

          const videoImp = builtRequest.data.imp[1].video;
          expect(videoImp.skip).to.equal(0);
          expect(videoImp.linearity).to.equal(1);
          expect(videoImp.minduration).to.equal(5);
          expect(videoImp.maxduration).to.equal(60);
          expect(videoImp.playbackmethod).to.deep.equal([2]);
          expect(videoImp.api).to.deep.equal([2]);
          expect(videoImp.mimes).to.deep.equal(['video/mp4']);
          expect(videoImp.protocols).to.deep.equal([2, 3, 5, 6, 7, 8]);
        });
      });
    });

    describe('interpretResponse', function() {
      let request;
      let response;

      beforeEach(() => {
        request = spec.buildRequests(bidRequests, bidderRequest);
        response = {
          body: {
            seatbid: [{
              bid: [{
                id: 'bidId1',
                impid: '123',
                w: 300,
                h: 250,
                price: 42,
                crid: 'creative',
                dealid: 'deal',
                adomain: ['domain.com'],
                adm: 'markup',
              }, {
                id: 'bidId2',
                impid: '456',
                w: 640,
                h: 480,
                price: 42,
                adm: 'vastTag',
              }],
            }],
          },
        };
      });

      describe('banner', () => {
        it('should return a banner bid', () => {
          const resp = spec.interpretResponse(response, request);

          const bannerBid = resp[0];
          expect(bannerBid.requestId).to.equal('123');
          expect(bannerBid.width).to.equal(300);
          expect(bannerBid.height).to.equal(250);
          expect(bannerBid.cpm).to.equal(42);
          expect(bannerBid.creativeId).to.equal('creative');
          expect(bannerBid.dealId).to.equal('deal');
          expect(bannerBid.mediaType).to.equal('banner');
          expect(bannerBid.currency).to.equal('USD');
          expect(bannerBid.netRevenue).to.equal(true);
          expect(bannerBid.ttl).to.equal(360);
          expect(bannerBid.ad).to.equal('markup');
          expect(bannerBid.meta.advertiserDomains).to.deep.equal(['domain.com']);
          expect(bannerBid.vastXml).to.be.undefined;
        });
      });

      describe('video', () => {
        it('should return a banner bid', () => {
          const resp = spec.interpretResponse(response, request);

          const bannerBid = resp[1];
          expect(bannerBid.requestId).to.equal('456');
          expect(bannerBid.width).to.equal(640);
          expect(bannerBid.height).to.equal(480);
          expect(bannerBid.cpm).to.equal(42);
          expect(bannerBid.creativeId).to.be.undefined;
          expect(bannerBid.dealId).to.be.null;
          expect(bannerBid.mediaType).to.equal('video');
          expect(bannerBid.currency).to.equal('USD');
          expect(bannerBid.netRevenue).to.equal(true);
          expect(bannerBid.ttl).to.equal(3600);
          expect(bannerBid.ad).to.equal('vastTag');
          expect(bannerBid.meta.advertiserDomains).to.deep.equal([]);
          expect(bannerBid.vastXml).to.equal('vastTag');
        });
      });
    });

    describe('getUserSyncs', function() {
      const cookieSyncs = ['cookieUrl1', 'cookieUrl2', 'cookieUrl3'];
      const serverResponses = [{ body: { cookieSyncUrls: cookieSyncs } }];

      it('returns an array of correctly formatted user syncs', function() {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, null, 'fake-privacy-signal');
        expect(syncArray).to.deep.equal([
          { type: 'image', url: 'cookieUrl1&us_privacy=fake-privacy-signal' },
          { type: 'image', url: 'cookieUrl2&us_privacy=fake-privacy-signal' },
          { type: 'image', url: 'cookieUrl3&us_privacy=fake-privacy-signal' }],
        );
      });

      it('returns an empty array if serverResponses is empty', function() {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, []);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if the body is null', function() {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: null }]);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if the body.cookieSyncUrls is missing', function() {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: { creatives: ['creative'] } }]);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if pixels are not enabled', function() {
        const syncArray = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
        expect(syncArray).to.be.an('array').that.is.empty;
      });
    });
  });
});
