import {expect} from 'chai';
import {config} from 'src/config.js';
import {filterBidData, init} from 'modules/dataControllerModule/index.js';
import {startAuction} from 'src/prebid.js';

describe('data controller', function () {
  let spyFn;

  beforeEach(function () {
    spyFn = sinon.spy();
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('data controller', function () {
    let result;
    let callbackFn;
    let req;

    beforeEach(function () {
      init();
      result = null;
      req = {
        'adUnits': [{
          'bids': [
            {
              'bidder': 'ix',
              'userIdAsEids': [
                {
                  'source': 'id5-sync.com',
                  'uids': [
                    {
                      'id': 'ID5*UJzjz7J0FNIWPCp8fAmwGavBhGxnJ06V9umghosEVm4ZPjpn2iWahAoiPal59yKa',
                      'atype': 1,
                      'ext': {
                        'linkType': 2
                      }
                    }
                  ]
                }
              ],

            }
          ]
        }],
        'ortb2Fragments': {
          'bidder': {
            'ix': {
              'user': {
                'data': [
                  {
                    'name': 'permutive.com',
                    'ext': {
                      'segtax': 4
                    },
                    'segment': [
                      {
                        'id': '777777'
                      },
                      {
                        'id': '888888'
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      };
      callbackFn = function (request) {
        result = request;
      };
    });

    afterEach(function () {
      config.resetConfig();
      startAuction.getHooks({hook: filterBidData}).remove();
    });

    it('filterEIDwhenSDA for All SDA ', function () {
      let dataControllerConfiguration = {
        'dataController': {
          filterEIDwhenSDA: ['*']
        }
      };
      config.setConfig(dataControllerConfiguration);
      filterBidData(callbackFn, req);
      expect(req.adUnits[0].bids[0].userIdAsEids).that.is.empty;
    });

    it('filterEIDwhenSDA for available SAD permutive.com:4:777777 ', function () {
      let dataControllerConfiguration = {
        'dataController': {
          filterEIDwhenSDA: ['permutive.com:4:777777']
        }

      };
      config.setConfig(dataControllerConfiguration);
      filterBidData(callbackFn, req);
      expect(req.adUnits[0].bids[0].userIdAsEids).that.is.empty;
    });

    it('filterEIDwhenSDA for unavailable SAD test.com:4:9999 ', function () {
      let dataControllerConfiguration = {
        'dataController': {
          filterEIDwhenSDA: ['test.com:4:99999']
        }
      };
      config.setConfig(dataControllerConfiguration);
      filterBidData(callbackFn, req);
      expect(req.adUnits[0].bids[0].userIdAsEids).that.is.not.empty;
    });

    it('filterSDAwhenEID for id5-sync.com EID ', function () {
      let dataControllerConfiguration = {
        'dataController': {
          filterSDAwhenEID: ['id5-sync.com']
        }
      };
      config.setConfig(dataControllerConfiguration);
      filterBidData(callbackFn, req);
      expect(req.ortb2Fragments.bidder.ix.user.data).that.is.empty;
    });

    it('filterSDAwhenEID for All EID ', function () {
      let dataControllerConfiguration = {
        'dataController': {
          filterSDAwhenEID: ['*']
        }
      };
      config.setConfig(dataControllerConfiguration);

      filterBidData(callbackFn, req);
      expect(req.ortb2Fragments.bidder.ix.user.data).that.is.empty;
    });
  });
});
