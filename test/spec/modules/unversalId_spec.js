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
      expect(validateConfig({
        getConfig: function () {}
      }, submodules)).to.equal(false);
    });

    it('return false if config does not define configuration for any of the submodules', function() {
      // no config objs for submodule configKey values
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'foo'
          }, {
            name: 'bar'
          }];
        }
      }, submodules)).to.equal(false);

      // config objs exist for configKey, but no sub obj exits
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId'
          }, {
            name: 'openId'
          }];
        }
      }, submodules)).to.equal(false);

      // config objs exist for configKey, but no valid 'value' or 'storage' sub obj
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId',
            foo: {}
          }, {
            name: 'openId',
            bar: {}
          }];
        }
      }, submodules)).to.equal(false);
    });

    it('return true if config defines value configurations for both of the submodules', function() {
      // submodules contain valid 'value' objs
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId',
            value: {}
          }, {
            name: 'openId',
            value: {}
          }];
        }
      }, submodules)).to.equal(true);
      // submodules contain valid 'storage' objs
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId',
            storage: {}
          }, {
            name: 'openId',
            storage: {}
          }];
        }
      }, submodules)).to.equal(true);
    });

    it('return true if config defines a value configuration for one of the submodules', function() {
      // one submodule contains a valid 'value' obj
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId',
            value: {}
          }, {
            name: 'foo'
          }];
        }
      }, submodules)).to.equal(true);

      // one submodule contains a valid 'storage' obj
      expect(validateConfig({
        getConfig: function () {
          return [{
            name: 'pubCommonId',
            storage: {}
          }, {
            name: 'foo'
          }];
        }
      }, submodules)).to.equal(true);
    });
  });
});
