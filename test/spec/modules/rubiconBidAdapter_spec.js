import {expect} from 'chai';
import {
  spec,
  getPriceGranularity,
  masSizeOrdering,
  resetUserSync,
  classifiedAsVideo,
  resetRubiConf,
  converter
} from 'modules/rubiconBidAdapter.js';
import {parse as parseQuery} from 'querystring';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {find} from 'src/polyfill.js';
import {createEidsArray} from 'modules/userId/eids.js';
import 'modules/schain.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/userId/index.js';
import 'modules/priceFloors.js';
import 'modules/multibid/index.js';
import adapterManager from 'src/adapterManager.js';
import {syncAddFPDToBidderRequest} from '../../helpers/fpd.js';
import { deepClone } from '../../../src/utils.js';

const INTEGRATION = `pbjs_lite_v$prebid.version$`; // $prebid.version$ will be substituted in by gulp in built prebid
const PBS_INTEGRATION = 'pbjs';

describe('the rubicon adapter', function () {
  let sandbox,
    bidderRequest,
    sizeMap,
    getFloorResponse,
    logErrorSpy;

  /**
   * @typedef {import('../../../src/adapters/bidderFactory.js').BidRequest} BidRequest
   * @typedef {Object} sizeMapConverted
   * @property {string} sizeId
   * @property {string} size
   * @property {Array.<Array>} sizeAsArray
   * @property {number} width
   * @property {number} height
   */

  /**
   * @param {Array.<sizeMapConverted>} sizesMapConverted
   * @param {Object} bid
   * @return {sizeMapConverted}
   */
  function getSizeIdForBid(sizesMapConverted, bid) {
    return find(sizesMapConverted, item => (item.width === bid.width && item.height === bid.height));
  }

  /**
   * @param {Array.<Object>} ads
   * @param {sizeMapConverted} size
   * @return {Object}
   */
  function getResponseAdBySize(ads, size) {
    return find(ads, item => item.size_id === size.sizeId);
  }

  /**
   * @param {Array.<BidRequest>} bidRequests
   * @param {sizeMapConverted} size
   * @return {BidRequest}
   */
  function getBidRequestBySize(bidRequests, size) {
    return find(bidRequests, item => item.sizes[0][0] === size.width && item.sizes[0][1] === size.height);
  }

  /**
   * @typedef {Object} overrideProps
   * @property {string} status
   * @property {number} cpm
   * @property {number} zone_id
   * @property {number} ad_id
   * @property {string} creative_id
   * @property {string} targeting_key - rpfl_{id}
   */
  /**
   * @param {number} i - index
   * @param {string} sizeId - id that maps to size
   * @param {Array.<overrideProps>} [indexOverMap]
   * @return {{status: string, cpm: number, zone_id: *, size_id: *, impression_id: *, ad_id: *, creative_id: string, type: string, targeting: *[]}}
   */

  function getBidderRequest() {
    return {
      bidderCode: 'rubicon',
      ortb2: {
        source: {
          tid: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
        }
      },
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
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
              rating: '5-star', // This actually should not be sent to frank!! causes 400
              prodtype: ['tech', 'mobile']
            },
            visitor: {
              ucat: 'new',
              lastsearch: 'iphone',
              likes: ['sports', 'video games']
            },
            position: 'atf',
            referrer: 'localhost',
            latLong: [40.7607823, '111.8910325']
          },
          mediaTypes: {
            banner: [[300, 250]]
          },
          adUnitCode: '/19968336/header-bid-tag-0',
          code: 'div-1',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
          ortb2Imp: {
            ext: {
              tid: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
            }
          },
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };
  };

  function createResponseAdByIndex(i, sizeId, indexOverMap) {
    const overridePropMap = (indexOverMap && indexOverMap[i] && typeof indexOverMap[i] === 'object') ? indexOverMap[i] : {};
    const overrideProps = Object.keys(overridePropMap).reduce((aggregate, key) => {
      aggregate[key] = overridePropMap[key];
      return aggregate;
    }, {});

    const getProp = (propName, defaultValue) => {
      return (overrideProps[propName]) ? overridePropMap[propName] : defaultValue;
    };

    return {
      'status': getProp('status', 'ok'),
      'cpm': getProp('cpm', i / 100),
      'zone_id': getProp('zone_id', i + 1),
      'size_id': sizeId,
      'impression_id': getProp('impression_id', `1-${i}`),
      'ad_id': getProp('ad_id', i + 1),
      'advertiser': i + 1,
      'network': i + 1,
      'creative_id': getProp('creative_id', `crid-${i}`),
      'type': 'script',
      'script': 'alert(\'foo\')',
      'campaign_id': i + 1,
      'targeting': [
        {
          'key': getProp('targeting_key', `rpfl_${i}`),
          'values': ['43_tier_all_test']
        }
      ]
    };
  }

  /**
   * @param {number} i
   * @param {Array.<Array>} size
   * @return {{ params: {accountId: string, siteId: string, zoneId: string }, adUnitCode: string, code: string, sizes: *[], bidId: string, bidderRequestId: string }}
   */
  function createBidRequestByIndex(i, size) {
    return {
      bidder: 'rubicon',
      params: {
        accountId: '14062',
        siteId: '70608',
        zoneId: (i + 1).toString(),
        userId: '12346',
        position: 'atf',
        referrer: 'localhost'
      },
      adUnitCode: `/19968336/header-bid-tag-${i}`,
      code: `div-${i}`,
      sizes: [size],
      bidId: i.toString(),
      bidderRequestId: i.toString(),
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
    };
  }

  /**
   * @param {boolean} [gdprApplies]
   */
  function createGdprBidderRequest(gdprApplies) {
    const bidderRequest = getBidderRequest();
    if (typeof gdprApplies === 'boolean') {
      bidderRequest.gdprConsent = {
        'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'gdprApplies': gdprApplies
      };
    } else {
      bidderRequest.gdprConsent = {
        'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
      };
    }
    return bidderRequest;
  }

  function addUspToBidderRequest(bidderRequest) {
    bidderRequest.uspConsent = '1NYN';
  }

  function createVideoBidderRequest() {
    const bidderRequest = createGdprBidderRequest(true);
    addUspToBidderRequest(bidderRequest);

    let bid = bidderRequest.bids[0];
    bid.mediaTypes = {
      video: {
        context: 'instream',
        mimes: ['video/mp4', 'video/x-flv'],
        api: [2],
        minduration: 15,
        playerSize: [640, 480],
        maxduration: 30,
        startdelay: 0,
        playbackmethod: [2],
        linearity: 1,
        skip: 1,
        skipafter: 15,
        pos: 1,
        protocols: [1, 2, 3, 4, 5, 6]
      }
    };
    bid.params.video = {
      'language': 'en',
      'skip': 1,
      'skipafter': 15,
      'playerHeight': 480,
      'playerWidth': 640,
      'size_id': 201,
    };
    bid.userId = {
      lipb: {lipbid: '0000-1111-2222-3333', segments: ['segA', 'segB']},
      idl_env: '1111-2222-3333-4444',
      tdid: '3000',
      pubcid: '4000',
      pubProvidedId: [{
        source: 'example.com',
        uids: [{
          id: '333333',
          ext: {
            stype: 'ppuid'
          }
        }]
      }, {
        source: 'id-partner.com',
        uids: [{
          id: '4444444'
        }]
      }],
      criteoId: '1111',
    };
    bid.userIdAsEids = [
      {
        'source': 'liveintent.com',
        'uids': [
          {
            'id': '0000-1111-2222-3333',
            'atype': 3
          }
        ],
        'ext': {
          'segments': [
            'segA',
            'segB'
          ]
        }
      },
      {
        'source': 'liveramp.com',
        'uids': [
          {
            'id': '1111-2222-3333-4444',
            'atype': 3
          }
        ]
      },
      {
        'source': 'adserver.org',
        'uids': [
          {
            'id': '3000',
            'atype': 1,
            'ext': {
              'rtiPartner': 'TDID'
            }
          }
        ]
      },
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'id': '4000',
            'atype': 1
          }
        ]
      },
      {
        'source': 'example.com',
        'uids': [
          {
            'id': '333333',
            'ext': {
              'stype': 'ppuid'
            }
          }
        ]
      },
      {
        'source': 'id-partner.com',
        'uids': [
          {
            'id': '4444444'
          }
        ]
      },
      {
        'source': 'criteo.com',
        'uids': [
          {
            'id': '1111',
            'atype': 1
          }
        ]
      }
    ];
    return bidderRequest;
  }

  function removeVideoParamFromBidderRequest(bidderRequest) {
    let bid = bidderRequest.bids[0];
    bid.mediaTypes = {
      video: {
        context: 'instream'
      },
    };
    bid.params.video = false;
  }

  function createVideoBidderRequestOutstream() {
    const bidderRequest = createGdprBidderRequest(false);
    let bid = bidderRequest.bids[0];
    delete bid.sizes;
    bid.mediaTypes = {
      video: {
        context: 'outstream',
        mimes: ['video/mp4', 'video/x-flv'],
        api: [2],
        minduration: 15,
        playerSize: [640, 480],
        maxduration: 30,
        startdelay: 0,
        playbackmethod: [2],
        linearity: 1,
        skip: 1,
        skipafter: 15,
        pos: 1,
        protocols: [1, 2, 3, 4, 5, 6]
      },
    };
    bid.params = {
      accountId: 14062,
      siteId: 70608,
      zoneId: 335918,
      video: {
        'language': 'en',
        'skip': 1,
        'skipafter': 15,
        'playerHeight': 320,
        'playerWidth': 640,
        'size_id': 203
      }
    }
    return bidderRequest;
  }

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    logErrorSpy = sinon.spy(utils, 'logError');
    getFloorResponse = {};
    bidderRequest = {
      bidderCode: 'rubicon',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      ortb2: {
        source: {
          tid: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
        }
      },
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
              rating: '5-star', // This actually should not be sent to frank!! causes 400
              prodtype: ['tech', 'mobile']
            },
            visitor: {
              ucat: 'new',
              lastsearch: 'iphone',
              likes: ['sports', 'video games']
            },
            position: 'atf',
            referrer: 'localhost',
            latLong: [40.7607823, '111.8910325']
          },
          mediaTypes: {
            banner: [[300, 250]]
          },
          adUnitCode: '/19968336/header-bid-tag-0',
          code: 'div-1',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
          ortb2Imp: {
            ext: {
              tid: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
            }
          },
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };

    sizeMap = [
      {sizeId: 1, size: '468x60'},
      {sizeId: 2, size: '728x90'},
      {sizeId: 5, size: '120x90'},
      {sizeId: 8, size: '120x600'},
      {sizeId: 9, size: '160x600'},
      {sizeId: 10, size: '300x600'},
      {sizeId: 13, size: '200x200'},
      {sizeId: 14, size: '250x250'},
      {sizeId: 15, size: '300x250'},
      {sizeId: 16, size: '336x280'},
      {sizeId: 19, size: '300x100'},
      {sizeId: 31, size: '980x120'},
      {sizeId: 32, size: '250x360'}
      // Create convenience properties for [sizeAsArray, width, height] by parsing the size string
    ].map(item => {
      const sizeAsArray = item.size.split('x').map(s => parseInt(s));
      return {
        sizeId: item.sizeId,
        size: item.size,
        sizeAsArray: sizeAsArray.slice(),
        width: sizeAsArray[0],
        height: sizeAsArray[1]
      };
    });
  });

  afterEach(function () {
    sandbox.restore();
    utils.logError.restore();
    config.resetConfig();
    resetRubiConf();
    delete $$PREBID_GLOBAL$$.installedModules;
  });

  describe('MAS mapping / ordering', function () {
    it('should sort values without any MAS priority sizes in regular ascending order', function () {
      let ordering = masSizeOrdering([126, 43, 65, 16]);
      expect(ordering).to.deep.equal([16, 43, 65, 126]);
    });

    it('should sort MAS priority sizes in the proper order w/ rest ascending', function () {
      let ordering = masSizeOrdering([43, 9, 65, 15, 16, 126]);
      expect(ordering).to.deep.equal([15, 9, 16, 43, 65, 126]);

      ordering = masSizeOrdering([43, 15, 9, 65, 16, 126, 2]);
      expect(ordering).to.deep.equal([15, 2, 9, 16, 43, 65, 126]);

      ordering = masSizeOrdering([8, 43, 9, 65, 16, 126, 2]);
      expect(ordering).to.deep.equal([2, 9, 8, 16, 43, 65, 126]);
    });
  });

  describe('buildRequests implementation', function () {
    describe('for requests', function () {
      describe('to fastlane', function () {
        it('should make a well-formed request object', function () {
          sandbox.stub(Math, 'random').callsFake(() => 0.1);
          let duplicate = Object.assign(bidderRequest);
          duplicate.bids[0].params.floor = 0.01;

          let [request] = spec.buildRequests(duplicate.bids, duplicate);
          let data = parseQuery(request.data);

          expect(request.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');

          let expectedQuery = {
            'account_id': '14062',
            'site_id': '70608',
            'zone_id': '335918',
            'size_id': '15',
            'alt_size_ids': '43',
            'p_pos': 'atf',
            'rp_floor': '0.01',
            'rp_secure': /[01]/,
            'rand': '0.1',
            'tk_flint': INTEGRATION,
            'x_source.tid': 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
            'p_screen_res': /\d+x\d+/,
            'tk_user_key': '12346',
            'kw': 'a,b,c',
            'tg_v.ucat': 'new',
            'tg_v.lastsearch': 'iphone',
            'tg_v.likes': 'sports,video games',
            'tg_i.rating': '5-star',
            'tg_i.prodtype': 'tech,mobile',
            'tg_fl.eid': 'div-1',
            'rf': 'localhost'
          };

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            let value = expectedQuery[key];
            if (value instanceof RegExp) {
              expect(data[key]).to.match(value);
            } else {
              expect(data[key]).to.equal(value);
            }
          });
        });

        it('should correctly send hard floors when getFloor function is present and returns valid floor', function () {
          // default getFloor response is empty object so should not break and not send hard_floor
          bidderRequest.bids[0].getFloor = () => getFloorResponse;
          sinon.spy(bidderRequest.bids[0], 'getFloor');
          let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

          // make sure banner bid called with right stuff
          expect(
            bidderRequest.bids[0].getFloor.calledWith({
              currency: 'USD',
              mediaType: 'banner',
              size: '*'
            })
          ).to.be.true;

          let data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.be.undefined;

          // not an object should work and not send
          getFloorResponse = undefined;
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.be.undefined;

          // make it respond with a non USD floor should not send it
          getFloorResponse = {currency: 'EUR', floor: 1.0};
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.be.undefined;

          // make it respond with a non USD floor should not send it
          getFloorResponse = {currency: 'EUR'};
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.be.undefined;

          // make it respond with USD floor and string floor
          getFloorResponse = {currency: 'USD', floor: '1.23'};
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.equal('1.23');

          // make it respond with USD floor and num floor
          getFloorResponse = {currency: 'USD', floor: 1.23};
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);
          expect(data.rp_hard_floor).to.equal('1.23');
        });

        it('should send rp_maxbids to AE if rubicon multibid config exists', function () {
          var multibidRequest = utils.deepClone(bidderRequest);
          multibidRequest.bidLimit = 5;

          let [request] = spec.buildRequests(multibidRequest.bids, multibidRequest);
          let data = parseQuery(request.data);

          expect(data['rp_maxbids']).to.equal('5');
        });

        it('should not send p_pos to AE if not params.position specified', function () {
          var noposRequest = utils.deepClone(bidderRequest);
          delete noposRequest.bids[0].params.position;

          let [request] = spec.buildRequests(noposRequest.bids, noposRequest);
          let data = parseQuery(request.data);

          expect(data['site_id']).to.equal('70608');
          expect(data['p_pos']).to.equal(undefined);
        });

        it('should not send p_pos to AE if not mediaTypes.banner.pos is invalid', function () {
          var bidRequest = utils.deepClone(bidderRequest);
          bidRequest.bids[0].mediaTypes = {
            banner: {
              pos: 5
            }
          };
          delete bidRequest.bids[0].params.position;

          let [request] = spec.buildRequests(bidRequest.bids, bidRequest);
          let data = parseQuery(request.data);

          expect(data['site_id']).to.equal('70608');
          expect(data['p_pos']).to.equal(undefined);
        });

        it('should send p_pos to AE if mediaTypes.banner.pos is valid', function () {
          var bidRequest = utils.deepClone(bidderRequest);
          bidRequest.bids[0].mediaTypes = {
            banner: {
              pos: 1
            }
          };
          delete bidRequest.bids[0].params.position;

          let [request] = spec.buildRequests(bidRequest.bids, bidRequest);
          let data = parseQuery(request.data);

          expect(data['site_id']).to.equal('70608');
          expect(data['p_pos']).to.equal('atf');
        });

        it('should not send p_pos to AE if not params.position is invalid', function () {
          var badposRequest = utils.deepClone(bidderRequest);
          badposRequest.bids[0].params.position = 'bad';

          let [request] = spec.buildRequests(badposRequest.bids, badposRequest);
          let data = parseQuery(request.data);

          expect(data['site_id']).to.equal('70608');
          expect(data['p_pos']).to.equal(undefined);
        });

        it('should correctly send p_pos in sra fashion', function() {
          config.setConfig({rubicon: {singleRequest: true}});
          // first one is atf
          var sraPosRequest = utils.deepClone(bidderRequest);

          // second is not present
          const bidCopy = utils.deepClone(sraPosRequest.bids[0]);
          delete bidCopy.params.position;
          sraPosRequest.bids.push(bidCopy);

          // third is btf
          const bidCopy1 = utils.deepClone(sraPosRequest.bids[0]);
          bidCopy1.params.position = 'btf';
          sraPosRequest.bids.push(bidCopy1);

          // fourth is invalid (aka not atf or btf)
          const bidCopy2 = utils.deepClone(sraPosRequest.bids[0]);
          bidCopy2.params.position = 'unknown';
          sraPosRequest.bids.push(bidCopy2);

          // fifth is not present
          const bidCopy3 = utils.deepClone(sraPosRequest.bids[0]);
          delete bidCopy3.params.position;
          sraPosRequest.bids.push(bidCopy3);

          let [request] = spec.buildRequests(sraPosRequest.bids, sraPosRequest);
          let data = parseQuery(request.data);

          expect(data['p_pos']).to.equal('atf;;btf;;');
        });

        it('should correctly send cdep signal when requested', () => {
          var badposRequest = utils.deepClone(bidderRequest);
          badposRequest.bids[0].ortb2 = {device: {ext: {cdep: 3}}};

          let [request] = spec.buildRequests(badposRequest.bids, badposRequest);
          let data = parseQuery(request.data);

          expect(data['o_cdep']).to.equal('3');
        });

        it('ad engine query params should be ordered correctly', function () {
          sandbox.stub(Math, 'random').callsFake(() => 0.1);
          let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

          const referenceOrdering = ['account_id', 'site_id', 'zone_id', 'size_id', 'alt_size_ids', 'p_pos', 'rf', 'p_geo.latitude', 'p_geo.longitude', 'kw', 'tg_v.ucat', 'tg_v.lastsearch', 'tg_v.likes', 'tg_i.rating', 'tg_i.prodtype', 'tk_flint', 'x_source.tid', 'l_pb_bid_id', 'p_screen_res', 'rp_secure', 'tk_user_key', 'x_imp.ext.tid', 'tg_fl.eid', 'rp_maxbids', 'slots', 'rand'];

          request.data.split('&').forEach((item, i) => {
            expect(item.split('=')[0]).to.equal(referenceOrdering[i]);
          });
        });

        it('should make a well-formed request object without latLong', function () {
          let expectedQuery = {
            'account_id': '14062',
            'site_id': '70608',
            'zone_id': '335918',
            'size_id': '15',
            'alt_size_ids': '43',
            'p_pos': 'atf',
            'rp_secure': /[01]/,
            'rand': '0.1',
            'tk_flint': INTEGRATION,
            'x_source.tid': 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
            'x_imp.ext.tid': 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
            'p_screen_res': /\d+x\d+/,
            'tk_user_key': '12346',
            'kw': 'a,b,c',
            'tg_v.ucat': 'new',
            'tg_v.lastsearch': 'iphone',
            'tg_v.likes': 'sports,video games',
            'tg_i.rating': '5-star',
            'tg_i.prodtype': 'tech,mobile',
            'rf': 'localhost',
            'p_geo.latitude': undefined,
            'p_geo.longitude': undefined
          };

          sandbox.stub(Math, 'random').callsFake(() => 0.1);

          delete bidderRequest.bids[0].params.latLong;
          let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          let data = parseQuery(request.data);

          expect(request.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            let value = expectedQuery[key];
            if (value instanceof RegExp) {
              expect(data[key]).to.match(value);
            } else {
              expect(data[key]).to.equal(value);
            }
          });

          bidderRequest.bids[0].params.latLong = [];
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          data = parseQuery(request.data);

          expect(request.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            let value = expectedQuery[key];
            if (value instanceof RegExp) {
              expect(data[key]).to.match(value);
            } else {
              expect(data[key]).to.equal(value);
            }
          });
        });

        it('should add referer info to request data', function () {
          let refererInfo = {
            page: 'https://www.prebid.org',
            reachedTop: true,
            numIframes: 1,
            stack: [
              'https://www.prebid.org/page.html',
              'https://www.prebid.org/iframe1.html',
            ]
          };

          bidderRequest = Object.assign({refererInfo}, bidderRequest);
          delete bidderRequest.bids[0].params.referrer;
          let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

          expect(parseQuery(request.data).rf).to.exist;
          expect(parseQuery(request.data).rf).to.equal('https://www.prebid.org');
        });

        it('page_url should use params.referrer, bidderRequest.refererInfo in that order', function () {
          let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          expect(parseQuery(request.data).rf).to.equal('localhost');

          delete bidderRequest.bids[0].params.referrer;
          let refererInfo = {page: 'https://www.prebid.org'};
          bidderRequest = Object.assign({refererInfo}, bidderRequest);
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          expect(parseQuery(request.data).rf).to.equal('https://www.prebid.org');

          bidderRequest.refererInfo.page = 'http://www.prebid.org';
          bidderRequest.bids[0].params.secure = true;
          [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          expect(parseQuery(request.data).rf).to.equal('https://www.prebid.org');
        });

        it('should use rubicon sizes if present (including non-mappable sizes)', function () {
          var sizesBidderRequest = utils.deepClone(bidderRequest);
          sizesBidderRequest.bids[0].params.sizes = [55, 57, 59, 801];

          let [request] = spec.buildRequests(sizesBidderRequest.bids, sizesBidderRequest);
          let data = parseQuery(request.data);

          expect(data['size_id']).to.equal('55');
          expect(data['alt_size_ids']).to.equal('57,59,801');
        });

        it('should not validate bid request if no valid sizes', function () {
          var sizesBidderRequest = utils.deepClone(bidderRequest);
          sizesBidderRequest.bids[0].sizes = [[621, 250], [300, 251]];

          let result = spec.isBidRequestValid(sizesBidderRequest.bids[0]);

          expect(result).to.equal(false);
        });

        it('should not validate bid request if no account id is present', function () {
          var noAccountBidderRequest = utils.deepClone(bidderRequest);
          delete noAccountBidderRequest.bids[0].params.accountId;

          let result = spec.isBidRequestValid(noAccountBidderRequest.bids[0]);

          expect(result).to.equal(false);
        });

        it('should allow a floor override', function () {
          var floorBidderRequest = utils.deepClone(bidderRequest);
          floorBidderRequest.bids[0].params.floor = 2;

          let [request] = spec.buildRequests(floorBidderRequest.bids, floorBidderRequest);
          let data = parseQuery(request.data);

          expect(data['rp_floor']).to.equal('2');
        });

        describe('GDPR consent config', function () {
          it('should send "gdpr" and "gdpr_consent", when gdprConsent defines consentString and gdprApplies', function () {
            const bidderRequest = createGdprBidderRequest(true);
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['gdpr']).to.equal('1');
            expect(data['gdpr_consent']).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
          });

          it('should send only "gdpr_consent", when gdprConsent defines only consentString', function () {
            const bidderRequest = createGdprBidderRequest();
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['gdpr_consent']).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
            expect(data['gdpr']).to.equal(undefined);
          });

          it('should not send GDPR params if gdprConsent is not defined', function () {
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['gdpr']).to.equal(undefined);
            expect(data['gdpr_consent']).to.equal(undefined);
          });

          it('should set "gdpr" value as 1 or 0, using "gdprApplies" value of either true/false', function () {
            let bidderRequest = createGdprBidderRequest(true);
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);
            expect(data['gdpr']).to.equal('1');

            bidderRequest = createGdprBidderRequest(false);
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            data = parseQuery(request.data);
            expect(data['gdpr']).to.equal('0');
          });
        });

        describe('USP Consent', function () {
          it('should send us_privacy if bidderRequest has a value for uspConsent', function () {
            addUspToBidderRequest(bidderRequest);
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['us_privacy']).to.equal('1NYN');
          });

          it('should not send us_privacy if bidderRequest has no uspConsent value', function () {
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['us_privacy']).to.equal(undefined);
          });
        });

        describe('GPP Consent', function () {
          it('should send gpp information if bidderRequest has a value for gppConsent', function () {
            bidderRequest.gppConsent = {
              gppString: 'consent',
              applicableSections: 2
            };
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);
            delete bidderRequest.gppConsent;

            expect(data['gpp']).to.equal('consent');
            expect(data['gpp_sid']).to.equal('2');
          });

          it('should not send gpp information if bidderRequest does not have a value for gppConsent', function () {
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            expect(data['gpp']).to.equal(undefined);
            expect(data['gpp_sid']).to.equal(undefined);
          });
        });

        describe('first party data', function () {
          it('should not have any tg_v or tg_i params if all are undefined', function () {
            let params = {
              inventory: {
                rating: null,
                prodtype: undefined
              },
              visitor: {
                ucat: undefined,
                lastsearch: null,
                likes: undefined
              },
            };

            // Overwrite the bidder request params with the above ones
            Object.assign(bidderRequest.bids[0].params, params);

            // get the built request
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            // make sure that no tg_v or tg_i keys are present in the request
            let matchingExp = RegExp('^tg_(i|v)\..*$')
            Object.keys(data).forEach(key => {
              expect(key).to.not.match(matchingExp);
            });
          });

          it('should contain valid params when some are undefined', function () {
            let params = {
              inventory: {
                rating: undefined,
                prodtype: ['tech', 'mobile']
              },
              visitor: {
                ucat: null,
                lastsearch: 'iphone',
                likes: undefined
              },
            };
            let undefinedKeys = ['tg_i.rating', 'tg_v.ucat', 'tg_v.likes']
            let expectedQuery = {
              'tg_v.lastsearch': 'iphone',
              'tg_i.prodtype': 'tech,mobile',
            }

            // Overwrite the bidder request params with the above ones
            Object.assign(bidderRequest.bids[0].params, params);

            // get the built request
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let data = parseQuery(request.data);

            // make sure none of the undefined keys are in query
            undefinedKeys.forEach(key => {
              expect(typeof data[key]).to.equal('undefined');
            });

            // make sure the expected and defined ones do show up still
            Object.keys(expectedQuery).forEach(key => {
              let value = expectedQuery[key];
              expect(data[key]).to.equal(value);
            });
          });

          it('should merge first party data from getConfig with the bid params, if present', () => {
            const site = {
              keywords: 'e,f',
              rating: '4-star',
              ext: {
                data: {
                  page: 'home'
                }
              },
              content: {
                data: [{
                  'name': 'www.dataprovider1.com',
                  'ext': { 'segtax': 1 },
                  'segment': [
                    { 'id': '987' }
		    ]
		  }, {
		    'name': 'www.dataprovider1.com',
		    'ext': { 'segtax': 2 },
		    'segment': [
		      { 'id': '432' }
		    ]
                }, {
                  'name': 'www.dataprovider1.com',
                  'ext': { 'segtax': 5 },
                  'segment': [
                    { 'id': '55' }
                  ]
                }, {
                  'name': 'www.dataprovider1.com',
                  'ext': { 'segtax': 6 },
                  'segment': [
                    { 'id': '66' }
                  ]
                }
                ]
              }
            };
            const user = {
              data: [{
                'name': 'www.dataprovider1.com',
                'ext': { 'segtax': 4 },
                'segment': [
                  { 'id': '687' },
                  { 'id': '123' }
                ]
              }],
              gender: 'M',
              yob: '1984',
              geo: {country: 'ca'},
              keywords: 'd',
              ext: {
                data: {
                  age: 40
                }
              }
            };

            const ortb2 = {
              site,
              user
            }

            const expectedQuery = {
              'kw': 'a,b,c,d',
              'tg_v.ucat': 'new',
              'tg_v.lastsearch': 'iphone',
              'tg_v.likes': 'sports,video games',
              'tg_v.gender': 'M',
              'tg_v.age': '40',
              'tg_v.iab': '687,123',
              'tg_i.iab': '987,432,55,66',
              'tg_v.yob': '1984',
              'tg_i.rating': '4-star,5-star',
              'tg_i.page': 'home',
              'tg_i.prodtype': 'tech,mobile',
            };

            // get the built request
            let [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2})), bidderRequest);
            let data = parseQuery(request.data);

            // make sure that tg_v, tg_i, and kw values are correct
            Object.keys(expectedQuery).forEach(key => {
              let value = expectedQuery[key];
              expect(data[key]).to.deep.equal(value);
            });
          });
        });

        describe('singleRequest config', function () {
          it('should group all bid requests with the same site id', function () {
            sandbox.stub(Math, 'random').callsFake(() => 0.1);

            config.setConfig({rubicon: {singleRequest: true}});

            const expectedQuery = {
              'account_id': '14062',
              'site_id': '70608',
              'zone_id': '335918',
              'size_id': '15',
              'alt_size_ids': '43',
              'p_pos': 'atf',
              'rp_secure': /[01]/,
              'rand': '0.1',
              'tk_flint': INTEGRATION,
              'x_source.tid': 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
              'p_screen_res': /\d+x\d+/,
              'tk_user_key': '12346',
              'kw': 'a,b,c',
              'tg_v.ucat': 'new',
              'tg_v.lastsearch': 'iphone',
              'tg_v.likes': 'sports,video games',
              'tg_i.rating': '5-star',
              'tg_i.prodtype': 'tech,mobile',
              'tg_fl.eid': 'div-1',
              'rf': 'localhost'
            };

            const bidCopy = utils.deepClone(bidderRequest.bids[0]);
            bidCopy.params.siteId = '70608';
            bidCopy.params.zoneId = '1111';
            bidderRequest.bids.push(bidCopy);

            const bidCopy2 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy2.params.siteId = '99999';
            bidCopy2.params.zoneId = '2222';
            bidderRequest.bids.push(bidCopy2);

            const bidCopy3 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy3.params.siteId = '99999';
            bidCopy3.params.zoneId = '3333';
            bidderRequest.bids.push(bidCopy3);

            const serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // array length should match the num of unique 'siteIds'
            expect(serverRequests).to.be.a('array');
            expect(serverRequests).to.have.lengthOf(2);

            // collect all bidRequests so order can be checked against the url param slot order
            const bidRequests = serverRequests.reduce((aggregator, item) => aggregator.concat(item.bidRequest), []);
            let bidRequestIndex = 0;

            serverRequests.forEach(item => {
              expect(item).to.be.a('object');
              expect(item).to.have.property('method');
              expect(item).to.have.property('url');
              expect(item).to.have.property('data');
              expect(item).to.have.property('bidRequest');

              expect(item.method).to.equal('GET');
              expect(item.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
              expect(item.data).to.be.a('string');

              // 'bidRequest' type must be 'array' if SRA enabled
              expect(item.bidRequest).to.be.a('array').to.have.lengthOf(2);

              item.bidRequest.forEach((bidRequestItem, i, array) => {
                expect(bidRequestItem).to.be.a('object');
                // every 'siteId' values need to match
                expect(bidRequestItem.params.siteId).to.equal(array[0].params.siteId);
              });

              const data = parseQuery(item.data);

              Object.keys(expectedQuery).forEach(key => {
                expect(data).to.have.property(key);

                // extract semicolon delineated values
                const params = data[key].split(';');

                // skip value test for site and zone ids
                if (key !== 'site_id' && key !== 'zone_id') {
                  if (expectedQuery[key] instanceof RegExp) {
                    params.forEach(paramItem => {
                      expect(paramItem).to.match(expectedQuery[key]);
                    });
                  } else {
                    expect(params).to.contain(expectedQuery[key]);
                  }
                }

                // check parsed url data list order with requestBid list, items must have same index in both lists
                if (key === 'zone_id') {
                  params.forEach((p) => {
                    expect(bidRequests[bidRequestIndex]).to.be.a('object');
                    expect(bidRequests[bidRequestIndex].params).to.be.a('object');

                    // 'zone_id' is used to verify so each bid must have a unique 'zone_id'
                    expect(p).to.equal(bidRequests[bidRequestIndex].params.zoneId);

                    // increment to next bidRequest index having verified that item positions match in url params and bidRequest lists
                    bidRequestIndex++;
                  });
                }
              });
            });
          });

          it('should not send more than 10 bids in a request (split into separate requests with <= 10 bids each)', function () {
            config.setConfig({rubicon: {singleRequest: true}});
            let serverRequests;
            let data;

            // TEST '10' BIDS, add 9 to 1 existing bid
            for (let i = 0; i < 9; i++) {
              let bidCopy = utils.deepClone(bidderRequest.bids[0]);
              bidCopy.params.zoneId = `${i}0000`;
              bidderRequest.bids.push(bidCopy);
            }
            serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);
            // '10' bids per SRA request: so there should be 1 request
            expect(serverRequests.length).to.equal(1);
            // and that one request should have data from 10 bids
            expect(serverRequests[0].bidRequest).to.have.lengthOf(10);
            // check that slots param value matches
            expect(serverRequests[0].data.indexOf('&slots=10&') !== -1).to.equal(true);
            // check that zone_id has 10 values (since all zone_ids are unique all should exist in get param)
            data = parseQuery(serverRequests[0].data);
            expect(data).to.be.a('object');
            expect(data).to.have.property('zone_id');
            expect(data.zone_id.split(';')).to.have.lengthOf(10);

            // TEST '100' BIDS, add 90 to the previously added 10
            for (let i = 0; i < 90; i++) {
              let bidCopy = utils.deepClone(bidderRequest.bids[0]);
              bidCopy.params.zoneId = `${(i + 10)}0000`;
              bidderRequest.bids.push(bidCopy);
            }
            serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);
            // '100' bids: should be '10' SRA requests
            expect(serverRequests.length).to.equal(10);
            // check that each request has 10 items
            serverRequests.forEach((serverRequest) => {
              // and that one request should have data from 10 bids
              expect(serverRequest.bidRequest).to.have.lengthOf(10);
              // check that slots param value matches
              expect(serverRequest.data.indexOf('&slots=10&') !== -1).to.equal(true);
            });
          });

          it('should still use single request if other rubicon configs are set after', function () {
            // set single request to true
            config.setConfig({ rubicon: { singleRequest: true } });

            // execute some other rubicon setConfig
            config.setConfig({ rubicon: { netRevenue: true } });

            const bidCopy = utils.deepClone(bidderRequest.bids[0]);
            bidderRequest.bids.push(bidCopy);
            bidderRequest.bids.push(bidCopy);
            bidderRequest.bids.push(bidCopy);

            let serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // should have 1 request only
            expect(serverRequests).that.is.an('array').of.length(1);

            // get the built query
            let data = parseQuery(serverRequests[0].data);

            // num slots should be 4
            expect(data.slots).to.equal('4');
          });

          it('should not group bid requests if singleRequest does not equal true', function () {
            config.setConfig({rubicon: {singleRequest: false}});

            const bidCopy = utils.deepClone(bidderRequest.bids[0]);
            bidderRequest.bids.push(bidCopy);

            const bidCopy2 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy2.params.siteId = '32001';
            bidderRequest.bids.push(bidCopy2);

            const bidCopy3 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy3.params.siteId = '32001';
            bidderRequest.bids.push(bidCopy3);

            let serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(serverRequests).that.is.an('array').of.length(4);
          });

          it('should not group video bid requests', function () {
            config.setConfig({rubicon: {singleRequest: true}});

            const bidCopy = utils.deepClone(bidderRequest.bids[0]);
            bidderRequest.bids.push(bidCopy);

            const bidCopy2 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy2.params.siteId = '32001';
            bidderRequest.bids.push(bidCopy2);

            const bidCopy3 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy3.params.siteId = '32001';
            bidderRequest.bids.push(bidCopy3);

            const bidCopy4 = utils.deepClone(bidderRequest.bids[0]);
            bidCopy4.mediaTypes = {
              video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/x-ms-wmv'],
                protocols: [2, 5],
                maxduration: 30,
                linearity: 1,
                api: [2]
              }
            };
            bidCopy4.params.video = {
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
            bidderRequest.bids.push(bidCopy4);

            let serverRequests = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(serverRequests).that.is.an('array').of.length(3);
          });
        });

        describe('user id config', function () {
          it('should send tpid_tdid when userIdAsEids contains unifiedId', function () {
            const clonedBid = utils.deepClone(bidderRequest.bids[0]);
            clonedBid.userId = {
              tdid: 'abcd-efgh-ijkl-mnop-1234'
            };
            clonedBid.userIdAsEids = [
              {
                'source': 'adserver.org',
                'uids': [
                  {
                    'id': 'abcd-efgh-ijkl-mnop-1234',
                    'atype': 1,
                    'ext': {
                      'rtiPartner': 'TDID'
                    }
                  }
                ]
              }
            ];
            let [request] = spec.buildRequests([clonedBid], bidderRequest);
            let data = parseQuery(request.data);

            expect(data['tpid_tdid']).to.equal('abcd-efgh-ijkl-mnop-1234');
            expect(data['eid_adserver.org']).to.equal('abcd-efgh-ijkl-mnop-1234');
          });

          describe('LiveIntent support', function () {
            it('should send tpid_liveintent.com when userIdAsEids contains liveintentId', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                lipb: {
                  lipbid: '0000-1111-2222-3333',
                  segments: ['segA', 'segB']
                }
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'liveintent.com',
                  'uids': [
                    {
                      'id': '0000-1111-2222-3333',
                      'atype': 3
                    }
                  ],
                  'ext': {
                    'segments': [
                      'segA',
                      'segB'
                    ]
                  }
                }
              ];
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['tpid_liveintent.com']).to.equal('0000-1111-2222-3333');
              expect(data['eid_liveintent.com']).to.equal('0000-1111-2222-3333');
              expect(data['tg_v.LIseg']).to.equal('segA,segB');
            });

            it('should send tg_v.LIseg when userIdAsEids contains liveintentId with ext.segments as array', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                lipb: {
                  lipbid: '1111-2222-3333-4444',
                  segments: ['segD', 'segE']
                }
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'liveintent.com',
                  'uids': [
                    {
                      'id': '1111-2222-3333-4444',
                      'atype': 3
                    }
                  ],
                  'ext': {
                    'segments': [
                      'segD',
                      'segE'
                    ]
                  }
                }
              ]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              const unescapedData = unescape(request.data);

              expect(unescapedData.indexOf('&tpid_liveintent.com=1111-2222-3333-4444&') !== -1).to.equal(true);
              expect(unescapedData.indexOf('&tg_v.LIseg=segD,segE&') !== -1).to.equal(true);
            });
          });

          describe('LiveRamp support', function () {
            it('should send x_liverampidl when userIdAsEids contains liverampId', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                idl_env: '1111-2222-3333-4444'
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'liveramp.com',
                  'uids': [
                    {
                      'id': '1111-2222-3333-4444',
                      'atype': 3
                    }
                  ]
                }
              ]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['x_liverampidl']).to.equal('1111-2222-3333-4444');
            });
          });

          describe('pubcid support', function () {
            it('should send eid_pubcid.org when userIdAsEids contains pubcid', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                pubcid: '1111'
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'pubcid.org',
                  'uids': [
                    {
                      'id': '1111',
                      'atype': 1
                    }
                  ]
                }
              ]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['eid_pubcid.org']).to.equal('1111^1');
            });
          });

          describe('Criteo support', function () {
            it('should send eid_criteo.com when userIdAsEids contains criteo', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                criteoId: '1111'
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'criteo.com',
                  'uids': [
                    {
                      'id': '1111',
                      'atype': 1
                    }
                  ]
                }
              ]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['eid_criteo.com']).to.equal('1111^1');
            });
          });

          describe('pubProvidedId support', function () {
            it('should send pubProvidedId when userIdAsEids contains pubProvidedId ids', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                pubProvidedId: [{
                  source: 'example.com',
                  uids: [{
                    id: '11111',
                    ext: {
                      stype: 'ppuid'
                    }
                  }]
                }, {
                  source: 'id-partner.com',
                  uids: [{
                    id: '222222'
                  }]
                }]
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'example.com',
                  'uids': [
                    {
                      'id': '11111',
                      'ext': {
                        'stype': 'ppuid'
                      }
                    }
                  ]
                },
                {
                  'source': 'id-partner.com',
                  'uids': [
                    {
                      'id': '222222'
                    }
                  ]
                }
              ];
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['ppuid']).to.equal('11111');
            });
          });

          describe('ID5 support', function () {
            it('should send ID5 id when userIdAsEids contains ID5', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                id5id: {
                  uid: '11111',
                  ext: {
                    linkType: '22222'
                  }
                }
              };
              clonedBid.userIdAsEids = [
                {
                  'source': 'id5-sync.com',
                  'uids': [
                    {
                      'id': '11111',
                      'atype': 1,
                      'ext': {
                        'linkType': '22222'
                      }
                    }
                  ]
                }
              ];
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['eid_id5-sync.com']).to.equal('11111^1^22222');
            });
          });

          describe('UserID catchall support', function () {
            it('should send user id with generic format', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              // Hardcoding userIdAsEids since createEidsArray returns empty array if source not found in eids.js
              clonedBid.userIdAsEids = [{
                source: 'catchall',
                uids: [{
                  id: '11111',
                  atype: 2
                }]
              }]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['eid_catchall']).to.equal('11111^2');
            });

            it('should send rubiconproject special case', function () {
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              // Hardcoding userIdAsEids since createEidsArray returns empty array if source not found in eids.js
              clonedBid.userIdAsEids = [{
                source: 'rubiconproject.com',
                uids: [{
                  id: 'some-cool-id',
                  atype: 3
                }]
              }]
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['eid_rubiconproject.com']).to.equal('some-cool-id');
            });
          });

          describe('Config user.id support', function () {
            it('should send ppuid when config defines user.id', function () {
              config.setConfig({user: {id: '123'}});
              const clonedBid = utils.deepClone(bidderRequest.bids[0]);
              clonedBid.userId = {
                pubcid: '1111'
              };
              let [request] = spec.buildRequests([clonedBid], bidderRequest);
              let data = parseQuery(request.data);

              expect(data['ppuid']).to.equal('123');
            });
          });
        });

        describe('Prebid AdSlot', function () {
          beforeEach(function () {
            // enforce that the bid at 0 does not have a 'context' property
            if (bidderRequest.bids[0].hasOwnProperty('ortb2Imp')) {
              delete bidderRequest.bids[0].ortb2Imp;
            }
          });

          it('should not send \"tg_i.pbadslot’\" if \"ortb2Imp.ext.data\" object is not valid', function () {
            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.pbadslot’');
          });

          it('should not send \"tg_i.pbadslot’\" if \"ortb2Imp.ext.data.pbadslot\" is undefined', function () {
            bidderRequest.bids[0].ortb2Imp = {};

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.pbadslot’');
          });

          it('should not send \"tg_i.pbadslot’\" if \"ortb2Imp.ext.data.pbadslot\" value is an empty string', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  pbadslot: ''
                }
              }
            };

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.pbadslot');
          });

          it('should send \"tg_i.pbadslot\" if \"ortb2Imp.ext.data.pbadslot\" value is a valid string', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  pbadslot: 'abc'
                }
              }
            }

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.have.property('tg_i.pbadslot');
            expect(data['tg_i.pbadslot']).to.equal('abc');
          });

          it('should send \"tg_i.pbadslot\" if \"ortb2Imp.ext.data.pbadslot\" value is a valid string', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  pbadslot: '/a/b/c'
                }
              }
            }

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.have.property('tg_i.pbadslot');
            expect(data['tg_i.pbadslot']).to.equal('/a/b/c');
          });

          it('should send gpid as p_gpid if valid', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                gpid: '/1233/sports&div1'
              }
            }

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.have.property('p_gpid');
            expect(data['p_gpid']).to.equal('/1233/sports&div1');
          });

          describe('Pass DSA signals', function() {
            const ortb2 = {
              regs: {
                ext: {
                  dsa: {
                    dsarequired: 3,
                    pubrender: 0,
                    datatopub: 2,
                    transparency: [
                      {
                        domain: 'testdomain.com',
                        dsaparams: [1],
                      },
                      {
                        domain: 'testdomain2.com',
                        dsaparams: [1, 2]
                      }
                    ]
                  }
                }
              }
            }
            it('should send valid dsaparams but filter out invalid ones', function () {
              const ortb2Clone = JSON.parse(JSON.stringify(ortb2));
              ortb2Clone.regs.ext.dsa.transparency = [
                {
                  domain: 'testdomain.com',
                  dsaparams: [1],
                },
                {
                  domain: '',
                  dsaparams: [2],
                }
              ];

              const expectedTransparency = 'testdomain.com~1';
              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({ ...b, ortb2: ortb2Clone })), bidderRequest);
              const data = parseQuery(request.data);

              expect(data['dsatransparency']).to.equal(expectedTransparency);
            })
            it('should send dsaparams if \"ortb2.regs.ext.dsa.transparancy[0].params\"', function() {
              const ortb2Clone = JSON.parse(JSON.stringify(ortb2));

              ortb2Clone.regs.ext.dsa.transparency = [{
                domain: 'testdomain.com',
                dsaparams: [1],
              }];

              const expectedTransparency = 'testdomain.com~1';
              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2: ortb2Clone})), bidderRequest);
              const data = parseQuery(request.data);

              expect(data['dsatransparency']).to.equal(expectedTransparency);
            })
            it('should pass an empty transparency param if \"ortb2.regs.ext.dsa.transparency[0].params\" is empty', function() {
              const ortb2Clone = JSON.parse(JSON.stringify(ortb2));

              ortb2Clone.regs.ext.dsa.transparency = [{
                domain: 'testdomain.com',
                params: [],
              }];

              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2: ortb2Clone})), bidderRequest);
              const data = parseQuery(request.data);
              expect(data['dsatransparency']).to.be.undefined
            })
            it('should send an empty transparency if \"ortb2.regs.ext.dsa.transparency[0].domain\" is empty', function() {
              const ortb2Clone = JSON.parse(JSON.stringify(ortb2));

              ortb2Clone.regs.ext.dsa.transparency = [{
                domain: '',
                dsaparams: [1],
              }];

              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2: ortb2Clone})), bidderRequest);
              const data = parseQuery(request.data);

              expect(data['dsatransparency']).to.be.undefined
            })
            it('should send dsa signals if \"ortb2.regs.ext.dsa\"', function() {
              const expectedTransparency = 'testdomain.com~1~~testdomain2.com~1_2'
              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2})), bidderRequest)
              const data = parseQuery(request.data);

              expect(data).to.be.an('Object');
              expect(data).to.have.property('dsarequired');
              expect(data).to.have.property('dsapubrender');
              expect(data).to.have.property('dsadatatopubs');
              expect(data).to.have.property('dsatransparency');

              expect(data['dsarequired']).to.equal(ortb2.regs.ext.dsa.dsarequired.toString());
              expect(data['dsapubrender']).to.equal(ortb2.regs.ext.dsa.pubrender.toString());
              expect(data['dsadatatopubs']).to.equal(ortb2.regs.ext.dsa.datatopub.toString());
              expect(data['dsatransparency']).to.equal(expectedTransparency)
            })
            it('should return one transparency param', function() {
              const expectedTransparency = 'testdomain.com~1';
              const ortb2Clone = deepClone(ortb2);
              ortb2Clone.regs.ext.dsa.transparency.pop()
              const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2: ortb2Clone})), bidderRequest)
              const data = parseQuery(request.data);

              expect(data).to.be.an('Object');
              expect(data).to.have.property('dsatransparency');
              expect(data['dsatransparency']).to.equal(expectedTransparency);
            })
          })

          it('should send gpid and pbadslot since it is prefered over dfp code', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                gpid: '/1233/sports&div1',
                data: {
                  pbadslot: 'pb_slot',
                  adserver: {
                    adslot: '/1234/sports',
                    name: 'gam'
                  }
                }
              }
            }

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data['p_gpid']).to.equal('/1233/sports&div1');
            expect(data).to.not.have.property('tg_i.dfp_ad_unit_code');
            expect(data['tg_i.pbadslot']).to.equal('pb_slot');
          });
        });

        describe('GAM ad unit', function () {
          beforeEach(function () {
            // enforce that the bid at 0 does not have a 'context' property
            if (bidderRequest.bids[0].hasOwnProperty('ortb2Imp')) {
              delete bidderRequest.bids[0].ortb2Imp;
            }
          });

          it('should not send \"tg_i.dfp_ad_unit_code’\" if \"ortb2Imp.ext.data\" object is not valid', function () {
            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.dfp_ad_unit_code’');
          });

          it('should not send \"tg_i.dfp_ad_unit_code’\" if \"ortb2Imp.ext.data.adServer.adslot\" is undefined', function () {
            bidderRequest.bids[0].ortb2Imp = {};

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.dfp_ad_unit_code’');
          });

          it('should not send \"tg_i.dfp_ad_unit_code’\" if \"ortb2Imp.ext.data.adServer.adslot\" value is an empty string', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  adserver: {
                    adslot: ''
                  }
                }
              }
            };

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.dfp_ad_unit_code');
          });

          it('should send NOT \"tg_i.dfp_ad_unit_code\" if \"ortb2Imp.ext.data.adServer.adslot\" value is a valid string but not gam', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  adserver: {
                    adslot: '/a/b/c',
                    name: 'not gam'
                  }
                }
              }
            }

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.not.have.property('tg_i.dfp_ad_unit_code');
          });

          it('should send \"tg_i.dfp_ad_unit_code\" if \"ortb2Imp.ext.data.adServer.adslot\" value is a valid string and name is gam', function () {
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/a/b/c'
                  }
                }
              }
            };

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            const data = parseQuery(request.data);

            expect(data).to.be.an('Object');
            expect(data).to.have.property('tg_i.dfp_ad_unit_code');
            expect(data['tg_i.dfp_ad_unit_code']).to.equal('/a/b/c');
          });
        });

        describe('client hints', function () {
          let standardSuaObject;
          beforeEach(function () {
            standardSuaObject = {
              source: 2,
              platform: {
                brand: 'macOS',
                version: [
                  '12',
                  '6',
                  '0'
                ]
              },
              browsers: [
                {
                  brand: 'Not.A/Brand',
                  version: [
                    '8',
                    '0',
                    '0',
                    '0'
                  ]
                },
                {
                  brand: 'Chromium',
                  version: [
                    '114',
                    '0',
                    '5735',
                    '198'
                  ]
                },
                {
                  brand: 'Google Chrome',
                  version: [
                    '114',
                    '0',
                    '5735',
                    '198'
                  ]
                }
              ],
              mobile: 0,
              model: '',
              bitness: '64',
              architecture: 'x86'
            }
          });
          it('should send m_ch_* params if ortb2.device.sua object is there', function () {
            let bidRequestSua = utils.deepClone(bidderRequest);
            bidRequestSua.bids[0].ortb2 = { device: { sua: standardSuaObject } };

            // How should fastlane query be constructed with default SUA
            let expectedValues = {
              m_ch_arch: 'x86',
              m_ch_bitness: '64',
              m_ch_ua: `"Not.A/Brand"|v="8","Chromium"|v="114","Google Chrome"|v="114"`,
              m_ch_full_ver: `"Not.A/Brand"|v="8.0.0.0","Chromium"|v="114.0.5735.198","Google Chrome"|v="114.0.5735.198"`,
              m_ch_mobile: '?0',
              m_ch_platform: 'macOS',
              m_ch_platform_ver: '12.6.0'
            }

            // Build Fastlane call
            let [request] = spec.buildRequests(bidRequestSua.bids, bidRequestSua);
            let data = parseQuery(request.data);

            // Loop through expected values and if they do not match push an error
            const errors = Object.entries(expectedValues).reduce((accum, [key, val]) => {
              if (data[key] !== val) accum.push(`${key} - expect: ${val} - got: ${data[key]}`)
              return accum;
            }, []);

            // should be no errors
            expect(errors).to.deep.equal([]);
          });
          it('should not send invalid values for m_ch_*', function () {
            let bidRequestSua = utils.deepClone(bidderRequest);

            // Alter input SUA object
            // send model
            standardSuaObject.model = 'Suface Duo';
            // send mobile = 1
            standardSuaObject.mobile = 1;

            // make browsers not an array
            standardSuaObject.browsers = 'My Browser';

            // make platform not have version
            delete standardSuaObject.platform.version;

            // delete architecture
            delete standardSuaObject.architecture;

            // add SUA to bid
            bidRequestSua.bids[0].ortb2 = { device: { sua: standardSuaObject } };

            // Build Fastlane request
            let [request] = spec.buildRequests(bidRequestSua.bids, bidRequestSua);
            let data = parseQuery(request.data);

            // should show new names
            expect(data.m_ch_model).to.equal('Suface Duo');
            expect(data.m_ch_mobile).to.equal('?1');

            // should still send platform
            expect(data.m_ch_platform).to.equal('macOS');

            // platform version not sent
            expect(data).to.not.haveOwnProperty('m_ch_platform_ver');

            // both ua and full_ver not sent because browsers not array
            expect(data).to.not.haveOwnProperty('m_ch_ua');
            expect(data).to.not.haveOwnProperty('m_ch_full_ver');

            // arch not sent
            expect(data).to.not.haveOwnProperty('m_ch_arch');
          });
        });
      });

      if (FEATURES.VIDEO) {
        describe('for video requests', function () {
          it('should make a well-formed video request', function () {
            const bidderRequest = createVideoBidderRequest();

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            let [request] = spec.buildRequests(bidderRequest.bids, syncAddFPDToBidderRequest(bidderRequest));
            let post = request.data;

            expect(post).to.have.property('imp');
            // .with.length.of(1);
            let imp = post.imp[0];
            expect(imp.id).to.equal(bidderRequest.bids[0].adUnitCode);
            expect(imp.exp).to.equal(undefined); // now undefined
            expect(imp.video.w).to.equal(640);
            expect(imp.video.h).to.equal(480);
            expect(imp.video.pos).to.equal(1);
            expect(imp.video.minduration).to.equal(15);
            expect(imp.video.maxduration).to.equal(30);
            expect(imp.video.startdelay).to.equal(0);
            expect(imp.video.skip).to.equal(1);
            expect(imp.video.skipafter).to.equal(15);
            expect(imp.ext.prebid.bidder.rubicon.video.playerWidth).to.equal(640);
            expect(imp.ext.prebid.bidder.rubicon.video.playerHeight).to.equal(480);
            expect(imp.ext.prebid.bidder.rubicon.video.size_id).to.equal(201);
            expect(imp.ext.prebid.bidder.rubicon.video.language).to.equal('en');
            // Also want it to be in post.site.content.language
            expect(imp.ext.prebid.bidder.rubicon.video.skip).to.equal(1);
            expect(imp.ext.prebid.bidder.rubicon.video.skipafter).to.equal(15);
            expect(post.ext.prebid.auctiontimestamp).to.equal(1472239426000);
            // should contain version
            expect(post.ext.prebid.channel).to.deep.equal({name: 'pbjs', version: $$PREBID_GLOBAL$$.version});
            expect(post.user.ext.consent).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
            // EIDs should exist
            expect(post.user.ext).to.have.property('eids').that.is.an('array');
            // LiveIntent should exist
            expect(post.user.ext.eids[0].source).to.equal('liveintent.com');
            expect(post.user.ext.eids[0].uids[0].id).to.equal('0000-1111-2222-3333');
            expect(post.user.ext.eids[0].uids[0].atype).to.equal(3);
            expect(post.user.ext.eids[0]).to.have.property('ext').that.is.an('object');
            expect(post.user.ext.eids[0].ext).to.have.property('segments').that.is.an('array');
            expect(post.user.ext.eids[0].ext.segments[0]).to.equal('segA');
            expect(post.user.ext.eids[0].ext.segments[1]).to.equal('segB');
            // LiveRamp should exist
            expect(post.user.ext.eids[1].source).to.equal('liveramp.com');
            expect(post.user.ext.eids[1].uids[0].id).to.equal('1111-2222-3333-4444');
            expect(post.user.ext.eids[1].uids[0].atype).to.equal(3);
            // UnifiedId should exist
            expect(post.user.ext.eids[2].source).to.equal('adserver.org');
            expect(post.user.ext.eids[2].uids[0].atype).to.equal(1);
            expect(post.user.ext.eids[2].uids[0].id).to.equal('3000');
            // PubCommonId should exist
            expect(post.user.ext.eids[3].source).to.equal('pubcid.org');
            expect(post.user.ext.eids[3].uids[0].atype).to.equal(1);
            expect(post.user.ext.eids[3].uids[0].id).to.equal('4000');
            // example should exist
            expect(post.user.ext.eids[4].source).to.equal('example.com');
            expect(post.user.ext.eids[4].uids[0].id).to.equal('333333');
            // id-partner.com
            expect(post.user.ext.eids[5].source).to.equal('id-partner.com');
            expect(post.user.ext.eids[5].uids[0].id).to.equal('4444444');
            // CriteoId should exist
            expect(post.user.ext.eids[6].source).to.equal('criteo.com');
            expect(post.user.ext.eids[6].uids[0].id).to.equal('1111');
            expect(post.user.ext.eids[6].uids[0].atype).to.equal(1);

            expect(post.regs.ext.gdpr).to.equal(1);
            expect(post.regs.ext.us_privacy).to.equal('1NYN');
            expect(post).to.have.property('ext').that.is.an('object');
            expect(post.ext.prebid.targeting.includewinners).to.equal(true);
            expect(post.ext.prebid).to.have.property('cache').that.is.an('object');
            expect(post.ext.prebid.cache).to.have.property('vastxml').that.is.an('object');
            expect(post.ext.prebid.cache.vastxml).to.have.property('returnCreative').that.is.an('boolean');
            expect(post.ext.prebid.cache.vastxml.returnCreative).to.equal(false);
            expect(post.ext.prebid.bidders.rubicon.integration).to.equal(PBS_INTEGRATION);
          });

          describe('ortb2imp sent to video bids', function () {
            beforeEach(function () {
            // initialize
              if (bidderRequest.bids[0].hasOwnProperty('ortb2Imp')) {
                delete bidderRequest.bids[0].ortb2Imp;
              }
            });

            it('should add ortb values to video requests', function () {
              const bidderRequest = createVideoBidderRequest();

              sandbox.stub(Date, 'now').callsFake(() =>
                bidderRequest.auctionStart + 100
              );

              bidderRequest.bids[0].ortb2Imp = {
                ext: {
                  gpid: '/test/gpid',
                  data: {
                    pbadslot: '/test/pbadslot'
                  },
                  prebid: {
                    storedauctionresponse: {
                      id: 'sample_video_response'
                    }
                  }
                }
              }

              let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
              let post = request.data;

              expect(post).to.have.property('imp');
              // .with.length.of(1);
              let imp = post.imp[0];
              expect(imp.ext.gpid).to.equal('/test/gpid');
              expect(imp.ext.data.pbadslot).to.equal('/test/pbadslot');
              expect(imp.ext.prebid.storedauctionresponse.id).to.equal('sample_video_response');
            });
          });

          it('should correctly set bidfloor on imp when getfloor in scope', function () {
            const bidderRequest = createVideoBidderRequest();
            // default getFloor response is empty object so should not break and not send hard_floor
            bidderRequest.bids[0].getFloor = () => getFloorResponse;
            sinon.spy(bidderRequest.bids[0], 'getFloor');

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // make sure banner bid called with right stuff
            expect(
              bidderRequest.bids[0].getFloor.calledWith({
                currency: 'USD',
                mediaType: '*',
                size: '*'
              })
            ).to.be.true;

            // not an object should work and not send
            expect(request.data.imp[0].bidfloor).to.be.undefined;

            // make it respond with a non USD floor should not send it
            getFloorResponse = {currency: 'EUR', floor: 1.0};
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.be.undefined;

            // make it respond with a non USD floor should not send it
            getFloorResponse = {currency: 'EUR'};
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.be.undefined;

            // make it respond with USD floor and string floor
            getFloorResponse = {currency: 'USD', floor: '1.23'};
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(1.23);

            // make it respond with USD floor and num floor
            getFloorResponse = {currency: 'USD', floor: 1.23};
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(1.23);
          });

          it('should continue with auction if getFloor throws error', function () {
            const bidderRequest = createVideoBidderRequest();
            // default getFloor response is empty object so should not break and not send hard_floor
            bidderRequest.bids[0].getFloor = () => {
              throw new Error('An exception!');
            };
            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // should have an imp
            expect(request.data.imp).to.exist.and.to.be.a('array');
            expect(request.data.imp).to.have.lengthOf(1);

            // should be NO bidFloor
            expect(request.data.imp[0].bidfloor).to.be.undefined;
            expect(request.data.imp[0].bidfloorcur).to.be.undefined;
          });

          it('should add alias name to PBS Request', function () {
            const bidderRequest = createVideoBidderRequest();
            adapterManager.aliasRegistry['superRubicon'] = 'rubicon';
            bidderRequest.bidderCode = 'superRubicon';
            bidderRequest.bids[0].bidder = 'superRubicon';
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // should have the aliases object sent to PBS
            expect(request.data.ext.prebid).to.haveOwnProperty('aliases');
            expect(request.data.ext.prebid.aliases).to.deep.equal({superRubicon: 'rubicon'});

            // should have the imp ext bidder params be under the alias name not rubicon superRubicon
            expect(request.data.imp[0].ext.prebid.bidder).to.have.property('superRubicon').that.is.an('object');
            expect(request.data.imp[0].ext.prebid.bidder).to.not.haveOwnProperty('rubicon');
          });

          it('should add floors flag correctly to PBS Request', function () {
            const bidderRequest = createVideoBidderRequest();
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // should not pass if undefined
            expect(request.data.ext.prebid.floors).to.be.undefined;

            // should pass it as false
            bidderRequest.bids[0].floorData = {
              skipped: false,
              location: 'fetch',
            }
            let [newRequest] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(newRequest.data.ext.prebid.floors).to.deep.equal({ enabled: false });
          });

          it('should add multibid configuration to PBS Request', function () {
            const bidderRequest = createVideoBidderRequest();

            const multibid = [{
              bidder: 'bidderA',
              maxBids: 2
            }, {
              bidder: 'bidderB',
              maxBids: 2
            }];
            const expected = [{
              bidder: 'bidderA',
              maxbids: 2
            }, {
              bidder: 'bidderB',
              maxbids: 2
            }];

            config.setConfig({multibid: multibid});

            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);

            // should have the aliases object sent to PBS
            expect(request.data.ext.prebid).to.haveOwnProperty('multibid');
            expect(request.data.ext.prebid.multibid).to.deep.equal(expected);
          });

          it('should pass client analytics to PBS endpoint if all modules included', function () {
            const bidderRequest = createVideoBidderRequest();
            $$PREBID_GLOBAL$$.installedModules = [];
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let payload = request.data;

            expect(payload.ext.prebid.analytics).to.not.be.undefined;
            expect(payload.ext.prebid.analytics).to.deep.equal({'rubicon': {'client-analytics': true}});
          });

          it('should pass client analytics to PBS endpoint if rubicon analytics adapter is included', function () {
            const bidderRequest = createVideoBidderRequest();
            $$PREBID_GLOBAL$$.installedModules = ['rubiconBidAdapter', 'rubiconAnalyticsAdapter'];
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let payload = request.data;

            expect(payload.ext.prebid.analytics).to.not.be.undefined;
            expect(payload.ext.prebid.analytics).to.deep.equal({'rubicon': {'client-analytics': true}});
          });

          it('should not pass client analytics to PBS endpoint if rubicon analytics adapter is not included', function () {
            const bidderRequest = createVideoBidderRequest();
            $$PREBID_GLOBAL$$.installedModules = ['rubiconBidAdapter'];
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let payload = request.data;

            expect(payload.ext.prebid.analytics).to.be.undefined;
          });

          it('should not send video exp at all if not set in s2sConfig config', function () {
            const bidderRequest = createVideoBidderRequest();
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let post = request.data;

            // should exp set to the right value according to config
            let imp = post.imp[0];
            // bidderFactory stringifies request body before sending so removes undefined attributes:
            expect(imp.exp).to.equal(undefined);
          });

          it('should send tmax as the bidderRequest timeout value', function () {
            const bidderRequest = createVideoBidderRequest();
            bidderRequest.timeout = 3333;
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            let post = request.data;
            expect(post.tmax).to.equal(3333);
          });

          it('should send correct bidfloor to PBS', function () {
            const bidderRequest = createVideoBidderRequest();

            bidderRequest.bids[0].params.floor = 0.1;
            let [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(0.1);

            bidderRequest.bids[0].params.floor = 5.5;
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(5.5);

            bidderRequest.bids[0].params.floor = '1.7';
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(1.7);

            bidderRequest.bids[0].params.floor = 0;
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].bidfloor).to.equal(0);

            bidderRequest.bids[0].params.floor = undefined;
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0]).to.not.haveOwnProperty('bidfloor');

            bidderRequest.bids[0].params.floor = null;
            [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0]).to.not.haveOwnProperty('bidfloor');
          });

          it('should send request with proper ad position', function () {
            const bidderRequest = createVideoBidderRequest();
            let positionBidderRequest = utils.deepClone(bidderRequest);
            positionBidderRequest.bids[0].mediaTypes.video.pos = 1;
            let [request] = spec.buildRequests(positionBidderRequest.bids, positionBidderRequest);
            expect(request.data.imp[0].video.pos).to.equal(1);

            positionBidderRequest = utils.deepClone(bidderRequest);
            positionBidderRequest.bids[0].params.position = undefined;
            positionBidderRequest.bids[0].mediaTypes.video.pos = undefined;
            [request] = spec.buildRequests(positionBidderRequest.bids, positionBidderRequest);
            expect(request.data.imp[0].video.pos).to.equal(undefined);

            positionBidderRequest = utils.deepClone(bidderRequest);
            positionBidderRequest.bids[0].params.position = 'atf'
            positionBidderRequest.bids[0].mediaTypes.video.pos = undefined;
            [request] = spec.buildRequests(positionBidderRequest.bids, positionBidderRequest);
            expect(request.data.imp[0].video.pos).to.equal(1);

            positionBidderRequest = utils.deepClone(bidderRequest);
            positionBidderRequest.bids[0].params.position = 'btf';
            positionBidderRequest.bids[0].mediaTypes.video.pos = undefined;
            [request] = spec.buildRequests(positionBidderRequest.bids, positionBidderRequest);
            expect(request.data.imp[0].video.pos).to.equal(3);

            positionBidderRequest = utils.deepClone(bidderRequest);
            positionBidderRequest.bids[0].params.position = 'foobar';
            positionBidderRequest.bids[0].mediaTypes.video.pos = undefined;
            [request] = spec.buildRequests(positionBidderRequest.bids, positionBidderRequest);
            expect(request.data.imp[0].video.pos).to.equal(undefined);
          });

          it('should properly enforce video.context to be either instream or outstream', function () {
            let bid = bidderRequest.bids[0];
            bid.mediaTypes = {
              video: {
                context: 'instream',
                mimes: ['video/mp4', 'video/x-ms-wmv'],
                protocols: [2, 5],
                maxduration: 30,
                linearity: 1,
                api: [2]
              }
            }
            bid.params.video = {};

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const bidRequestCopy = utils.deepClone(bidderRequest.bids[0]);
            expect(spec.isBidRequestValid(bidRequestCopy)).to.equal(true);

            // change context to outstream, still true
            bidRequestCopy.mediaTypes.video.context = 'outstream';
            expect(spec.isBidRequestValid(bidRequestCopy)).to.equal(true);

            // change context to random, false now
            bidRequestCopy.mediaTypes.video.context = 'random';
            expect(spec.isBidRequestValid(bidRequestCopy)).to.equal(false);

            // change context to undefined, still false
            bidRequestCopy.mediaTypes.video.context = undefined;
            expect(spec.isBidRequestValid(bidRequestCopy)).to.equal(false);

            // remove context, still false
            delete bidRequestCopy.mediaTypes.video.context;
            expect(spec.isBidRequestValid(bidRequestCopy)).to.equal(false);
          });

          it('should enforce the new required mediaTypes.video params', function () {
            let bidderRequest = createVideoBidderRequest();

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(true);

            // change mimes to a non array, no good
            bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].mediaTypes.video.mimes = 'video/mp4';
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);

            // delete mimes, no good
            bidderRequest = createVideoBidderRequest();
            delete bidderRequest.bids[0].mediaTypes.video.mimes;
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);

            // change protocols to an int not array of ints, no good
            bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].mediaTypes.video.protocols = 1;
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);

            // delete protocols, no good
            bidderRequest = createVideoBidderRequest();
            delete bidderRequest.bids[0].mediaTypes.video.protocols;
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);

            // change linearity to an string, no good
            bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].mediaTypes.video.linearity = 'string';
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);

            // delete linearity, no good
            bidderRequest = createVideoBidderRequest();
            delete bidderRequest.bids[0].mediaTypes.video.linearity;
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(false);
          });

          it('bid request is valid when video context is outstream', function () {
            const bidderRequest = createVideoBidderRequestOutstream();
            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const bidRequestCopy = utils.deepClone(bidderRequest);

            let [request] = spec.buildRequests(bidRequestCopy.bids, bidRequestCopy);
            expect(spec.isBidRequestValid(bidderRequest.bids[0])).to.equal(true);
            expect(request.data.imp[0].ext.prebid.bidder.rubicon.video.size_id).to.equal(203);
          });

          it('should send banner request when outstream or instream video included but no rubicon video obect is present', function () {
          // add banner and video mediaTypes
            bidderRequest.mediaTypes = {
              banner: {
                sizes: [[300, 250]]
              },
              video: {
                context: 'outstream'
              }
            };
            // no video object in rubicon params, so we should see one call made for banner

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            let requests = spec.buildRequests(bidderRequest.bids, bidderRequest);

            expect(requests.length).to.equal(1);
            expect(requests[0].url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');

            bidderRequest.mediaTypes.video.context = 'instream';

            requests = spec.buildRequests(bidderRequest.bids, bidderRequest);

            expect(requests.length).to.equal(1);
            expect(requests[0].url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
          });

          it('should send request as banner when invalid video bid in multiple mediaType bidRequest', function () {
            removeVideoParamFromBidderRequest(bidderRequest);

            let bid = bidderRequest.bids[0];
            bid.mediaTypes.banner = {
              sizes: [[300, 250]]
            };

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const bidRequestCopy = utils.deepClone(bidderRequest);

            let requests = spec.buildRequests(bidRequestCopy.bids, bidRequestCopy);
            expect(requests.length).to.equal(1);
            expect(requests[0].url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
          });

          it('should include coppa flag in video bid request', () => {
            const bidderRequest = createVideoBidderRequest();

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            sandbox.stub(config, 'getConfig').callsFake(key => {
              const config = {
                'coppa': true
              };
              return config[key];
            });
            const [request] = spec.buildRequests(bidderRequest.bids, syncAddFPDToBidderRequest(bidderRequest));
            expect(request.data.regs.coppa).to.equal(1);
          });

          it('should include first party data', () => {
            const bidderRequest = createVideoBidderRequest();

            const site = {
              ext: {
                data: {
                  page: 'home'
                }
              },
              content: {
                data: [{foo: 'bar'}]
              },
              keywords: 'e,f',
              rating: '4-star',
              data: [{foo: 'bar'}]
            };
            const user = {
              ext: {
                data: {
                  age: 31
                }
              },
              keywords: 'd',
              gender: 'M',
              yob: '1984',
              geo: {country: 'ca'},
              data: [{foo: 'bar'}]
            };

            const ortb2 = {
              site,
              user
            };

            const [request] = spec.buildRequests(bidderRequest.bids.map((b) => ({...b, ortb2})), bidderRequest);

            const expected = {
              site: Object.assign({}, site, {keywords: bidderRequest.bids[0].params.keywords.join(',')}),
              user: Object.assign({}, user),
              siteData: Object.assign({}, site.ext.data, bidderRequest.bids[0].params.inventory),
              userData: Object.assign({}, user.ext.data, bidderRequest.bids[0].params.visitor),
            };

            delete request.data.site.page;
            delete request.data.site.content.language;

            expect(request.data.site.keywords).to.deep.equal('a,b,c');
            expect(request.data.user.keywords).to.deep.equal('d');
            expect(request.data.site.ext.data).to.deep.equal(expected.siteData);
            expect(request.data.user.ext.data).to.deep.equal(expected.userData);
          });

          it('should include pbadslot in bid request', function () {
            const bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  pbadslot: '1234567890'
                }
              }
            }

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].ext.data.pbadslot).to.equal('1234567890');
          });

          it('should NOT include storedrequests in pbs payload', function () {
            const bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].ortb2 = {
              ext: {
                prebid: {
                  storedrequest: 'no-send-top-level-sr'
                }
              }
            }

            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                prebid: {
                  storedrequest: 'no-send-imp-sr'
                }
              }
            }

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.ext.prebid.storedrequest).to.be.undefined;
            expect(request.data.imp[0].ext.prebid.storedrequest).to.be.undefined;
          });

          it('should include GAM ad unit in bid request', function () {
            const bidderRequest = createVideoBidderRequest();
            bidderRequest.bids[0].ortb2Imp = {
              ext: {
                data: {
                  adserver: {
                    adslot: '1234567890',
                    name: 'adServerName1'
                  }
                }
              }
            };

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.imp[0].ext.data.adserver.adslot).to.equal('1234567890');
            expect(request.data.imp[0].ext.data.adserver.name).to.equal('adServerName1');
          });

          it('should use the integration type provided in the config instead of the default', () => {
            const bidderRequest = createVideoBidderRequest();
            config.setConfig({rubicon: {int_type: 'testType'}});
            const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
            expect(request.data.ext.prebid.bidders.rubicon.integration).to.equal('testType');
          });

          it('should pass the user.id provided in the config', function () {
            config.setConfig({user: {id: '123'}});
            const bidderRequest = createVideoBidderRequest();

            sandbox.stub(Date, 'now').callsFake(() =>
              bidderRequest.auctionStart + 100
            );

            let [request] = spec.buildRequests(bidderRequest.bids, syncAddFPDToBidderRequest(bidderRequest));
            let post = request.data;

            expect(post).to.have.property('imp')
            // .with.length.of(1);
            let imp = post.imp[0];
            expect(imp.id).to.equal(bidderRequest.bids[0].adUnitCode);
            expect(imp.exp).to.equal(undefined);
            expect(imp.video.w).to.equal(640);
            expect(imp.video.h).to.equal(480);
            expect(imp.video.pos).to.equal(1);
            expect(imp.video.minduration).to.equal(15);
            expect(imp.video.maxduration).to.equal(30);
            expect(imp.video.startdelay).to.equal(0);
            expect(imp.video.skip).to.equal(1);
            expect(imp.video.skipafter).to.equal(15);
            expect(imp.ext.prebid.bidder.rubicon.video.playerWidth).to.equal(640);
            expect(imp.ext.prebid.bidder.rubicon.video.playerHeight).to.equal(480);
            expect(imp.ext.prebid.bidder.rubicon.video.language).to.equal('en');

            // Also want it to be in post.site.content.language
            expect(post.site.content.language).to.equal('en');
            expect(post.ext.prebid.auctiontimestamp).to.equal(1472239426000);
            expect(post.user.ext.consent).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');

            // Config user.id
            expect(post.user.id).to.equal('123');

            expect(post.regs.ext.gdpr).to.equal(1);
            expect(post.regs.ext.us_privacy).to.equal('1NYN');
            expect(post).to.have.property('ext').that.is.an('object');
            expect(post.ext.prebid.targeting.includewinners).to.equal(true);
            expect(post.ext.prebid).to.have.property('cache').that.is.an('object');
            expect(post.ext.prebid.cache).to.have.property('vastxml').that.is.an('object');
            expect(post.ext.prebid.cache.vastxml).to.have.property('returnCreative').that.is.an('boolean');
            expect(post.ext.prebid.cache.vastxml.returnCreative).to.equal(false);
            expect(post.ext.prebid.bidders.rubicon.integration).to.equal(PBS_INTEGRATION);
          })
        });
      }

      describe('combineSlotUrlParams', function () {
        it('should combine an array of slot url params', function () {
          expect(spec.combineSlotUrlParams([])).to.deep.equal({});

          expect(spec.combineSlotUrlParams([{p1: 'foo', p2: 'test', p3: ''}])).to.deep.equal({
            p1: 'foo',
            p2: 'test',
            p3: ''
          });

          expect(spec.combineSlotUrlParams([{}, {p1: 'foo', p2: 'test'}])).to.deep.equal({p1: ';foo', p2: ';test'});

          expect(spec.combineSlotUrlParams([{}, {}, {p1: 'foo', p2: ''}, {}])).to.deep.equal({p1: ';;foo;', p2: ''});

          expect(spec.combineSlotUrlParams([{}, {p1: 'foo'}, {p1: ''}])).to.deep.equal({p1: ';foo;'});

          expect(spec.combineSlotUrlParams([
            {p1: 'foo', p2: 'test'},
            {p2: 'test', p3: 'bar'},
            {p1: 'bar', p2: 'test', p4: 'bar'}
          ])).to.deep.equal({p1: 'foo;;bar', p2: 'test', p3: ';bar;', p4: ';;bar'});

          expect(spec.combineSlotUrlParams([
            {p1: 'foo', p2: 'test', p3: 'baz'},
            {p1: 'foo', p2: 'bar'},
            {p2: 'test'}
          ])).to.deep.equal({p1: 'foo;foo;', p2: 'test;bar;test', p3: 'baz;;'});
        });
      });

      describe('createSlotParams', function () {
        it('should return a valid slot params object', function () {
          const localBidderRequest = Object.assign({}, bidderRequest);
          let expectedQuery = {
            'account_id': '14062',
            'site_id': '70608',
            'zone_id': '335918',
            'size_id': 15,
            'alt_size_ids': '43',
            'p_pos': 'atf',
            'rp_secure': /[01]/,
            'tk_flint': INTEGRATION,
            'x_source.tid': 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
            'p_screen_res': /\d+x\d+/,
            'tk_user_key': '12346',
            'kw': 'a,b,c',
            'tg_v.ucat': 'new',
            'tg_v.lastsearch': 'iphone',
            'tg_v.likes': 'sports,video games',
            'tg_i.rating': '5-star',
            'tg_i.prodtype': 'tech,mobile',
            'tg_fl.eid': 'div-1',
            'rf': 'localhost'
          };

          const slotParams = spec.createSlotParams(bidderRequest.bids[0], localBidderRequest);

          // test that all values above are both present and correct
          Object.keys(expectedQuery).forEach(key => {
            const value = expectedQuery[key];
            if (value instanceof RegExp) {
              expect(slotParams[key]).to.match(value);
            } else {
              expect(slotParams[key]).to.equal(value);
            }
          });
        });

        it('should not fail if keywords param is not an array', function () {
          bidderRequest.bids[0].params.keywords = 'a,b,c';
          const slotParams = spec.createSlotParams(bidderRequest.bids[0], bidderRequest);
          expect(slotParams.kw).to.equal('a,b,c');
        });

        it('should pass along o_ae param when fledge is enabled', () => {
          const localBidRequest = Object.assign({}, bidderRequest.bids[0]);
          localBidRequest.ortb2Imp.ext.ae = true;

          const slotParams = spec.createSlotParams(localBidRequest, bidderRequest);

          expect(slotParams['o_ae']).to.equal(1)
        });

        it('should pass along desired segtaxes, but not non-desired ones', () => {
          const localBidderRequest = Object.assign({}, bidderRequest);
          localBidderRequest.refererInfo = {domain: 'bob'};
          config.setConfig({
            rubicon: {
              sendUserSegtax: [9],
              sendSiteSegtax: [10]
            }
          });
          localBidderRequest.ortb2.user = {
            data: [{
              ext: {
                segtax: '404'
              },
              segment: [{id: 5}, {id: 6}]
            }, {
              ext: {
                segtax: '508'
              },
              segment: [{id: 5}, {id: 2}]
            }, {
              ext: {
                segtax: '9'
              },
              segment: [{id: 1}, {id: 2}]
            }]
          }
          localBidderRequest.ortb2.site = {
            content: {
              data: [{
                ext: {
                  segtax: '10'
                },
                segment: [{id: 2}, {id: 3}]
              }, {
                ext: {
                  segtax: '507'
                },
                segment: [{id: 3}, {id: 4}]
              }]
            }
          }
          const slotParams = spec.createSlotParams(bidderRequest.bids[0], localBidderRequest);
          expect(slotParams['tg_i.tax507']).is.equal('3,4');
          expect(slotParams['tg_v.tax508']).is.equal('5,2');
          expect(slotParams['tg_v.tax9']).is.equal('1,2');
          expect(slotParams['tg_i.tax10']).is.equal('2,3');
          expect(slotParams['tg_v.tax404']).is.equal(undefined);
        });
      });

      describe('classifiedAsVideo', function () {
        it('should return true if mediaTypes is video', function () {
          const bidderRequest = createVideoBidderRequest();
          const bidClassifiedAsVideo = classifiedAsVideo(bidderRequest.bids[0]);
          expect(bidClassifiedAsVideo).is.equal(true);
        });

        it('should return false if trying to use legacy mediaType with video', function () {
          const bidderRequest = createVideoBidderRequest();
          delete bidderRequest.bids[0].mediaTypes;
          bidderRequest.bids[0].mediaType = 'video';
          const legacyVideoTypeBidRequest = classifiedAsVideo(bidderRequest.bids[0]);
          expect(legacyVideoTypeBidRequest).is.equal(false);
        });

        it('should return false if bid.mediaTypes is not equal to video', function () {
          expect(classifiedAsVideo({
            mediaType: 'banner'
          })).is.equal(false);
        });

        it('should return false if bid.mediaTypes is not defined', function () {
          expect(classifiedAsVideo({})).is.equal(false);
        });

        it('Should return false if both banner and video mediaTypes are set and params.video is not an object', function () {
          removeVideoParamFromBidderRequest(bidderRequest);
          let bid = bidderRequest.bids[0];
          bid.mediaTypes.banner = {flag: true};
          expect(classifiedAsVideo(bid)).to.equal(false);
        });
        it('Should return true if both banner and video mediaTypes are set and params.video is an object', function () {
          removeVideoParamFromBidderRequest(bidderRequest);
          let bid = bidderRequest.bids[0];
          bid.mediaTypes.banner = {flag: true};
          bid.params.video = {};
          expect(classifiedAsVideo(bid)).to.equal(true);
        });

        it('Should return true and create a params.video object if one is not already present', function () {
          removeVideoParamFromBidderRequest(bidderRequest);
          let bid = bidderRequest.bids[0]
          expect(classifiedAsVideo(bid)).to.equal(true);
          expect(bid.params.video).to.not.be.undefined;
        });
      });

      if (FEATURES.NATIVE) {
        describe('when there is a native request', function () {
          describe('and bidonmultiformat = undefined (false)', () => {
            it('should send only one native bid to PBS endpoint', function () {
              const bidReq = addNativeToBidRequest(bidderRequest);
              bidReq.bids[0].params = {
                video: {}
              }
              let [request] = spec.buildRequests(bidReq.bids, bidReq);
              expect(request.method).to.equal('POST');
              expect(request.url).to.equal('https://prebid-server.rubiconproject.com/openrtb2/auction');
              expect(request.data.imp).to.have.nested.property('[0].native');
            });

            it('should not break if position is set and no video MT', function () {
              const bidReq = addNativeToBidRequest(bidderRequest);
              delete bidReq.bids[0].mediaTypes.banner;
              bidReq.bids[0].params = {
                position: 'atf'
              }
              let [request] = spec.buildRequests(bidReq.bids, bidReq);
              expect(request.method).to.equal('POST');
              expect(request.url).to.equal('https://prebid-server.rubiconproject.com/openrtb2/auction');
              expect(request.data.imp).to.have.nested.property('[0].native');
            });

            describe('that contains also a banner mediaType', function () {
              it('should send the banner to fastlane BUT NOT the native bid because missing params.video', function() {
                const bidReq = addNativeToBidRequest(bidderRequest);
                bidReq.bids[0].mediaTypes.banner = {
                  sizes: [[300, 250]]
                }
                let [request] = spec.buildRequests(bidReq.bids, bidReq);
                expect(request.method).to.equal('GET');
                expect(request.url).to.include('https://fastlane.rubiconproject.com/a/api/fastlane.json');
              });
            });
            describe('with another banner request', () => {
              it('should send the native bid to PBS and the banner to fastlane', function() {
                const bidReq = addNativeToBidRequest(bidderRequest);
                bidReq.bids[0].params = { video: {} };
                // add second bidRqeuest
                bidReq.bids.push({
                  mediaTypes: {
                    banner: {
                      sizes: [[300, 250]]
                    }
                  },
                  params: bidReq.bids[0].params
                })
                let [request1, request2] = spec.buildRequests(bidReq.bids, bidReq);
                expect(request1.method).to.equal('POST');
                expect(request1.url).to.equal('https://prebid-server.rubiconproject.com/openrtb2/auction');
                expect(request1.data.imp).to.have.nested.property('[0].native');
                expect(request2.method).to.equal('GET');
                expect(request2.url).to.include('https://fastlane.rubiconproject.com/a/api/fastlane.json');
              });
            });
          });

          describe('with bidonmultiformat === true', () => {
            it('should send two requests,  to PBS with 2 imps', () => {
              const bidReq = addNativeToBidRequest(bidderRequest);
              // add second mediaType
              bidReq.bids[0].mediaTypes = {
                ...bidReq.bids[0].mediaTypes,
                banner: {
                  sizes: [[300, 250]]
                }
              };
              bidReq.bids[0].params.bidonmultiformat = true;
              let [pbsRequest, fastlanteRequest] = spec.buildRequests(bidReq.bids, bidReq);
              expect(pbsRequest.method).to.equal('POST');
              expect(pbsRequest.url).to.equal('https://prebid-server.rubiconproject.com/openrtb2/auction');
              expect(pbsRequest.data.imp).to.have.nested.property('[0].native');
              expect(fastlanteRequest.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
            });

            it('should include multiformat data in the pbs request', () => {
              const bidReq = addNativeToBidRequest(bidderRequest);
              // add second mediaType
              bidReq.bids[0].mediaTypes = {
                ...bidReq.bids[0].mediaTypes,
                banner: {
                  sizes: [[300, 250]]
                }
              };
              bidReq.bids[0].params.bidonmultiformat = true;
              let [pbsRequest, fastlanteRequest] = spec.buildRequests(bidReq.bids, bidReq);
              expect(pbsRequest.data.imp[0].ext.prebid.bidder.rubicon.formats).to.deep.equal(['native', 'banner']);
            });

            it('should include multiformat data in the fastlane request', () => {
              const bidReq = addNativeToBidRequest(bidderRequest);
              // add second mediaType
              bidReq.bids[0].mediaTypes = {
                ...bidReq.bids[0].mediaTypes,
                banner: {
                  sizes: [[300, 250]]
                }
              };
              bidReq.bids[0].params.bidonmultiformat = true;
              let [pbsRequest, fastlanteRequest] = spec.buildRequests(bidReq.bids, bidReq);
              let formatsIncluded = fastlanteRequest.data.indexOf('formats=native%2Cbanner') !== -1;
              expect(formatsIncluded).to.equal(true);
            });
          });
          describe('with bidonmultiformat === false', () => {
            it('should send only banner request because there\'s no params.video', () => {
              const bidReq = addNativeToBidRequest(bidderRequest);
              // add second mediaType
              bidReq.bids[0].mediaTypes = {
                ...bidReq.bids[0].mediaTypes,
                banner: {
                  sizes: [[300, 250]]
                }
              };

              let [fastlanteRequest, ...others] = spec.buildRequests(bidReq.bids, bidReq);
              expect(fastlanteRequest.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
              expect(others).to.be.empty;
            });

            it('should not send native to PBS even if there\'s param.video', () => {
              const bidReq = addNativeToBidRequest(bidderRequest);
              // add second mediaType
              bidReq.bids[0].mediaTypes = {
                ...bidReq.bids[0].mediaTypes,
                banner: {
                  sizes: [[300, 250]]
                }
              };
              // by adding this, when bidonmultiformat is false, the native request will be sent to pbs
              bidReq.bids[0].params = {
                video: {}
              }
              let [fastlaneRequest, ...other] = spec.buildRequests(bidReq.bids, bidReq);
              expect(fastlaneRequest.method).to.equal('GET');
              expect(fastlaneRequest.url).to.equal('https://fastlane.rubiconproject.com/a/api/fastlane.json');
              expect(other).to.be.empty;
            });
          });
        });
      }
    });

    describe('interpretResponse', function () {
      describe('for fastlane', function () {
        it('should handle a success response and sort by cpm', function () {
          let response = {
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
                'adomain': ['test.com'],
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
                'adomain': ['test.com'],
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
          };

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(2);

          expect(bids[0].width).to.equal(320);
          expect(bids[0].height).to.equal(50);
          expect(bids[0].cpm).to.equal(0.911);
          expect(bids[0].ttl).to.equal(360);
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[0].rubicon.advertiserId).to.equal(7);
          expect(bids[0].rubicon.networkId).to.equal(8);
          expect(bids[0].creativeId).to.equal('crid-9');
          expect(bids[0].currency).to.equal('USD');
          expect(bids[0].meta.mediaType).to.equal('banner');
          expect(String(bids[0].meta.advertiserDomains)).to.equal('test.com');
          expect(bids[0].ad).to.contain(`alert('foo')`)
            .and.to.contain(`<html>`)
            .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374d'>`);
          expect(bids[0].rubiconTargeting.rpfl_elemid).to.equal('/19968336/header-bid-tag-0');
          expect(bids[0].rubiconTargeting.rpfl_14062).to.equal('43_tier_all_test');

          expect(bids[1].width).to.equal(300);
          expect(bids[1].height).to.equal(250);
          expect(bids[1].cpm).to.equal(0.811);
          expect(bids[1].ttl).to.equal(360);
          expect(bids[1].netRevenue).to.equal(true);
          expect(bids[1].rubicon.advertiserId).to.equal(7);
          expect(bids[1].rubicon.networkId).to.equal(8);
          expect(bids[1].creativeId).to.equal('crid-9');
          expect(bids[1].currency).to.equal('USD');
          expect(bids[1].ad).to.contain(`alert('foo')`)
            .and.to.contain(`<html>`)
            .and.to.contain(`<div data-rp-impression-id='153dc240-8229-4604-b8f5-256933b9374c'>`);
          expect(bids[1].rubiconTargeting.rpfl_elemid).to.equal('/19968336/header-bid-tag-0');
          expect(bids[1].rubiconTargeting.rpfl_14062).to.equal('15_tier_all_test');
        });

        it('should pass netRevenue correctly if set in setConfig', function () {
          let response = {
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
          };

          // Set to false => false
          config.setConfig({
            rubicon: {
              netRevenue: false
            }
          });
          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids).to.be.lengthOf(2);
          expect(bids[0].netRevenue).to.equal(false);
          expect(bids[1].netRevenue).to.equal(false);

          // Set to true => true
          config.setConfig({
            rubicon: {
              netRevenue: true
            }
          });
          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids).to.be.lengthOf(2);
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[1].netRevenue).to.equal(true);

          // Set to undefined => true
          config.setConfig({
            rubicon: {
              netRevenue: undefined
            }
          });
          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids).to.be.lengthOf(2);
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[1].netRevenue).to.equal(true);

          // Set to string => true
          config.setConfig({
            rubicon: {
              netRevenue: 'someString'
            }
          });
          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids).to.be.lengthOf(2);
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[1].netRevenue).to.equal(true);

          config.resetConfig();
        });
        it('should use "network-advertiser" if no creative_id', function () {
          let response = {
            'status': 'ok',
            'account_id': 14062,
            'site_id': 70608,
            'zone_id': 530022,
            'size_id': 15,
            'alt_size_ids': [
              43, 10, 2
            ],
            'tracking': '',
            'inventory': {}
          };

          response.ads = [
            {
              'status': 'ok',
              'impression_id': '153dc240-8229-4604-b8f5-256933b9374c',
              'size_id': '15',
              'ad_id': '6',
              'advertiser': 7,
              'network': 8,
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
          ];

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids[0].creativeId).to.equal('8-7');

          response.ads = [
            {
              'status': 'ok',
              'impression_id': '153dc240-8229-4604-b8f5-256933b9374d',
              'size_id': '43',
              'ad_id': '7',
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
          ];

          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids[0].creativeId).to.equal('-');

          response.ads = [
            {
              'status': 'ok',
              'impression_id': '153dc240-8229-4604-b8f5-256933b9374d',
              'size_id': '10',
              'ad_id': '7',
              'network': 8,
              'type': 'script',
              'script': 'alert(\'foo\')',
              'campaign_id': 10,
              'cpm': 0.911,
              'targeting': [
                {
                  'key': 'rpfl_14062',
                  'values': [
                    '10_tier_all_test'
                  ]
                }
              ]
            }
          ];

          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids[0].creativeId).to.equal('8-');

          response.ads = [
            {
              'status': 'ok',
              'impression_id': '153dc240-8229-4604-b8f5-256933b9374d',
              'size_id': '2',
              'ad_id': '7',
              'advertiser': 7,
              'type': 'script',
              'script': 'alert(\'foo\')',
              'campaign_id': 10,
              'cpm': 0.911,
              'targeting': [
                {
                  'key': 'rpfl_14062',
                  'values': [
                    '2_tier_all_test'
                  ]
                }
              ]
            }
          ];

          bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids[0].creativeId).to.equal('-7');
        });

        it('should be fine with a CPM of 0', function () {
          let response = {
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
          };

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(1);
          expect(bids[0].cpm).to.be.equal(0);
        });

        it('should handle DSA object from response', function() {
          let response = {
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
                'adomain': ['test.com'],
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
                ],
                'dsa': {
                  'behalf': 'Advertiser',
                  'paid': 'Advertiser',
                  'transparency': [{
                    'domain': 'dsp1domain.com',
                    'dsaparams': [1, 2]
                  }],
                  'adrender': 1
                }
              },
              {
                'status': 'ok',
                'impression_id': '153dc240-8229-4604-b8f5-256933b9374d',
                'size_id': '43',
                'ad_id': '7',
                'adomain': ['test.com'],
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
                ],
                'dsa': {}
              }
            ]
          };
          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });
          expect(bids).to.be.lengthOf(2);
          expect(bids[1].meta.dsa).to.have.property('behalf');
          expect(bids[1].meta.dsa).to.have.property('paid');

          // if we dont have dsa field in response or the dsa object is empty
          expect(bids[0].meta).to.not.have.property('dsa');
        })

        it('should create bids with matching requestIds if imp id matches', function () {
          let bidRequests = [{
            'bidder': 'rubicon',
            'params': {
              'accountId': 1001,
              'siteId': 12345,
              'zoneId': 67890,
              'floor': null
            },
            'mediaTypes': {
              'banner': {
                'sizes': [[300, 250]]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '404a7b28-f276-41cc-a5cf-c1d3dc5671f9',
            'sizes': [[300, 250]],
            'bidId': '557ba307cef098',
            'bidderRequestId': '46a00704ffeb7',
            'auctionId': '3fdc6494-da94-44a0-a292-b55a90b08b2c',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'startTime': 1615412098213
          }, {
            'bidder': 'rubicon',
            'params': {
              'accountId': 1001,
              'siteId': 12345,
              'zoneId': 67890,
              'floor': null
            },
            'mediaTypes': {
              'banner': {
                'sizes': [[300, 250]]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-1',
            'transactionId': '404a7b28-f276-41cc-a5cf-c1d3dc5671f9',
            'sizes': [[300, 250]],
            'bidId': '456gt123jkl098',
            'bidderRequestId': '46a00704ffeb7',
            'auctionId': '3fdc6494-da94-44a0-a292-b55a90b08b2c',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'startTime': 1615412098213
          }];

          let response = {
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
                'impression_id': '153dc240-8229-4604-b8f5-256933b9374c',
                'size_id': '15',
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
                'cpm': 1.911,
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
          };

          config.setConfig({ multibid: [{bidder: 'rubicon', maxbids: 2, targetbiddercodeprefix: 'rubi'}] });

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidRequests
          });

          expect(bids).to.be.lengthOf(3);
          expect(bids[0].requestId).to.not.equal(bids[1].requestId);
          expect(bids[1].requestId).to.equal(bids[2].requestId);
        });

        it('should handle an error with no ads returned', function () {
          let response = {
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
          };

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(0);
        });

        it('Should support recieving an auctionConfig and pass it along to Prebid', function () {
          let response = {
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
            }],
            'component_auction_config': [{
              'random': 'value',
              'bidId': '5432'
            },
            {
              'random': 'string',
              'bidId': '6789'
            }]
          };

          let {bids, fledgeAuctionConfigs} = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(1);
          expect(fledgeAuctionConfigs[0].bidId).to.equal('5432');
          expect(fledgeAuctionConfigs[0].config.random).to.equal('value');
          expect(fledgeAuctionConfigs[1].bidId).to.equal('6789');
        });

        it('should handle an error', function () {
          let response = {
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
          };

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(0);
        });

        it('should handle an error because of malformed json response', function () {
          let response = '{test{';

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: bidderRequest.bids[0]
          });

          expect(bids).to.be.lengthOf(0);
        });

        it('should handle a bidRequest argument of type Array', function () {
          let response = {
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
          };

          let bids = spec.interpretResponse({body: response}, {
            bidRequest: [utils.deepClone(bidderRequest.bids[0])]
          });

          expect(bids).to.be.lengthOf(1);
          expect(bids[0].cpm).to.be.equal(0);
        });

        describe('singleRequest enabled', function () {
          it('handles bidRequest of type Array and returns associated adUnits', function () {
            const overrideMap = [];
            overrideMap[0] = {impression_id: '1'};

            const stubAds = [];
            for (let i = 0; i < 10; i++) {
              stubAds.push(createResponseAdByIndex(i, sizeMap[i].sizeId, overrideMap));
            }

            const stubBids = [];
            for (let i = 0; i < 10; i++) {
              stubBids.push(createBidRequestByIndex(i, sizeMap[i].sizeAsArray.slice()));
            }

            const bids = spec.interpretResponse({
              body: {
                'status': 'ok',
                'site_id': '1100',
                'account_id': 14062,
                'zone_id': 2100,
                'size_id': '1',
                'tracking': '',
                'inventory': {},
                'ads': stubAds
              }
            }, {bidRequest: stubBids});
            expect(bids).to.be.a('array').with.lengthOf(10);

            bids.forEach((bid) => {
              expect(bid).to.be.a('object');
              expect(bid).to.have.property('cpm').that.is.a('number');
              expect(bid).to.have.property('width').that.is.a('number');
              expect(bid).to.have.property('height').that.is.a('number');

              // verify that result bid 'sizeId' links to a size from the sizeMap
              const size = getSizeIdForBid(sizeMap, bid);
              expect(size).to.be.a('object');

              // use 'size' to verify that result bid links to the 'response.ad' passed to function
              const associateAd = getResponseAdBySize(stubAds, size);
              expect(associateAd).to.be.a('object');
              expect(associateAd).to.have.property('creative_id').that.is.a('string');

              // use 'size' to verify that result bid links to the 'bidRequest' passed to function
              const associateBidRequest = getBidRequestBySize(stubBids, size);
              expect(associateBidRequest).to.be.a('object');
              expect(associateBidRequest).to.have.property('bidId').that.is.a('string');

              // verify all bid properties set using 'ad' and 'bidRequest' match
              // 'ad.creative_id === bid.creativeId'
              expect(bid.requestId).to.equal(associateBidRequest.bidId);
              // 'bid.requestId === bidRequest.bidId'
              expect(bid.creativeId).to.equal(associateAd.creative_id);
            });
          });

          it('handles incorrect adUnits length by returning all bids with matching ads', function () {
            const overrideMap = [];
            overrideMap[0] = {impression_id: '1'};

            const stubAds = [];
            for (let i = 0; i < 6; i++) {
              stubAds.push(createResponseAdByIndex(i, sizeMap[i].sizeId, overrideMap));
            }

            const stubBids = [];
            for (let i = 0; i < 10; i++) {
              stubBids.push(createBidRequestByIndex(i, sizeMap[i].sizeAsArray.slice()));
            }

            const bids = spec.interpretResponse({
              body: {
                'status': 'ok',
                'site_id': '1100',
                'account_id': 14062,
                'zone_id': 2100,
                'size_id': '1',
                'tracking': '',
                'inventory': {},
                'ads': stubAds
              }
            }, {bidRequest: stubBids});

            // no bids expected because response didn't match requested bid number
            expect(bids).to.be.a('array').with.lengthOf(6);
          });

          it('skips adUnits with error status and returns all bids with ok status', function () {
            const stubAds = [];
            // Create overrides to break associations between bids and ads
            // Each override should cause one less bid to be returned by interpretResponse
            const overrideMap = [];
            overrideMap[0] = {impression_id: '1'};
            overrideMap[2] = {status: 'error'};
            overrideMap[4] = {status: 'error'};
            overrideMap[7] = {status: 'error'};
            overrideMap[8] = {status: 'error'};

            for (let i = 0; i < 10; i++) {
              stubAds.push(createResponseAdByIndex(i, sizeMap[i].sizeId, overrideMap));
            }

            const stubBids = [];
            for (let i = 0; i < 10; i++) {
              stubBids.push(createBidRequestByIndex(i, sizeMap[i].sizeAsArray.slice()));
            }

            const bids = spec.interpretResponse({
              body: {
                'status': 'error',
                'site_id': '1100',
                'account_id': 14062,
                'zone_id': 2100,
                'size_id': '1',
                'tracking': '',
                'inventory': {},
                'ads': stubAds
              }
            }, {bidRequest: stubBids});
            expect(bids).to.be.a('array').with.lengthOf(6);

            bids.forEach((bid) => {
              expect(bid).to.be.a('object');
              expect(bid).to.have.property('cpm').that.is.a('number');
              expect(bid).to.have.property('width').that.is.a('number');
              expect(bid).to.have.property('height').that.is.a('number');

              // verify that result bid 'sizeId' links to a size from the sizeMap
              const size = getSizeIdForBid(sizeMap, bid);
              expect(size).to.be.a('object');

              // use 'size' to verify that result bid links to the 'response.ad' passed to function
              const associateAd = getResponseAdBySize(stubAds, size);
              expect(associateAd).to.be.a('object');
              expect(associateAd).to.have.property('creative_id').that.is.a('string');
              expect(associateAd).to.have.property('status').that.is.a('string');
              expect(associateAd.status).to.equal('ok');

              // use 'size' to verify that result bid links to the 'bidRequest' passed to function
              const associateBidRequest = getBidRequestBySize(stubBids, size);
              expect(associateBidRequest).to.be.a('object');
              expect(associateBidRequest).to.have.property('bidId').that.is.a('string');

              // verify all bid properties set using 'ad' and 'bidRequest' match
              // 'ad.creative_id === bid.creativeId'
              expect(bid.requestId).to.equal(associateBidRequest.bidId);
              // 'bid.requestId === bidRequest.bidId'
              expect(bid.creativeId).to.equal(associateAd.creative_id);
            });
          });
        });
      });

      if (FEATURES.VIDEO) {
        describe('for video', function () {
          it('should register a successful bid', function () {
            const bidderRequest = createVideoBidderRequest();
            let response = {
              cur: 'USD',
              seatbid: [{
                bid: [{
                  id: '0',
                  impid: '/19968336/header-bid-tag-0',
                  adomain: ['test.com'],
                  price: 2,
                  crid: '4259970',
                  ext: {
                    bidder: {
                      rp: {
                        mime: 'application/javascript',
                        size_id: 201,
                        advid: 12345
                      }
                    },
                    prebid: {
                      targeting: {
                        hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'
                      },
                      type: 'video'
                    }
                  }
                }],
                group: 0,
                seat: 'rubicon'
              }],
            };

            const request = converter.toORTB({bidderRequest, bidRequests: bidderRequest.bids});

            let bids = spec.interpretResponse({body: response}, {data: request});

            expect(bids).to.be.lengthOf(1);

            expect(bids[0].seatBidId).to.equal('0');
            expect(bids[0].creativeId).to.equal('4259970');
            expect(bids[0].cpm).to.equal(2);
            expect(bids[0].ttl).to.equal(360);
            expect(bids[0].netRevenue).to.equal(true);
            expect(bids[0].adserverTargeting).to.deep.equal({hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'});
            expect(bids[0].mediaType).to.equal('video');
            expect(bids[0].meta.mediaType).to.equal('video');
            expect(String(bids[0].meta.advertiserDomains)).to.equal('test.com');
            expect(bids[0].meta.advertiserId).to.equal(12345);
            expect(bids[0].bidderCode).to.equal('rubicon');
            expect(bids[0].currency).to.equal('USD');
            expect(bids[0].width).to.equal(640);
            expect(bids[0].height).to.equal(480);
          });
        });
      }

      if (FEATURES.NATIVE) {
        describe('for native', () => {
          it('should get a native bid', () => {
            const nativeBidderRequest = addNativeToBidRequest(bidderRequest);
            const request = converter.toORTB({bidderRequest: nativeBidderRequest, bidRequests: nativeBidderRequest.bids});
            let response = getNativeResponse({impid: request.imp[0].id});
            let bids = spec.interpretResponse({body: response}, {data: request});
            expect(bids).to.have.nested.property('[0].native');
          });
        });
      }

      if (FEATURES.VIDEO) {
        describe('for outstream video', function () {
          const sandbox = sinon.createSandbox();
          beforeEach(function () {
            config.setConfig({rubicon: {
              rendererConfig: {
                align: 'left',
                closeButton: true,
                collapse: false
              },
              rendererUrl: 'https://example.test/renderer.js'
            }});
            window.MagniteApex = {
              renderAd: function() {
                return null;
              }
            }
          });

          afterEach(function () {
            sandbox.restore();
            delete window.MagniteApex;
          });

          it('should register a successful bid', function () {
            const bidderRequest = createVideoBidderRequestOutstream();
            let response = {
              cur: 'USD',
              seatbid: [{
                bid: [{
                  id: '0',
                  impid: '/19968336/header-bid-tag-0',
                  adomain: ['test.com'],
                  price: 2,
                  crid: '4259970',
                  ext: {
                    bidder: {
                      rp: {
                        mime: 'application/javascript',
                        size_id: 201,
                        advid: 12345
                      }
                    },
                    prebid: {
                      targeting: {
                        hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'
                      },
                      type: 'video'
                    }
                  }
                }],
                group: 0,
                seat: 'rubicon'
              }],
            };

            const request = converter.toORTB({bidderRequest, bidRequests: bidderRequest.bids});

            let bids = spec.interpretResponse({body: response}, { data: request });

            expect(bids).to.be.lengthOf(1);

            expect(bids[0].seatBidId).to.equal('0');
            expect(bids[0].creativeId).to.equal('4259970');
            expect(bids[0].cpm).to.equal(2);
            expect(bids[0].ttl).to.equal(360);
            expect(bids[0].netRevenue).to.equal(true);
            expect(bids[0].adserverTargeting).to.deep.equal({hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'});
            expect(bids[0].mediaType).to.equal('video');
            expect(bids[0].meta.mediaType).to.equal('video');
            expect(String(bids[0].meta.advertiserDomains)).to.equal('test.com');
            expect(bids[0].meta.advertiserId).to.equal(12345);
            expect(bids[0].bidderCode).to.equal('rubicon');
            expect(bids[0].currency).to.equal('USD');
            expect(bids[0].width).to.equal(640);
            expect(bids[0].height).to.equal(320);
            // check custom renderer
            expect(typeof bids[0].renderer).to.equal('object');
            expect(bids[0].renderer.getConfig()).to.deep.equal({
              align: 'left',
              closeButton: true,
              collapse: false
            });
            expect(bids[0].renderer.url).to.equal('https://example.test/renderer.js');
          });

          it('should render ad with Magnite renderer', function () {
            const bidderRequest = createVideoBidderRequestOutstream();
            let response = {
              cur: 'USD',
              seatbid: [{
                bid: [{
                  id: '0',
                  impid: '/19968336/header-bid-tag-0',
                  adomain: ['test.com'],
                  price: 2,
                  crid: '4259970',
                  ext: {
                    bidder: {
                      rp: {
                        mime: 'application/javascript',
                        size_id: 201,
                        advid: 12345
                      }
                    },
                    prebid: {
                      targeting: {
                        hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'
                      },
                      type: 'video'
                    }
                  },
                  nurl: 'https://test.com/vast.xml'
                }],
                group: 0,
                seat: 'rubicon'
              }],
            };

            const request = converter.toORTB({bidderRequest, bidRequests: bidderRequest.bids});

            sinon.spy(window.MagniteApex, 'renderAd');

            let bids = spec.interpretResponse({body: response}, {data: request});
            const bid = bids[0];
            bid.adUnitCode = 'outstream_video1_placement';
            const adUnit = document.createElement('div');
            adUnit.id = bid.adUnitCode;
            document.body.appendChild(adUnit);

            bid.renderer.render(bid);

            const renderCall = window.MagniteApex.renderAd.getCall(0);
            expect(renderCall.args[0]).to.deep.equal({
              closeButton: true,
              collapse: false,
              height: 320,
              label: undefined,
              placement: {
                align: 'left',
                attachTo: adUnit,
                position: 'append',
              },
              vastUrl: 'https://test.com/vast.xml',
              width: 640
            });
            // cleanup
            adUnit.parentNode.removeChild(adUnit);
          });

          it('should render ad with Magnite renderer without video object', function () {
            const bidderRequest = createVideoBidderRequestOutstream();
            delete bidderRequest.bids[0].params.video;
            bidderRequest.bids[0].params.bidonmultiformat = true;
            bidderRequest.bids[0].mediaTypes.video.placement = 3;
            bidderRequest.bids[0].mediaTypes.video.playerSize = [640, 480];

            let response = {
              cur: 'USD',
              seatbid: [{
                bid: [{
                  id: '0',
                  impid: '/19968336/header-bid-tag-0',
                  adomain: ['test.com'],
                  price: 2,
                  crid: '4259970',
                  ext: {
                    bidder: {
                      rp: {
                        mime: 'application/javascript',
                        size_id: 201,
                        advid: 12345
                      }
                    },
                    prebid: {
                      targeting: {
                        hb_uuid: '0c498f63-5111-4bed-98e2-9be7cb932a64'
                      },
                      type: 'video'
                    }
                  },
                  nurl: 'https://test.com/vast.xml'
                }],
                group: 0,
                seat: 'rubicon'
              }],
            };

            const request = converter.toORTB({bidderRequest, bidRequests: bidderRequest.bids});

            sinon.spy(window.MagniteApex, 'renderAd');

            let bids = spec.interpretResponse({body: response}, {data: request});
            const bid = bids[0];
            bid.adUnitCode = 'outstream_video1_placement';
            const adUnit = document.createElement('div');
            adUnit.id = bid.adUnitCode;
            document.body.appendChild(adUnit);

            bid.renderer.render(bid);

            const renderCall = window.MagniteApex.renderAd.getCall(0);
            expect(renderCall.args[0]).to.deep.equal({
              closeButton: true,
              collapse: false,
              height: 480,
              label: undefined,
              placement: {
                align: 'left',
                attachTo: adUnit,
                position: 'append',
              },
              vastUrl: 'https://test.com/vast.xml',
              width: 640
            });
            // cleanup
            adUnit.parentNode.removeChild(adUnit);
          });
        });
      }

      describe('config with integration type', () => {
        it('should use the integration type provided in the config instead of the default', () => {
          config.setConfig({rubicon: {int_type: 'testType'}});
          const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
          expect(parseQuery(request.data).tk_flint).to.equal('testType_v$prebid.version$');
        });
      });
    });
  });

  describe('user sync', function () {
    const emilyUrl = 'https://eus.rubiconproject.com/usync.html';

    beforeEach(function () {
      resetUserSync();
    });

    it('should register the Emily iframe', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });

      expect(syncs).to.deep.equal({type: 'iframe', url: emilyUrl});
    });

    it('should not register the Emily iframe more than once', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });
      expect(syncs).to.deep.equal({type: 'iframe', url: emilyUrl});

      // when called again, should still have only been called once
      syncs = spec.getUserSyncs();
      expect(syncs).to.equal(undefined);
    });

    it('should pass gdpr params if consent is true', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        gdprApplies: true, consentString: 'foo'
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr=1&gdpr_consent=foo`
      });
    });

    it('should pass gdpr params if consent is false', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        gdprApplies: false, consentString: 'foo'
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr=0&gdpr_consent=foo`
      });
    });

    it('should pass gdpr param gdpr_consent only when gdprApplies is undefined', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        consentString: 'foo'
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr_consent=foo`
      });
    });

    it('should pass no params if gdpr consentString is not defined', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {})).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}`
      });
    });

    it('should pass no params if gdpr consentString is a number', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        consentString: 0
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}`
      });
    });

    it('should pass no params if gdpr consentString is null', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        consentString: null
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}`
      });
    });

    it('should pass no params if gdpr consentString is a object', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        consentString: {}
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}`
      });
    });

    it('should pass no params if gdpr is not defined', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, undefined)).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}`
      });
    });

    it('should pass us_privacy if uspConsent is defined', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, undefined, '1NYN')).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?us_privacy=1NYN`
      });
    });

    it('should pass us_privacy after gdpr if both are present', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        consentString: 'foo'
      }, '1NYN')).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr_consent=foo&us_privacy=1NYN`
      });
    });

    it('should pass gdprApplies', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        gdprApplies: true
      }, '1NYN')).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr=1&us_privacy=1NYN`
      });
    });

    it('should pass all correctly', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {
        gdprApplies: true,
        consentString: 'foo'
      }, '1NYN')).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gdpr=1&gdpr_consent=foo&us_privacy=1NYN`
      });
    });

    it('should pass gpp params when gppConsent is present', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {}, undefined, {
        gppString: 'foo',
        applicableSections: [2]
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gpp=foo&gpp_sid=2`
      });
    });

    it('should pass multiple sid\'s when multiple are present', function () {
      expect(spec.getUserSyncs({iframeEnabled: true}, {}, {}, undefined, {
        gppString: 'foo',
        applicableSections: [2, 5]
      })).to.deep.equal({
        type: 'iframe', url: `${emilyUrl}?gpp=foo&gpp_sid=2,5`
      });
    });
  });

  describe('get price granularity', function () {
    it('should return correct buckets for all price granularity values', function () {
      const CUSTOM_PRICE_BUCKET_ITEM = {max: 5, increment: 0.5};

      const mockConfig = {
        priceGranularity: undefined,
        customPriceBucket: {
          buckets: [CUSTOM_PRICE_BUCKET_ITEM]
        }
      };
      sandbox.stub(config, 'getConfig').callsFake(key => {
        return mockConfig[key];
      });

      [
        {key: 'low', val: {max: 5.00, increment: 0.50}},
        {key: 'medium', val: {max: 20.00, increment: 0.10}},
        {key: 'high', val: {max: 20.00, increment: 0.01}},
        {key: 'auto', val: {max: 5.00, increment: 0.05}},
        {key: 'dense', val: {max: 3.00, increment: 0.01}},
        {key: 'custom', val: CUSTOM_PRICE_BUCKET_ITEM},

      ].forEach(kvPair => {
        mockConfig.priceGranularity = kvPair.key;
        const result = getPriceGranularity(config);
        expect(typeof result).to.equal('object');
        expect(result).to.haveOwnProperty('ranges');
        expect(Array.isArray(result.ranges)).to.equal(true);
        expect(result.ranges.length).to.be.greaterThan(0)
        expect(result.ranges[0]).to.deep.equal(kvPair.val);
      });
    });
  });

  describe('Supply Chain Support', function () {
    const nodePropsOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    let bidRequests;
    let schainConfig;

    const getSupplyChainConfig = () => {
      return {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'rubicon.com',
            sid: '1234',
            hp: 1,
            rid: 'bid-request-1',
            name: 'pub one',
            domain: 'pub1.com'
          },
          {
            asi: 'theexchange.com',
            sid: '5678',
            hp: 1,
            rid: 'bid-request-2',
            name: 'pub two',
            domain: 'pub2.com'
          },
          {
            asi: 'wesellads.com',
            sid: '9876',
            hp: 1,
            rid: 'bid-request-3',
            // name: 'alladsallthetime',
            domain: 'alladsallthetime.com'
          }
        ]
      };
    };

    beforeEach(() => {
      bidRequests = getBidderRequest();
      schainConfig = getSupplyChainConfig();
      bidRequests.bids[0].schain = schainConfig;
    });

    it('should properly serialize schain object with correct delimiters', () => {
      const results = spec.buildRequests(bidRequests.bids, bidRequests);
      const numNodes = schainConfig.nodes.length;
      const schain = parseQuery(results[0].data).rp_schain;

      // each node serialization should start with an !
      expect(schain.match(/!/g).length).to.equal(numNodes);

      // 5 commas per node plus 1 for version
      expect(schain.match(/,/g).length).to.equal(numNodes * 5 + 1);
    });

    it('should send the proper version for the schain', () => {
      const results = spec.buildRequests(bidRequests.bids, bidRequests);
      const schain = parseQuery(results[0].data).rp_schain.split('!');
      const version = schain.shift().split(',')[0];
      expect(version).to.equal(bidRequests.bids[0].schain.ver);
    });

    it('should send the correct value for complete in schain', () => {
      const results = spec.buildRequests(bidRequests.bids, bidRequests);
      const schain = parseQuery(results[0].data).rp_schain.split('!');
      const complete = schain.shift().split(',')[1];
      expect(complete).to.equal(String(bidRequests.bids[0].schain.complete));
    });

    it('should send available params in the right order', () => {
      const results = spec.buildRequests(bidRequests.bids, bidRequests);
      const schain = parseQuery(results[0].data).rp_schain.split('!');
      schain.shift();

      schain.forEach((serializeNode, nodeIndex) => {
        const nodeProps = serializeNode.split(',');
        nodeProps.forEach((nodeProp, propIndex) => {
          const node = schainConfig.nodes[nodeIndex];
          const key = nodePropsOrder[propIndex];
          expect(nodeProp).to.equal(node[key] ? String(node[key]) : '');
        });
      });
    });

    it('should copy the schain JSON to to bid.source.ext.schain', () => {
      const bidderRequest = createVideoBidderRequest();
      const schain = getSupplyChainConfig();
      bidderRequest.bids[0].schain = schain;
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request[0].data.source.ext.schain).to.deep.equal(schain);
    });
  });

  describe('configurable settings', function() {
    afterEach(() => {
      config.setConfig({
        rubicon: {
          bannerHost: 'rubicon',
          videoHost: 'prebid-server',
          syncHost: 'eus',
          returnVast: false
        }
      });
      config.resetConfig();
    });

    beforeEach(function () {
      resetUserSync();
    });

    it('should update fastlane endpoint if', function () {
      config.setConfig({
        rubicon: {
          bannerHost: 'fastlane-qa',
          videoHost: 'prebid-server-qa',
          syncHost: 'eus-qa',
          returnVast: true
        }
      });

      // banner
      const bannerBidderRequest = createGdprBidderRequest(false);
      let [bannerRequest] = spec.buildRequests(bannerBidderRequest.bids, bannerBidderRequest);
      expect(bannerRequest.url).to.equal('https://fastlane-qa.rubiconproject.com/a/api/fastlane.json');

      // video and returnVast
      const videoBidderRequest = createVideoBidderRequest();
      let [videoRequest] = spec.buildRequests(videoBidderRequest.bids, videoBidderRequest);
      let post = videoRequest.data;
      expect(videoRequest.url).to.equal('https://prebid-server-qa.rubiconproject.com/openrtb2/auction');
      expect(post.ext.prebid.cache.vastxml).to.have.property('returnCreative').that.is.an('boolean');
      expect(post.ext.prebid.cache.vastxml.returnCreative).to.equal(true);

      // user sync
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });
      expect(syncs).to.deep.equal({type: 'iframe', url: 'https://eus-qa.rubiconproject.com/usync.html'});
    });
  });
});

function addNativeToBidRequest(bidderRequest) {
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
    }]
  };
  bidderRequest.refererInfo = {
    page: 'localhost'
  }
  bidderRequest.bids[0] = {
    bidder: 'rubicon',
    params: {
      accountId: '14062',
      siteId: '70608',
      zoneId: '335918',
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    code: 'div-1',
    bidId: '2ffb201a808da7',
    bidderRequestId: '178e34bad3658f',
    auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
    transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    mediaTypes: {
      native: {
        ortb: {
          ...nativeOrtbRequest
        }
      }
    },
    nativeOrtbRequest
  }
  return bidderRequest;
}

function getNativeResponse(options = {impid: 1234}) {
  return {
    'id': 'd7786a80-bfb4-4541-859f-225a934e81d4',
    'seatbid': [
      {
        'bid': [
          {
            'id': '971650',
            'impid': options.impid,
            'price': 20,
            'adm': {
              'ver': '1.2',
              'assets': [
                {
                  'id': 0,
                  'title': {
                    'text': 'This is a title'
                  },
                  'link': {
                    'clicktrackers': [
                      'http://localhost:5500/event?type=click1&component=card&asset=0'
                    ]
                  }
                },
                {
                  'id': 1,
                  'img': {
                    'url': 'https:\\\\/\\\\/vcdn.adnxs.com\\\\/p\\\\/creative-image\\\\/94\\\\/22\\\\/cd\\\\/0f\\\\/9422cd0f-f400-45d3-80f5-2b92629d9257.jpg',
                    'h': 2250,
                    'w': 3000
                  },
                  'link': {
                    'clicktrackers': [
                      'http://localhost:5500/event?type=click1&component=card&asset=1'
                    ]
                  }
                },
                {
                  'id': 2,
                  'data': {
                    'value': 'this is asset data 1 that corresponds to sponsoredBy'
                  }
                }
              ],
              'link': {
                'url': 'https://magnite.com',
                'clicktrackers': [
                  'http://localhost:5500/event?type=click1&component=card',
                  'http://localhost:5500/event?type=click2&component=card'
                ]
              },
              'jstracker': '<script>console.log(\\"this is from a jstracker\\")</script>',
              'eventtrackers': [
                {
                  'event': 1,
                  'method': 2,
                  'url': 'http://localhost:5500/event?type=1&method=2'
                },
                {
                  'event': 2,
                  'method': 1,
                  'url': 'http://localhost:5500/event?type=v50&component=card'
                }
              ]
            },
            'adid': '392180',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://lax1-ib.adnxs.com/cr?id=97494403',
            'cid': '9325',
            'crid': '97494403',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'targeting': {
                  'hb_bidder': 'rubicon',
                  'hb_cache_host': 'prebid.lax1.adnxs-simple.com',
                  'hb_cache_path': '/pbc/v1/cache',
                  'hb_pb': '20.00'
                },
                'type': 'native',
                'video': {
                  'duration': 0,
                  'primary_category': ''
                }
              },
              'rubicon': {
                'auction_id': 642778043863823100,
                'bid_ad_type': 3,
                'bidder_id': 2,
                'brand_id': 555545
              }
            }
          }
        ],
        'seat': 'rubicon'
      }
    ],
    'cur': 'USD'
  };
}
