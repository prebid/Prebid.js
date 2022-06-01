import {expect} from 'chai';
import {config} from 'src/config.js';
import {filterData} from 'modules/dataControllerModule/index.js';
import * as utils from 'src/utils.js';

const MODULE_NAME = 'dataController';
let dataControllerConfig;
const ALL = '*';

function filterEIDs(requestObject) {
  dataControllerConfig = config.getConfig(MODULE_NAME);
  if (dataControllerConfig && dataControllerConfig.filterEIDwhenSDA) {
    let bidderConfig = config.getBidderConfig();
    let userEids = {};
    Object.entries(bidderConfig).forEach(([key, value]) => {
      let resetEID = containsConfiguredSDA(value);
      if (resetEID) {
        userEids[key] = [];
      }
    });
    return userEids;
  }
}

function containsConfiguredEIDS(eidSources) {
  dataControllerConfig = config.getConfig(MODULE_NAME);
  if (dataControllerConfig.filterSDAwhenEID.includes(ALL)) {
    return true;
  }
  let containsSource = false;
  dataControllerConfig.filterSDAwhenEID.forEach(source => {
    if (eidSources.has(source)) {
      containsSource = true;
    }
  })
  return containsSource;
}

function containsConfiguredSDA(bidderConfig) {
  if (dataControllerConfig.filterEIDwhenSDA.includes(ALL)) {
    return true;
  }
  let segementSet = getSegmentConfig(bidderConfig);

  let containsSegment = false;
  dataControllerConfig.filterEIDwhenSDA.forEach(segment => {
    if (segementSet.has(segment)) {
      containsSegment = true;
    }
  })
  return containsSegment;
}

function getSegmentConfig(bidderConfig) {
  let segementSet = new Set();
  let userData = utils.deepAccess(bidderConfig, 'ortb2.user.data') || [];
  if (userData) {
    for (let i = 0; i < userData.length; i++) {
      let segments = userData[i].segment;
      let segmentPrefix = '';
      if (userData[i].name) {
        segmentPrefix = userData[i].name + ':';
      }

      if (userData[i].ext && userData[i].ext.segtax) {
        segmentPrefix += userData[i].ext.segtax + ':';
      }
      for (let j = 0; j < segments.length; j++) {
        segementSet.add(segmentPrefix + segments[j].id);
      }
    }
  }
  return segementSet;
}

function getEIDsSource(requestObject) {
  let source = new Set();

  requestObject.forEach(eids => {
    if ('userIdAsEids' in eids) {
      eids.userIdAsEids.forEach((value) => {
        if ('source' in value) {
          source.add(value['source']);
        }
      });
    }
  });
  return source;
}

function filterSDA(bidRequests) {
  dataControllerConfig = config.getConfig(MODULE_NAME);
  if (dataControllerConfig.filterSDAwhenEID) {
    let eidSources = getEIDsSource(bidRequests);
    let resetSDA = containsConfiguredEIDS(eidSources);
    const bidderConfig = config.getBidderConfig();
    if (resetSDA) {
      for (const [key, value] of Object.entries(bidderConfig)) {
        value.ortb2.user.data = [];
      }
      return bidderConfig;
    }
  }
}

export const dcSubmodule = {
  filterSDA: filterSDA,
  filterEIDs: filterEIDs
};

describe('data controller', function () {
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
  afterEach(function () {
    config.resetConfig();
  });

  describe('data controller', function () {
    let result;
    let callbackFn = function (bidderRequests) {
      result = bidderRequests;
    };

    beforeEach(function () {
      result = null;
    });

    afterEach(function () {
      config.resetConfig();
    });
    it('data controller not configured ', function () {
      let bidRequests = [{...bidderRequests[0]}];

      filterData(dcSubmodule, bidRequests)
      expect(config.getConfig('dcUsersAsEids')).to.equal(undefined);
    });

    it('data controller incorrect ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['permutive.com:4:777777'],
          filterSDAwhenEID: ['id5-sync.com']
        }
      }
      config.setConfig(dataControllerConfiguration);
      let bidRequests = [{...bidderRequests[0]}];
      filterData(dcSubmodule, bidRequests)
      expect(config.getConfig('dcUsersAsEids')).to.equal(undefined);
    });

    it('filterEIDwhenSDA for All SDA ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['*'],
        }
      }
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);

      let bidRequests = [{...bidderRequests[0]}];
      filterData(dcSubmodule, bidRequests)
      expect(config.getConfig('dcUsersAsEids')).to.not.equal(undefined);
      expect(config.getConfig('dcUsersAsEids').magnite).to.not.equal(null);
    });

    it('filterEIDwhenSDA for permutive.com:4:777777 ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['permutive.com:4:777777'],
        }
      }
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);

      let bidRequests = [{...bidderRequests[0]}];
      filterData(dcSubmodule, bidRequests)
      expect(config.getConfig('dcUsersAsEids')).to.not.equal(undefined);
      expect(config.getConfig('dcUsersAsEids').magnite).to.not.equal(null);
      expect(config.getConfig('dcUsersAsEids').magnite).to.be.instanceof(Array);
      expect(config.getConfig('dcUsersAsEids').magnite).that.is.empty;
    });

    it('filterEIDwhenSDA for unavaible SAD test.com:4:9999 ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterEIDwhenSDA: ['permutive.com:4:777777'],
        }
      }
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);
      let bidRequests = [{...bidderRequests[0]}];

      filterData(dcSubmodule, bidRequests)

      expect(config.getConfig('dcUsersAsEids')).to.not.equal(undefined);
      expect(config.getConfig('dcUsersAsEids').magnite).to.not.equal(undefined);
      expect(config.getConfig('dcUsersAsEids').magnite).to.be.instanceof(Array);
      expect(config.getConfig('dcUsersAsEids').magnite).that.is.empty; ;
    });
    it('filterSDAwhenEID for id5-sync.com EID ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterSDAwhenEID: ['id5-sync.com'],
        }
      }
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);

      let source = new Set();

      let bidRequests = [{...bidderRequests[0]}];

      bidRequests.forEach(eids => {
        if ('userIdAsEids' in eids) {
          eids.userIdAsEids.forEach((value) => {
            if ('source' in value) {
              source.add(value['source']);
            }
          });
        }
      });
      filterData(dcSubmodule, bidRequests)
      let updatedBidderConfig = config.getBidderConfig();
      expect(updatedBidderConfig.magnite).to.not.equal(undefined);

      expect(updatedBidderConfig.magnite.ortb2.user.data).to.be.instanceof(Array);
      expect(updatedBidderConfig.magnite.ortb2.user.data).that.is.empty; ;
    });

    it('filterSDAwhenEID for All EID ', function () {
      let dataControllerConfiguration = {
        dataController: {
          filterSDAwhenEID: ['*'],
        }
      }
      config.setBidderConfig(magniteBidderConfig);
      config.setConfig(dataControllerConfiguration);

      let source = new Set();

      let bidRequests = [{...bidderRequests[0]}];

      bidRequests.forEach(eids => {
        if ('userIdAsEids' in eids) {
          eids.userIdAsEids.forEach((value) => {
            if ('source' in value) {
              source.add(value['source']);
            }
          });
        }
      });
      filterData(dcSubmodule, bidRequests)
      let updatedBidderConfig = config.getBidderConfig();
      expect(updatedBidderConfig.magnite).to.not.equal(undefined);
      expect(updatedBidderConfig.magnite.ortb2.user.data).to.be.instanceof(Array);
      expect(updatedBidderConfig.magnite.ortb2.user.data).that.is.empty;
    });
  });
});
