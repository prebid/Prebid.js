import { oneKeyIdSubmodule } from 'modules/oneKeyIdSystem'

const defaultConf = {
  params: {
    proxyHostName: 'proxy.com'
  }
};

const defaultIdsAndPreferences = {
  identifiers: [
    {
      version: '0.1',
      type: 'paf_browser_id',
      value: 'df0a5664-987d-4074-bbd9-e9b12ebae6ef',
      source: {
        domain: 'crto-poc-1.onekey.network',
        timestamp: 1657100291,
        signature: 'ikjV6WwpcroNB5XyLOr3MgYHLpS6UjICEOuv/jEr00uVrjZm0zluDSWh11OeGDZrMhxMBPeTabtQ4U2rNk3IzQ=='
      }
    }
  ],
  preferences: {
    version: '0.1',
    data: {
      use_browsing_for_personalization: true
    },
    source: {
      domain: 'cmp.pafdemopublisher.com',
      timestamp: 1657100294,
      signature: 'aAbMThxyeKpe/EgT5ARI1xecjCwwh0uRagsTuPXNY2fzh7foeW31qljDZf6h8UwOd9M2bAN7XNtM2LYBbJzskQ=='
    }
  }
};

const defaultIdsAndPreferencesResult = {
  status: 'PARTICIPATING',
  data: defaultIdsAndPreferences
};

describe('oneKeyData module', () => {
  describe('getId function', () => {
    beforeEach(() => {
      setUpOneKey();
    });

    it('return a callback for handling asynchron results', () => {
      const moduleIdResponse = oneKeyIdSubmodule.getId(defaultConf);

      expect(moduleIdResponse.callback).to.be.an('function');
    });

    it(`return a callback that waits for OneKey to be loaded`, () => {
      const moduleIdResponse = oneKeyIdSubmodule.getId(defaultConf);

      moduleIdResponse.callback(function() {})

      expect(window.OneKey.queue.length).to.equal(1);
    });

    it('return a callback that gets ids and prefs', () => {
      const moduleIdResponse = oneKeyIdSubmodule.getId(defaultConf);

      // Act
      return new Promise((resolve) => {
        moduleIdResponse.callback(resolve);
        executeOneKeyQueue();
      })

      // Assert
        .then((idsAndPrefs) => {
          expect(idsAndPrefs).to.equal(defaultIdsAndPreferences);
        });
    });

    it('return a callback with undefined if impossible to get ids and prefs', () => {
      window.OneKey.getIdsAndPreferences = () => {
        return Promise.reject(new Error(`Impossible to get ids and prefs`));
      };
      const moduleIdResponse = oneKeyIdSubmodule.getId(defaultConf);

      // Act
      return new Promise((resolve) => {
        moduleIdResponse.callback(resolve);
        executeOneKeyQueue();
      })

      // Assert
        .then((idsAndPrefs) => {
          expect(idsAndPrefs).to.be.undefined;
        });
    });
  });
});

const setUpOneKey = () => {
  window.OneKey.queue = [];
  window.OneKey.getIdsAndPreferences = () => {
    return Promise.resolve(defaultIdsAndPreferencesResult);
  };
}

const executeOneKeyQueue = () => {
  while (window.OneKey.queue.length > 0) {
    window.OneKey.queue[0]();
    window.OneKey.queue.shift();
  }
}
