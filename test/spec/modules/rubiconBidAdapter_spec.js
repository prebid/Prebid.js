import { expect } from 'chai';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import RubiconAdapter from 'modules/rubiconBidAdapter';
import {parse as parseQuery} from 'querystring';

var CONSTANTS = require('src/constants.json');

const INTEGRATION = `pbjs_lite_v$prebid.version$`; // $prebid.version$ will be substituted in by gulp in built prebid

describe('the rubicon adapter', () => {
  let sandbox,
    adUnit,
    bidderRequest;

  function createVideoBidderRequest() {
    let bid = bidderRequest.bids[0];
    bid.mediaType = 'video';
    bid.params.video = {
      'language': 'en',
      'p_aso.video.ext.skip': true,
      'p_aso.video.ext.skipdelay': 15,
      'playerHeight': 320,
      'playerWidth': 640,
      'size_id': 201,
      'aeParams': {
        'p_aso.video.ext.skip': '1',
        'p_aso.video.ext.skipdelay': '15'
      }
    };
  }

  function createVideoBidderRequestNoVideo() {
    let bid = bidderRequest.bids[0];
    bid.mediaType = 'video';
    bid.params.video = '';
  }

  function createVideoBidderRequestNoPlayer() {
    let bid = bidderRequest.bids[0];
    bid.mediaType = 'video';
    bid.params.video = {
      'language': 'en',
      'p_aso.video.ext.skip': true,
      'p_aso.video.ext.skipdelay': 15,
      'size_id': 201,
      'aeParams': {
        'p_aso.video.ext.skip': '1',
        'p_aso.video.ext.skipdelay': '15'
      }
    };
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    adUnit = {
      code: '/19968336/header-bid-tag-0',
      sizes: [[300, 250], [320, 50]],
      mediaType: 'video',
      bids: [
        {
          bidder: 'rubicon',
          params: {
            accountId: '14062',
            siteId: '70608',
            zoneId: '335918',
            userId: '12346',
            keywords: ['a', 'b', 'c'],
            inventory: {
              rating: '5-star',
              prodtype: 'tech'
            },
            visitor: {
              ucat: 'new',
              lastsearch: 'iphone'
            },
            position: 'atf',
            referrer: 'localhost'
          }
        }
      ]
    };

    bidderRequest = {
      bidderCode: 'rubicon',
      requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      bidderRequestId: '178e34bad3658f',
      bids: [
        {
          bidder: 'rubicon',
          params: {
            accountId: '14062',
            siteId: '70608',
            zoneId: '335918',
            userId: '12346',
            keywords: ['a', 'b', 'c'],
            inventory: {
              rating: '5-star',
              prodtype: 'tech'
            },
            visitor: {
              ucat: 'new',
              lastsearch: 'iphone'
            },
            position: 'atf',
            referrer: 'localhost'
          },
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a'
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids public interface', () => {
    let rubiconAdapter = adapterManager.bidderRegistry['rubicon'];

    it('should receive a well-formed bidRequest from the adaptermanager', () => {
      sandbox.stub(rubiconAdapter, 'callBids');

      adapterManager.callBids({
        adUnits: [clone(adUnit)]
      });

      let bidderRequest = rubiconAdapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'rubicon');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('mediaType', 'video');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('placementCode', adUnit.code);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(2)
        .that.deep.equals(adUnit.sizes);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('params')
        .that.deep.equals(adUnit.bids[0].params);
    });
  });

  describe('MAS mapping / ordering', () => {
    let masSizeOrdering = RubiconAdapter.masSizeOrdering;

    it('should not include values without a proper mapping', () => {
      // two invalid sizes included: [42, 42], [1, 1]
      let ordering = masSizeOrdering([[320, 50], [42, 42], [300, 250], [640, 480], [1, 1], [336, 280]]);

      expect(ordering).to.deep.equal([15, 16, 43, 65]);
    });

    it('should sort values without any MAS priority sizes in regular ascending order', () => {
      let ordering = masSizeOrdering([[320, 50], [640, 480], [336, 280], [200, 600]]);

      expect(ordering).to.deep.equal([16, 43, 65, 126]);
    });

    it('should sort MAS priority sizes in the proper order w/ rest ascending', () => {
      let ordering = masSizeOrdering([[320, 50], [160, 600], [640, 480], [300, 250], [336, 280], [200, 600]]);
      expect(ordering).to.deep.equal([15, 9, 16, 43, 65, 126]);

      ordering = masSizeOrdering([[320, 50], [300, 250], [160, 600], [640, 480], [336, 280], [200, 600], [728, 90]]);
      expect(ordering).to.deep.equal([15, 2, 9, 16, 43, 65, 126]);

      ordering = masSizeOrdering([[120, 600], [320, 50], [160, 600], [640, 480], [336, 280], [200, 600], [728, 90]]);
      expect(ordering).to.deep.equal([2, 9, 8, 16, 43, 65, 126]);
    });
  });

  describe('callBids implementation', () => {
    let rubiconAdapter;

    describe('for requests', () => {
      let xhr,
        bids;

      beforeEach(() => {
        rubiconAdapter = new RubiconAdapter();

        bids = [];

        xhr = sandbox.useFakeXMLHttpRequest();

        sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
          bids.push(bid);
        });
      });

      afterEach(() => {
        xhr.restore();
      });

      describe('to fastlane', () => {
        it('should make a well-formed request', () => {
          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let [path, query] = request.url.split('?');
          query = parseQuery(query);

          expect(path).to.equal(
            '//fastlane.rubiconproject.com/a/api/fastlane.json'
          );

          let expectedQuery = {
            'account_id': '14062',
            'site_id': '70608',
            'zone_id': '335918',
            'size_id': '15',
            'alt_size_ids': '43',
            'p_pos': 'atf',
            'rp_floor': '0.01',
            'rp_secure': /[01]/,
            'tk_flint': INTEGRATION,
            'p_screen_res': /\d+x\d+/,
            'tk_user_key': '12346',
            'kw': 'a,b,c',
            'tg_v.ucat': 'new',
            'tg_v.lastsearch': 'iphone',
            'tg_i.rating': '5-star',
            'tg_i.prodtype': 'tech',
            'rf': 'localhost'
          };

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            let value = expectedQuery[key];
            if (value instanceof RegExp) {
              expect(query[key]).to.match(value);
            } else {
              expect(query[key]).to.equal(value);
            }
          });

          expect(query).to.have.property('rand');
        });

        it('should use rubicon sizes if present', () => {
          var sizesBidderRequest = clone(bidderRequest);
          sizesBidderRequest.bids[0].params.sizes = [55, 57, 59];

          rubiconAdapter.callBids(sizesBidderRequest);

          let query = parseQuery(xhr.requests[0].url.split('?')[1]);

          expect(query['size_id']).to.equal('55');
          expect(query['alt_size_ids']).to.equal('57,59');
        });

        it('should not send a request and register an error bid if no valid sizes', () => {
          var sizesBidderRequest = clone(bidderRequest);
          sizesBidderRequest.bids[0].sizes = [[620, 250], [300, 251]];

          rubiconAdapter.callBids(sizesBidderRequest);

          expect(xhr.requests.length).to.equal(0);

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should not send a request and register an error if no account id is present', () => {
          var noAccountBidderRequest = clone(bidderRequest);
          delete noAccountBidderRequest.bids[0].params.accountId;

          rubiconAdapter.callBids(noAccountBidderRequest);

          expect(xhr.requests.length).to.equal(0);
          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should allow a floor override', () => {
          var floorBidderRequest = clone(bidderRequest);
          floorBidderRequest.bids[0].params.floor = 2;

          rubiconAdapter.callBids(floorBidderRequest);

          let query = parseQuery(xhr.requests[0].url.split('?')[1]);

          expect(query['rp_floor']).to.equal('2');
        });

        it('should send digitrust params', () => {
          window.DigiTrust = {
            getUser: function() {}
          };
          sandbox.stub(window.DigiTrust, 'getUser', () =>
            ({
              success: true,
              identity: {
                privacy: {optout: false},
                id: 'testId',
                keyv: 'testKeyV'
              }
            })
          );

          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let query = request.url.split('?')[1];
          query = parseQuery(query);

          let expectedQuery = {
            'dt.id': 'testId',
            'dt.keyv': 'testKeyV',
            'dt.pref': '0'
          };

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            let value = expectedQuery[key];
            expect(query[key]).to.equal(value);
          });

          delete window.DigiTrust;
        });

        it('should not send digitrust params when DigiTrust not loaded', () => {
          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let query = request.url.split('?')[1];
          query = parseQuery(query);

          let undefinedKeys = ['dt.id', 'dt.keyv'];

          // Test that none of the DigiTrust keys are part of the query
          undefinedKeys.forEach(key => {
            expect(typeof query[key]).to.equal('undefined');
          });
        });

        it('should not send digitrust params due to optout', () => {
          window.DigiTrust = {
            getUser: function() {}
          };
          sandbox.stub(window.DigiTrust, 'getUser', () =>
            ({
              success: true,
              identity: {
                privacy: {optout: true},
                id: 'testId',
                keyv: 'testKeyV'
              }
            })
          );

          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let query = request.url.split('?')[1];
          query = parseQuery(query);

          let undefinedKeys = ['dt.id', 'dt.keyv'];

          // Test that none of the DigiTrust keys are part of the query
          undefinedKeys.forEach(key => {
            expect(typeof query[key]).to.equal('undefined');
          });

          delete window.DigiTrust;
        });

        it('should not send digitrust params due to failure', () => {
          window.DigiTrust = {
            getUser: function() {}
          };
          sandbox.stub(window.DigiTrust, 'getUser', () =>
            ({
              success: false,
              identity: {
                privacy: {optout: false},
                id: 'testId',
                keyv: 'testKeyV'
              }
            })
          );

          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let query = request.url.split('?')[1];
          query = parseQuery(query);

          let undefinedKeys = ['dt.id', 'dt.keyv'];

          // Test that none of the DigiTrust keys are part of the query
          undefinedKeys.forEach(key => {
            expect(typeof query[key]).to.equal('undefined');
          });

          delete window.DigiTrust;
        });

        describe('digiTrustId config', () => {
          var origGetConfig;
          beforeEach(() => {
            window.DigiTrust = {
              getUser: sinon.spy()
            };
            origGetConfig = window.$$PREBID_GLOBAL$$.getConfig;
          });

          afterEach(() => {
            delete window.DigiTrust;
            window.$$PREBID_GLOBAL$$.getConfig = origGetConfig;
          });

          it('should send digiTrustId config params', () => {
            sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
              var config = {
                digiTrustId: {
                  success: true,
                  identity: {
                    privacy: {optout: false},
                    id: 'testId',
                    keyv: 'testKeyV'
                  }
                }
              };
              return config[key];
            });

            rubiconAdapter.callBids(bidderRequest);

            let request = xhr.requests[0];

            let query = request.url.split('?')[1];
            query = parseQuery(query);

            let expectedQuery = {
              'dt.id': 'testId',
              'dt.keyv': 'testKeyV'
            };

            // test that all values above are both present and correct
            Object.keys(expectedQuery).forEach(key => {
              let value = expectedQuery[key];
              expect(query[key]).to.equal(value);
            });

            // should not have called DigiTrust.getUser()
            expect(window.DigiTrust.getUser.notCalled).to.equal(true);
          });

          it('should not send digiTrustId config params due to optout', () => {
            sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
              var config = {
                digiTrustId: {
                  success: true,
                  identity: {
                    privacy: {optout: true},
                    id: 'testId',
                    keyv: 'testKeyV'
                  }
                }
              }
              return config[key];
            });

            rubiconAdapter.callBids(bidderRequest);

            let request = xhr.requests[0];

            let query = request.url.split('?')[1];
            query = parseQuery(query);

            let undefinedKeys = ['dt.id', 'dt.keyv'];

            // Test that none of the DigiTrust keys are part of the query
            undefinedKeys.forEach(key => {
              expect(typeof query[key]).to.equal('undefined');
            });

            // should not have called DigiTrust.getUser()
            expect(window.DigiTrust.getUser.notCalled).to.equal(true);
          });

          it('should not send digiTrustId config params due to failure', () => {
            sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
              var config = {
                digiTrustId: {
                  success: false,
                  identity: {
                    privacy: {optout: false},
                    id: 'testId',
                    keyv: 'testKeyV'
                  }
                }
              }
              return config[key];
            });

            rubiconAdapter.callBids(bidderRequest);

            let request = xhr.requests[0];

            let query = request.url.split('?')[1];
            query = parseQuery(query);

            let undefinedKeys = ['dt.id', 'dt.keyv'];

            // Test that none of the DigiTrust keys are part of the query
            undefinedKeys.forEach(key => {
              expect(typeof query[key]).to.equal('undefined');
            });

            // should not have called DigiTrust.getUser()
            expect(window.DigiTrust.getUser.notCalled).to.equal(true);
          });

          it('should not send digiTrustId config params if they do not exist', () => {
            sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
              var config = {};
              return config[key];
            });

            rubiconAdapter.callBids(bidderRequest);

            let request = xhr.requests[0];

            let query = request.url.split('?')[1];
            query = parseQuery(query);

            let undefinedKeys = ['dt.id', 'dt.keyv'];

            // Test that none of the DigiTrust keys are part of the query
            undefinedKeys.forEach(key => {
              expect(typeof query[key]).to.equal('undefined');
            });

            // should have called DigiTrust.getUser() once
            expect(window.DigiTrust.getUser.calledOnce).to.equal(true);
          });
        });
      });

      describe('for video requests', () => {
        /*
        beforeEach(() => {
          createVideoBidderRequest();

          sandbox.stub(Date, 'now', () =>
            bidderRequest.auctionStart + 100
          );
        });
        */

        it('should make a well-formed video request', () => {
          createVideoBidderRequest();

          sandbox.stub(Date, 'now', () =>
            bidderRequest.auctionStart + 100
          );

          rubiconAdapter.callBids(bidderRequest);

          let request = xhr.requests[0];

          let url = request.url;
          let post = JSON.parse(request.requestBody);

          expect(url).to.equal('//fastlane-adv.rubiconproject.com/v1/auction/video');

          expect(post).to.have.property('page_url').that.is.a('string');
          expect(post.resolution).to.match(/\d+x\d+/);
          expect(post.account_id).to.equal('14062');
          expect(post.integration).to.equal(INTEGRATION);
          expect(post).to.have.property('timeout').that.is.a('number');
          expect(post.timeout < 5000).to.equal(true);
          expect(post.stash_creatives).to.equal(true);

          expect(post).to.have.property('ae_pass_through_parameters');
          expect(post.ae_pass_through_parameters)
            .to.have.property('p_aso.video.ext.skip')
            .that.equals('1');
          expect(post.ae_pass_through_parameters)
            .to.have.property('p_aso.video.ext.skipdelay')
            .that.equals('15');

          expect(post).to.have.property('slots')
            .with.length.of(1);

          let slot = post.slots[0];

          expect(slot.site_id).to.equal('70608');
          expect(slot.zone_id).to.equal('335918');
          expect(slot.position).to.equal('atf');
          expect(slot.floor).to.equal(0.01);
          expect(slot.element_id).to.equal(bidderRequest.bids[0].placementCode);
          expect(slot.name).to.equal(bidderRequest.bids[0].placementCode);
          expect(slot.language).to.equal('en');
          expect(slot.width).to.equal(640);
          expect(slot.height).to.equal(320);
          expect(slot.size_id).to.equal(201);

          expect(slot).to.have.property('inventory').that.is.an('object');
          expect(slot.inventory).to.have.property('rating').that.equals('5-star');
          expect(slot.inventory).to.have.property('prodtype').that.equals('tech');

          expect(slot).to.have.property('keywords')
            .that.is.an('array')
            .of.length(3)
            .that.deep.equals(['a', 'b', 'c']);

          expect(slot).to.have.property('visitor').that.is.an('object');
          expect(slot.visitor).to.have.property('ucat').that.equals('new');
          expect(slot.visitor).to.have.property('lastsearch').that.equals('iphone');
        });

        it('should allow a floor price override', () => {
          createVideoBidderRequest();

          sandbox.stub(Date, 'now', () =>
            bidderRequest.auctionStart + 100
          );

          var floorBidderRequest = clone(bidderRequest);

          // enter an explicit floor price //
          floorBidderRequest.bids[0].params.floor = 3.25;

          rubiconAdapter.callBids(floorBidderRequest);

          let request = xhr.requests[0];
          let post = JSON.parse(request.requestBody);

          let floor = post.slots[0].floor;

          expect(floor).to.equal(3.25);
        });

        it('should trap when no video object is passed in', () => {
          createVideoBidderRequestNoVideo();
          sandbox.stub(Date, 'now', () =>
            bidderRequest.auctionStart + 100
          );

          var floorBidderRequest = clone(bidderRequest);

          rubiconAdapter.callBids(floorBidderRequest);

          expect(xhr.requests.length).to.equal(0);
        });

        it('should get size from bid.sizes too', () => {
          createVideoBidderRequestNoPlayer();
          sandbox.stub(Date, 'now', () =>
            bidderRequest.auctionStart + 100
          );

          var floorBidderRequest = clone(bidderRequest);

          rubiconAdapter.callBids(floorBidderRequest);

          let request = xhr.requests[0];
          let post = JSON.parse(request.requestBody);

          expect(post.slots[0].width).to.equal(300);
          expect(post.slots[0].height).to.equal(250);
        });
      });
    });

    describe('response handler', () => {
      let bids,
        server,
        addBidResponseAction;

      beforeEach(() => {
        bids = [];

        server = sinon.fakeServer.create();

        sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
          bids.push(bid);
          if (addBidResponseAction) {
            addBidResponseAction();
            addBidResponseAction = undefined;
          }
        });
      });

      afterEach(() => {
        server.restore();
      });

      describe('for fastlane', () => {
        it('should handle a success response and sort by cpm', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': [
              {
                'status': 'ok',
                'impression_id': '153dc240-8229-4604-b8f5-256933b9374c',
                'size_id': '15',
                'ad_id': '6',
                'advertiser': 7,
                'network': 8,
                'creative_id': 'crid-9',
                'type': 'script',
                'script': 'alert(\'foo\')',
                'campaign_id': 10,
                'cpm': 0.811,
                'targeting': [
                  {
                    'key': 'rpfl_14062',
                    'values': [
                      '15_tier_all_test'
                    ]
                  }
                ]
              },
              {
                'status': 'ok',
                'impression_id': '153dc240-8229-4604-b8f5-256933b9374d',
                'size_id': '43',
                'ad_id': '7',
                'advertiser': 7,
                'network': 8,
                'creative_id': 'crid-9',
                'type': 'script',
                'script': 'alert(\'foo\')',
                'campaign_id': 10,
                'cpm': 0.911,
                'targeting': [
                  {
                    'key': 'rpfl_14062',
                    'values': [
                      '43_tier_all_test'
                    ]
                  }
                ]
              }
            ]
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledTwice).to.equal(true);

          expect(bids).to.be.lengthOf(2);

          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[0].bidderCode).to.equal('rubicon');
          expect(bids[0].width).to.equal(320);
          expect(bids[0].height).to.equal(50);
          expect(bids[0].cpm).to.equal(0.911);
          expect(bids[0].creative_id).to.equal('crid-9');
          expect(bids[0].ad).to.contain(`alert('foo')`)
            .and.to.contain(`<html>`)
            .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374d'>`);
          expect(bids[0].rubiconTargeting.rpfl_elemid).to.equal('/19968336/header-bid-tag-0');
          expect(bids[0].rubiconTargeting.rpfl_14062).to.equal('43_tier_all_test');

          expect(bids[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[1].bidderCode).to.equal('rubicon');
          expect(bids[1].width).to.equal(300);
          expect(bids[1].height).to.equal(250);
          expect(bids[1].cpm).to.equal(0.811);
          expect(bids[1].creative_id).to.equal('crid-9');
          expect(bids[1].ad).to.contain(`alert('foo')`)
            .and.to.contain(`<html>`)
            .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374c'>`);
          expect(bids[1].rubiconTargeting.rpfl_elemid).to.equal('/19968336/header-bid-tag-0');
          expect(bids[1].rubiconTargeting.rpfl_14062).to.equal('15_tier_all_test');
        });

        it('should be fine with a CPM of 0', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': [{
              'status': 'ok',
              'cpm': 0,
              'size_id': 15
            }]
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
        });

        it('should return currency "USD"', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': [{
              'status': 'ok',
              'cpm': 0,
              'size_id': 15
            }]
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[0].currency).to.equal('USD');
        });

        it('should handle an error with no ads returned', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': []
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should handle an error with bad status', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': [{
              'status': 'not_ok',
            }]
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should handle an error because of malformed json response', () => {
          server.respondWith('{test{');

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should handle error contacting endpoint', () => {
          server.respondWith([404, {}, '']);

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
        });

        it('should not register an error bid when a success call to addBidResponse throws an error', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43
            ],
            'tracking': '',
            'inventory': {},
            'ads': [{
              'status': 'ok',
              'cpm': 0.8,
              'size_id': 15
            }]
          }));

          addBidResponseAction = function() {
            throw new Error('test error');
          };

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          // was calling twice for same bid, but should only call once
          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids).to.be.lengthOf(1);
        });
      });

      describe('for video', () => {
        beforeEach(() => {
          createVideoBidderRequest();
        });

        it('should register a successful bid', () => {
          server.respondWith(JSON.stringify({
            'status': 'ok',
            'ads': {
              '/19968336/header-bid-tag-0': [
                {
                  'status': 'ok',
                  'cpm': 1,
                  'tier': 'tier0200',
                  'targeting': {
                    'rpfl_8000': '201_tier0200',
                    'rpfl_elemid': '/19968336/header-bid-tag-0'
                  },
                  'impression_id': 'a40fe16e-d08d-46a9-869d-2e1573599e0c',
                  'site_id': 88888,
                  'zone_id': 54321,
                  'creative_type': 'video',
                  'creative_depot_url': 'https://fastlane-adv.rubiconproject.com/v1/creative/a40fe16e-d08d-46a9-869d-2e1573599e0c.xml',
                  'ad_id': 999999,
                  'creative_id': 'crid-999999',
                  'size_id': 201,
                  'advertiser': 12345
                }
              ]
            },
            'account_id': 7780
          }));

          rubiconAdapter.callBids(bidderRequest);

          server.respond();

          // was calling twice for same bid, but should only call once
          expect(bidManager.addBidResponse.calledOnce).to.equal(true);

          expect(bids).to.be.lengthOf(1);

          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[0].bidderCode).to.equal('rubicon');
          expect(bids[0].creative_id).to.equal('crid-999999');
          expect(bids[0].cpm).to.equal(1);
          expect(bids[0].descriptionUrl).to.equal('a40fe16e-d08d-46a9-869d-2e1573599e0c');
          expect(bids[0].vastUrl).to.equal(
            'https://fastlane-adv.rubiconproject.com/v1/creative/a40fe16e-d08d-46a9-869d-2e1573599e0c.xml'
          );
          expect(bids[0].impression_id).to.equal('a40fe16e-d08d-46a9-869d-2e1573599e0c');
        });
      });
    });
  });

  describe('user sync', () => {
    let bids;
    let server;
    let clock;
    let addBidResponseAction;
    let rubiconAdapter;
    const emilyUrl = 'https://tap-secure.rubiconproject.com/partner/scripts/rubicon/emily.html?rtb_ext=1';
    let origGetConfig = window.$$PREBID_GLOBAL$$.getConfig;

    beforeEach(() => {
      bids = [];

      server = sinon.fakeServer.create();
      clock = sinon.useFakeTimers();

      sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
        bids.push(bid);
        if (addBidResponseAction) {
          addBidResponseAction();
          addBidResponseAction = undefined;
        }
      });

      server.respondWith(JSON.stringify({
        'status': 'ok',
        'account_id': 14062,
        'site_id': 70608,
        'zone_id': 530022,
        'size_id': 15,
        'alt_size_ids': [
          43
        ],
        'tracking': '',
        'inventory': {},
        'ads': [
          {
            'status': 'ok',
            'impression_id': '153dc240-8229-4604-b8f5-256933b9374c',
            'size_id': '15',
            'ad_id': '6',
            'advertiser': 7,
            'network': 8,
            'creative_id': 9,
            'type': 'script',
            'script': 'alert(\'foo\')',
            'campaign_id': 10,
            'cpm': 0.811,
            'targeting': [
              {
                'key': 'rpfl_14062',
                'values': [
                  '15_tier_all_test'
                ]
              }
            ]
          }
        ]
      }));

      // Remove all Emily iframes for a fresh start
      let iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      for (let i = 0; i < iframes.length; i += 1) {
        iframes[i].outerHTML = '';
      }

      rubiconAdapter = new RubiconAdapter();
    });

    afterEach(() => {
      server.restore();
      clock.restore();
      window.$$PREBID_GLOBAL$$.getConfig = origGetConfig;
    });

    it('should add the Emily iframe by default', () => {
      sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
        var config = { rubicon: {
          userSync: {delay: 10}
        }};
        return config[key];
      });

      rubiconAdapter.callBids(bidderRequest);
      server.respond();

      // move clock to just before the usersync delay, should be no iframe
      clock.tick(9);
      let iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(0);
      // move clock to usersync delay, iframe should have been added
      clock.tick(1);
      iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(1);
    });

    it('should add the Emily iframe when enabled', () => {
      sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
        var config = { rubicon: {
          userSync: {enabled: true, delay: 20}
        }};
        return config[key];
      });
      rubiconAdapter.callBids(bidderRequest);

      server.respond();

      // move clock to just before the usersync delay, should be no iframe
      clock.tick(19);
      let iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(0);
      // move clock to usersync delay, iframe should have been added
      clock.tick(1);
      iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(1);
    });

    it('should not fire more than once', () => {
      sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
        var config = { rubicon: {
          userSync: {enabled: true, delay: 100}
        }};
        return config[key];
      });
      rubiconAdapter.callBids(bidderRequest);

      server.respond();
      // move clock to just before the usersync delay, should be no iframe
      clock.tick(99);
      let iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(0);
      // move clock to usersync delay, iframe should have been added
      clock.tick(1);
      iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(1);

      // Fire again
      rubiconAdapter.callBids(bidderRequest);
      server.respond();
      // move clock to usersync delay, new iframe should not have been added
      clock.tick(100);
      iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(1);
    });

    it('should not add the Emily iframe when disabled', () => {
      sinon.stub(window.$$PREBID_GLOBAL$$, 'getConfig', (key) => {
        var config = { rubicon: {
          userSync: {enabled: false, delay: 50}
        }};
        return config[key];
      });
      rubiconAdapter.callBids(bidderRequest);

      server.respond();

      // move clock to usersync delay, iframe should have been added
      clock.tick(50);
      let iframes = document.querySelectorAll('[src="' + emilyUrl + '"]');
      expect(iframes.length).to.equal(0);
    });
  });
});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
