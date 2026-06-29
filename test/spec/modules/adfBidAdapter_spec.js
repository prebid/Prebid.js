// jshint esversion: 6, es3: false, node: true

import { assert } from 'chai';
import { spec } from 'modules/adfBidAdapter.js';
import { config } from 'src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import 'modules/priceFloors.js';

describe('Adf adapter', function () {
  let bids = [];

  describe('backwards-compatibility', function () {
    it('should have adformOpenRTB alias defined', function () {
      assert.equal(spec.aliases[0].code, 'adformOpenRTB');
      assert.equal(spec.aliases[0].gvlid, 50);
    });

    it('should have adform alias defined', function () {
      assert.equal(spec.aliases[1].code, 'adform');
      assert.equal(spec.aliases[1].gvlid, 50);
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'adformOpenRTB',
      'params': {
        'mid': '19910113'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));

      bid.params = {
        inv: 1234,
        mname: 'some-placement'
      };
      assert(spec.isBidRequestValid(bid));

      bid.params = {
        mid: 4332,
        inv: 1234,
        mname: 'some-placement'
      };
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params = { adxDomain: 'adx.adform.net' };
      assert.isFalse(spec.isBidRequestValid(bid));

      bid.params = {
        mname: 'some-placement'
      };
      assert.isFalse(spec.isBidRequestValid(bid));

      bid.params = {
        inv: 1234
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('should send request with correct structure', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: {
          adxDomain: 'adx2.adform.net',
        }
      }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://adx2.adform.net/adx/openrtb');
      assert.equal(request.options, undefined);
      assert.ok(request.data);
    });

    it('should use default adxDomain when not specified', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: 1 }
      }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      assert.equal(request.url, 'https://adx.adform.net/adx/openrtb');
    });

    describe('user privacy', function () {
      it('should send GDPR Consent data to adform', function () {
        const validBidRequests = [{ bidId: 'bidId', params: { mid: 1 } }];
        const ortb2 = {
          regs: {
            ext: {
              gdpr: 1
            }
          },
          user: {
            ext: {
              consent: 'consentDataString'
            }
          }
        };
        const bidderRequest = { ortb2, refererInfo: { page: 'page' } };
        const request = spec.buildRequests(validBidRequests, bidderRequest).data;

        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should send CCPA Consent data to adform', function () {
        const validBidRequests = [{ bidId: 'bidId', params: { mid: 1 } }];
        const ortb2 = {
          regs: {
            ext: {
              us_privacy: '1YA-'
            }
          }
        };
        let bidderRequest = { ortb2, refererInfo: { page: 'page' } };
        let request = spec.buildRequests(validBidRequests, bidderRequest).data;

        assert.equal(request.regs.ext.us_privacy, '1YA-');

        ortb2.regs.ext.gdpr = 1;
        ortb2.user = { ext: { consent: 'consentDataString' } };

        bidderRequest = { ortb2, refererInfo: { page: 'page' } };
        request = spec.buildRequests(validBidRequests, bidderRequest).data;

        assert.equal(request.regs.ext.us_privacy, '1YA-');
        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should transfer DSA info', function () {
        const validBidRequests = [{ bidId: 'bidId', params: { mid: 1 } }];

        const request = spec.buildRequests(validBidRequests, {
          refererInfo: { page: 'page' },
          ortb2: {
            regs: {
              ext: {
                dsa: {
                  dsarequired: '1',
                  pubrender: '2',
                  datatopub: '3',
                  transparency: [
                    {
                      domain: 'test.com',
                      dsaparams: [1, 2, 3]
                    }
                  ]
                }
              }
            }
          }
        }).data;

        assert.deepEqual(request.regs.ext, {
          dsa: {
            dsarequired: '1',
            pubrender: '2',
            datatopub: '3',
            transparency: [
              {
                domain: 'test.com',
                dsaparams: [1, 2, 3]
              }
            ]
          }
        });
      });
    });

    it('should have source and ext on request', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: 1 }
      }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data;
      const data = Object.keys(request);

      assert.include(data, 'source');
      assert.include(data, 'ext');
      assert.include(data, 'imp');
    });

    it('should set request keys correct values', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: 1 },
      }];
      const request = spec.buildRequests(validBidRequests, {
        refererInfo: { page: 'page' },
        ortb2: { source: { tid: 'tid' } }
      }).data;

      assert.equal(request.source.tid, 'tid');
      assert.equal(request.source.fd, 1);
    });

    it('should send coppa flag', function () {
      const ortb2 = { regs: { coppa: 1 } };
      const validBidRequests = [{ bidId: 'bidId', params: { mid: 1 } }];
      const request = spec.buildRequests(validBidRequests, { ortb2, refererInfo: { page: 'page' } }).data;

      assert.equal(request.regs.coppa, 1);
    });

    it('should send info about device', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' }
      }];
      const ortb2 = { device: { ua: 'customUA', h: 100, w: 100, geo: { lat: 1, lon: 1 } } };
      const request = spec.buildRequests(validBidRequests, { ortb2, refererInfo: { page: 'page' } }).data;

      assert.equal(request.device.ua, 'customUA');
      assert.equal(request.device.w, 100);
      assert.equal(request.device.h, 100);
      assert.deepEqual(request.device.geo, { lat: 1, lon: 1 });
    });

    it('should send app info', function () {
      const ortb2 = { app: { id: 'appid', name: 'appname' } };
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' },
        ortb2
      }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 }).data;

      assert.equal(request.app.id, 'appid');
      assert.equal(request.app.name, 'appname');
      assert.equal(request.site, undefined);
    });

    it('should send info about the site from ortb2', function () {
      const ortb2 = {
        site: {
          id: '123123',
          page: 'page',
          publisher: {
            domain: 'publisher.domain.com',
            name: 'publisher\'s name'
          }
        }
      };
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' },
      }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 }).data;

      assert.equal(request.site.id, '123123');
      assert.equal(request.site.page, 'page');
      assert.equal(request.site.publisher.domain, 'publisher.domain.com');
      assert.equal(request.site.publisher.name, 'publisher\'s name');
    });

    it('should pass extended ids from ortb2', function () {
      const eids = [
        { source: 'adserver.org', uids: [{ id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: { rtiPartner: 'TDID' } }] },
        { source: 'pubcid.org', uids: [{ id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1 }] }
      ];
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: 1 },
      }];

      const request = spec.buildRequests(validBidRequests, {
        refererInfo: { page: 'page' },
        ortb2: { user: { ext: { eids } } }
      }).data;
      assert.deepEqual(request.user.ext.eids, eids);
    });

    it('should send currency if defined', function () {
      const validBidRequests = [{ bidId: 'bidId', params: { mid: 1 } }];
      const refererInfo = { page: 'page' };
      const bidderRequest = { refererInfo };
      setCurrencyConfig({ adServerCurrency: 'EUR' });
      return addFPDToBidderRequest(bidderRequest).then(res => {
        const request = spec.buildRequests(validBidRequests, res).data;
        assert.deepEqual(request.cur, ['EUR']);
        setCurrencyConfig({});
      });
    });

    it('should pass supply chain object', function () {
      const ortb2 = {
        source: {
          ext: {
            schain: {
              validation: 'strict',
              config: {
                ver: '1.0'
              }
            }
          }
        }
      };
      const validBidRequests = [{
        bidId: 'bidId',
        params: { mid: 1 }
      }];

      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 }).data;
      assert.deepEqual(request.source.ext.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    describe('priceType', function () {
      it('should send default priceType', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data;

        assert.equal(request.ext.pt, 'net');
      });
      it('should send correct priceType value', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { priceType: 'net' }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data;

        assert.equal(request.ext.pt, 'net');
      });
      it('should send gross priceType when configured', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1, pt: 'gross' }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data;

        assert.equal(request.ext.pt, 'gross');
      });
    });

    describe('bids', function () {
      it('should add more than one bid to the request', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 }
        }, {
          bidId: 'bidId2',
          params: { mid: 2 }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data;

        assert.equal(request.imp.length, 2);
      });
      it('should use bidId as imp id', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: '1000' },
        }, {
          bidId: 'bidId2',
          params: { mid: '1000' },
        }, {
          bidId: 'bidId3',
          params: { mid: '1000' },
        }];
        const imps = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp;

        assert.equal(imps[0].id, 'bidId');
        assert.equal(imps[1].id, 'bidId2');
        assert.equal(imps[2].id, 'bidId3');
      });

      it('should add mid as tagid', function () {
        const validBidRequests = [
          { bidId: 'bidId', params: { mid: 1000 } },
          { bidId: 'bidId2', params: { mid: 1001 } },
          { bidId: 'bidId3', params: { mid: 1002 } }
        ];
        const imps = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp;
        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].tagid, validBidRequests[i].params.mid);
        }
      });

      it('should merge ortb2Imp.ext properties', function () {
        const validBidRequests = [
          { bidId: 'bidId', params: { mid: 1000 }, ortb2Imp: { ext: { some: 'value' } } },
          { bidId: 'bidId2', params: { mid: 1001 }, ortb2Imp: { ext: { some: 'value', another: 1 } } },
          { bidId: 'bidId3', params: { mid: 1002 }, ortb2Imp: { ext: {} } }
        ];
        const imps = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp;
        assert.equal(imps[0].ext.some, 'value');
        assert.equal(imps[1].ext.some, 'value');
        assert.equal(imps[1].ext.another, 1);
      });

      describe('dynamic placement tag', function () {
        it('should set ext.bidder with inv/mname when mid is not provided', function () {
          const validBidRequests = [
            { bidId: 'bidId1', params: { inv: 1000, mname: 'placement' } },
            { bidId: 'bidId2', params: { mid: 1234 } }
          ];
          const [imp1, imp2] = getRequestImps(validBidRequests);

          assert.equal(imp1.ext.bidder.inv, 1000);
          assert.equal(imp1.ext.bidder.mname, 'placement');
          assert.equal('tagid' in imp1, false);

          assert.equal(imp2.tagid, 1234);
          assert.equal(imp2.ext?.bidder, undefined);
        });
      });

      if (FEATURES.VIDEO) {
        describe('multiple media types', function () {
          it('should use all configured media types for bidding', function () {
            const validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              mediaTypes: {
                banner: {
                  sizes: [[100, 100], [200, 300]]
                },
                video: {
                  mimes: ['video/mp4']
                }
              }
            }, {
              bidId: 'bidId1',
              params: { mid: 1000 },
              mediaTypes: {
                video: {
                  mimes: ['video/mp4']
                }
              }
            }, {
              bidId: 'bidId2',
              params: { mid: 1000 },
              nativeOrtbRequest: {
                assets: [
                  {
                    required: 1,
                    id: 0,
                    title: {
                      len: 140
                    }
                  }
                ]
              },
              mediaTypes: {
                banner: {
                  sizes: [[100, 100], [200, 300]]
                },
                native: {},
                video: {
                  mimes: ['video/mp4']
                }
              }
            }];
            const [first, second, third] = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp;

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
      }

      describe('banner', function () {
        it('should convert sizes to openrtb format', function () {
          const validBidRequests = [{
            bidId: 'bidId',
            params: { mid: 1000 },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              }
            }
          }];
          const { banner } = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
          assert.deepEqual(banner.format, [{ w: 100, h: 100 }, { w: 200, h: 300 }]);
        });
      });

      if (FEATURES.VIDEO) {
        describe('video', function () {
          it('should pass video mediatype config', function () {
            const validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              mediaTypes: {
                video: {
                  playerSize: [640, 480],
                  context: 'outstream',
                  mimes: ['video/mp4']
                }
              }
            }];
            const { video } = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
            assert.equal(video.w, 640);
            assert.equal(video.h, 480);
            assert.deepEqual(video.mimes, ['video/mp4']);
          });
        });
      }

      if (FEATURES.NATIVE) {
        describe('native', function () {
          describe('assets', function () {
            it('should use nativeOrtbRequest for native imp', function () {
              const validBidRequests = [{
                bidId: 'bidId',
                params: { mid: 1000 },
                mediaTypes: {
                  native: {}
                },
                nativeOrtbRequest: {
                  assets: [
                    { required: 1, title: { len: 200 } },
                    { required: 1, img: { type: 3, w: 170, h: 70 } },
                    { required: 0, img: { type: 1, w: 70, h: 70 } },
                    { required: 0, data: { type: 2, len: 150 } },
                    { required: 1, data: { type: 1 } },
                    { required: 0, data: { type: 12 } },
                  ]
                }
              }];

              const nativeRequest = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0].native.request;
              const assets = JSON.parse(nativeRequest).assets;
              assert.ok(assets[0].title);
              assert.equal(assets[0].title.len, 200);
              assert.deepEqual(assets[1].img, { type: 3, w: 170, h: 70 });
              assert.deepEqual(assets[2].img, { type: 1, w: 70, h: 70 });
              assert.deepEqual(assets[3].data, { type: 2, len: 150 });
              assert.deepEqual(assets[4].data, { type: 1 });
              assert.deepEqual(assets[5].data, { type: 12 });
              assert.ok(!assets[6]);
            });

            it('should set correct asset id', function () {
              const validBidRequests = [{
                bidId: 'bidId',
                params: { mid: 1000 },
                mediaTypes: { native: {} },
                nativeOrtbRequest: {
                  assets: [
                    { id: 0, required: 1, title: { len: 140 } },
                    { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] } },
                    { id: 2, data: { type: 2, len: 140 } }
                  ]
                }
              }];

              const nativeRequest = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0].native.request;
              const assets = JSON.parse(nativeRequest).assets;

              assert.equal(assets[0].id, 0);
              assert.equal(assets[1].id, 1);
              assert.equal(assets[2].id, 2);
            });

            it('should add required key if it is necessary', function () {
              const validBidRequests = [{
                bidId: 'bidId',
                params: { mid: 1000 },
                mediaTypes: { native: {} },
                nativeOrtbRequest: {
                  assets: [
                    { required: 1, title: { len: 140 } },
                    { required: 0, img: { type: 3, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] } },
                    { data: { type: 2, len: 140 } },
                    { required: 1, data: { type: 1, len: 140 } }
                  ]
                }
              }];
              const nativeRequest = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0].native.request;
              const assets = JSON.parse(nativeRequest).assets;

              assert.equal(assets[0].required, 1);
              assert.ok(!assets[1].required);
              assert.ok(!assets[2].required);
              assert.equal(assets[3].required, 1);
            });

            it('should map img and data assets', function () {
              const validBidRequests = [{
                bidId: 'bidId',
                params: { mid: 1000 },
                mediaTypes: { native: {} },
                nativeOrtbRequest: {
                  assets: [
                    { required: 1, title: { len: 140 } },
                    { required: 1, img: { type: 3, w: 150, h: 50 } },
                    { required: 0, img: { type: 1, w: 50, h: 50 } },
                    { required: 0, data: { type: 2, len: 140 } },
                    { required: 1, data: { type: 1 } },
                    { required: 0, data: { type: 12 } },
                  ]
                }
              }];

              const nativeRequest = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0].native.request;
              const assets = JSON.parse(nativeRequest).assets;
              assert.ok(assets[0].title);
              assert.equal(assets[0].title.len, 140);
              assert.deepEqual(assets[1].img, { type: 3, w: 150, h: 50 });
              assert.deepEqual(assets[2].img, { type: 1, w: 50, h: 50 });
              assert.deepEqual(assets[3].data, { type: 2, len: 140 });
              assert.deepEqual(assets[4].data, { type: 1 });
              assert.deepEqual(assets[5].data, { type: 12 });
              assert.ok(!assets[6]);
            });
          });
        });
      }
    });

    describe('price floors', function () {
      it('should set bidfloor and bidfloorcur when getFloor returns valid floor', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          getFloor: () => ({ currency: 'USD', floor: 1.23 })
        }];
        const imp = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
        assert.equal(imp.bidfloor, 1.23);
        assert.equal(imp.bidfloorcur, 'USD');
      });

      it('should not set bidfloor when getFloor returns undefined floor', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          getFloor: () => ({ currency: 'USD', floor: undefined })
        }];
        const imp = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
        assert.equal(imp.bidfloor, undefined);
        assert.equal(imp.bidfloorcur, undefined);
      });

      it('should not set bidfloor when getFloor is not a function', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }];
        const imp = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
        assert.equal(imp.bidfloor, undefined);
        assert.equal(imp.bidfloorcur, undefined);
      });

      it('should request floor in adserver currency', function () {
        config.setConfig({ currency: { adServerCurrency: 'DKK' } });
        const calls = [];
        const validBidRequests = [{
          bidId: 'bidId',
          params: { mid: 1 },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          getFloor: (params) => {
            calls.push(params);
            return { currency: 'DKK', floor: 5.0 };
          }
        }];
        const imp = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data.imp[0];
        const mainFloorCall = calls.find(c => c.mediaType === '*');
        assert.ok(mainFloorCall, 'should have a call with mediaType *');
        assert.equal(mainFloorCall.currency, 'DKK');
        assert.equal(mainFloorCall.size, '*');
        assert.equal(imp.bidfloor, 5.0);
        assert.equal(imp.bidfloorcur, 'DKK');
        config.resetConfig();
      });
    });

    function getRequestImps(validBidRequests, enriched = {}) {
      return spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ...enriched }).data.imp;
    }
  });

  describe('interpretResponse', function () {
    it('should return if no body in response', function () {
      const serverResponse = {};
      const bidRequest = { data: {} };

      const result = spec.interpretResponse(serverResponse, bidRequest);
      assert.deepEqual(result, []);
    });

    it('should set ad content on banner response', function () {
      const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { banner: { sizes: [[300, 250]] } } }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{ impid: 'bidId1', adm: '<banner>', ext: { prebid: { type: 'banner' } } }]
          }]
        }
      };

      bids = spec.interpretResponse(serverResponse, request);
      assert.equal(bids.length, 1);
      assert.equal(bids[0].ad, '<banner>');
      assert.equal(bids[0].mediaType, 'banner');
      assert.equal(bids[0].meta.mediaType, 'banner');
    });

    it('should set correct values to bid', function () {
      const validBidRequests = [
        { bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { banner: { sizes: [[300, 250]] } } }
      ];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [
              {
                impid: 'bidId1',
                price: 93.1231,
                crid: '12312312',
                adm: '<banner>',
                dealid: 'deal-id',
                adomain: ['demo.com'],
                ext: {
                  prebid: {
                    type: 'banner',
                  },
                  dsa: {
                    behalf: 'some-behalf',
                    paid: 'some-paid',
                    transparency: [{
                      domain: 'test.com',
                      dsaparams: [1, 2, 3]
                    }],
                    adrender: 1
                  }
                },
                cat: ['IAB1', 'IAB2']
              }
            ]
          }],
          cur: 'NOK'
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      const bid = serverResponse.body.seatbid[0].bid[0];
      assert.deepEqual(bids[0].requestId, 'bidId1');
      assert.deepEqual(bids[0].cpm, bid.price);
      assert.deepEqual(bids[0].creativeId, bid.crid);
      assert.deepEqual(bids[0].ttl, 360);
      assert.deepEqual(bids[0].netRevenue, true);
      assert.deepEqual(bids[0].currency, serverResponse.body.cur);
      assert.deepEqual(bids[0].mediaType, 'banner');
      assert.deepEqual(bids[0].meta.mediaType, 'banner');
      assert.deepEqual(bids[0].meta.primaryCatId, 'IAB1');
      assert.deepEqual(bids[0].meta.secondaryCatIds, ['IAB2']);
      assert.deepEqual(bids[0].meta.advertiserDomains, ['demo.com']);
      assert.deepEqual(bids[0].meta.dsa, {
        behalf: 'some-behalf',
        paid: 'some-paid',
        transparency: [{
          domain: 'test.com',
          dsaparams: [1, 2, 3]
        }],
        adrender: 1
      });
      assert.deepEqual(bids[0].dealId, 'deal-id');
    });

    it('should return empty when there is no bids in response', function () {
      const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { banner: { sizes: [[300, 250]] } } }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid: [] }],
          cur: 'NOK'
        }
      };
      const result = spec.interpretResponse(serverResponse, request);
      assert.equal(result.length, 0);
    });

    it('should return empty when seatbid is missing', function () {
      const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { banner: { sizes: [[300, 250]] } } }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      const serverResponse = {
        body: {
          id: 'responseId',
          cur: 'USD'
        }
      };
      const result = spec.interpretResponse(serverResponse, request);
      assert.equal(result.length, 0);
    });

    it('should set netRevenue to false when priceType is gross', function () {
      const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000, pt: 'gross' }, mediaTypes: { banner: { sizes: [[300, 250]] } } }];
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{ impid: 'bidId1', price: 1.5, adm: '<banner>', ext: { prebid: { type: 'banner' } } }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      assert.equal(bids[0].netRevenue, false);
    });

    if (FEATURES.NATIVE) {
      describe('native', function () {
        it('should return more than one bid', function () {
          const validBidRequests = [
            { bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } },
            { bidId: 'bidId2', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } }
          ];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{
                bid: [{ impid: 'bidId1', adm: JSON.stringify({ assets: [{ id: 0, title: { text: 'text' } }], link: { url: 'link' } }), ext: { prebid: { type: 'native' } } }]
              }, {
                bid: [{ impid: 'bidId2', adm: JSON.stringify({ assets: [{ id: 0, title: { text: 'text' } }], link: { url: 'link' } }), ext: { prebid: { type: 'native' } } }]
              }]
            }
          };

          bids = spec.interpretResponse(serverResponse, request);
          assert.equal(bids.length, 2);
        });

        it('should parse seatbids', function () {
          const validBidRequests = [
            { bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } },
            { bidId: 'bidId2', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } },
            { bidId: 'bidId3', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } },
            { bidId: 'bidId4', params: { mid: 1000 }, mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] } }
          ];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{
                bid: [
                  { impid: 'bidId1', adm: JSON.stringify({ assets: [{ id: 0, title: { text: 'text' } }], link: { url: 'link1' } }), ext: { prebid: { type: 'native' } } },
                  { impid: 'bidId4', adm: JSON.stringify({ assets: [{ id: 0, title: { text: 'text' } }], link: { url: 'link4' } }), ext: { prebid: { type: 'native' } } }
                ]
              }, {
                bid: [{ impid: 'bidId2', adm: JSON.stringify({ assets: [{ id: 0, title: { text: 'text' } }], link: { url: 'link2' } }), ext: { prebid: { type: 'native' } } }]
              }]
            }
          };

          bids = spec.interpretResponse(serverResponse, request).map(bid => {
            const { requestId, native: { ortb: { link: { url } } } } = bid;
            return [requestId, url];
          });

          assert.equal(bids.length, 3);
          assert.deepEqual(bids, [['bidId1', 'link1'], ['bidId4', 'link4'], ['bidId2', 'link2']]);
        });

        it('should set correct native params', function () {
          const nativePayload = {
            ver: '1.1',
            assets: [{
              id: 1,
              required: 0,
              title: { text: 'Native' }
            }, {
              id: 3,
              required: 0,
              data: { value: 'Adform' }
            }, {
              id: 2,
              required: 0,
              data: { value: 'Native banner' }
            }, {
              id: 4,
              required: 0,
              data: { value: 'Brand' }
            }, {
              id: 5,
              required: 0,
              img: { url: 'test.url.com/icon.jpg', w: 30, h: 10 }
            }, {
              id: 0,
              required: 0,
              img: { url: 'test.url.com/image.jpg?bv=1', w: 300, h: 300 }
            }],
            link: {
              url: 'clickUrl', clicktrackers: ['clickTracker1', 'clickTracker2']
            },
            imptrackers: ['imptracker url1', 'imptracker url2'],
            jstracker: 'jstracker'
          };

          const validBidRequests = [{
            bidId: 'bidId1',
            params: { mid: 1000 },
            mediaTypes: { native: {} },
            nativeOrtbRequest: { assets: [{ id: 0, required: 1, title: { len: 140 } }] }
          }];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{ bid: [{ impid: 'bidId1', adm: JSON.stringify(nativePayload), ext: { prebid: { type: 'native' } } }] }],
              cur: 'NOK'
            }
          };

          const result = spec.interpretResponse(serverResponse, request)[0].native;
          assert.deepEqual(result, { ortb: nativePayload });
        });
      });
    }

    if (FEATURES.VIDEO) {
      describe('video', function () {
        it('should set vastXml on response', function () {
          const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { video: { mimes: ['video/mp4'] } } }];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{
                bid: [{ impid: 'bidId1', adm: '<vast>', ext: { prebid: { type: 'video' } } }]
              }]
            }
          };

          bids = spec.interpretResponse(serverResponse, request);
          assert.equal(bids.length, 1);
          assert.equal(bids[0].vastXml, '<vast>');
          assert.equal(bids[0].mediaType, 'video');
          assert.equal(bids[0].meta.mediaType, 'video');
        });

        it('should set vastUrl if nurl is present in response', function () {
          const vastUrl = 'http://url.to/vast';
          const validBidRequests = [{ bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { video: { mimes: ['video/mp4'] } } }];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{
                bid: [{ impid: 'bidId1', adm: '<vast>', nurl: vastUrl, ext: { prebid: { type: 'video' } } }]
              }]
            }
          };

          bids = spec.interpretResponse(serverResponse, request);
          assert.equal(bids.length, 1);
          assert.equal(bids[0].vastUrl, vastUrl);
          assert.equal(bids[0].mediaType, 'video');
          assert.equal(bids[0].meta.mediaType, 'video');
        });

        it('should add renderer for outstream bids', function () {
          const validBidRequests = [
            { bidId: 'bidId1', params: { mid: 1000 }, mediaTypes: { video: { context: 'outstream', mimes: ['video/mp4'] } } },
            { bidId: 'bidId2', params: { mid: 1000 }, mediaTypes: { video: { context: 'instream', mimes: ['video/mp4'] } } }
          ];
          const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

          const serverResponse = {
            body: {
              seatbid: [{
                bid: [
                  { impid: 'bidId1', adm: '<vast>', ext: { prebid: { type: 'video' } } },
                  { impid: 'bidId2', adm: '<vast>', ext: { prebid: { type: 'video' } } }
                ]
              }]
            }
          };

          bids = spec.interpretResponse(serverResponse, request);
          assert.ok(bids[0].renderer);
          assert.equal(bids[1].renderer, undefined);
        });
      });
    }
  });
});
