import { isValidSchainConfig, isSchainObjectValid, makeBidRequestsHook } from '../../../modules/schain';
import { deepClone } from '../../../src/utils';
import {config} from '../../../src/config';
import { expect } from 'chai';

describe('#isValidSchainConfig: module config validation', function() {
  it('if config is undefined or not an objct then return false', function() {
    expect(isValidSchainConfig()).to.false;
    expect(isValidSchainConfig('')).to.false;
    expect(isValidSchainConfig([])).to.false;
    expect(isValidSchainConfig(12)).to.false;
    expect(isValidSchainConfig(3.14)).to.false;
  })

  it('if config is an object then return true', function() {
    expect(isValidSchainConfig({})).to.true;
  })
});

describe('#isSchainObjectValid: schain object validation', function() {
  let schainConfig;

  beforeEach(function() {
    schainConfig = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'indirectseller.com',
          'sid': '00001',
          'hp': 1
        },

        {
          'asi': 'indirectseller-2.com',
          'sid': '00002',
          'hp': 2
        }
      ]
    };
  });

  it('Return true for correct config', function() {
    expect(isSchainObjectValid(schainConfig, true)).to.true;
  });

  it('Return false for string config', function() {
    schainConfig = JSON.stringify(schainConfig);
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if complete param is not an Integer', function() {
    schainConfig.complete = 1; // integer
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.complete = '1'; // string
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.complete = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.complete = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.complete; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.complete = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.complete = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if version param is not a String', function() {
    schainConfig.ver = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ver = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ver = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.ver; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ver = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ver = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if ext param is not an Object', function() {
    schainConfig.ext = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ext = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ext = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    delete schainConfig.ext; // undefined // param is optional thus this will result true
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.ext = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.ext = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes param is not an Array', function() {
    // by default schainConfig.nodes is array
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].asi is not a String', function() {
    schainConfig.nodes[0].asi = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].asi = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].asi = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[0].asi; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].asi = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].asi = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].sid is not a String', function() {
    schainConfig.nodes[1].sid = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].sid = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].sid = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[0].sid; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].sid = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].sid = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].hp is not an Integer', function() {
    schainConfig.nodes[0].hp = '1'; // string
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].hp = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].hp = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[0].hp; // undefined
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].hp = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].hp = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].rid is not a String', function() {
    schainConfig.nodes[1].rid = 'rid value'; // string
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[1].rid = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].rid = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].rid = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[1].rid; // undefined // param is optional thus this will result true
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[1].rid = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].rid = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].name is not a String', function() {
    schainConfig.nodes[0].name = 'name value'; // string
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[0].name = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].name = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].name = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[0].name; // undefined // param is optional thus this will result true
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[0].name = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].name = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].domain is not a String', function() {
    schainConfig.nodes[1].domain = 'domain value'; // string
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[1].domain = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].domain = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].domain = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    delete schainConfig.nodes[1].domain; // undefined // param is optional thus this will result true
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[1].domain = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[1].domain = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Returns false if nodes[].ext param is not an Object', function() {
    schainConfig.nodes[0].ext = 1; // Integer
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].ext = 1.1; // float
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].ext = {}; // object
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    delete schainConfig.nodes[0].ext; // undefined // param is optional thus this will result true
    expect(isSchainObjectValid(schainConfig, true)).to.true;
    schainConfig.nodes[0].ext = true; // boolean
    expect(isSchainObjectValid(schainConfig, true)).to.false;
    schainConfig.nodes[0].ext = []; // array
    expect(isSchainObjectValid(schainConfig, true)).to.false;
  });

  it('Relaxed mode: Returns true even for invalid config if second argument is set to false', function() {
    schainConfig = {
      'ver': 1.0, // invalid
      'complete': '1', // invalid
      'nodes': [
        {
          'asi': 'indirectseller.com',
          'sid': 1, // invalid
          'hp': '1' // invalid
        },

        {
          'asi': 'indirectseller-2.com',
          'sid': '00002',
          'hp': 2
        }
      ]
    };
    expect(isSchainObjectValid(schainConfig, false)).to.true;

    schainConfig = {};
    expect(isSchainObjectValid(schainConfig, false)).to.true;
  })
});

