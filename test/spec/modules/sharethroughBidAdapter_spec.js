import { expect } from 'chai';
import * as sinon from 'sinon';
import { sharethroughAdapterSpec, sharethroughInternal } from 'modules/sharethroughBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config';
import * as utils from 'src/utils';

const spec = newBidder(sharethroughAdapterSpec).getSpec();

describe('sharethrough adapter spec', function () {
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

  describe('code', function () {
    it('should return a bidder code of sharethrough', function () {
      expect(spec.code).to.eql('sharethrough');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false if req has no pkey', function () {
      const invalidBidRequest = {
        bidder: 'sharethrough',
        params: {
          notPKey: 'abc123',
        },
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return false if req has wrong bidder code', function () {
      const invalidBidRequest = {
        bidder: 'notSharethrough',
        params: {
          pkey: 'abc123',
        },
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return true if req is correct', function () {
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
          mediaTypes: {
            banner: {
              pos: 1,
            },
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
            intentIqId: 'fake-intentiq',
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
              pos: 3,
              skip: 1,
              linearity: 0,
              minduration: 10,
              maxduration: 30,
              playbackmethod: [1],
              api: [3],
              mimes: ['video/3gpp'],
              protocols: [2, 3],
              playerSize: [640, 480],
              startdelay: 42,
              skipmin: 10,
              skipafter: 20,
              delivery: 1,
              companiontype: 'companion type',
              companionad: 'companion ad',
              context: 'instream',
            },
          },
          getFloor: () => ({ currency: 'USD', floor: 42 }),
        },
      ];

      bidderRequest = {
        refererInfo: {
          ref: 'https://referer.com',
        },
      };
    });

    describe('buildRequests', function () {
      describe('top level object', () => {
        it('should build openRTB request', () => {
          const builtRequests = spec.buildRequests(bidRequests, bidderRequest);

          const expectedImpValues = [
            {
              id: 'bidId1',
              tagid: 'aaaa1111',
              secure: 1,
              bidfloor: 42,
            },
            {
              id: 'bidId2',
              tagid: 'bbbb2222',
              secure: 1,
              bidfloor: 42,
            },
          ];

          builtRequests.map((builtRequest, rIndex) => {
            expect(builtRequest.method).to.equal('POST');
            expect(builtRequest.url).not.to.be.undefined;
            expect(builtRequest.options).to.be.undefined;

            const openRtbReq = builtRequest.data;
            expect(openRtbReq.id).not.to.be.undefined;
            expect(openRtbReq.cur).to.deep.equal(['USD']);
            expect(openRtbReq.tmax).to.equal(242);

            expect(Object.keys(openRtbReq.site)).to.have.length(3);
            expect(openRtbReq.site.domain).not.to.be.undefined;
            expect(openRtbReq.site.page).not.to.be.undefined;
            expect(openRtbReq.site.ref).to.equal('https://referer.com');

            const expectedEids = {
              'liveramp.com': { id: 'fake-identity-link' },
              'id5-sync.com': { id: 'fake-id5id' },
              'pubcid.org': { id: 'fake-pubcid' },
              'adserver.org': { id: 'fake-tdid' },
              'criteo.com': { id: 'fake-criteo' },
              'britepool.com': { id: 'fake-britepool' },
              'liveintent.com': { id: 'fake-lipbid' },
              'intentiq.com': { id: 'fake-intentiq' },
              'crwdcntrl.net': { id: 'fake-lotame' },
              'parrable.com': { id: 'fake-parrable' },
              'netid.de': { id: 'fake-netid' },
            };
            expect(openRtbReq.user.ext.eids).to.be.an('array').that.have.length(Object.keys(expectedEids).length);
            for (const eid of openRtbReq.user.ext.eids) {
              expect(Object.keys(expectedEids)).to.include(eid.source);
              expect(eid.uids[0].id).to.equal(expectedEids[eid.source].id);
              expect(eid.uids[0].atype).to.be.ok;
            }

            expect(openRtbReq.device.ua).to.equal(navigator.userAgent);
            expect(openRtbReq.regs.coppa).to.equal(1);

            expect(openRtbReq.source.ext.version).not.to.be.undefined;
            expect(openRtbReq.source.ext.str).not.to.be.undefined;
            expect(openRtbReq.source.ext.schain).to.deep.equal(bidRequests[0].schain);

            expect(openRtbReq.bcat).to.deep.equal(bidRequests[0].params.bcat);
            expect(openRtbReq.badv).to.deep.equal(bidRequests[0].params.badv);

            expect(openRtbReq.imp).to.have.length(1);

            expect(openRtbReq.imp[0].id).to.equal(expectedImpValues[rIndex].id);
            expect(openRtbReq.imp[0].tagid).to.equal(expectedImpValues[rIndex].tagid);
            expect(openRtbReq.imp[0].secure).to.equal(expectedImpValues[rIndex].secure);
            expect(openRtbReq.imp[0].bidfloor).to.equal(expectedImpValues[rIndex].bidfloor);
          });
        });

        it('should have empty eid array if no id is provided', () => {
          const openRtbReq = spec.buildRequests([bidRequests[1]], bidderRequest)[0].data;

          expect(openRtbReq.user.ext.eids).to.deep.equal([]);
        });
      });

      describe('no referer provided', () => {
        beforeEach(() => {
          bidderRequest = {};
        });

        it('should set referer to undefined', () => {
          const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;
          expect(openRtbReq.site.ref).to.be.undefined;
        });
      });

      describe('regulation', () => {
        describe('gdpr', () => {
          it('should populate request accordingly when gdpr applies', () => {
            bidderRequest.gdprConsent = {
              gdprApplies: true,
              consentString: 'consent',
            };

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;

            expect(openRtbReq.regs.ext.gdpr).to.equal(1);
            expect(openRtbReq.user.ext.consent).to.equal('consent');
          });

          it('should populate request accordingly when gdpr explicitly does not apply', () => {
            bidderRequest.gdprConsent = {
              gdprApplies: false,
            };

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;

            expect(openRtbReq.regs.ext.gdpr).to.equal(0);
            expect(openRtbReq.user.ext.consent).to.be.undefined;
          });
        });

        describe('US privacy', () => {
          it('should populate request accordingly when us privacy applies', () => {
            bidderRequest.uspConsent = 'consent';

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;

            expect(openRtbReq.regs.ext.us_privacy).to.equal('consent');
          });
        });

        describe('coppa', () => {
          it('should populate request accordingly when coppa does not apply', () => {
            config.setConfig({ coppa: false });

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;

            expect(openRtbReq.regs.coppa).to.equal(0);
          });
        });
      });

      describe('universal id', () => {
        it('should include gpid when universal id is provided', () => {
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].ext.gpid).to.equal('universal-id');
          expect(requests[1].data.imp[0].ext).to.be.undefined;
        });
      });

      describe('secure flag', () => {
        it('should be positive when protocol is https', () => {
          protocolStub.returns('https');
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].secure).to.equal(1);
          expect(requests[1].data.imp[0].secure).to.equal(1);
        });

        it('should be negative when protocol is http', () => {
          protocolStub.returns('http');
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].secure).to.equal(0);
          expect(requests[1].data.imp[0].secure).to.equal(0);
        });

        it('should be positive when protocol is neither http nor https', () => {
          protocolStub.returns('about');
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].secure).to.equal(1);
          expect(requests[1].data.imp[0].secure).to.equal(1);
        });
      });

      describe('banner imp', () => {
        it('should generate open rtb banner imp', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];

          const bannerImp = builtRequest.data.imp[0].banner;
          expect(bannerImp.pos).to.equal(1);
          expect(bannerImp.topframe).to.equal(1);
          expect(bannerImp.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
        });

        it('should default to pos 0 if not provided', () => {
          delete bidRequests[0].mediaTypes;
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];

          const bannerImp = builtRequest.data.imp[0].banner;
          expect(bannerImp.pos).to.equal(0);
        });
      });

      describe('video imp', () => {
        it('should generate open rtb video imp', () => {
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];

          const videoImp = builtRequest.data.imp[0].video;
          expect(videoImp.pos).to.equal(3);
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
          expect(videoImp.startdelay).to.equal(42);
          expect(videoImp.skipmin).to.equal(10);
          expect(videoImp.skipafter).to.equal(20);
          expect(videoImp.placement).to.equal(1);
          expect(videoImp.delivery).to.equal(1);
          expect(videoImp.companiontype).to.equal('companion type');
          expect(videoImp.companionad).to.equal('companion ad');
        });

        it('should set defaults if no value provided', () => {
          delete bidRequests[1].mediaTypes.video.pos;
          delete bidRequests[1].mediaTypes.video.skip;
          delete bidRequests[1].mediaTypes.video.linearity;
          delete bidRequests[1].mediaTypes.video.minduration;
          delete bidRequests[1].mediaTypes.video.maxduration;
          delete bidRequests[1].mediaTypes.video.playbackmethod;
          delete bidRequests[1].mediaTypes.video.api;
          delete bidRequests[1].mediaTypes.video.mimes;
          delete bidRequests[1].mediaTypes.video.protocols;
          delete bidRequests[1].mediaTypes.video.playerSize;
          delete bidRequests[1].mediaTypes.video.startdelay;
          delete bidRequests[1].mediaTypes.video.skipmin;
          delete bidRequests[1].mediaTypes.video.skipafter;
          delete bidRequests[1].mediaTypes.video.placement;
          delete bidRequests[1].mediaTypes.video.delivery;
          delete bidRequests[1].mediaTypes.video.companiontype;
          delete bidRequests[1].mediaTypes.video.companionad;

          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];

          const videoImp = builtRequest.data.imp[0].video;
          expect(videoImp.pos).to.equal(0);
          expect(videoImp.skip).to.equal(0);
          expect(videoImp.linearity).to.equal(1);
          expect(videoImp.minduration).to.equal(5);
          expect(videoImp.maxduration).to.equal(60);
          expect(videoImp.playbackmethod).to.deep.equal([2]);
          expect(videoImp.api).to.deep.equal([2]);
          expect(videoImp.mimes).to.deep.equal(['video/mp4']);
          expect(videoImp.protocols).to.deep.equal([2, 3, 5, 6, 7, 8]);
          expect(videoImp.w).to.equal(640);
          expect(videoImp.h).to.equal(360);
          expect(videoImp.startdelay).to.equal(0);
          expect(videoImp.skipmin).to.equal(0);
          expect(videoImp.skipafter).to.equal(0);
          expect(videoImp.placement).to.equal(1);
          expect(videoImp.delivery).to.be.undefined;
          expect(videoImp.companiontype).to.be.undefined;
          expect(videoImp.companionad).to.be.undefined;
        });

        describe('outstream', () => {
          it('should use placement value if provided', () => {
            bidRequests[1].mediaTypes.video.context = 'outstream';
            bidRequests[1].mediaTypes.video.placement = 3;

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];
            const videoImp = builtRequest.data.imp[0].video;

            expect(videoImp.placement).to.equal(3);
          });

          it('should default placement to 4 if not provided', () => {
            bidRequests[1].mediaTypes.video.context = 'outstream';

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];
            const videoImp = builtRequest.data.imp[0].video;

            expect(videoImp.placement).to.equal(4);
          });
        });
      });

      describe('first party data', () => {
        const firstPartyData = {
          site: {
            name: 'example',
            keywords: 'power tools, drills',
            search: 'drill',
            content: {
              userrating: '4',
            },
            ext: {
              data: {
                pageType: 'article',
                category: 'repair',
              },
            },
          },
          user: {
            yob: 1985,
            gender: 'm',
            ext: {
              data: {
                registered: true,
                interests: ['cars'],
              },
            },
          },
        };

        it('should include first party data in open rtb request, site section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, {...bidderRequest, ortb2: firstPartyData})[0].data;

          expect(openRtbReq.site.name).to.equal(firstPartyData.site.name);
          expect(openRtbReq.site.keywords).to.equal(firstPartyData.site.keywords);
          expect(openRtbReq.site.search).to.equal(firstPartyData.site.search);
          expect(openRtbReq.site.content).to.deep.equal(firstPartyData.site.content);
          expect(openRtbReq.site.ext).to.deep.equal(firstPartyData.site.ext);
        });

        it('should include first party data in open rtb request, user section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, {...bidderRequest, ortb2: firstPartyData})[0].data;

          expect(openRtbReq.user.yob).to.equal(firstPartyData.user.yob);
          expect(openRtbReq.user.gender).to.equal(firstPartyData.user.gender);
          expect(openRtbReq.user.ext.data).to.deep.equal(firstPartyData.user.ext.data);
          expect(openRtbReq.user.ext.eids).not.to.be.undefined;
        });
      });
    });

    describe('interpretResponse', function () {
      let request;
      let response;

      describe('banner', () => {
        beforeEach(() => {
          request = spec.buildRequests(bidRequests, bidderRequest)[0];
          response = {
            body: {
              seatbid: [{
                bid: [{
                  id: '123',
                  impid: 'bidId1',
                  w: 300,
                  h: 250,
                  price: 42,
                  crid: 'creative',
                  dealid: 'deal',
                  adomain: ['domain.com'],
                  adm: 'markup',
                }, {
                  id: '456',
                  impid: 'bidId2',
                  w: 640,
                  h: 480,
                  price: 42,
                  adm: 'vastTag',
                }],
              }],
            },
          };
        });

        it('should return a banner bid', () => {
          const resp = spec.interpretResponse(response, request);

          const bannerBid = resp[0];
          expect(bannerBid.requestId).to.equal('bidId1');
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
        beforeEach(() => {
          request = spec.buildRequests(bidRequests, bidderRequest)[1];
          response = {
            body: {
              seatbid: [{
                bid: [{
                  id: '456',
                  impid: 'bidId2',
                  w: 640,
                  h: 480,
                  price: 42,
                  adm: 'vastTag',
                }],
              }],
            },
          };
        });

        it('should return a video bid', () => {
          const resp = spec.interpretResponse(response, request);

          const bannerBid = resp[0];
          expect(bannerBid.requestId).to.equal('bidId2');
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

    describe('getUserSyncs', function () {
      const cookieSyncs = ['cookieUrl1', 'cookieUrl2', 'cookieUrl3'];
      const serverResponses = [{ body: { cookieSyncUrls: cookieSyncs } }];

      it('returns an array of correctly formatted user syncs', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
        expect(syncArray).to.deep.equal([
          { type: 'image', url: 'cookieUrl1' },
          { type: 'image', url: 'cookieUrl2' },
          { type: 'image', url: 'cookieUrl3' }],
        );
      });

      it('returns an empty array if serverResponses is empty', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, []);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if the body is null', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: null }]);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if the body.cookieSyncUrls is missing', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: { creatives: ['creative'] } }]);
        expect(syncArray).to.be.an('array').that.is.empty;
      });

      it('returns an empty array if pixels are not enabled', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
        expect(syncArray).to.be.an('array').that.is.empty;
      });
    });
  });
});
