import {expect} from 'chai';
import {config} from 'src/config.js';
import {getRefererInfo} from 'src/refererDetection.js';
import {processFpd, registerSubmodules, startAuctionHook, reset} from 'modules/fpdModule/index.js';
import * as validationModule from 'modules/validationFpdModule/index.js';
import {GreedyPromise} from '../../../src/utils/promise.js';

describe('the first party data module', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('startAuctionHook', () => {
    const mockFpd = {
      global: {key: 'value'},
      bidder: {A: {bkey: 'bvalue'}}
    }
    beforeEach(() => {
      reset();
    });

    it('should run ortb2Fragments through fpd submodules', () => {
      registerSubmodules({
        name: 'test',
        processFpd: function () {
          return mockFpd;
        }
      });
      const req = {ortb2Fragments: {}};
      return new Promise((resolve) => startAuctionHook(resolve, req))
        .then(() => {
          expect(req.ortb2Fragments).to.eql(mockFpd);
        })
    });

    it('should work with fpd submodules that return promises', () => {
      registerSubmodules({
        name: 'test',
        processFpd: function () {
          return Promise.resolve(mockFpd);
        }
      });
      const req = {ortb2Fragments: {}};
      return new Promise((resolve) => {
        startAuctionHook(resolve, req);
      }).then(() => {
        expect(req.ortb2Fragments).to.eql(mockFpd);
      });
    });
  });

});
