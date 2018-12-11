import {
  enabledStorageTypes
} from 'modules/universalId';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import * as auctionModule from 'src/auction';
import {expect, assert} from 'chai'

describe('Universal ID', function () {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('Storage function', function() {
    describe('enabledStorageTypes', function() {
      it('returns array with \'localStorage\' and \'cookie\' items, if both local storage and cookies are enabled', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          cookie: ''
        });
        expect(result).to.deep.equal(['localStorage', 'cookie']);
      });

      it('returns array with \'localStorage\' item, if only localStorage is enabled', function() {
        const result = enabledStorageTypes({
          cookieEnabled: false
        }, {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          set cookie(v) {},
          get cookie() {
            return ''
          }
        });
        expect(result).to.deep.equal(['localStorage']);
      });

      it('returns array with \'cookie\' item, if only cookie storage is enabled', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        })
        expect(result).to.deep.equal(['cookie'])
      });

      it('returns empty array if neither local storage or cookies are not enabled', function() {
        const result = enabledStorageTypes({
          cookieEnabled: false
        }, {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return ''
          }
        });
        expect(result).to.deep.equal([]);
      });
    })
  });
});
