import {expect} from 'chai';
import {config} from 'src/config.js';
import {filterBidData} from 'modules/dataControllerModule/index.js';

const MODULE_NAME = 'dataController';
let dataControllerConfig;
const ALL = '*';

describe('data controller', function () {
  let spyFn;

  let bidderRequests = [{
    'bidder': 'magnite',
    'params': {
      'accountId': 9840,
      'siteId': 123564,
      'zoneId': 583584,
      'inventory': {
        'area': [
          'home'
        ]
      },
      'visitor': {
        'test_kv': [
          'true'
        ],
        'p_standard': [
          'pcrprs1',
          'pcrprs2',
          'ppam1',
          'ppam2',
          '1000001',
          '1000002'
        ],
        'permutive': [
          'gam1',
          'gam2'
        ]
      }
    },
    'userId': {
      'id5id': {
        'uid': 'ID5*bYa7d4OryMyzTHV4Y0HXVsvfeUvB1cMrHDqM_5lnwQkTd5cs8J6sU7jG5JZUpBVS',
        'ext': {
          'linkType': 2
        }
      }
    },
    'userIdAsEids': [
      {
        'source': 'id5-sync.com',
        'uids': [
          {
            'id': 'ID5*bYa7d4OryMyzTHV4Y0HXVsvfeUvB1cMrHDqM_5lnwQkTd5cs8J6sU7jG5JZUpBVS',
            'atype': 1,
            'ext': {
              'linkType': 2
            }
          }
        ]
      }
    ],
    'crumbs': {
      'pubcid': '56b30547-fb8f-4b63-a3ae-99007b930263'
    },
    'ortb2Imp': {
      'ext': {
        'data': {
          'adserver': {
            'name': 'gam',
            'adslot': '/19968336/header-bid-tag-0'
          },
          'pbadslot': '/19968336/header-bid-tag-0'
        },
        'gpid': '/19968336/header-bid-tag-0'
      }
    }
  }];

  let magniteBidderConfig = {
    bidders: ['magnite'],
    config: {
      ortb2: {
        user: {
          data: [
            {
              name: 'permutive.com',
              segment: [
                {
                  id: 'pcrprs1'
                },
                {
                  id: 'pcrprs2'
                },
                {
                  id: 'ppam1'
                },
                {
                  id: 'ppam2'
                },
                {
                  id: '1000001'
                },
                {
                  id: '1000002'
                }
              ]
            },
            {
              name: 'permutive.com',
              ext: {
                segtax: 4
              },
              segment: [
                {
                  id: '777777'
                },
                {
                  id: '888888'
                }
              ]
            }
          ]
        },
        site: {
          content: {
            data: [1]
          }
        }
      }
    }
  };

  beforeEach(function () {
    spyFn = sinon.spy();
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('data controller', function () {
    let result;
    let specDetails = {};
    let callbackFn = function (bidderRequests) {
      result = bidderRequests;
    };

    beforeEach(function () {
      result = null;
      callbackFn = sinon.spy();
    });

    afterEach(function () {
      config.resetConfig();
    });
    it('data controller not configured ', function () {
      let bids = [{...bidderRequests[0]}];
      filterBidData(callbackFn, specDetails, bids, bidderRequests);
      expect(callbackFn.called).to.equal(true);
    });

    it('data controller incorrect ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['permutive.com:4:777777'],
          filterSDAwhenEID: ['id5-sync.com']
        }
      };
      config.setConfig(dataControllerConfiguration);
      let bids = [{...bidderRequests[0]}];
      filterBidData(callbackFn, specDetails, bids, bidderRequests);
      expect(callbackFn.called).to.equal(true);
    });

    it('filterEIDwhenSDA for All SDA ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['*'],
        }
      };
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);

      let bids = [{...bidderRequests[0]}];
      let magniteBidderRequest = {
        bidderCode: 'magnite'
      };
      filterBidData(callbackFn, specDetails, bids, magniteBidderRequest);
      expect(callbackFn.called).to.equal(true);
      expect(bids[0].userIdAsEids).that.is.empty;
    });

    it('filterEIDwhenSDA for available SAD permutive.com:4:9999 ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['permutive.com:4:777777'],
        }
      };
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);
      let bids = [{...bidderRequests[0]}];
      let magniteBidderRequest = {
        bidderCode: 'magnite'
      };
      filterBidData(callbackFn, specDetails, bids, magniteBidderRequest);
      expect(callbackFn.called).to.equal(true);
      expect(bids[0].userIdAsEids).that.is.empty;
    });

    it('filterEIDwhenSDA for unavailable SAD test.com:4:9999 ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['test.com:4:777777'],
        }
      };
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);
      let bids = [{...bidderRequests[0]}];
      let magniteBidderRequest = {
        bidderCode: 'magnite'
      };
      filterBidData(callbackFn, specDetails, bids, magniteBidderRequest);
      expect(callbackFn.called).to.equal(true);
      expect(bids[0].userIdAsEids).that.is.not.empty;
    });

    it('filterSDAwhenEID for id5-sync.com EID ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterSDAwhenEID: ['id5-sync.com'],
        }
      };
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);
      let bids = [{...bidderRequests[0]}];

      let magniteBidderRequest = {
        bidderCode: 'magnite'
      };
      filterBidData(callbackFn, specDetails, bids, magniteBidderRequest);
      let updatedBidderConfig = config.getBidderConfig();
      expect(updatedBidderConfig.magnite).to.not.equal(undefined);

      expect(updatedBidderConfig.magnite.ortb2.user.data).to.be.instanceof(Array);
      expect(updatedBidderConfig.magnite.ortb2.user.data).that.is.empty;
    });

    it('filterSDAwhenEID for All EID ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterSDAwhenEID: ['*'],
        }
      };
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);
      let bids = [{...bidderRequests[0]}];
      let magniteBidderRequest = {
        bidderCode: 'magnite'
      };
      filterBidData(callbackFn, specDetails, bids, magniteBidderRequest);
      let updatedBidderConfig = config.getBidderConfig();
      expect(updatedBidderConfig.magnite).to.not.equal(undefined);
      expect(updatedBidderConfig.magnite.ortb2.user.data).to.be.instanceof(Array);
      expect(updatedBidderConfig.magnite.ortb2.user.data).that.is.empty;
    });
  });
});
