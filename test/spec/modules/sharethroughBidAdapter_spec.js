import { expect } from 'chai';
import { sharethroughAdapterSpec, sharethroughInternal } from 'modules/sharethroughBidAdapter.js';
import * as sinon from 'sinon';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config';
import * as utils from 'src/utils';
import { deepSetValue } from '../../../src/utils.js';
import { getImpIdMap, setIsEqtvTest } from '../../../modules/sharethroughBidAdapter.js';
import * as equativUtils from '../../../libraries/equativUtils/equativUtils.js'

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

    it('should return true if req is correct', function () {
      const validBidRequest = {
        params: {
          pkey: 'abc123',
        },
      };
      expect(spec.isBidRequestValid(validBidRequest)).to.eq(true);
    });
  });

  describe('open rtb', () => {
    let bidRequests, bidderRequest, multiImpBidRequests;

    const bannerBidRequests = [
      {
        adUnitCode: 'eqtv_42',
        bidId: 'abcd1234',
        sizes: [
          [300, 250],
          [300, 600],
        ],
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidder: 'sharethrough',
        params: {
          pkey: 111,
          equativNetworkId: 73
        },
        requestId: 'efgh5678',
        ortb2Imp: {
          ext: {
            tid: 'zsfgzzg',
          },
        },
      }
    ];

    const videoBidRequests = [
      {
        adUnitCode: 'eqtv_43',
        bidId: 'efgh5678',
        sizes: [],
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[640, 480]],
            pos: 3,
            skip: 1,
            linearity: 1,
            minduration: 10,
            maxduration: 30,
            minbitrate: 300,
            maxbitrate: 600,
            w: 640,
            h: 480,
            playbackmethod: [1],
            api: [3],
            mimes: ['video/x-flv', 'video/mp4'],
            startdelay: 42,
            battr: [13, 14],
            placement: 1,
          },
        },
        bidder: 'sharethrough',
        params: {
          pkey: 111,
          equativNetworkIdId: 73
        },
        requestId: 'abcd1234',
        ortb2Imp: {
          ext: {
            tid: 'zsgzgzz',
          },
        },
      }
    ];

    const nativeOrtbRequest = {
      assets: [{
        id: 0,
        required: 1,
        title: {
          len: 140
        }
      },
      {
        id: 1,
        required: 1,
        img: {
          type: 3,
          w: 300,
          h: 600
        }
      },
      {
        id: 2,
        required: 1,
        data: {
          type: 1
        }
      }],
      context: 1,
      eventtrackers: [{
        event: 1,
        methods: [1, 2]
      }],
      plcmttype: 1,
      privacy: 1,
      ver: '1.2',
    };

    const nativeBidRequests = [{
      bidder: 'sharethrough',
      adUnitCode: 'sharethrough_native_42',
      bidId: 'bidId3',
      sizes: [],
      mediaTypes: {
        native: {
          ...nativeOrtbRequest
        },
      },
      nativeOrtbRequest,
      params: {
        pkey: 777,
        equativNetworkId: 73
      },
      requestId: 'sharethrough_native_reqid_42',
      ortb2Imp: {
        ext: {
          tid: 'sharethrough_native_tid_42',
        },
      },
    }]

    beforeEach(() => {
      config.setConfig({
        bidderTimeout: 242,
        coppa: true,
      });

      bidRequests = [
        {
          bidder: 'sharethrough',
          bidId: 'bidId1',
          transactionId: 'transactionId1',
          sizes: [
            [300, 250],
            [300, 600],
          ],
          params: {
            pkey: 'aaaa1111',
            bcat: ['cat1', 'cat2'],
            badv: ['adv1', 'adv2'],
          },
          mediaTypes: {
            banner: {
              pos: 1,
              battr: [6, 7],
            },
          },
          ortb2Imp: {
            ext: {
              tid: 'transaction-id-1',
              gpid: 'universal-id',
              data: {
                pbadslot: 'pbadslot-id',
              },
            },
          },
          userIdAsEids: [
            {
              source: 'pubcid.org',
              uids: [
                {
                  atype: 1,
                  id: 'fake-pubcid',
                },
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-identity-link',
                },
              ],
            },
            {
              source: 'id5-sync.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-id5id',
                },
              ],
            },
            {
              source: 'adserver.org',
              uids: [
                {
                  atype: 1,
                  id: 'fake-tdid',
                },
              ],
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-criteo',
                },
              ],
            },
            {
              source: 'britepool.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-britepool',
                },
              ],
            },
            {
              source: 'liveintent.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-lipbid',
                },
              ],
            },
            {
              source: 'intentiq.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-intentiq',
                },
              ],
            },
            {
              source: 'crwdcntrl.net',
              uids: [
                {
                  atype: 1,
                  id: 'fake-lotame',
                },
              ],
            },
            {
              source: 'parrable.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-parrable',
                },
              ],
            },
            {
              source: 'netid.de',
              uids: [
                {
                  atype: 1,
                  id: 'fake-netid',
                },
              ],
            },
          ],
          crumbs: {
            pubcid: 'fake-pubcid-in-crumbs-obj',
          },
          ortb2: {
            source: {
              ext: {
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
                }
              }
            }
          },
          getFloor: () => ({ currency: 'USD', floor: 42 }),
        },
        {
          bidder: 'sharethrough',
          bidId: 'bidId2',
          sizes: [[600, 300]],
          transactionId: 'transactionId2',
          params: {
            pkey: 'bbbb2222',
          },
          mediaTypes: {
            video: {
              pos: 3,
              skip: 1,
              linearity: 1,
              minduration: 10,
              maxduration: 30,
              playbackmethod: [1],
              api: [3],
              mimes: ['video/3gpp'],
              protocols: [2, 3],
              playerSize: [[640, 480]],
              startdelay: 42,
              skipmin: 10,
              skipafter: 20,
              delivery: 1,
              battr: [13, 14],
              companiontype: 'companion type',
              companionad: 'companion ad',
              context: 'instream',
              placement: 1,
              plcmt: 1,
            },
          },
          getFloor: () => ({ currency: 'USD', floor: 42 }),
        },
      ];

      multiImpBidRequests = [
        {
          adUnitCode: 'equativ_42',
          bidId: 'abcd1234',
          mediaTypes: {
            banner: bannerBidRequests[0].mediaTypes.banner,
            video: videoBidRequests[0].mediaTypes.video,
            native: nativeBidRequests[0].mediaTypes.native
          },
          sizes: [],
          nativeOrtbRequest,
          bidder: 'sharethrough',
          params: {
            pkey: 111,
            equativNetworkId: 73
          },
          requestId: 'efgh5678',
          ortb2Imp: {
            ext: {
              tid: 'zsfgzzg',
            },
          },
          getFloor: ({ mediaType, size }) => {
            if ((mediaType === 'banner' && size[0] === 300 && size[1] === 250) || mediaType === 'native') {
              return { floor: 1.1 };
            }
            return { floor: 0.9 };
          }
        }
      ];

      bidderRequest = {
        refererInfo: {
          ref: 'https://referer.com',
        },
        ortb2: {
          source: {
            tid: 'auction-id',
          },
        },
        timeout: 242,
      };
    });

    afterEach(() => {
      setIsEqtvTest(null);
    })

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

          builtRequests.forEach((builtRequest, rIndex) => {
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

            // expect(openRtbReq.regs.gpp).to.equal(bidderRequest.gppConsent.gppString);
            // expect(openRtbReq.regs.gpp_sid).to.equal(bidderRequest.gppConsent.applicableSections);

            // expect(openRtbReq.regs.ext.gpp).to.equal(bidderRequest.ortb2.regs.gpp);
            // expect(openRtbReq.regs.ext.gpp_sid).to.equal(bidderRequest.ortb2.regs.gpp_sid);

            expect(openRtbReq.device.ua).to.equal(navigator.userAgent);
            expect(openRtbReq.regs.coppa).to.equal(1);

            expect(openRtbReq.source.tid).to.equal(bidderRequest.ortb2.source.tid);
            expect(openRtbReq.source.ext.version).not.to.be.undefined;
            expect(openRtbReq.source.ext.str).not.to.be.undefined;
            expect(openRtbReq.source.ext.schain).to.deep.equal(bidRequests[0].ortb2.source.ext.schain);

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

        it('should add ORTB2 device data to the request', () => {
          const bidderRequestWithOrtb2Device = {
            ...bidderRequest,
            ...{
              ortb2: {
                device: {
                  w: 980,
                  h: 1720,
                  dnt: 0,
                  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
                  language: 'en',
                  devicetype: 1,
                  make: 'Apple',
                  model: 'iPhone 12 Pro Max',
                  os: 'iOS',
                  osv: '17.4',
                },
              },
            },
          };

          const [request] = spec.buildRequests(bidRequests, bidderRequestWithOrtb2Device);

          expect(request.data.device.w).to.equal(bidderRequestWithOrtb2Device.ortb2.device.w);
          expect(request.data.device.h).to.equal(bidderRequestWithOrtb2Device.ortb2.device.h);
          expect(request.data.device.dnt).to.equal(bidderRequestWithOrtb2Device.ortb2.device.dnt);
          expect(request.data.device.ua).to.equal(bidderRequestWithOrtb2Device.ortb2.device.ua);
          expect(request.data.device.language).to.equal(bidderRequestWithOrtb2Device.ortb2.device.language);
          expect(request.data.device.devicetype).to.equal(bidderRequestWithOrtb2Device.ortb2.device.devicetype);
          expect(request.data.device.make).to.equal(bidderRequestWithOrtb2Device.ortb2.device.make);
          expect(request.data.device.model).to.equal(bidderRequestWithOrtb2Device.ortb2.device.model);
          expect(request.data.device.os).to.equal(bidderRequestWithOrtb2Device.ortb2.device.os);
          expect(request.data.device.osv).to.equal(bidderRequestWithOrtb2Device.ortb2.device.osv);
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
            expect(openRtbReq.regs.us_privacy).to.equal('consent');
          });
        });

        describe('coppa', () => {
          it('should populate request accordingly when coppa does not apply', () => {
            config.setConfig({ coppa: false });

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;

            expect(openRtbReq.regs.coppa).to.equal(0);
          });
        });

        describe('gpp', () => {
          it('should properly attach GPP information to the request when applicable', () => {
            bidderRequest.gppConsent = {
              gppString: 'some-gpp-string',
              applicableSections: [3, 5],
            };

            const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;
            expect(openRtbReq.regs.gpp).to.equal(bidderRequest.gppConsent.gppString);
            expect(openRtbReq.regs.gpp_sid).to.equal(bidderRequest.gppConsent.applicableSections);
          });

          it('should populate request accordingly when gpp explicitly does not apply', function () {
            const openRtbReq = spec.buildRequests(bidRequests, {})[0].data;

            expect(openRtbReq.regs.gpp).to.be.undefined;
          });
        });
      });

      describe('dsa', () => {
        it('should properly attach dsa information to the request when applicable', () => {
          bidderRequest.ortb2 = {
            regs: {
              ext: {
                dsa: {
                  'dsarequired': 1,
                  'pubrender': 0,
                  'datatopub': 1,
                  'transparency': [{
                    'domain': 'good-domain',
                    'dsaparams': [1, 2]
                  }, {
                    'domain': 'bad-setup',
                    'dsaparams': ['1', 3]
                  }]
                }
              }
            }
          }

          const openRtbReq = spec.buildRequests(bidRequests, bidderRequest)[0].data;
          expect(openRtbReq.regs.ext.dsa.dsarequired).to.equal(1);
          expect(openRtbReq.regs.ext.dsa.pubrender).to.equal(0);
          expect(openRtbReq.regs.ext.dsa.datatopub).to.equal(1);
          expect(openRtbReq.regs.ext.dsa.transparency).to.deep.equal([{
            'domain': 'good-domain',
            'dsaparams': [1, 2]
          }, {
            'domain': 'bad-setup',
            'dsaparams': ['1', 3]
          }]);
        });
      });

      describe('transaction id at the impression level', () => {
        it('should include transaction id when provided', () => {
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].ext.tid).to.equal('transaction-id-1');
          expect(requests[1].data.imp[0].ext).to.be.empty;
        });
      });

      describe('universal id', () => {
        it('should include gpid when universal id is provided', () => {
          const requests = spec.buildRequests(bidRequests, bidderRequest);

          expect(requests[0].data.imp[0].ext.gpid).to.equal('universal-id');
          expect(requests[1].data.imp[0].ext).to.be.empty;
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
          expect(bannerImp.format).to.deep.equal([
            { w: 300, h: 250 },
            { w: 300, h: 600 },
          ]);
        });

        it('should correctly harvest battr values for banner if present in mediaTypes.banner of impression and battr is not defined in ortb2Imp.banner', () => {
          // assemble
          const EXPECTED_BATTR_VALUES = [6, 7];

          // act
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
          const ACTUAL_BATTR_VALUES = builtRequest.data.imp[0].banner.battr

          // assert
          expect(ACTUAL_BATTR_VALUES).to.deep.equal(EXPECTED_BATTR_VALUES);
        });

        it('should not include battr values for banner if NOT present in mediaTypes.banner of impression and battr is not defined in ortb2Imp.banner', () => {
          // assemble
          delete bidRequests[0].mediaTypes.banner.battr;

          // act
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];

          // assert
          expect(builtRequest.data.imp[0].banner.battr).to.be.undefined;
        });

        it('should prefer battr values from mediaTypes.banner over ortb2Imp.banner', () => {
          // assemble
          deepSetValue(bidRequests[0], 'ortb2Imp.banner.battr', [1, 2, 3]);
          const EXPECTED_BATTR_VALUES = [6, 7]; // values from mediaTypes.banner

          // act
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
          const ACTUAL_BATTR_VALUES = builtRequest.data.imp[0].banner.battr

          // assert
          expect(ACTUAL_BATTR_VALUES).to.deep.equal(EXPECTED_BATTR_VALUES);
        });

        it('should use battr values from ortb2Imp.banner if mediaTypes.banner.battr is not present', () => {
          // assemble
          delete bidRequests[0].mediaTypes.banner.battr;
          const EXPECTED_BATTR_VALUES = [1, 2, 3];
          deepSetValue(bidRequests[0], 'ortb2Imp.banner.battr', EXPECTED_BATTR_VALUES);

          // act
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
          const ACTUAL_BATTR_VALUES = builtRequest.data.imp[0].banner.battr

          // assert
          expect(ACTUAL_BATTR_VALUES).to.deep.equal(EXPECTED_BATTR_VALUES);
        });

        it('should default to pos 0 if not provided', () => {
          delete bidRequests[0].mediaTypes.banner.pos;
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
          expect(videoImp.linearity).to.equal(1);
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
          expect(videoImp.battr).to.deep.equal([13, 14]);
          expect(videoImp.companiontype).to.equal('companion type');
          expect(videoImp.companionad).to.equal('companion ad');
        });

        it('should set defaults in some circumstances if no value provided', () => {
          delete bidRequests[1].mediaTypes.video.pos;
          delete bidRequests[1].mediaTypes.video.playerSize;

          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];

          const videoImp = builtRequest.data.imp[0].video;
          expect(videoImp.pos).to.equal(0);
          expect(videoImp.w).to.equal(640);
          expect(videoImp.h).to.equal(360);
        });

        it('should not set values in some circumstances when non-valid values are supplied', () => {
          // arrange
          bidRequests[1].mediaTypes.video.api = 1; // non-array value, will not be used
          bidRequests[1].mediaTypes.video.battr = undefined; // non-array value, will not be used
          bidRequests[1].mediaTypes.video.mimes = 'video/3gpp'; // non-array value, will not be used
          bidRequests[1].mediaTypes.video.playbackmethod = null; // non-array value, will not be used
          bidRequests[1].mediaTypes.video.protocols = []; // empty array, will not be used

          // act
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];
          const videoImp = builtRequest.data.imp[0].video;

          // assert
          expect(videoImp.api).to.be.undefined;
          expect(videoImp.battr).to.be.undefined;
          expect(videoImp.mimes).to.be.undefined;
          expect(videoImp.playbackmethod).to.be.undefined;
          expect(videoImp.protocols).to.be.undefined;
        });

        it('should not set a property if no corresponding property is detected on mediaTypes.video', () => {
          // arrange
          const propertiesToConsider = [
            'api', 'battr', 'companionad', 'companiontype', 'delivery', 'linearity', 'maxduration', 'mimes', 'minduration', 'placement', 'playbackmethod', 'plcmt', 'protocols', 'skip', 'skipafter', 'skipmin', 'startdelay'
          ]

          // act
          propertiesToConsider.forEach(propertyToConsider => {
            delete bidRequests[1].mediaTypes.video[propertyToConsider];
          });
          const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];
          const videoImp = builtRequest.data.imp[0].video;

          // assert
          propertiesToConsider.forEach(propertyToConsider => {
            expect(videoImp[propertyToConsider]).to.be.undefined;
          });
        });

        describe('outstream', () => {
          it('should use placement value if provided', () => {
            bidRequests[1].mediaTypes.video.context = 'outstream';
            bidRequests[1].mediaTypes.video.placement = 3;

            const builtRequest = spec.buildRequests(bidRequests, bidderRequest)[1];
            const videoImp = builtRequest.data.imp[0].video;

            expect(videoImp.placement).to.equal(3);
          });
        });
      });

      describe('cookie deprecation', () => {
        it('should not add cdep if we do not get it in an impression request', () => {
          const builtRequests = spec.buildRequests(bidRequests, {
            auctionId: 'new-auction-id',
            ortb2: {
              device: {
                ext: {
                  propThatIsNotCdep: 'value-we-dont-care-about',
                },
              },
            },
          });
          const noCdep = builtRequests.every((builtRequest) => {
            const ourCdepValue = builtRequest.data.device?.ext?.cdep;
            return ourCdepValue === undefined;
          });
          expect(noCdep).to.be.true;
        });

        it('should add cdep if we DO get it in an impression request', () => {
          const builtRequests = spec.buildRequests(bidRequests, {
            auctionId: 'new-auction-id',
            ortb2: {
              device: {
                ext: {
                  cdep: 'cdep-value',
                },
              },
            },
          });
          const cdepPresent = builtRequests.every((builtRequest) => {
            return builtRequest.data.device.ext.cdep === 'cdep-value';
          });
          expect(cdepPresent).to.be.true;
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
          bcat: ['IAB1', 'IAB2-1'],
          badv: ['domain1.com', 'domain2.com'],
          regs: {
            gpp: 'gpp_string',
            gpp_sid: [7],
          },
        };

        it('should include first party data in open rtb request, site section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: firstPartyData })[0].data;

          expect(openRtbReq.site.name).to.equal(firstPartyData.site.name);
          expect(openRtbReq.site.keywords).to.equal(firstPartyData.site.keywords);
          expect(openRtbReq.site.search).to.equal(firstPartyData.site.search);
          expect(openRtbReq.site.content).to.deep.equal(firstPartyData.site.content);
          expect(openRtbReq.site.ext).to.deep.equal(firstPartyData.site.ext);
        });

        it('should include first party data in open rtb request, user section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: firstPartyData })[0].data;

          expect(openRtbReq.user.yob).to.equal(firstPartyData.user.yob);
          expect(openRtbReq.user.gender).to.equal(firstPartyData.user.gender);
          expect(openRtbReq.user.ext.data).to.deep.equal(firstPartyData.user.ext.data);
          expect(openRtbReq.user.ext.eids).not.to.be.undefined;
        });

        it('should include first party data in open rtb request, ORTB blocked section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: firstPartyData })[0].data;

          expect(openRtbReq.bcat).to.deep.equal(firstPartyData.bcat);
          expect(openRtbReq.badv).to.deep.equal(firstPartyData.badv);
        });

        it('should include first party data in open rtb request, regulation section', () => {
          const openRtbReq = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: firstPartyData })[0].data;

          expect(openRtbReq.regs.ext.gpp).to.equal(firstPartyData.regs.gpp);
          expect(openRtbReq.regs.ext.gpp_sid).to.equal(firstPartyData.regs.gpp_sid);
        });
      });

      describe('fledge', () => {
        it('should attach "ae" as a property to the request if 1) fledge auctions are enabled, and 2) request is display (only supporting display for now)', () => {
          // ASSEMBLE
          const EXPECTED_AE_VALUE = 1;

          // ACT
          bidderRequest.paapi = { enabled: true };
          const builtRequests = spec.buildRequests(bidRequests, bidderRequest);
          const ACTUAL_AE_VALUE = builtRequests[0].data.imp[0].ext.ae;

          // ASSERT
          expect(ACTUAL_AE_VALUE).to.equal(EXPECTED_AE_VALUE);
          expect(builtRequests[1].data.imp[0].ext.ae).to.be.undefined;
        });
      });

      describe('isEqtvTest', () => {
        it('should set publisher id if equativNetworkId param is present', () => {
          const builtRequest = spec.buildRequests(multiImpBidRequests, bidderRequest)[0]
          expect(builtRequest.data.site.publisher.id).to.equal(73)
        })

        it('should not set publisher id if equativNetworkId param is not present', () => {
          const bidRequest = {
            ...bidRequests[0],
            params: {
              ...bidRequests[0].params,
              equativNetworkId: undefined
            }
          }

          const builtRequest = spec.buildRequests([bidRequest], bidderRequest)[0]
          expect(builtRequest.data.site.publisher).to.equal(undefined)
        })

        it('should generate a 14-char id for each imp object', () => {
          const request = spec.buildRequests(
            bannerBidRequests,
            bidderRequest
          );

          request[0].data.imp.forEach(imp => {
            expect(imp.id).to.have.lengthOf(14);
          });
        });

        it('should split banner sizes per floor', () => {
          const bids = [
            {
              ...bannerBidRequests[0],
              getFloor: ({ size }) => ({ floor: size[0] * size[1] / 100_000 })
            }
          ];

          const request = spec.buildRequests(
            bids,
            bidderRequest
          );

          expect(request[0].data.imp).to.have.lengthOf(2);

          const firstImp = request[0].data.imp[0];
          expect(firstImp.bidfloor).to.equal(300 * 250 / 100_000);
          expect(firstImp.banner.format).to.have.lengthOf(1);
          expect(firstImp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });

          const secondImp = request[0].data.imp[1];
          expect(secondImp.bidfloor).to.equal(300 * 600 / 100_000);
          expect(secondImp.banner.format).to.have.lengthOf(1);
          expect(secondImp.banner.format[0]).to.deep.equal({ w: 300, h: 600 });
        });

        //   it('should group media types per floor', () => {
        //     const request = spec.buildRequests(
        //       multiImpBidRequests,
        //       bidderRequest
        //     );

        //     const firstImp = request[0].data.imp[0];

        //     expect(firstImp.banner.format).to.have.lengthOf(1);
        //     expect(firstImp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });
        //     expect(firstImp).to.have.property('native');
        //     expect(firstImp).to.not.have.property('video');

        //     const secondImp = request[0].data.imp[1];

        //     expect(secondImp.banner.format).to.have.lengthOf(1);
        //     expect(secondImp.banner.format[0]).to.deep.equal({ w: 300, h: 600 });
        //     expect(secondImp).to.not.have.property('native');
        //     expect(secondImp).to.have.property('video');
        //   });
      })

      it('should return correct native properties from ORTB converter', () => {
        if (FEATURES.NATIVE) {
          const request = spec.buildRequests(nativeBidRequests, {})[0];
          const assets = JSON.parse(request.data.imp[0].native.request).assets;

          const asset1 = assets[0];
          expect(asset1.id).to.equal(0);
          expect(asset1.required).to.equal(1);
          expect(asset1.title).to.deep.equal({ 'len': 140 });

          const asset2 = assets[1];
          expect(asset2.id).to.equal(1);
          expect(asset2.required).to.equal(1);
          expect(asset2.img).to.deep.equal({ 'type': 3, 'w': 300, 'h': 600 });

          const asset3 = assets[2];
          expect(asset3.id).to.equal(2);
          expect(asset3.required).to.equal(1);
          expect(asset3.data).to.deep.equal({ 'type': 1 })
        }
      })
    });

    describe('interpretResponse', function () {
      let request;
      let response;

      describe('banner', () => {
        beforeEach(() => {
          request = spec.buildRequests(bidRequests, bidderRequest)[0];
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: '123',
                      impid: 'bidId1',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                    },
                    {
                      id: '456',
                      impid: 'bidId2',
                      w: 640,
                      h: 480,
                      price: 42,
                      adm: 'vastTag',
                    },
                  ],
                },
              ],
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

        it('should set requestId from impIdMap when isEqtvTest is true', () => {
          setIsEqtvTest(true);
          request = spec.buildRequests(bannerBidRequests, bidderRequest)[0]
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: 'abcd1234',
                      impid: 'aaaabbbbccccdd',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                    },
                  ],
                },
              ],
            },
          };

          const impIdMap = getImpIdMap();
          impIdMap['aaaabbbbccccdd'] = 'abcd1234'

          const resp = spec.interpretResponse(response, request)[0];

          expect(resp.requestId).to.equal('abcd1234')
        })

        it('should set ttl when bid.exp is a number > 0', () => {
          request = spec.buildRequests(bannerBidRequests, bidderRequest)[0]
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: 'abcd1234',
                      impid: 'aaaabbbbccccdd',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                      exp: 100
                    },
                  ],
                },
              ],
            },
          };

          const resp = spec.interpretResponse(response, request)[0];
          expect(resp.ttl).to.equal(100);
        })

        it('should set ttl to 360 when bid.exp is a number <= 0', () => {
          request = spec.buildRequests(bannerBidRequests, bidderRequest)[0]
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: 'abcd1234',
                      impid: 'aaaabbbbccccdd',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                      exp: -1
                    },
                  ],
                },
              ],
            },
          };

          const resp = spec.interpretResponse(response, request)[0];
          expect(resp.ttl).to.equal(360);
        })

        it('should return correct properties when fledgeAuctionEnabled is true and isEqtvTest is false', () => {
          request = spec.buildRequests(bidRequests, bidderRequest)[0]
          response = {
            body: {
              ext: {
                auctionConfigs: {
                  key: 'value'
                }
              },
              seatbid: [
                {
                  bid: [
                    {
                      id: 'abcd1234',
                      impid: 'aaaabbbbccccdd',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                      exp: -1
                    },
                    {
                      id: 'efgh5678',
                      impid: 'ddeeeeffffgggg',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                      exp: -1
                    },
                  ],
                },
              ],
            },
          };

          const resp = spec.interpretResponse(response, request);
          expect(resp.bids.length).to.equal(2);
          expect(resp.paapi).to.deep.equal({ 'key': 'value' })
        })
      });

      describe('video', () => {
        beforeEach(() => {
          request = spec.buildRequests(bidRequests, bidderRequest)[1];
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: '456',
                      impid: 'bidId2',
                      w: 640,
                      h: 480,
                      price: 42,
                      adm: 'vastTag',
                    },
                  ],
                },
              ],
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

      describe('native', () => {
        beforeEach(() => {
          request = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: '456',
                      impid: 'bidId2',
                      w: 640,
                      h: 480,
                      price: 42,
                      adm: '{"ad": "ad"}',
                    },
                  ],
                },
              ],
            },
          };
        });

        it('should set correct ortb property', () => {
          const resp = spec.interpretResponse(response, request)[0];

          expect(resp.native.ortb).to.deep.equal({ 'ad': 'ad' })
        })
      })

      describe('meta object', () => {
        beforeEach(() => {
          request = spec.buildRequests(bidRequests, bidderRequest)[0];
          response = {
            body: {
              seatbid: [
                {
                  bid: [
                    {
                      id: '123',
                      impid: 'bidId1',
                      w: 300,
                      h: 250,
                      price: 42,
                      crid: 'creative',
                      dealid: 'deal',
                      adomain: ['domain.com'],
                      adm: 'markup',
                    },
                  ],
                },
              ],
            },
          };
        });

        it("should have null optional fields when the response's optional seatbid[].bid[].ext field is empty", () => {
          const bid = spec.interpretResponse(response, request)[0];

          expect(bid.meta.networkId).to.be.null;
          expect(bid.meta.networkName).to.be.null;
          expect(bid.meta.agencyId).to.be.null;
          expect(bid.meta.agencyName).to.be.null;
          expect(bid.meta.advertiserId).to.be.null;
          expect(bid.meta.advertiserName).to.be.null;
          expect(bid.meta.brandId).to.be.null;
          expect(bid.meta.brandName).to.be.null;
          expect(bid.meta.demandSource).to.be.null;
          expect(bid.meta.dchain).to.be.null;
          expect(bid.meta.primaryCatId).to.be.null;
          expect(bid.meta.secondaryCatIds).to.be.null;
          expect(bid.meta.mediaType).to.be.null;
        });

        it("should have populated fields when the response's optional seatbid[].bid[].ext fields are filled", () => {
          response.body.seatbid[0].bid[0].ext = {
            networkId: 'my network id',
            networkName: 'my network name',
            agencyId: 'my agency id',
            agencyName: 'my agency name',
            advertiserId: 'my advertiser id',
            advertiserName: 'my advertiser name',
            brandId: 'my brand id',
            brandName: 'my brand name',
            demandSource: 'my demand source',
            dchain: { 'my key': 'my value' },
            primaryCatId: 'my primary cat id',
            secondaryCatIds: ['my', 'secondary', 'cat', 'ids'],
            mediaType: 'my media type',
          };

          const bid = spec.interpretResponse(response, request)[0];

          expect(bid.meta.networkId).to.equal('my network id');
          expect(bid.meta.networkName).to.equal('my network name');
          expect(bid.meta.agencyId).to.equal('my agency id');
          expect(bid.meta.agencyName).to.equal('my agency name');
          expect(bid.meta.advertiserId).to.equal('my advertiser id');
          expect(bid.meta.advertiserName).to.equal('my advertiser name');
          expect(bid.meta.brandId).to.equal('my brand id');
          expect(bid.meta.brandName).to.equal('my brand name');
          expect(bid.meta.demandSource).to.equal('my demand source');
          expect(bid.meta.dchain).to.deep.equal({ 'my key': 'my value' });
          expect(bid.meta.primaryCatId).to.equal('my primary cat id');
          expect(bid.meta.secondaryCatIds).to.deep.equal(['my', 'secondary', 'cat', 'ids']);
          expect(bid.meta.mediaType).to.equal('my media type');
        });
      });
    });

    describe('getUserSyncs', function () {
      const cookieSyncs = ['cookieUrl1', 'cookieUrl2', 'cookieUrl3'];
      const serverResponses = [{ body: { cookieSyncUrls: cookieSyncs } }];
      let handleCookieSyncStub;

      const SAMPLE_RESPONSE = {
        body: {
          id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
          seatbid: [
            {
              bid: [
                {
                  id: '1bh7jku7-ko2g-8654-ab72-h268shvwy271',
                  impid: 'r12gwgf231',
                  price: 0.6565,
                  adm: '<h1>AD</h1>',
                  adomain: ['abc.com'],
                  cid: '1242512',
                  crid: '535231',
                  w: 300,
                  h: 600,
                  mtype: 1,
                  cat: ['IAB19', 'IAB19-1'],
                  cattax: 1,
                },
              ],
              seat: '4212',
            },
          ],
          cur: 'USD',
          statuscode: 0,
        },
      };

      beforeEach(() => {
        handleCookieSyncStub = sinon.stub(equativUtils, 'handleCookieSync');
      });
      afterEach(() => {
        handleCookieSyncStub.restore();
      });

      it('should call handleCookieSync with correct parameters and return its result', () => {
        setIsEqtvTest(true);

        const expectedResult = [
          { type: 'iframe', url: 'https://sync.example.com' },
        ];

        handleCookieSyncStub.returns(expectedResult)

        const result = spec.getUserSyncs({ iframeEnabled: true },
          SAMPLE_RESPONSE,
          { gdprApplies: true, vendorData: { vendor: { consents: {} } } });

        sinon.assert.calledWithMatch(
          handleCookieSyncStub,
          { iframeEnabled: true },
          SAMPLE_RESPONSE,
          { gdprApplies: true, vendorData: { vendor: { consents: {} } } },
          sinon.match.number,
          sinon.match.object
        );

        expect(result).to.deep.equal(expectedResult);
      });

      it('should not call handleCookieSync and return undefined when isEqtvTest is false', () => {
        setIsEqtvTest(false);

        spec.getUserSyncs({}, {}, {});

        sinon.assert.notCalled(handleCookieSyncStub);
      });

      it('returns an array of correctly formatted user syncs', function () {
        const syncArray = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
        expect(syncArray).to.deep.equal([
          { type: 'image', url: 'cookieUrl1' },
          { type: 'image', url: 'cookieUrl2' },
          { type: 'image', url: 'cookieUrl3' },
        ]);
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
