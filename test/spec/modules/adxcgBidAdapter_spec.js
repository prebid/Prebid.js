// jshint esversion: 6, es3: false, node: true
import {assert} from 'chai';
import {spec} from 'modules/adxcgBidAdapter.js';
import {config} from 'src/config.js';
import {createEidsArray} from 'modules/userId/eids.js';
const utils = require('src/utils');

describe('Adxcg adapter', function () {
  let bids = [];

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'adxcg',
      'params': {
        'adzoneid': '19910113'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));

      bid.params = {
        adzoneid: 4332,
      };
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params = {};
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
          adzoneid: '19910113'
        }
      }];
      let request = spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}});

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://pbc.adxcg.net/rtb/ortb/pbc?adExchangeId=1');
      assert.deepEqual(request.options, {contentType: 'application/json'});
      assert.ok(request.data);
    });

    describe('user privacy', function () {
      it('should send GDPR Consent data to exchange if gdprApplies', function () {
        let validBidRequests = [{bidId: 'bidId', params: {test: 1}}];
        let bidderRequest = {
          gdprConsent: {gdprApplies: true, consentString: 'consentDataString'},
          refererInfo: {referer: 'page'}
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.regs.ext.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.regs.ext.gdpr, 'number');
      });

      it('should send gdpr as number', function () {
        let validBidRequests = [{bidId: 'bidId', params: {test: 1}}];
        let bidderRequest = {
          gdprConsent: {gdprApplies: true, consentString: 'consentDataString'},
          refererInfo: {referer: 'page'}
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(typeof request.regs.ext.gdpr, 'number');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should send CCPA Consent data to exchange', function () {
        let validBidRequests = [{bidId: 'bidId', params: {test: 1}}];
        let bidderRequest = {uspConsent: '1YA-', refererInfo: {referer: 'page'}};
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');

        bidderRequest = {
          uspConsent: '1YA-',
          gdprConsent: {gdprApplies: true, consentString: 'consentDataString'},
          refererInfo: {referer: 'page'}
        };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.regs.ext.us_privacy, '1YA-');
        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 1);
      });

      it('should not send GDPR Consent data to adxcg if gdprApplies is undefined', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: {siteId: 'siteId'}
        }];
        let bidderRequest = {
          gdprConsent: {gdprApplies: false, consentString: 'consentDataString'},
          refererInfo: {referer: 'page'}
        };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user.ext.consent, 'consentDataString');
        assert.equal(request.regs.ext.gdpr, 0);

        bidderRequest = {gdprConsent: {consentString: 'consentDataString'}, refererInfo: {referer: 'page'}};
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
      it('should send default GDPR Consent data to exchange', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: {siteId: 'siteId'}
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

        assert.equal(request.user, undefined);
        assert.equal(request.regs, undefined);
      });
    });

    it('should add test and is_debug to request, if test is set in parameters', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {test: 1}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

      assert.ok(request.is_debug);
      assert.equal(request.test, 1);
    });

    it('should have default request structure', function () {
      let keys = 'site,geo,device,source,ext,imp'.split(',');
      let validBidRequests = [{
        bidId: 'bidId',
        params: {siteId: 'siteId'}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should set request keys correct values', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {siteId: 'siteId'},
        transactionId: 'transactionId'
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

      assert.equal(request.source.tid, validBidRequests[0].transactionId);
      assert.equal(request.source.fd, 1);
    });

    it('should send info about device', function () {
      config.setConfig({
        device: {w: 100, h: 100}
      });
      let validBidRequests = [{
        bidId: 'bidId',
        params: {adzoneid: '1000'}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

      assert.equal(request.device.ua, navigator.userAgent);
      assert.equal(request.device.w, 100);
      assert.equal(request.device.h, 100);
    });

    it('should send app info', function () {
      config.setConfig({
        app: {id: 'appid'},
        ortb2: {app: {name: 'appname'}}
      });
      let validBidRequests = [{
        bidId: 'bidId',
        params: {adzoneid: '1000'}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

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
        ortb2: {
          site: {
            publisher: {
              id: 4441,
              name: 'publisher\'s name'
            }
          }
        }
      });
      let validBidRequests = [{
        bidId: 'bidId',
        params: {adzoneid: '1000'}
      }];
      let refererInfo = {referer: 'page'};
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo}).data);

      assert.deepEqual(request.site, {
        domain: 'localhost',
        id: '123123',
        page: refererInfo.referer,
        publisher: {
          domain: 'publisher.domain.com',
          id: 4441,
          name: 'publisher\'s name'
        }
      });
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

      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);
      assert.deepEqual(request.user.ext.eids, [
        {source: 'adserver.org', uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]},
        {source: 'pubcid.org', uids: [{id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1}]}
      ]);
    });

    it('should send currency if defined', function () {
      config.setConfig({currency: {adServerCurrency: 'EUR'}});
      let validBidRequests = [{params: {}}];
      let refererInfo = {referer: 'page'};
      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo}).data);

      assert.deepEqual(request.cur, ['EUR']);
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

      let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);
      assert.deepEqual(request.source.ext.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    describe('bids', function () {
      it('should add more than one bid to the request', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: {siteId: 'siteId'}
        }, {
          bidId: 'bidId2',
          params: {siteId: 'siteId'}
        }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data);

        assert.equal(request.imp.length, 2);
      });
      it('should add incrementing values of id', function () {
        let validBidRequests = [{
          bidId: 'bidId',
          params: {adzoneid: '1000'},
          mediaTypes: {video: {}}
        }, {
          bidId: 'bidId2',
          params: {adzoneid: '1000'},
          mediaTypes: {video: {}}
        }, {
          bidId: 'bidId3',
          params: {adzoneid: '1000'},
          mediaTypes: {video: {}}
        }];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp;

        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].id, i + 1);
        }
      });

      it('should add adzoneid', function () {
        let validBidRequests = [{bidId: 'bidId', params: {adzoneid: 1000}, mediaTypes: {video: {}}},
          {bidId: 'bidId2', params: {adzoneid: 1001}, mediaTypes: {video: {}}},
          {bidId: 'bidId3', params: {adzoneid: 1002}, mediaTypes: {video: {}}}];
        let imps = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp;
        for (let i = 0; i < 3; i++) {
          assert.equal(imps[i].tagid, validBidRequests[i].params.adzoneid);
        }
      });

      describe('price floors', function () {
        it('should not add if floors module not configured', function () {
          const validBidRequests = [{bidId: 'bidId', params: {adzoneid: 1000}, mediaTypes: {video: {}}}];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, undefined);
        });

        it('should not add if floor price not defined', function () {
          const validBidRequests = [getBidWithFloor()];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'USD');
        });

        it('should request floor price in adserver currency', function () {
          config.setConfig({currency: {adServerCurrency: 'DKK'}});
          const validBidRequests = [getBidWithFloor()];
          let imp = getRequestImps(validBidRequests)[0];

          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'DKK');
        });

        it('should add correct floor values', function () {
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
            params: {adzoneid: 1},
            mediaTypes: {video: {}},
            getFloor: ({currency}) => {
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
            params: {adzoneid: 1000},
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              },
              video: {}
            }
          }, {
            bidId: 'bidId1',
            params: {adzoneid: 1000},
            mediaTypes: {
              video: {},
              native: {}
            }
          }, {
            bidId: 'bidId2',
            params: {adzoneid: 1000},
            nativeParams: {
              title: {required: true, len: 140}
            },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              },
              native: {},
              video: {}
            }
          }];
          let [first, second, third] = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp;

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
            params: {adzoneid: 1000},
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              }
            }
          }];
          let {banner} = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0];
          assert.deepEqual(banner, {
            format: [{w: 100, h: 100}, {w: 200, h: 300}]
          });
        });
      });

      describe('video', function () {
        it('should pass video mediatype config', function () {
          let validBidRequests = [{
            bidId: 'bidId',
            params: {adzoneid: 1000},
            mediaTypes: {
              video: {
                playerSize: [640, 480],
                context: 'outstream',
                mimes: ['video/mp4']
              }
            }
          }];
          let {video} = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0];
          assert.deepEqual(video, {
            playerSize: [640, 480],
            context: 'outstream',
            mimes: ['video/mp4']
          });
        });
      });

      describe('native', function () {
        describe('assets', function () {
          it('should set correct asset id', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: {adzoneid: 1000},
              nativeParams: {
                title: {required: true, len: 140},
                image: {required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif']},
                body: {len: 140}
              }
            }];
            let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
            let assets = JSON.parse(nativeRequest).assets;

            assert.equal(assets[0].id, 0);
            assert.equal(assets[1].id, 3);
            assert.equal(assets[2].id, 4);
          });
          it('should add required key if it is necessary', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: {adzoneid: 1000},
              nativeParams: {
                title: {required: true, len: 140},
                image: {required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif']},
                body: {len: 140},
                sponsoredBy: {required: true, len: 140}
              }
            }];

            let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
            let assets = JSON.parse(nativeRequest).assets;

            assert.equal(assets[0].required, 1);
            assert.ok(!assets[1].required);
            assert.ok(!assets[2].required);
            assert.equal(assets[3].required, 1);
          });

          it('should map img and data assets', function () {
            let validBidRequests = [{
              bidId: 'bidId',
              params: {adzoneid: 1000},
              nativeParams: {
                title: {required: true, len: 140},
                image: {required: true, sizes: [150, 50]},
                icon: {required: false, sizes: [50, 50]},
                body: {required: false, len: 140},
                sponsoredBy: {required: true},
                cta: {required: false},
                clickUrl: {required: false}
              }
            }];

            let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
            let assets = JSON.parse(nativeRequest).assets;
            assert.ok(assets[0].title);
            assert.equal(assets[0].title.len, 140);
            assert.deepEqual(assets[1].img, {type: 3, w: 150, h: 50});
            assert.deepEqual(assets[2].img, {type: 1, w: 50, h: 50});
            assert.deepEqual(assets[3].data, {type: 2, len: 140});
            assert.deepEqual(assets[4].data, {type: 1});
            assert.deepEqual(assets[5].data, {type: 12});
            assert.ok(!assets[6]);
          });

          describe('icon/image sizing', function () {
            it('should flatten sizes and utilise first pair', function () {
              const validBidRequests = [{
                bidId: 'bidId',
                params: {adzoneid: 1000},
                nativeParams: {
                  image: {
                    sizes: [[200, 300], [100, 200]]
                  },
                }
              }];

              let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
              let assets = JSON.parse(nativeRequest).assets;
              assert.ok(assets[0].img);
              assert.equal(assets[0].img.w, 200);
              assert.equal(assets[0].img.h, 300);
            });
          });

          it('should utilise aspect_ratios', function () {
            const validBidRequests = [{
              bidId: 'bidId',
              params: {adzoneid: 1000},
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
              }
            }];

            let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
            let assets = JSON.parse(nativeRequest).assets;
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
              params: {adzoneid: 1000},
              nativeParams: {
                image: {
                  aspect_ratios: []
                },
                icon: {
                  aspect_ratios: []
                }
              }
            }];

            assert.doesNotThrow(() => spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}));
          });
        });

        it('should expect any dimensions if min_width not passed', function () {
          const validBidRequests = [{
            bidId: 'bidId',
            params: {adzoneid: 1000},
            nativeParams: {
              image: {
                aspect_ratios: [{
                  ratio_height: 3,
                  ratio_width: 1
                }]
              }
            }
          }];

          let nativeRequest = JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp[0].native.request;
          let assets = JSON.parse(nativeRequest).assets;
          assert.ok(assets[0].img);
          assert.equal(assets[0].img.wmin, 0);
          assert.equal(assets[0].img.hmin, 0);
          assert.ok(!assets[1]);
        });
      });
    });

    function getRequestImps(validBidRequests) {
      return JSON.parse(spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}}).data).imp;
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
            bid: [{
              impid: '1',
              native: {ver: '1.1', link: {url: 'link'}, assets: [{id: 1, title: {text: 'Asset title text'}}]}
            }]
          }, {
            bid: [{
              impid: '2',
              native: {ver: '1.1', link: {url: 'link'}, assets: [{id: 1, data: {value: 'Asset title text'}}]}
            }]
          }]
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: {adzoneid: 1000},
            nativeParams: {
              title: {required: true, len: 140},
              image: {required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif']},
              body: {len: 140}
            }
          },
          {
            bidId: 'bidId2',
            params: {adzoneid: 1000},
            nativeParams: {
              title: {required: true, len: 140},
              image: {required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif']},
              body: {len: 140}
            }
          }
        ]
      };

      bids = spec.interpretResponse(serverResponse, bidRequest);
      assert.equal(spec.interpretResponse(serverResponse, bidRequest).length, 2);
    });

    it('should set correct values to bid', function () {
      let nativeExample1 = {
        assets: [],
        link: {url: 'link'},
        imptrackers: ['imptrackers url1', 'imptrackers url2']
      }

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
                adm: JSON.stringify(nativeExample1),
                dealid: 'deal-id',
                adomain: ['demo.com'],
                ext: {
                  crType: 'native',
                  advertiser_id: 'adv1',
                  advertiser_name: 'advname',
                  agency_name: 'agname',
                  mediaType: 'native'
                }
              }
            ]
          }],
          cur: 'EUR'
        }
      };
      let bidRequest = {
        data: {},
        bids: [
          {
            bidId: 'bidId1',
            params: {adzoneid: 1000},
            nativeParams: {
              title: {required: true, len: 140},
              image: {required: false, wmin: 836, hmin: 627, w: 325, h: 300, mimes: ['image/jpg', 'image/gif']},
              body: {len: 140}
            }
          }
        ]
      };

      const bids = spec.interpretResponse(serverResponse, bidRequest);
      const bid = serverResponse.body.seatbid[0].bid[0];
      assert.deepEqual(bids[0].requestId, bidRequest.bids[0].bidId);
      assert.deepEqual(bids[0].cpm, bid.price);
      assert.deepEqual(bids[0].creativeId, bid.crid);
      assert.deepEqual(bids[0].ttl, 300);
      assert.deepEqual(bids[0].netRevenue, false);
      assert.deepEqual(bids[0].currency, serverResponse.body.cur);
      assert.deepEqual(bids[0].mediaType, 'native');
      assert.deepEqual(bids[0].meta.mediaType, 'native');
      assert.deepEqual(bids[0].meta.advertiserDomains, ['demo.com']);

      assert.deepEqual(bids[0].meta.advertiserName, 'advname');
      assert.deepEqual(bids[0].meta.agencyName, 'agname');

      assert.deepEqual(bids[0].dealId, 'deal-id');
    });

    it('should return empty when there is no bids in response', function () {
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{bid: []}],
          cur: 'EUR'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{bidId: 'bidId1'}]
      };
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.ok(!result);
    });

    describe('banner', function () {
      it('should set ad content on response', function () {
        let serverResponse = {
          body: {
            seatbid: [{
              bid: [{impid: '1', adm: '<banner>', ext: {crType: 'banner'}}]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: {adzoneid: 1000}
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
              bid: [{impid: '1', adm: '<vast>', ext: {crType: 'video'}}]
            }]
          }
        };
        let bidRequest = {
          data: {},
          bids: [
            {
              bidId: 'bidId1',
              params: {adzoneid: 1000}
            }
          ]
        };

        bids = spec.interpretResponse(serverResponse, bidRequest);
        assert.equal(bids.length, 1);
        assert.equal(bids[0].vastXml, '<vast>');
        assert.equal(bids[0].mediaType, 'video');
        assert.equal(bids[0].meta.mediaType, 'video');
      });
    });
  });

  describe('getUserSyncs', function () {
    const usersyncUrl = 'https://usersync-url.com';
    beforeEach(() => {
      config.setConfig(
        {
          adxcg: {
            usersyncUrl: usersyncUrl,
          }
        }
      )
    })
    after(() => {
      config.resetConfig()
    })

    it('should return user sync if pixel enabled with adxcg config', function () {
      const ret = spec.getUserSyncs({pixelEnabled: true})
      expect(ret).to.deep.equal([{type: 'image', url: usersyncUrl}])
    })

    it('should not return user sync if pixel disabled', function () {
      const ret = spec.getUserSyncs({pixelEnabled: false})
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should not return user sync if url is not set', function () {
      config.resetConfig()
      const ret = spec.getUserSyncs({pixelEnabled: true})
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should pass GDPR consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: false, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=0&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: undefined}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=`
      }]);
    });

    it('should pass US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=1NYN`
      }]);
    });

    it('should pass GDPR and US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo&us_privacy=1NYN`
      }]);
    });
  });

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should trigger pixel if bid nurl', function() {
      const bid = {
        nurl: 'http://example.com/win/${AUCTION_PRICE}',
        cpm: 2.1,
        originalCpm: 1.1,
      }
      spec.onBidWon(bid);
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })
});
