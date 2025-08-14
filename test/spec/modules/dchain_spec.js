import { checkDchainSyntax, addBidResponseHook } from '../../../modules/dchain.js';
import { config } from '../../../src/config.js';
import { expect } from 'chai';

describe('dchain module', function () {
  const STRICT = 'strict';
  const RELAX = 'relaxed';
  const OFF = 'off';

  describe('checkDchainSyntax', function () {
    let bid;

    beforeEach(function () {
      bid = {
        meta: {
          dchain: {
            'ver': '1.0',
            'complete': 0,
            'ext': {},
            'nodes': [{
              'asi': 'domain.com',
              'bsid': '12345',
            }, {
              'name': 'bidder',
              'domain': 'bidder.com',
              'ext': {}
            }]
          }
        }
      };
    });

    it('Returns false if complete param is not 0 or 1', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.complete = 0; // integer
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.complete = 1; // integer
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.complete = '1'; // string
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.complete = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.complete = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.complete; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.complete = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.complete = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if ver param is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.ver = 1; // integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ver = '1'; // string
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.ver = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ver = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.ver; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ver = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ver = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if ext param is not an Object', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.ext = 1; // integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ext = '1'; // string
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ext = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ext = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      delete dchainConfig.ext; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.ext = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.ext = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes param is not an Array', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes = 1; // integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes = '1'; // string
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if unknown field is used in main dchain', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.test = '1'; // String
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].asi is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].asi = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].asi = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].asi = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes[0].asi; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].asi = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].asi = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].bsid is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].bsid = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].bsid = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].bsid = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes[0].bsid; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].bsid = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].bsid = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].rid is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].rid = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].rid = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].rid = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes[0].rid; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].rid = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].rid = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].name is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].name = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].name = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].name = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes[0].name; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].name = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].name = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].domain is not a String', function () {
      let dchainConfig = bid.meta.dchain;
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].domain = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].domain = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].domain = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      delete dchainConfig.nodes[0].domain; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].domain = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].domain = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if nodes[].ext is not an Object', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.nodes[0].ext = '1'; // String
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].ext = 1; // Integer
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].ext = 1.1; // float
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].ext = {}; // object
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      delete dchainConfig.nodes[0].ext; // undefined
      expect(checkDchainSyntax(bid, STRICT)).to.true;
      dchainConfig.nodes[0].ext = true; // boolean
      expect(checkDchainSyntax(bid, STRICT)).to.false;
      dchainConfig.nodes[0].ext = []; // array
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Returns false if unknown field is used in nodes[]', function () {
      let dchainConfig = bid.meta.dchain;
      dchainConfig.nodes[0].test = '1'; // String
      expect(checkDchainSyntax(bid, STRICT)).to.false;
    });

    it('Relaxed mode: returns true even for invalid config', function () {
      bid.meta.dchain = {
        ver: 1.1,
        complete: '0',
        nodes: [{
          name: 'asdf',
          domain: ['domain.com']
        }]
      };

      expect(checkDchainSyntax(bid, RELAX)).to.true;
    });
  });

  describe('addBidResponseHook', function () {
    let bid;
    let adUnitCode = 'adUnit1';

    beforeEach(function () {
      bid = {
        bidderCode: 'bidderA',
        meta: {
          dchain: {
            'ver': '1.0',
            'complete': 0,
            'ext': {},
            'nodes': [{
              'asi': 'domain.com',
              'bsid': '12345',
            }, {
              'name': 'bidder',
              'domain': 'bidder.com',
              'ext': {}
            }]
          },
          networkName: 'myNetworkName',
          networkId: 8475
        }
      };
    });

    afterEach(function () {
      config.resetConfig();
    });

    it('good strict config should append a node object to existing bid.meta.dchain object', function () {
      function testCallback(adUnitCode, bid) {
        expect(bid.meta.dchain).to.exist;
        expect(bid.meta.dchain.nodes[1]).to.exist.and.to.deep.equal({
          'name': 'bidder',
          'domain': 'bidder.com',
          'ext': {}
        });
        expect(bid.meta.dchain.nodes[2]).to.exist.and.to.deep.equal({ asi: 'bidderA' });
      }

      config.setConfig({ dchain: { validation: STRICT } });
      addBidResponseHook(testCallback, adUnitCode, bid);
    });

    it('bad strict config should delete the bid.meta.dchain object', function () {
      function testCallback(adUnitCode, bid) {
        expect(bid.meta.dchain).to.not.exist;
      }

      config.setConfig({ dchain: { validation: STRICT } });
      bid.meta.dchain.complete = 3;
      addBidResponseHook(testCallback, adUnitCode, bid);
    });

    it('relaxed config should allow bid.meta.dchain to proceed, even with bad values', function () {
      function testCallback(adUnitCode, bid) {
        expect(bid.meta.dchain).to.exist;
        expect(bid.meta.dchain.complete).to.exist.and.to.equal(3);
        expect(bid.meta.dchain.nodes[2]).to.exist.and.to.deep.equal({ asi: 'bidderA' });
      }

      config.setConfig({ dchain: { validation: RELAX } });
      bid.meta.dchain.complete = 3;
      addBidResponseHook(testCallback, adUnitCode, bid);
    });

    it('off config should allow the bid.meta.dchain to proceed', function () {
      // check for missing nodes
      function testCallback(adUnitCode, bid) {
        expect(bid.meta.dchain).to.exist;
        expect(bid.meta.dchain.complete).to.exist.and.to.equal(0);
        expect(bid.meta.dchain.nodes).to.exist.and.to.deep.equal({ test: 123 });
      }

      config.setConfig({ dchain: { validation: OFF } });
      bid.meta.dchain.nodes = { test: 123 };
      addBidResponseHook(testCallback, adUnitCode, bid);
    });

    it('no bidder dchain', function () {
      function testCallback(adUnitCode, bid) {
        expect(bid.meta.dchain).to.exist;
        expect(bid.meta.dchain.ver).to.exist.and.to.equal('1.0');
        expect(bid.meta.dchain.complete).to.exist.and.to.equal(0);
        expect(bid.meta.dchain.nodes).to.exist.and.to.deep.equal([{ name: 'myNetworkName', bsid: '8475' }, { name: 'bidderA' }]);
      }

      delete bid.meta.dchain;
      config.setConfig({ dchain: { validation: RELAX } });
      addBidResponseHook(testCallback, adUnitCode, bid);
    });
  });
});
