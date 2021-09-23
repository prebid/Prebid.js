import { checkDchainSyntax, addBidResponseHook } from '../../../modules/dchain.js';
import { deepClone } from '../../../src/utils.js';
import { config } from '../../../src/config.js';
import { expect } from 'chai';

describe.only('dchain module', function () {
  describe('checkDchainSyntax', function () {
    let bid;
    const STRICT = 'strict';

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

    // complete
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

    // version
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

    // ext
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

    // nodes
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
  });

  describe('addBidResponseHook', function () {

  });
});