describe('#makeBidRequestsHook', function() {
  const bidderRequests = [
    {
      'bidderCode': 'rubicon',
      'bids': [
        {
          'bidder': 'rubicon',
          'params': {
            'accountId': 14062,
            'siteId': 70608,
            'zoneId': 498816
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2e6d166eb869c3'

        }
      ],
    },
    {
      'bidderCode': 'districtm',
      'bids': [
        {
          'bidder': 'districtm',
          'params': {
            'placementId': 13144370
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '41cdeddf7b6905'
        }
      ],
    },
    {
      'bidderCode': 'appnexus',
      'bids': [
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': 13144370
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '626cc7f1c4ccfc'
        }
      ],

    }
  ];

  const globalSchainConfig = {
    'schain': {
      'validation': 'off',
      'config': {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'indirectseller.com',
            'sid': '00001',
            'hp': 1
          },

          {
            'asi': 'indirectseller-2.com',
            'sid': '00002',
            'hp': 1
          }
        ]
      }
    }
  };

  const goodStrictBidderConfig = {
    bidders: ['appnexus'],
    config: {
      'schain': {
        'validation': 'strict',
        'config': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'myoverride1.com',
              'sid': '00001',
              'hp': 1,
              'name': 'node1'
            },
            {
              'asi': 'myoverride2.com',
              'sid': '00001',
              'hp': 1,
              'name': 'node2'
            }
          ]
        }
      }
    }
  }

  const badStrictBidderConfig = {
    bidders: ['appnexus'],
    config: {
      'schain': {
        'validation': 'strict',
        'config': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'myoverride1.com',
              'sid': 1,
              'hp': 1,
              'name': 342
            },
            {
              'asi': 'myoverride2.com',
              'sid': 2,
              'hp': 1,
              'name': '342'
            }
          ]
        }
      }
    }
  };

  const goodRelaxedBidderConfig = {
    bidders: ['districtm'],
    config: {
      'schain': {
        'validation': 'relaxed',
        'config': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'myoverride.com',
              'sid': '00001',
              'hp': 1,
              'name': 'goodConfig'
            }
          ]
        }
      }
    }
  };

  const badRelaxedBidderConfig = {
    bidders: ['districtm'],
    config: {
      'schain': {
        'validation': 'relaxed',
        'config': {
          'ver': 1,
          'complete': 1,
          'nodes': [
            {
              'asi': 'myoverride.com',
              'sid': 1,
              'hp': 1
            }
          ]
        }
      }
    }
  };

  beforeEach(function () {
    config.setConfig(globalSchainConfig);
  });

  afterEach(function () {
    config.resetConfig();

    config.setBidderConfig({
      bidders: ['districtm'],
      config: {
        schain: null
      }
    });

    config.setBidderConfig({
      bidders: ['appnexus'],
      config: {
        schain: null
      }
    });
  });

  it('should properly read from bidder schain + global schain configs', function() {
    function testCallback(bidderRequests) {
      expect(bidderRequests[0].bids[0].schain).to.exist;
      expect(bidderRequests[0].bids[0].schain).to.deep.equal(globalSchainConfig.schain.config);
      expect(bidderRequests[1].bids[0].schain).to.exist;
      expect(bidderRequests[1].bids[0].schain).to.deep.equal(goodRelaxedBidderConfig.config.schain.config);
      expect(bidderRequests[2].bids[0].schain).to.exist;
      expect(bidderRequests[2].bids[0].schain).to.deep.equal(goodStrictBidderConfig.config.schain.config);
    }

    const testBidderRequests = deepClone(bidderRequests);
    config.setBidderConfig(goodStrictBidderConfig);
    config.setBidderConfig(goodRelaxedBidderConfig);

    makeBidRequestsHook(testCallback, testBidderRequests);
  });

  it('should reject bad strict config but allow a bad relaxed config for bidders trying to override it', function () {
    function testCallback(bidderRequests) {
      expect(bidderRequests[0].bids[0].schain).to.exist;
      expect(bidderRequests[0].bids[0].schain).to.deep.equal(globalSchainConfig.schain.config);
      expect(bidderRequests[1].bids[0].schain).to.exist;
      expect(bidderRequests[1].bids[0].schain).to.deep.equal(badRelaxedBidderConfig.config.schain.config);
      expect(bidderRequests[2].bids[0].schain).to.be.undefined;
    }

    const testBidderRequests = deepClone(bidderRequests);
    config.setBidderConfig(badStrictBidderConfig);
    config.setBidderConfig(badRelaxedBidderConfig);

    makeBidRequestsHook(testCallback, testBidderRequests);
  });
});
