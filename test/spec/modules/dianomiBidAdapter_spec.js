// jshint esversion: 6, es3: false, node: true
import { assert } from 'chai';
import { spec } from 'modules/dianomiBidAdapter.js';
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

describe('Dianomi adapter', () => {
  let bids = [];

  describe('isBidRequestValid', () => {
    let bid = {
      bidder: 'dianomi',
      params: {
        smartadId: 1234,
      },
    };

    it('should return true when required params found', () => {
      assert(spec.isBidRequestValid(bid));
      bid.params = {
        smartadId: 4332,
      };
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', () => {
      bid.params = {};
      assert.isFalse(spec.isBidRequestValid(bid));

      bid.params = {
        smartadId: null,
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', () => {
    beforeEach(() => {
      config.resetConfig();
    });
    it('should send request with correct structure', () => {
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
        },
      ];
      let request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://www-prebid.dianomi.com/cgi-bin/smartads_prebid.pl');
      assert.ok(request.data);
    });

    describe('user privacy', () => {
      it('should send GDPR Consent data to Dianomi if gdprApplies', () => {
        let validBidRequests = [{ bidId: 'bidId', params: { smartadId: 1234 } }];
        let bidderRequest = {
          gdprConsent: { gdprApplies: true, consentString: 'consentDataString' },
          refererInfo: { page: 'page' },
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.regs.ext.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.regs.ext.gdpr, 'number');
      });

      it('should send gdpr as number', () => {
        let validBidRequests = [{ bidId: 'bidId', params: { smartadId: 1234 } }];
        let bidderRequest = {
          gdprConsent: { gdprApplies: true, consentString: 'consentDataString' },
          refererInfo: { page: 'page' },
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(typeof request.regs.ext.gdpr, 'number');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should send CCPA Consent data to dianomi', () => {
        let validBidRequests = [{ bidId: 'bidId', params: { smartadId: 1234 } }];
        let bidderRequest = { uspConsent: '1YA-', refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');

        bidderRequest = {
          uspConsent: '1YA-',
          gdprConsent: { gdprApplies: true, consentString: 'consentDataString' },
          refererInfo: { page: 'page' },
        };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');
        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should not send GDPR Consent data to dianomi if gdprApplies is undefined', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
          },
        ];
        let bidderRequest = {
          gdprConsent: { gdprApplies: false, consentString: 'consentDataString' },
          refererInfo: { page: 'page' },
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 0);

        bidderRequest = {
          gdprConsent: { consentString: 'consentDataString' },
          refererInfo: { page: 'page' },
        };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
      it('should send default GDPR Consent data to dianomi', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
          },
        ];
        let request = JSON.parse(
          spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
        );

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
    });

    it('should have default request structure', () => {
      let keys = 'site,device,source,ext,imp'.split(',');
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
        },
      ];
      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      );
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should set request keys correct values', () => {
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
          transactionId: 'transactionId',
        },
      ];
      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      );

      assert.equal(request.source.tid, validBidRequests[0].transactionId);
      assert.equal(request.source.fd, 1);
    });

    it('should send info about device', () => {
      config.setConfig({
        device: { w: 100, h: 100 },
      });
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
        },
      ];
      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      );

      assert.equal(request.device.ua, navigator.userAgent);
      assert.equal(request.device.w, 100);
      assert.equal(request.device.h, 100);
    });

    it('should send app info', () => {
      config.setConfig({
        app: { id: 'appid' },
      });
      const ortb2 = { app: { name: 'appname' } };
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
          ortb2
        },
      ];
      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 }).data
      );

      assert.equal(request.app.id, 'appid');
      assert.equal(request.app.name, 'appname');
      assert.equal(request.site, undefined);
    });

    it('should send info about the site', () => {
      config.setConfig({
        site: {
          id: '123123',
          publisher: {
            domain: 'publisher.domain.com',
          },
        },
      });
      const ortb2 = {
        site: {
          publisher: {
            name: "publisher's name",
          },
        },
      }
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
          ortb2
        },
      ];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo, ortb2 }).data);

      assert.deepEqual(request.site, {
        page: refererInfo.page,
        publisher: {
          domain: 'publisher.domain.com',
          name: "publisher's name",
        },
        id: '123123',
      });
    });

    it('should pass extended ids', () => {
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
          userIdAsEids: createEidsArray({
            tdid: 'TTD_ID_FROM_USER_ID_MODULE',
            pubcid: 'pubCommonId_FROM_USER_ID_MODULE',
          }),
        },
      ];

      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      );
      assert.deepEqual(request.user.ext.eids, [
        {
          source: 'adserver.org',
          uids: [{ id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: { rtiPartner: 'TDID' } }],
        },
        { source: 'pubcid.org', uids: [{ id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1 }] },
      ]);
    });

    it('should send currency if defined', () => {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      let validBidRequests = [{ params: { smartadId: 1234 } }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo }).data);

      assert.deepEqual(request.cur, ['EUR']);
    });

    it('should pass supply chain object', () => {
      let validBidRequests = [
        {
          bidId: 'bidId',
          params: { smartadId: 1234 },
          schain: {
            validation: 'strict',
            config: {
              ver: '1.0',
            },
          },
        },
      ];

      let request = JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      );
      assert.deepEqual(request.source.ext.schain, {
        validation: 'strict',
        config: {
          ver: '1.0',
        },
      });
    });

    describe('priceType', () => {
      it('should send default priceType', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
          },
        ];
        let request = JSON.parse(
          spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
        );

        assert.equal(request.ext.pt, 'net');
      });
      it('should send correct priceType value', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
          },
        ];
        let request = JSON.parse(
          spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
        );

        assert.equal(request.ext.pt, 'net');
      });
    });

    describe('bids', () => {
      it('should add more than one bid to the request', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
          },
          {
            bidId: 'bidId2',
            params: { smartadId: 1234 }
          },
        ];
        let request = JSON.parse(
          spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
        );

        assert.equal(request.imp.length, 2);
      });
      it('should add incrementing values of id', () => {
        let validBidRequests = [
          {
            bidId: 'bidId',
            params: { smartadId: 1234 },
            mediaTypes: { video: {} },
          },
          {
            bidId: 'bidId2',
            params: { smartadId: 1234 },
            mediaTypes: { video: {} },
          },
          {
            bidId: 'bidId3',
            params: { smartadId: 1234 },
            mediaTypes: { video: {} },
          },
        ];
        let imps = JSON.parse(
          spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
        ).imp;

        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].id, i + 1);
        }
      });

      describe('price floors', () => {
        it('should not add if floors module not configured', () => {
          const validBidRequests = [
            { bidId: 'bidId', params: { smartadId: 1234 }, mediaTypes: { video: {} } },
          ];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, undefined);
        });

        it('should not add if floor price not defined', () => {
          const validBidRequests = [getBidWithFloor()];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'USD');
        });

        it('should request floor price in adserver currency', () => {
          config.setConfig({ currency: { adServerCurrency: 'GBP' } });
          const validBidRequests = [getBidWithFloor()];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'GBP');
        });

        it('should add correct floor values', () => {
          const expectedFloors = [1, 1.3, 0.5];
          const validBidRequests = expectedFloors.map(getBidWithFloor);
          let imps = getRequestImps(validBidRequests);

          expectedFloors.forEach((floor, index) => {
            assert.equal(imps[index].bidfloor, floor);
            assert.equal(imps[index].bidfloorcur, 'USD');
          });
        });

        function getBidWithFloor(floor) {
          return {
            params: { smartadId: 1234 },
            mediaTypes: { video: {} },
            getFloor: ({ currency }) => {
              return {
                currency: currency,
                floor,
              };
            },
          };
        }
      });

      describe('multiple media types', () => {
        it('should use all configured media types for bidding', () => {
          let validBidRequests = [
            {
              bidId: 'bidId',
              params: { smartadId: 1234 },
              mediaTypes: {
                banner: {
                  sizes: [
                    [100, 100],
                    [200, 300],
                  ],
                },
                video: {},
              },
            },
            {
              bidId: 'bidId1',
              params: { smartadId: 1234 },
              mediaTypes: {
                video: {},
                native: {},
              },
            },
            {
              bidId: 'bidId2',
              params: { smartadId: 1234 },
              nativeParams: {
                title: { required: true, len: 140 },
              },
              mediaTypes: {
                banner: {
                  sizes: [
                    [100, 100],
                    [200, 300],
                  ],
                },
                native: {},
                video: {},
              },
            },
          ];
          let [first, second, third] = JSON.parse(
            spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
          ).imp;

          assert.ok(first.banner);
          assert.ok(first.video);
          assert.equal(first.native, undefined);

          assert.ok(second.video);
          assert.equal(second.banner, undefined);
          assert.equal(second.native, undefined);

          assert.ok(third.native);
          assert.ok(third.video);
          assert.ok(third.banner);
        });
      });

      describe('banner', () => {
        it('should convert sizes to openrtb format', () => {
          let validBidRequests = [
            {
              bidId: 'bidId',
              params: { smartadId: 1234 },
              mediaTypes: {
                banner: {
                  sizes: [
                    [100, 100],
                    [200, 300],
                  ],
                },
              },
            },
          ];
          let { banner } = JSON.parse(
            spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
          ).imp[0];
          assert.deepEqual(banner, {
            format: [
              { w: 100, h: 100 },
              { w: 200, h: 300 },
            ],
          });
        });
      });

      describe('video', () => {
        it('should pass video mediatype config', () => {
          let validBidRequests = [
            {
              bidId: 'bidId',
              params: { smartadId: 1234 },
              mediaTypes: {
                video: {
                  playerSize: [640, 480],
                  context: 'outstream',
                  mimes: ['video/mp4'],
                },
              },
            },
          ];
          let { video } = JSON.parse(
            spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
          ).imp[0];
          assert.deepEqual(video, {
            playerSize: [640, 480],
            context: 'outstream',
            mimes: ['video/mp4'],
          });
        });
      });

      describe('native', () => {
        describe('assets', () => {
          it('should set correct asset id', () => {
            let validBidRequests = [
              {
                bidId: 'bidId',
                params: { smartadId: 1234 },
                nativeParams: {
                  title: { required: true, len: 140 },
                  image: {
                    required: false,
                    wmin: 836,
                    hmin: 627,
                    w: 325,
                    h: 300,
                    mimes: ['image/jpg', 'image/gif'],
                  },
                  body: { len: 140 },
                },
              },
            ];
            let assets = JSON.parse(
              spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
            ).imp[0].native.assets;

            assert.equal(assets[0].id, 0);
            assert.equal(assets[1].id, 3);
            assert.equal(assets[2].id, 4);
          });
          it('should add required key if it is necessary', () => {
            let validBidRequests = [
              {
                bidId: 'bidId',
                params: { smartadId: 1234 },
                nativeParams: {
                  title: { required: true, len: 140 },
                  image: {
                    required: false,
                    wmin: 836,
                    hmin: 627,
                    w: 325,
                    h: 300,
                    mimes: ['image/jpg', 'image/gif'],
                  },
                  body: { len: 140 },
                  sponsoredBy: { required: true, len: 140 },
                },
              },
            ];

            let assets = JSON.parse(
              spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
            ).imp[0].native.assets;

            assert.equal(assets[0].required, 1);
            assert.ok(!assets[1].required);
            assert.ok(!assets[2].required);
            assert.equal(assets[3].required, 1);
          });

          it('should map img and data assets', () => {
            let validBidRequests = [
              {
                bidId: 'bidId',
                params: { smartadId: 1234 },
                nativeParams: {
                  title: { required: true, len: 140 },
                  image: { required: true, sizes: [150, 50] },
                  icon: { required: false, sizes: [50, 50] },
                  body: { required: false, len: 140 },
                  sponsoredBy: { required: true },
                  cta: { required: false },
                  clickUrl: { required: false },
                },
              },
            ];

            let assets = JSON.parse(
              spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
            ).imp[0].native.assets;
            assert.ok(assets[0].title);
            assert.equal(assets[0].title.len, 140);
            assert.deepEqual(assets[1].img, { type: 3, w: 150, h: 50 });
            assert.deepEqual(assets[2].img, { type: 1, w: 50, h: 50 });
            assert.deepEqual(assets[3].data, { type: 2, len: 140 });
            assert.deepEqual(assets[4].data, { type: 1 });
            assert.deepEqual(assets[5].data, { type: 12 });
            assert.ok(!assets[6]);
          });

          describe('icon/image sizing', () => {
            it('should flatten sizes and utilise first pair', () => {
              const validBidRequests = [
                {
                  bidId: 'bidId',
                  params: { smartadId: 1234 },
                  nativeParams: {
                    image: {
                      sizes: [
                        [200, 300],
                        [100, 200],
                      ],
                    },
                  },
                },
              ];

              let assets = JSON.parse(
                spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
              ).imp[0].native.assets;
              assert.ok(assets[0].img);
              assert.equal(assets[0].img.w, 200);
              assert.equal(assets[0].img.h, 300);
            });
          });

          it('should utilise aspect_ratios', () => {
            const validBidRequests = [
              {
                bidId: 'bidId',
                params: { smartadId: 1234 },
                nativeParams: {
                  image: {
                    aspect_ratios: [
                      {
                        min_width: 100,
                        ratio_height: 3,
                        ratio_width: 1,
                      },
                    ],
                  },
                  icon: {
                    aspect_ratios: [
                      {
                        min_width: 10,
                        ratio_height: 5,
                        ratio_width: 2,
                      },
                    ],
                  },
                },
              },
            ];

            let assets = JSON.parse(
              spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
            ).imp[0].native.assets;
            assert.ok(assets[0].img);
            assert.equal(assets[0].img.wmin, 100);
            assert.equal(assets[0].img.hmin, 300);

            assert.ok(assets[1].img);
            assert.equal(assets[1].img.wmin, 10);
            assert.equal(assets[1].img.hmin, 25);
          });

          it('should not throw error if aspect_ratios config is not defined', () => {
            const validBidRequests = [
              {
                bidId: 'bidId',
                params: { smartadId: 1234 },
                nativeParams: {
                  image: {
                    aspect_ratios: [],
                  },
                  icon: {
                    aspect_ratios: [],
                  },
                },
              },
            ];

            assert.doesNotThrow(() =>
              spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })
            );
          });
        });
      });
    });

    function getRequestImps(validBidRequests) {
      return JSON.parse(
        spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data
      ).imp;
    }
  });

  describe('interpretResponse', () => {
    it('should return if no body in response', () => {
      let serverResponse = {};
      let bidRequest = {};

      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });
    it('should return more than one bids', () => {
      let serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: '1',
                  native: {
                    ver: '1.1',
                    link: { url: 'link' },
                    assets: [{ id: 1, title: { text: 'Asset title text' } }],
                  },
                },
              ],
            },
            {
              bid: [
                {
                  impid: '2',
                  native: {
                    ver: '1.1',
                    link: { url: 'link' },
                    assets: [{ id: 1, data: { value: 'Asset title text' } }],
                  },
                },
              ],
            },
          ],
        },
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
          {
            bidId: 'bidId2',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
        ],
      };

      bids = spec.interpretResponse(serverResponse, bidRequest);
      assert.equal(spec.interpretResponse(serverResponse, bidRequest).length, 2);
    });

    it('should parse seatbids', () => {
      let serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: '1',
                  native: {
                    ver: '1.1',
                    link: { url: 'link1' },
                    assets: [{ id: 1, title: { text: 'Asset title text' } }],
                  },
                },
                {
                  impid: '4',
                  native: {
                    ver: '1.1',
                    link: { url: 'link4' },
                    assets: [{ id: 1, title: { text: 'Asset title text' } }],
                  },
                },
              ],
            },
            {
              bid: [
                {
                  impid: '2',
                  native: {
                    ver: '1.1',
                    link: { url: 'link2' },
                    assets: [{ id: 1, data: { value: 'Asset title text' } }],
                  },
                },
              ],
            },
          ],
        },
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
          {
            bidId: 'bidId2',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
          {
            bidId: 'bidId3',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
          {
            bidId: 'bidId4',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
        ],
      };

      bids = spec.interpretResponse(serverResponse, bidRequest).map((bid) => {
        const {
          requestId,
          native: { clickUrl },
        } = bid;
        return [requestId, clickUrl];
      });

      assert.equal(bids.length, 3);
      assert.deepEqual(bids, [
        ['bidId1', 'link1'],
        ['bidId2', 'link2'],
        ['bidId4', 'link4'],
      ]);
    });

    it('should set correct values to bid', () => {
      let serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [
            {
              bid: [
                {
                  impid: '1',
                  price: 93.1231,
                  crid: '12312312',
                  native: {
                    assets: [],
                    link: { url: 'link' },
                    imptrackers: ['imptrackers url1', 'imptrackers url2'],
                  },
                  dealid: 'deal-id',
                  adomain: ['demo.com'],
                  ext: {
                    prebid: {
                      type: 'native',
                    },
                  },
                },
              ],
            },
          ],
          cur: 'USD',
        },
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { smartadId: 1234 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: {
                required: false,
                wmin: 836,
                hmin: 627,
                w: 325,
                h: 300,
                mimes: ['image/jpg', 'image/gif'],
              },
              body: { len: 140 },
            },
          },
        ],
      };

      const bids = spec.interpretResponse(serverResponse, bidRequest);
      const bid = serverResponse.body.seatbid[0].bid[0];
      assert.deepEqual(bids[0].requestId, bidRequest.bids[0].bidId);
      assert.deepEqual(bids[0].cpm, bid.price);
      assert.deepEqual(bids[0].creativeId, bid.crid);
      assert.deepEqual(bids[0].ttl, 360);
      assert.deepEqual(bids[0].netRevenue, false);
      assert.deepEqual(bids[0].currency, serverResponse.body.cur);
      assert.deepEqual(bids[0].mediaType, 'native');
      assert.deepEqual(bids[0].meta.mediaType, 'native');
      assert.deepEqual(bids[0].meta.advertiserDomains, ['demo.com']);
      assert.deepEqual(bids[0].dealId, 'deal-id');
    });
    it('should set correct native params', () => {
      const bid = [
        {
          impid: '1',
          price: 93.1231,
          crid: '12312312',
          native: {
            assets: [
              {
                data: null,
                id: 0,
                img: null,
                required: 0,
                title: { text: 'title', len: null },
                video: null,
              },
              {
                data: null,
                id: 2,
                img: { type: null, url: 'test.url.com/Files/58345/308185.jpg?bv=1', w: 30, h: 10 },
                required: 0,
                title: null,
                video: null,
              },
              {
                data: null,
                id: 3,
                img: {
                  type: null,
                  url: 'test.url.com/Files/58345/308200.jpg?bv=1',
                  w: 100,
                  h: 100,
                },
                required: 0,
                title: null,
                video: null,
              },
              {
                data: { type: null, len: null, value: 'body' },
                id: 4,
                img: null,
                required: 0,
                title: null,
                video: null,
              },
              {
                data: { type: null, len: null, value: 'cta' },
                id: 1,
                img: null,
                required: 0,
                title: null,
                video: null,
              },
              {
                data: { type: null, len: null, value: 'sponsoredBy' },
                id: 5,
                img: null,
                required: 0,
                title: null,
                video: null,
              },
            ],
            link: { url: 'clickUrl', clicktrackers: ['clickTracker1', 'clickTracker2'] },
            imptrackers: ['imptrackers url1', 'imptrackers url2'],
            jstracker: 'jstracker',
          },
        },
      ];
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid }],
          cur: 'USD',
        },
      };
      let bidRequest = {
        data: {},
        bids: [{ bidId: 'bidId1' }],
      };

      const result = spec.interpretResponse(serverResponse, bidRequest)[0].native;
      const native = bid[0].native;
      const assets = native.assets;
      assert.deepEqual(
        {
          clickUrl: native.link.url,
          clickTrackers: native.link.clicktrackers,
          impressionTrackers: native.imptrackers,
          javascriptTrackers: [native.jstracker],
          title: assets[0].title.text,
          icon: { url: assets[1].img.url, width: assets[1].img.w, height: assets[1].img.h },
          image: { url: assets[2].img.url, width: assets[2].img.w, height: assets[2].img.h },
          body: assets[3].data.value,
          cta: assets[4].data.value,
          sponsoredBy: assets[5].data.value,
        },
        result
      );
    });
    it('should return empty when there is no bids in response', () => {
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid: [] }],
          cur: 'USD',
        },
      };
      let bidRequest = {
        data: {},
        bids: [{ bidId: 'bidId1' }],
      };
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.ok(!result);
    });

    describe('banner', () => {
      it('should set ad content on response', () => {
        let serverResponse = {
          body: {
            seatbid: [
              {
                bid: [{ impid: '1', adm: '<banner>', ext: { prebid: { type: 'banner' } } }],
              },
            ],
          },
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { smartadId: 1234 },
            },
          ],
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].ad, '<banner>');
        assert.equal(bids[0].mediaType, 'banner');
        assert.equal(bids[0].meta.mediaType, 'banner');
      });
    });

    describe('video', () => {
      it('should set vastXml on response', () => {
        let serverResponse = {
          body: {
            seatbid: [
              {
                bid: [{ impid: '1', adm: '<vast>', ext: { prebid: { type: 'video' } } }],
              },
            ],
          },
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { smartadId: 1234 },
            },
          ],
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].vastXml, '<vast>');
        assert.equal(bids[0].mediaType, 'video');
        assert.equal(bids[0].meta.mediaType, 'video');
      });

      it('should add renderer for outstream bids', () => {
        let serverResponse = {
          body: {
            seatbid: [
              {
                bid: [
                  { impid: '1', adm: '<vast>', ext: { prebid: { type: 'video' } } },
                  { impid: '2', adm: '<vast>', ext: { prebid: { type: 'video' } } },
                ],
              },
            ],
          },
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { smartadId: 1234 },
              mediaTypes: {
                video: {
                  context: 'outstream',
                },
              },
            },
            {
              bidId: 'bidId2',
              params: { smartadId: 1234 },
              mediaTypes: {
                video: {
                  constext: 'instream',
                },
              },
            },
          ],
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.ok(bids[0].renderer);
        assert.equal(bids[1].renderer, undefined);
      });
    });
  });
});
