/* eslint-disable no-trailing-spaces */
import {expect} from 'chai';
import {
  PrebidServer as Adapter,
  resetSyncedStatus,
} from 'modules/prebidServerBidAdapter/index.js';
import * as utils from 'src/utils.js';
import {ajax} from 'src/ajax.js';
import {config} from 'src/config.js';
import 'modules/appnexusBidAdapter.js'; // appnexus alias test
import 'modules/rubiconBidAdapter.js'; // rubicon alias test
import 'src/prebid.js'; // $$PREBID_GLOBAL$$.aliasBidder test
import 'modules/currency.js'; // adServerCurrency test
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/schain.js';
import 'modules/fledgeForGpt.js';
import {hook} from '../../../src/hook.js';
import {decorateAdUnitsWithNativeParams} from '../../../src/native.js';
import CONSTANTS from '../../../src/constants.json';
import sinon from 'sinon';
import * as events from '../../../src/events';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  cacheMarkup: 2,
  endpoint: {
    p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
    noP1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
  }
};

const REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'secure': 0,
  'url': '',
  'prebid_version': '0.30.0-pre',
  's2sConfig': CONFIG,
  'ad_units': [
    {
      'code': 'div-gpt-ad-1460505748561-0',
      'sizes': [[300, 250], [300, 600]],
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 300]]
        },
        'native': {
          'title': {
            'required': true,
            'len': 800
          },
          'image': {
            'required': true,
            'sizes': [989, 742],
          },
          'icon': {
            'required': true,
            'aspect_ratios': [{
              'min_height': 10,
              'min_width': 10,
              'ratio_height': 1,
              'ratio_width': 1
            }]
          },
          'sponsoredBy': {
            'required': true
          }
        }
      },
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
      'bids': [
        {
          'bid_id': '123',
          'bidder': 'appnexus',
          'params': {
            'placementId': '10433394',
            'member': 123
          },
        }
      ]
    }
  ]
};

let BID_REQUESTS;

describe('S2S Adapter', function () {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  addBidResponse.reject = sinon.spy();

  function prepRequest(req) {
    req.ad_units.forEach((adUnit) => {
      delete adUnit.nativeParams
    });
    decorateAdUnitsWithNativeParams(req.ad_units);
  }

  before(() => {
    hook.ready();
    prepRequest(REQUEST);
  });

  beforeEach(function () {
    config.resetConfig();
    config.setConfig({floors: {enabled: false}});
    adapter = new Adapter();
    BID_REQUESTS = [
      {
        'bidderCode': 'appnexus',
        'auctionId': '173afb6d132ba3',
        'bidderRequestId': '3d1063078dfcc8',
        'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': '10433394',
              'member': 123,
              'keywords': {
                'foo': ['bar', 'baz'],
                'fizz': ['buzz']
              }
            },
            'bid_id': '123',
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'mediaTypes': {
              'banner': {
                'sizes': [[300, 250]]
              }
            },
            'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
            'sizes': [300, 250],
            'bidId': '123',
            'bidderRequestId': '3d1063078dfcc8',
            'auctionId': '173afb6d132ba3'
          }
        ],
        'auctionStart': 1510852447530,
        'timeout': 5000,
        'src': 's2s',
        'doneCbCallCount': 0,
        'refererInfo': {
          'page': 'http://mytestpage.com'
        }
      }
    ];
  });

  afterEach(function () {
    addBidResponse.resetHistory();
    addBidResponse.reject = sinon.spy();
    done.resetHistory();
  });

  after(function () {
    config.resetConfig();
  });

  describe('pbsConverter', function () {
    let logErrorSpy;
    let eventsEmitSpy;

    beforeEach(function () {
      logErrorSpy = sinon.spy(utils, 'logError');
      resetSyncedStatus();
    });

    afterEach(function () {
      utils.logError.restore();
      sinon.spy.resetHistory()
      eventsEmitSpy.resetHistory();
    });

    it('should emit event `floorValuesReceived` when calculating bid floor', function () {
      // This will be used to test the bidFloor function in ortbConverter.js
      eventsEmitSpy = sinon.spy(events, 'emit');
      const consentConfig = {s2sConfig: CONFIG};
      config.setConfig(consentConfig);
      const bidRequest = utils.deepClone(REQUEST);
      bidRequest.ad_units[0].ortb2Imp = {
        banner: {
          api: 7
        },
        instl: 1
      };

      adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      expect(eventsEmitSpy.getCalls()
        .filter(call => {
          return call.args[0] === CONSTANTS.EVENTS.PBS_FLOOR_VALUES_RECEIVED
        })
      ).to.length(1);
    });
  });
});
