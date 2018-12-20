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
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          cookie: ''
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['html5', 'cookie']);
    });

    it('returns array with \'localStorage\' item, if only localStorage is enabled', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: false
        },
        document: {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          set cookie(v) {},
          get cookie() {
            return ''
          }
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['html5']);
    });

    it('returns array with \'localStorage\' item, if localStorage is enabled but an error occurred setting test cookie', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
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
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['html5']);
    });

    it('returns array with \'localStorage\' item, if localStorage is enabled but an error occurred getting test cookie', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
          localStorage: {
            setItem: function(key, value) {},
            getItem: function(key) { if (key === 'prebid.cookieTest') { return '1' } }
          },
          set cookie(v) {},
          get cookie() {
            // simulate error getting cookie!!!!
            throw new Error('error getting test cookie');
          }
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['html5']);
    });

    it('returns array with \'cookie\' item, if only cookie storage is enabled', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return 'prebid.cookieTest'
          }
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['cookie']);
    });

    it('returns array with \'cookie\' item, if cookie storage is enabled but an error occurred getting local storage test data', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
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
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['cookie']);
    });

    it('returns array with \'cookie\' item, if cookie storage is enabled but an error occurred setting local storage test data', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: true
        },
        document: {
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
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal(['cookie']);
    });

    it('returns empty array if neither local storage or cookies are not enabled', function() {
      const dependencyContainer = {
        navigator: {
          cookieEnabled: false
        },
        document: {
          localStorage: undefined,
          set cookie(v) {},
          get cookie() {
            return ''
          }
        }
      };
      expect(enabledStorageTypes(dependencyContainer)).to.deep.equal([]);
    });
  });

  describe('validateConfig', function() {
    const submodules = [{
      configKey: 'pubCommonId'
    }, {
      configKey: 'unifiedId'
    }];

    it('return false if config does not define usersync.universalIds', function() {
      const dependencyContainer = {
        universalIds: undefined,
        submodules: submodules
      };
      expect(validateConfig(dependencyContainer)).to.equal(false);
    });

    it('return true if config defines configurations for both submodules', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'pubCommonId'
        }, {
          name: 'unifiedId'
        }],
        submodules: submodules
      };
      expect(validateConfig(dependencyContainer)).to.equal(true);
    });

    it('return true if config defines a value configuration for one of the submodules', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'pubCommonId'
        }, {
          name: 'foo'
        }],
        submodules: submodules
      };
      expect(validateConfig(dependencyContainer)).to.equal(true);
    });

    it('return false if config does not define a configuration with a name matching a submodule configKey', function() {
      const dependencyContainer = {
        universalIds: [{
          name: 'foo'
        }, {
          name: 'bar'
        }],
        submodules: submodules
      };
      expect(validateConfig(dependencyContainer)).to.equal(false);
    });

    it('return false if config does not define a configuration for any submodule', function() {
      const dependencyContainer = {
        universalIds: [],
        submodules: submodules
      };
      expect(validateConfig(dependencyContainer)).to.equal(false);
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
        utils: {
          logInfo: function () {

          }
        },
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
      expect(initSubmodules(dependencyContainer)).to.deep.equal([]);
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
