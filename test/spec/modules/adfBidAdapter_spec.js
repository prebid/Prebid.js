// jshint esversion: 6, es3: false, node: true
/* eslint-disable no-console */
import { assert } from 'chai';
import { spec } from 'modules/adfBidAdapter.js';
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

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
    let bid = {
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
      let validBidRequests = [{
        bidId: 'bidId',
        params: {
          adxDomain: '10.8.57.207'
        }
      }];
      let request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://10.8.57.207/adx/openrtb');
      assert.equal(request.options, undefined);
      assert.ok(request.data);
    });

    describe('user privacy', function () {
      it('should send GDPR Consent data to adform if gdprApplies', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.regs.ext.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.regs.ext.gdpr, 'number');
      });

      it('should send gdpr as number', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(typeof request.regs.ext.gdpr, 'number');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should send CCPA Consent data to adform', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { uspConsent: '1YA-', refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');

        bidderRequest = { uspConsent: '1YA-', gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');
        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should not send GDPR Consent data to adform if gdprApplies is undefined', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let bidderRequest = { gdprConsent: {gdprApplies: false, consentString: 'consentDataString'}, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 0);

        bidderRequest = {gdprConsent: {consentString: 'consentDataString'}, refererInfo: { page: 'page' }};
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
      it('should send default GDPR Consent data to adform', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });

      it('should transfer DSA info', function () {
        let validBidRequests = [ { bidId: 'bidId', params: { siteId: 'siteId' } } ];

        let request = JSON.parse(
          spec.buildRequests(validBidRequests, {
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
          }).data
        );

        assert.deepEqual(request.regs, {
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
        });
      });
    });

    it('should add test and is_debug to request, if test is set in parameters', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { test: 1 }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

      assert.ok(request.is_debug);
      assert.equal(request.test, 1);
    });

    it('should have default request structure', function () {
      let keys = 'site,device,source,ext,imp'.split(',');
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should set request keys correct values', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { siteId: 'siteId' },
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {
        refererInfo: {page: 'page'},
        ortb2: {source: {tid: 'tid'}}
      }).data);

      assert.equal(request.source.tid, 'tid');
      assert.equal(request.source.fd, 1);
    });

    it('should not set coppa when coppa is not provided or is set to false', function () {
      config.setConfig({
      });
      let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
      let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
      let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

      assert.equal(request.regs.coppa, undefined);

      config.setConfig({
        coppa: false
      });
      request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

      assert.equal(request.regs.coppa, undefined);
    });

    it('should set coppa to 1 when coppa is provided with value true', function () {
      config.setConfig({
        coppa: true
      });
      let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

      assert.equal(request.regs.coppa, 1);
    });

    it('should send info about device', function () {
      config.setConfig({
        device: { w: 100, h: 100 }
      });
      let validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

      assert.equal(request.device.ua, navigator.userAgent);
      assert.equal(request.device.w, 100);
      assert.equal(request.device.h, 100);
    });

    it('should send app info', function () {
      config.setConfig({
        app: { id: 'appid' },
      });
      const ortb2 = { app: { name: 'appname' } };
      let validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' },
        ortb2
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 }).data);

      assert.equal(request.app.id, 'appid');
      assert.equal(request.app.name, 'appname');
      assert.equal(request.site, undefined);
    });

    it('should send info about the site', function () {
      config.setConfig({
        site: {
          id: '123123',
          publisher: {
            domain: 'publisher.domain.com'
          }
        },
      });
      const ortb2 = {
        site: {
          publisher: {
            name: 'publisher\'s name'
          }
        }
      };
      let validBidRequests = [{
        bidId: 'bidId',
        params: { mid: '1000' },
        ortb2
      }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo, ortb2 }).data);

      assert.deepEqual(request.site, {
        page: refererInfo.page,
        publisher: {
          domain: 'publisher.domain.com',
          name: 'publisher\'s name'
        },
        id: '123123'
      });
    });

    it('should pass extended ids', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {},
        userIdAsEids: [
          { source: 'adserver.org', uids: [ { id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: { rtiPartner: 'TDID' } } ] },
          { source: 'pubcid.org', uids: [ { id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1 } ] }
        ]
      }];

      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);
      assert.deepEqual(request.user.ext.eids, validBidRequests[0].userIdAsEids);
    });

    it('should send currency if defined', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      let validBidRequests = [{ params: {} }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo }).data);

      assert.deepEqual(request.cur, [ 'EUR' ]);
    });

    it('should pass supply chain object', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {},
        schain: {
          validation: 'strict',
          config: {
            ver: '1.0'
          }
        }
      }];

      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);
      assert.deepEqual(request.source.ext.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    describe('priceType', function () {
      it('should send default priceType', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

        assert.equal(request.ext.pt, 'net');
      });
      it('should send correct priceType value', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { priceType: 'net' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

        assert.equal(request.ext.pt, 'net');
      });
    });

    describe('bids', function () {
      it('should add more than one bid to the request', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { siteId: 'siteId' }
        }, {
          bidId: 'bidId2',
          params: { siteId: 'siteId' }
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data);

        assert.equal(request.imp.length, 2);
      });
      it('should add incrementing values of id', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: { mid: '1000' },
          mediaTypes: {video: {}}
        }, {
          bidId: 'bidId2',
          params: { mid: '1000' },
          mediaTypes: {video: {}}
        }, {
          bidId: 'bidId3',
          params: { mid: '1000' },
          mediaTypes: {video: {}}
        }];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp;

        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].id, i + 1);
        }
      });

      it('should add mid', function () {
        let validBidRequests = [{ bidId: 'bidId', params: {mid: 1000}, mediaTypes: {video: {}} },
          { bidId: 'bidId2', params: {mid: 1001}, mediaTypes: {video: {}} },
          { bidId: 'bidId3', params: {mid: 1002}, mediaTypes: {video: {}} }];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp;
        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].tagid, validBidRequests[i].params.mid);
        }
      });

      it('should add first party data', function () {
        let validBidRequests = [
          { bidId: 'bidId', params: { mid: 1000 }, mediaTypes: { video: {} }, ortb2Imp: { ext: { data: { some: 'value' } } } },
          { bidId: 'bidId2', params: { mid: 1001 }, mediaTypes: { video: {} }, ortb2Imp: { ext: { data: { some: 'value', another: 1 } } } },
          { bidId: 'bidId3', params: { mid: 1002 }, mediaTypes: { video: {} }, ortb2Imp: { ext: {} } }
        ];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp;
        for (let i = 0; i < 3; i++) {
          assert.deepEqual(imps[i].ext.data, validBidRequests[i].ortb2Imp.ext.data);
        }
      });

      describe('dynamic placement tag', function () {
        it('should add imp parameters correctly', function () {
          const validBidRequests = [
            { bidId: 'bidId', params: { inv: 1000, mname: 'placement' }, mediaTypes: {video: {}} },
            { bidId: 'bidId', params: { mid: 1234, inv: 1002, mname: 'placement2' }, mediaTypes: {video: {}} },
            { bidId: 'bidId', params: { mid: 1234 }, mediaTypes: {video: {}} }
          ];
          const [ imp1, imp2, imp3 ] = getRequestImps(validBidRequests);

          assert.equal(imp1.ext.bidder.inv, 1000);
          assert.equal(imp1.ext.bidder.mname, 'placement');
          assert.equal('tagid' in imp1, false);

          assert.equal(imp2.ext.bidder.inv, 1002);
          assert.equal(imp2.ext.bidder.mname, 'placement2');
          assert.equal(imp2.tagid, 1234);

          assert.ok(imp3.ext.bidder);
          assert.equal('inv' in imp3.ext.bidder, false);
          assert.equal('mname' in imp3.ext.bidder, false);
          assert.equal(imp3.tagid, 1234);
        });
      });

      describe('price floors', function () {
        it('should not add if floors module not configured', function () {
          const validBidRequests = [{ bidId: 'bidId', params: {mid: 1000}, mediaTypes: {video: {}} }];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, undefined);
        });

        it('should not add if floor price not defined', function () {
          const validBidRequests = [ getBidWithFloor() ];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'USD');
        });

        it('should request floor price in adserver currency', function () {
          config.setConfig({ currency: { adServerCurrency: 'DKK' } });
          const validBidRequests = [ getBidWithFloor() ];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'DKK');
        });

        it('should add correct floor values', function () {
          const expectedFloors = [ 1, 1.3, 0.5 ];
          const validBidRequests = expectedFloors.map(getBidWithFloor);
          let imps = getRequestImps(validBidRequests);

          expectedFloors.forEach((floor, index) => {
            assert.equal(imps[index].bidfloor, floor);
            assert.equal(imps[index].bidfloorcur, 'USD');
          });
        });

        it('should add correct params to getFloor', function () {
          let result;
          let mediaTypes = { video: {
            playerSize: [ 100, 200 ]
          } };
          const expectedFloors = [ 1, 1.3, 0.5 ];
          config.setConfig({ currency: { adServerCurrency: 'DKK' } });
          let validBidRequests = expectedFloors.map(getBidWithFloorTest);
          getRequestImps(validBidRequests);
          assert.deepEqual(result, { currency: 'DKK', size: '*', mediaType: '*' });

          mediaTypes = { banner: {
            sizes: [ [100, 200], [300, 400] ]
          }};
          validBidRequests = expectedFloors.map(getBidWithFloorTest);
          getRequestImps(validBidRequests);

          assert.deepEqual(result, { currency: 'DKK', size: '*', mediaType: '*' });

          mediaTypes = { native: {} };
          validBidRequests = expectedFloors.map(getBidWithFloorTest);
          getRequestImps(validBidRequests);

          assert.deepEqual(result, { currency: 'DKK', size: '*', mediaType: '*' });

          mediaTypes = {};
          validBidRequests = expectedFloors.map(getBidWithFloorTest);
          getRequestImps(validBidRequests);

          assert.deepEqual(result, { currency: 'DKK', size: '*', mediaType: '*' });

          function getBidWithFloorTest(floor) {
            return {
              params: { mid: 1 },
              mediaTypes: mediaTypes,
              getFloor: (args) => {
                result = args;
                return {
                  currency: 'DKK',
                  floor
                };
              }
            };
          }
        });

        function getBidWithFloor(floor) {
          return {
            params: { mid: 1 },
            mediaTypes: { video: {} },
            getFloor: ({ currency }) => {
              return {
                currency: currency,
                floor
              };
            }
          };
        }
      });

      describe('multiple media types', function () {
        it('should use all configured media types for bidding', function () {
          let validBidRequests = [{
            bidId: 'bidId',
            params: { mid: 1000 },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              },
              video: {}
            }
          }, {
            bidId: 'bidId1',
            params: { mid: 1000 },
            mediaTypes: {
              video: {},
              native: {}
            }
          }, {
            bidId: 'bidId2',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 }
            },
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
              video: {}
            }
          }];
          let [ first, second, third ] = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp;

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

      describe('banner', function () {
        it('should convert sizes to openrtb format', function () {
          let validBidRequests = [{
            bidId: 'bidId',
            params: { mid: 1000 },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              }
            }
          }];
          let { banner } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0];
          assert.deepEqual(banner, {
            format: [ { w: 100, h: 100 }, { w: 200, h: 300 } ]
          });
        });
      });

      describe('video', function () {
        it('should pass video mediatype config', function () {
          let validBidRequests = [{
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
          let { video } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0];
          assert.deepEqual(video, {
            playerSize: [640, 480],
            context: 'outstream',
            mimes: ['video/mp4']
          });
        });
      });

      describe('native', function () {
        describe('assets', function () {
          it('should use nativeOrtbRequest instead of nativeParams or mediaTypes', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                title: { required: true, len: 200 },
                image: { required: true, sizes: [150, 150] },
                icon: { required: false, sizes: [150, 150] },
                body: { required: false, len: 1140 },
                sponsoredBy: { required: true },
                cta: { required: false },
                clickUrl: { required: false },
                ortb: {
                  ver: '1.2',
                  assets: []
                }
              },
              mediaTypes: {
                native: {
                  title: { required: true, len: 140 },
                  image: { required: true, sizes: [150, 50] },
                  icon: { required: false, sizes: [50, 50] },
                  body: { required: false, len: 140 },
                  sponsoredBy: { required: true },
                  cta: { required: false },
                  clickUrl: { required: false }
                }
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

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;
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
            let validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
                body: { len: 140 }
              },
              nativeOrtbRequest: {
                assets: [
                  {
                    id: 0,
                    required: 1,
                    title: {
                      len: 140
                    }
                  },
                  {
                    id: 1,
                    required: 0,
                    img: {
                      type: 3,
                      wmin: 836,
                      hmin: 627,
                      w: 325,
                      h: 300,
                      mimes: [ 'image/jpg', 'image/gif' ]
                    }
                  },
                  {
                    id: 2,
                    data: {
                      type: 2,
                      len: 140
                    }
                  }
                ]
              }
            }];

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;

            assert.equal(assets[0].id, 0);
            assert.equal(assets[1].id, 1);
            assert.equal(assets[2].id, 2);
          });

          it('should add required key if it is necessary', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
                body: { len: 140 },
                sponsoredBy: { required: true, len: 140 }
              },
              nativeOrtbRequest: {
                assets: [
                  { required: 1, title: { len: 140 } },
                  { required: 0, img: { type: 3, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] } },
                  { data: { type: 2, len: 140 } },
                  { required: 1, data: { type: 1, len: 140 } }
                ]
              }
            }];
            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;

            assert.equal(assets[0].required, 1);
            assert.ok(!assets[1].required);
            assert.ok(!assets[2].required);
            assert.equal(assets[3].required, 1);
          });

          it('should map img and data assets', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                title: { required: true, len: 140 },
                image: { required: true, sizes: [150, 50] },
                icon: { required: false, sizes: [50, 50] },
                body: { required: false, len: 140 },
                sponsoredBy: { required: true },
                cta: { required: false }
              },
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

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;
            assert.ok(assets[0].title);
            assert.equal(assets[0].title.len, 140);
            assert.deepEqual(assets[1].img, { type: 3, w: 150, h: 50 });
            assert.deepEqual(assets[2].img, { type: 1, w: 50, h: 50 });
            assert.deepEqual(assets[3].data, { type: 2, len: 140 });
            assert.deepEqual(assets[4].data, { type: 1 });
            assert.deepEqual(assets[5].data, { type: 12 });
            assert.ok(!assets[6]);
          });

          it('should utilise aspect_ratios', function () {
            const validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                image: {
                  aspect_ratios: [{
                    min_width: 100,
                    ratio_height: 3,
                    ratio_width: 1
                  }]
                },
                icon: {
                  aspect_ratios: [{
                    min_width: 10,
                    ratio_height: 5,
                    ratio_width: 2
                  }]
                }
              },
              nativeOrtbRequest: {
                assets: [
                  { img: { type: 3, wmin: 100, ext: { aspectratios: ['1:3'] } } },
                  { img: { type: 1, wmin: 10, ext: { aspectratios: ['2:5'] } } }
                ]
              }
            }];

            let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;
            assert.ok(assets[0].img);
            assert.equal(assets[0].img.wmin, 100);
            assert.equal(assets[0].img.hmin, 300);

            assert.ok(assets[1].img);
            assert.equal(assets[1].img.wmin, 10);
            assert.equal(assets[1].img.hmin, 25);
          });

          it('should not throw error if aspect_ratios config is not defined', function () {
            const validBidRequests = [{
              bidId: 'bidId',
              params: { mid: 1000 },
              nativeParams: {
                image: {
                  aspect_ratios: []
                },
                icon: {
                  aspect_ratios: []
                }
              },
              nativeOrtbRequest: {
                request: {
                  assets: [
                    { img: {} },
                    { img: {} }
                  ]
                }
              }
            }];

            assert.doesNotThrow(() => spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }));
          });
        });

        it('should expect any dimensions if min_width not passed', function () {
          const validBidRequests = [{
            bidId: 'bidId',
            params: { mid: 1000 },
            nativeParams: {
              image: {
                aspect_ratios: [{
                  ratio_height: 3,
                  ratio_width: 1
                }]
              }
            },
            nativeOrtbRequest: {
              assets: [
                { img: { type: 3, ext: { aspectratios: ['3:1'] } } }
              ]
            }
          }];

          let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp[0].native.request.assets;
          assert.ok(assets[0].img);
          assert.ok(!assets[0].img.wmin);
          assert.ok(!assets[0].img.hmin);
          assert.ok(!assets[1]);
        });
      });
    });

    function getRequestImps(validBidRequests) {
      return JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } }).data).imp;
    }
  });

  describe('interpretResponse', function () {
    it('should return if no body in response', function () {
      let serverResponse = {};
      let bidRequest = {};

      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });
    it('should return more than one bids', function () {
      let serverResponse = {
        body: {
          seatbid: [{
            bid: [{impid: '1', native: {ver: '1.1', link: { url: 'link' }, assets: [{id: 0, title: {text: 'Asset title text'}}]}}]
          }, {
            bid: [{impid: '2', native: {ver: '1.1', link: { url: 'link' }, assets: [{id: 1, data: {value: 'Asset title text'}}]}}]
          }]
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          },
          {
            bidId: 'bidId2',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          }
        ]
      };

      bids = spec.interpretResponse(serverResponse, bidRequest);
      assert.equal(spec.interpretResponse(serverResponse, bidRequest).length, 2);
    });

    it('should parse seatbids', function () {
      let serverResponse = {
        body: {
          seatbid: [{
            bid: [
              {impid: '1', native: {ver: '1.1', link: { url: 'link1' }, assets: [{id: 0, title: {text: 'Asset title text'}}]}},
              {impid: '4', native: {ver: '1.1', link: { url: 'link4' }, assets: [{id: 1, title: {text: 'Asset title text'}}]}}
            ]
          }, {
            bid: [{impid: '2', native: {ver: '1.1', link: { url: 'link2' }, assets: [{id: 0, data: {value: 'Asset title text'}}]}}]
          }]
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          },
          {
            bidId: 'bidId2',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          },
          {
            bidId: 'bidId3',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          },
          {
            bidId: 'bidId4',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                { id: 0, required: 1, title: { len: 140 } },
                { id: 1, required: 0, img: { type: 3, wmin: 836, hmin: 627, ext: { aspectratios: ['6:5'] } } },
                { id: 2, required: 0, data: { type: 2 } }
              ]
            }
          }
        ]
      };

      bids = spec.interpretResponse(serverResponse, bidRequest).map(bid => {
        const { requestId, native: { ortb: { link: { url } } } } = bid;
        return [ requestId, url ];
      });

      assert.equal(bids.length, 3);
      assert.deepEqual(bids, [[ 'bidId1', 'link1' ], [ 'bidId2', 'link2' ], [ 'bidId4', 'link4' ]]);
    });

    it('should set correct values to bid', function () {
      let serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{
            bid: [
              {
                impid: '1',
                price: 93.1231,
                crid: '12312312',
                native: {
                  assets: [],
                  link: { url: 'link' },
                  imptrackers: ['imptrackers url1', 'imptrackers url2']
                },
                dealid: 'deal-id',
                adomain: [ 'demo.com' ],
                ext: {
                  prebid: {
                    type: 'native',
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
                }
              }
            ]
          }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { mid: 1000 },
            nativeOrtbRequest: {
              assets: [
                {
                  id: 0,
                  required: 1,
                  title: {
                    len: 140
                  }
                }, {
                  id: 1,
                  required: 1,
                  img: {
                    type: 3,
                    wmin: 836,
                    hmin: 627,
                    ext: {
                      aspectratios: ['6:5']
                    }
                  }
                }, {
                  id: 2,
                  required: 0,
                  data: {
                    type: 2
                  }
                }
              ]
            },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          }
        ]
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
      assert.deepEqual(bids[0].meta.advertiserDomains, [ 'demo.com' ]);
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
    it('should set correct native params', function () {
      const bid = [
        {
          impid: '1',
          native: {
            ver: '1.1',
            assets: [{
              id: 1,
              required: 0,
              title: {
                text: 'FLS Native'
              }
            }, {
              id: 3,
              required: 0,
              data: {
                value: 'Adform'
              }
            }, {
              id: 2,
              required: 0,
              data: {
                value: 'Native banner. WOW.'
              }
            }, {
              id: 4,
              required: 0,
              data: {
                value: 'Oho'
              }
            }, {
              id: 5,
              required: 0,
              img: { url: 'test.url.com/Files/58345/308185.jpg?bv=1', w: 30, h: 10 }
            }, {
              id: 0,
              required: 0,
              img: { url: 'test.url.com/Files/58345/308200.jpg?bv=1', w: 300, h: 300 }
            }],
            link: {
              url: 'clickUrl', clicktrackers: [ 'clickTracker1', 'clickTracker2' ]
            },
            imptrackers: ['imptracker url1', 'imptracker url2'],
            jstracker: 'jstracker'
          }
        }
      ];
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{
          bidId: 'bidId1',
          nativeOrtbRequest: {
            ver: '1.2',
            assets: [{
              id: 0,
              required: 1,
              img: {
                type: 3,
                wmin: 200,
                hmin: 166,
                ext: {
                  aspectratios: ['6:5']
                }
              }
            }, {
              id: 1,
              required: 1,
              title: {
                len: 150
              }
            }, {
              id: 2,
              required: 0,
              data: {
                type: 2
              }
            }, {
              id: 3,
              required: 1,
              data: {
                type: 1
              }
            }, {
              id: 4,
              required: 1,
              data: {
                type: 12
              }
            }, {
              id: 5,
              required: 0,
              img: {
                type: 1,
                wmin: 10,
                hmin: 10,
                ext: {
                  aspectratios: ['1:1']
                }
              }
            }]
          },
        }]
      };

      const result = spec.interpretResponse(serverResponse, bidRequest)[0].native;
      const native = bid[0].native;
      const assets = native.assets;

      assert.deepEqual(result, {ortb: native});
    });
    it('should return empty when there is no bids in response', function () {
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{ bid: [] }],
          cur: 'NOK'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{ bidId: 'bidId1' }]
      };
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.ok(!result);
    });

    describe('banner', function () {
      it('should set ad content on response', function () {
        let serverResponse = {
          body: {
            seatbid: [{
              bid: [{ impid: '1', adm: '<banner>', ext: { prebid: { type: 'banner' } } }]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { mid: 1000 }
            }
          ]
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].ad, '<banner>');
        assert.equal(bids[0].mediaType, 'banner');
        assert.equal(bids[0].meta.mediaType, 'banner');
      });
    });

    describe('video', function () {
      it('should set vastXml on response', function () {
        let serverResponse = {
          body: {
            seatbid: [{
              bid: [{ impid: '1', adm: '<vast>', ext: { prebid: { type: 'video' } } }]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { mid: 1000 }
            }
          ]
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].vastXml, '<vast>');
        assert.equal(bids[0].mediaType, 'video');
        assert.equal(bids[0].meta.mediaType, 'video');
      });

      it('should set vastUrl if nurl is present in response', function () {
        let vastUrl = 'http://url.to/vast'
        let serverResponse = {
          body: {
            seatbid: [{
              bid: [{ impid: '1', adm: '<vast>', nurl: vastUrl, ext: { prebid: { type: 'video' } } }]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { mid: 1000 }
            }
          ]
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].vastUrl, vastUrl);
        assert.equal(bids[0].mediaType, 'video');
        assert.equal(bids[0].meta.mediaType, 'video');
      });

      it('should add renderer for outstream bids', function () {
        let serverResponse = {
          body: {
            seatbid: [{
              bid: [{ impid: '1', adm: '<vast>', ext: { prebid: { type: 'video' } } }, { impid: '2', adm: '<vast>', ext: { prebid: { type: 'video' } } }]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: { mid: 1000 },
              mediaTypes: {
                video: {
                  context: 'outstream'
                }
              }
            },
            {
              bidId: 'bidId2',
              params: { mid: 1000 },
              mediaTypes: {
                video: {
                  constext: 'instream'
                }
              }
            }
          ]
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.ok(bids[0].renderer);
        assert.equal(bids[1].renderer, undefined);
      });
    });
  });
});
