import {isValidSchainConfig, isSchainObjectValid, copySchainObjectInAdunits} from '../../../modules/schain';
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

describe('Passing schain object to adUnits', function() {
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

  it('schain object should be applied to all adUnits', function() {
    let adUnits = [
      {
        bids: [{}, {}]
      },
      {
        bids: [{}, {}]
      }
    ];
    copySchainObjectInAdunits(adUnits, schainConfig);
    expect(adUnits[0].bids[0].schain).to.equal(schainConfig);
    expect(adUnits[0].bids[1].schain).to.equal(schainConfig);
    expect(adUnits[1].bids[0].schain).to.equal(schainConfig);
    expect(adUnits[1].bids[1].schain).to.equal(schainConfig);
  });
});
