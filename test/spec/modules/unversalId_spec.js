import {
  enabledStorageTypes,
  validateConfig
} from 'modules/universalId';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
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
        expect(result).to.deep.equal(['html5', 'cookie']);
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
        expect(result).to.deep.equal(['html5']);
      });

      it('returns array with \'localStorage\' item, if localStorage is enabled but an error occurred setting test cookie', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          set cookie(v) {
            // simulate error setting cookie!!!!
            throw new Error('error setting test cookie' + v);
          },
          get cookie() {
            return 'prebid.cookieTest'
          }
        });
        expect(result).to.deep.equal(['html5']);
      });

      it('returns array with \'localStorage\' item, if localStorage is enabled but an error occurred getting test cookie', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          set cookie(v) {},
          get cookie() {
            // simulate error getting cookie!!!!
            throw new Error('error getting test cookie');
          }
        });
        expect(result).to.deep.equal(['html5']);
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
        });
        expect(result).to.deep.equal(['cookie']);
      });

      it('returns array with \'cookie\' item, if cookie storage is enabled but an error occurred getting local storage test data', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) {
              // simulate error calling localStorage.getItem(key)
              throw new Error('error getting local storage key: ' + key);
            }
          },
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        });
        expect(result).to.deep.equal(['cookie']);
      });

      it('returns array with \'cookie\' item, if cookie storage is enabled but an error occurred setting local storage test data', function() {
        const result = enabledStorageTypes({
          cookieEnabled: true
        }, {
          localStorage: {
            setItem: function(key, value) {
              // simulate error calling localStorage.getItem(key)
              throw new Error('error setting local storage key: ' + key + ' = ' + value);
            },
            getItem: function(key) {
              if (key === 'prebid.cookieTest') {
                return '1';
              }
            }
          },
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        });
        expect(result).to.deep.equal(['cookie']);
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
    });

    describe('validateConfig', function() {
      const submodules = [{
        configKey: 'pubCommonId'
      }, {
        configKey: 'openId'
      }];

      it('return false if config does not define usersync.universalIds', function() {
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          return undefined;
        });
        const result = validateConfig(config, submodules);
        expect(result).to.equal(false);
      });

      it('return false if config does not define configuration for any of the submodules', function() {
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          return [{
            name: 'foo'
          }, {
            name: 'bar'
          }];
        });
        const result = validateConfig(config, submodules);
        expect(result).to.equal(false);
      });

      it('return true if config defines configurations for both of the submodules', function() {
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          return [{
            name: 'pubCommonId'
          }, {
            name: 'openId'
          }];
        });
        const result = validateConfig(config, submodules);
        expect(result).to.equal(true);
      });

      it('return true if config defines a configuration for one of the submodules', function() {
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          return [{
            name: 'pubCommonId'
          }, {
            name: 'foo'
          }];
        });
        const result = validateConfig(config, submodules);
        expect(result).to.equal(true);
      });
    });
  });
});
