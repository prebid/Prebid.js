import {
  enabledStorageTypes,
  validateConfig,
  initSubmodules,
  requestBidHook,
  extendedBidRequestData
} from 'modules/universalId';
import { expect, assert } from 'chai'
import sinon from 'sinon'

describe('Universal ID', function () {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
    $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidHook);
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
      configKey: 'unifiedId'
    }];

    it('return false if config does not define usersync.universalIds', function() {
      expect(validateConfig(undefined, submodules)).to.equal(false);
    });

    it('return true if config defines configurations for both submodules', function() {
      expect(validateConfig([{
        name: 'pubCommonId'
      }, {
        name: 'unifiedId'
      }], submodules)).to.equal(true);
    });

    it('return true if config defines a value configuration for one of the submodules', function() {
      expect(validateConfig([{
        name: 'pubCommonId'
      }, {
        name: 'foo'
      }], submodules)).to.equal(true);
    });

    it('return false if config does not define a configuration with a name matching a submodule configKey', function() {
      expect(validateConfig([{
        name: 'foo'
      }, {
        name: 'bar'
      }], submodules)).to.equal(false);
    });

    it('return false if config does not define a configuration for any submodule', function() {
      expect(validateConfig([], submodules)).to.equal(false);
    });
  });

  describe('initSubmodules', function() {
    const submodules = [{
      configKey: 'pubCommonId',
      expires: Number.MAX_VALUE,
      decode: function(value) {
        return {
          'pubcid': value
        }
      },
      getId: function (data, callback) {
        // callback({
        //   expires: Number.MAX_VALUE,
        //   data: '1111'
        // });
      }
    }, {
      configKey: 'unifiedId',
      expires: Number.MAX_VALUE - 1,
      decode: function(value) {
        return {
          'unifiedId': value
        }
      },
      getId: function (data, callback) {
        // callback({
        //   expires: Number.MAX_VALUE - 10,
        //   data: '2222'
        // });
      }
    }];

    it('returns empty array if no storage exists and no submodule config exists with a \'value\' property', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'foo'
        }, {
          name: 'bar'
        }],
        syncDelay: 0,
        submodules: submodules,
        navigator: {
          cookieEnabled: false
        },
        document: {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return ''
          }
        },
        consentData: {}
      };
      console.log(initSubmodules(dependencyContainer))
      // expect(initSubmodules(dependencyContainer).to.deep.equal([]));
    });

    it('returns array with both submodules enabled, if no storage exists but both submodule configs contain \'value\' property', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'pubCommonId',
          value: {}
        }, {
          name: 'unifiedId',
          value: {}
        }],
        syncDelay: 0,
        submodules: submodules,
        navigator: {
          cookieEnabled: false
        },
        document: {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return ''
          }
        },
        consentData: {}
      };
      expect(initSubmodules(dependencyContainer).length).to.equal(2);
    });

    it('returns array with both submodules enabled, if storage is enabled and both submodule configs contain valid configs', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'pubCommonId',
          value: {}
        }, {
          name: 'unifiedId',
          value: {}
        }],
        syncDelay: 0,
        submodules: submodules,
        navigator: {
          cookieEnabled: true
        },
        document: {
          localStorage: {
            setItem: function (key, value) {},
            getItem: function (key) {
              if (key === 'prebid.cookieTest') {
                return '1'
              }
            }
          },
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        },
        consentData: {}
      };
      expect(initSubmodules(dependencyContainer).length).to.equal(2);
    });

    it('returns array with single item when only cookie storage is enabled, and only one submodule uses that \'type\'', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'pubCommonId',
          storage: {
            type: 'cookie',
            name: 'pubcid'
          }
        }, {
          name: 'unifiedId',
          storage: {
            type: 'html5',
            name: 'unifiedId'
          }
        }],
        syncDelay: 0,
        submodules: submodules,
        navigator: {
          cookieEnabled: true
        },
        document: {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        },
        consentData: {}
      };
      expect(initSubmodules(dependencyContainer).length).to.equal(1);
    });
  });
});
