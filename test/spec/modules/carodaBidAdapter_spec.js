// jshint esversion: 6, es3: false, node: true
import { assert } from 'chai';
import { spec } from 'modules/carodaBidAdapter.js';
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

describe('Caroda adapter', function () {
  let bids = [];

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'caroda',
      'params': {
        'ctok': 'adf232eef344'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));

      bid.params = {
        ctok: 'adf232eef344',
        placementId: 'someplacement'
      };
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params = {};
      assert.isFalse(spec.isBidRequestValid(bid));

      bid.params = {
        placementId: 'someplacement'
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
      delete window.carodaPageViewId
    });
    it('should send request with minimal structure', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: {
          'ctok': 'adf232eef344'
        }
      }];
      window.top.carodaPageViewId = 12345
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://prebid.caroda.io/api/hb?entry_id=12345');
      assert.equal(request.options, undefined);
      const data = JSON.parse(request.data)
      assert.equal(data.ctok, 'adf232eef344');
      assert.ok(data.site);
      assert.ok(data.hb_version);
      assert.ok(data.device);
      assert.equal(data.price_type, 'net');
    });

    it('should add test to request, if test is set in parameters', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: {
          'ctok': 'adf232eef344',
          'test': 1
        }
      }];
      window.top.carodaPageViewId = 12345
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      const data = JSON.parse(request.data)
      assert.equal(data.test, 1);
    });

    it('should add placement_id to request when available', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: {
          'ctok': 'adf232eef344',
          'placementId': 'opzafe342f'
        }
      }];
      window.top.carodaPageViewId = 12345
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      const data = JSON.parse(request.data)
      assert.equal(data.placement_id, 'opzafe342f');
    });
  
    it('should send info about device', function () {
      config.setConfig({
        device: { w: 100, h: 100 }
      });
      const validBidRequests = [{
        bidId: 'bidId',
        params: { 'ctok': 'adf232eef344' }
      }];
      const data = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.equal(data.device.ua, navigator.userAgent);
      assert.equal(data.device.w, 100);
      assert.equal(data.device.h, 100);
    });

    it('should pass supply chain object', function () {
      const validBidRequests = [{
        bidId: 'bidId',
        params: {},
        schain: {
          validation: 'strict',
          config: {
            ver: '1.0'
          }
        }
      }];

      let data = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.deepEqual(data.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
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
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 })[0].data);
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
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo, ortb2 })[0].data);

      assert.deepEqual(request.site, {
        page: refererInfo.page,
        publisher: {
          domain: 'publisher.domain.com',
          name: 'publisher\'s name'
        },
        id: '123123'
      });
    });

    it('should send correct priceType value', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: { priceType: 'gross' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);

      assert.equal(request.price_type, 'gross');
    });

    it('should send currency if defined', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      let validBidRequests = [{ params: {} }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo })[0].data);

      assert.deepEqual(request.currency, 'EUR');
    });

    it('should pass extended ids', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {},
        userIdAsEids: createEidsArray({
          tdid: 'TTD_ID_FROM_USER_ID_MODULE',
          pubcid: 'pubCommonId_FROM_USER_ID_MODULE'
        })
      }];

      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.deepEqual(request.user.eids, [
        { source: 'adserver.org', uids: [ { id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: { rtiPartner: 'TDID' } } ] },
        { source: 'pubcid.org', uids: [ { id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1 } ] }
      ]);
    });

    describe('user privacy', function () {
      it('should send GDPR Consent data to adform if gdprApplies', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.gdpr_consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.privacy.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.privacy.gdpr, 'number');
      });

      it('should send gdpr as number', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(typeof request.privacy.gdpr, 'number');
        assert.equal(request.privacy.gdpr, 1);
      });

      it('should send CCPA Consent data', function () {
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { uspConsent: '1YA-', refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.us_privacy, '1YA-');

        bidderRequest = { uspConsent: '1YA-', gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.us_privacy, '1YA-');
        assert.equal(request.privacy.gdpr_consent, 'consentDataString');
        assert.equal(request.privacy.gdpr, 1);
      });

      it('should not set coppa when coppa is not provided or is set to false', function () {
        config.setConfig({
        });
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);
  
        assert.equal(request.privacy.coppa, undefined);
  
        config.setConfig({
          coppa: false
        });
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);
  
        assert.equal(request.privacy.coppa, undefined);
      });  
      it('should set coppa to 1 when coppa is provided with value true', function () {
        config.setConfig({
          coppa: true
        });
        let validBidRequests = [{ bidId: 'bidId', params: { test: 1 } }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
  
        assert.equal(request.privacy.coppa, 1);
      });
    });

    describe('bids', function () {
      it('should be able to handle multiple bids', function () {
        const validBidRequests = [{
          bidId: 'bidId',
          params: { ctok: 'ctok1' }
        }, {
          bidId: 'bidId2',
          params: { ctok: 'ctok2' }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });
        assert.equal(request.length, 2);
        const data = request.map(r => JSON.parse(r.data))
        assert.equal(data[0].ctok, 'ctok1')
        assert.equal(data[1].ctok, 'ctok2')
      });

      
      describe('price floors', function () {
        it('should not add if floors module not configured', function () {
          const validBidRequests = [{ bidId: 'bidId', params: {ctok: 'ctok1'}, mediaTypes: {video: {}} }];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, undefined);
        });

        it('should not add if floor price not defined', function () {
          const validBidRequests = [ getBidWithFloor() ];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'EUR');
        });

        it('should request floor price in adserver currency', function () {
          config.setConfig({ currency: { adServerCurrency: 'DKK' } });
          const validBidRequests = [ getBidWithFloor() ];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'DKK');
        });

        it('should add correct floor values', function () {
          const expectedFloors = [ 1, 1.3, 0.5 ];
          const validBidRequests = expectedFloors.map(getBidWithFloor);
          const imps = spec
            .buildRequests(validBidRequests, { refererInfo: { page: 'page' } })
            .map(r => JSON.parse(r.data));
          expectedFloors.forEach((floor, index) => {
            assert.equal(imps[index].bidfloor, floor);
            assert.equal(imps[index].bidfloorcur, 'EUR');
          });
        });

        function getBidWithFloor(floor) {
          return {
            params: { ctok: 'ctok1' },
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
          const validBidRequests = [{
            bidId: 'bidId',
            params: { ctok: 'ctok1' },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              },
              video: {}
            }
          }, {
            bidId: 'bidId2',
            params: { ctok: 'ctok1' },
            mediaTypes: {
              video: {},
              native: {}
            }
          }];
          const [ first, second ] = spec
            .buildRequests(validBidRequests, { refererInfo: { page: 'page' } })
            .map(r => JSON.parse(r.data));

          assert.ok(first.banner);
          assert.ok(first.video);

          assert.ok(second.video);
          assert.equal(second.banner, undefined);
        });
      });

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
          const { banner } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.deepEqual(banner, {
            format: [ { w: 100, h: 100 }, { w: 200, h: 300 } ]
          });
        });
      });

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
          const { video } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.deepEqual(video, {
            playerSize: [640, 480],
            context: 'outstream',
            mimes: ['video/mp4']
          });
        });
      });
    });
  });

  describe.skip('interpretResponse', function () {
    it('should return if no body in response', function () {
      let serverResponse = {};
      let bidRequest = {};

      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });
    it('should return more than one bids', function () {
      let serverResponse = {
        body: {
          seatbid: [{
            bid: [{impid: '1', native: {ver: '1.1', link: { url: 'link' }, assets: [{id: 1, title: {text: 'Asset title text'}}]}}]
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
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          },
          {
            bidId: 'bidId2',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
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
              {impid: '1', native: {ver: '1.1', link: { url: 'link1' }, assets: [{id: 1, title: {text: 'Asset title text'}}]}},
              {impid: '4', native: {ver: '1.1', link: { url: 'link4' }, assets: [{id: 1, title: {text: 'Asset title text'}}]}}
            ]
          }, {
            bid: [{impid: '2', native: {ver: '1.1', link: { url: 'link2' }, assets: [{id: 1, data: {value: 'Asset title text'}}]}}]
          }]
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          },
          {
            bidId: 'bidId2',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          },
          {
            bidId: 'bidId3',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          },
          {
            bidId: 'bidId4',
            params: { mid: 1000 },
            nativeParams: {
              title: { required: true, len: 140 },
              image: { required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif'] },
              body: { len: 140 }
            }
          }
        ]
      };

      bids = spec.interpretResponse(serverResponse, bidRequest).map(bid => {
        const { requestId, native: { clickUrl } } = bid;
        return [ requestId, clickUrl ];
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
                    type: 'native'
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
      assert.deepEqual(bids[0].dealId, 'deal-id');
    });
    it('should set correct native params', function () {
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
                title: {text: 'title', len: null},
                video: null
              }, {
                data: null,
                id: 2,
                img: {type: null, url: 'test.url.com/Files/58345/308185.jpg?bv=1', w: 30, h: 10},
                required: 0,
                title: null,
                video: null
              }, {
                data: null,
                id: 3,
                img: {type: null, url: 'test.url.com/Files/58345/308200.jpg?bv=1', w: 100, h: 100},
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'body'},
                id: 4,
                img: null,
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'cta'},
                id: 1,
                img: null,
                required: 0,
                title: null,
                video: null
              }, {
                data: {type: null, len: null, value: 'sponsoredBy'},
                id: 5,
                img: null,
                required: 0,
                title: null,
                video: null
              }
            ],
            link: { url: 'clickUrl', clicktrackers: ['clickTracker1', 'clickTracker2'] },
            imptrackers: ['imptrackers url1', 'imptrackers url2'],
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
        bids: [{ bidId: 'bidId1' }]
      };

      const result = spec.interpretResponse(serverResponse, bidRequest)[0].native;
      const native = bid[0].native;
      const assets = native.assets;
      assert.deepEqual({
        clickUrl: native.link.url,
        clickTrackers: native.link.clicktrackers,
        impressionTrackers: native.imptrackers,
        javascriptTrackers: [ native.jstracker ],
        title: assets[0].title.text,
        icon: {url: assets[1].img.url, width: assets[1].img.w, height: assets[1].img.h},
        image: {url: assets[2].img.url, width: assets[2].img.w, height: assets[2].img.h},
        body: assets[3].data.value,
        cta: assets[4].data.value,
        sponsoredBy: assets[5].data.value
      }, result);
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
