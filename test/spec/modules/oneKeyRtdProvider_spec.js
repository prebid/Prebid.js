import {oneKeyDataSubmodule} from 'modules/oneKeyRtdProvider.js';
import {getAdUnits} from '../../fixtures/fixtures.js';

const defaultSeed = {
  version: '0.1',
  transaction_ids: [
    'd566b02a-a6e2-4c87-98dc-f5623cd9e828',
    'f7ffe3cc-0d58-4ec4-b687-1d3d410a48fe'
  ],
  publisher: 'cmp.pafdemopublisher.com',
  source: {
    domain: 'cmp.pafdemopublisher.com',
    timestamp: 1657116880,
    signature: '6OmdrSGwagPpugGFuQ4VGjzqYadHxWIXPaLItk0vA1lmi/EQyRvNF5seXStfwKWRnC7HZlOIGSjA6g7HAuofWw=='

  }
};

const defaultOrb2WithTransmission = {
  user: {
    ext: {
      paf: {
        transmission: {
          seed: defaultSeed
        }
      }
    }
  }
};

const defaultRtdConfig = {
  params: {
    proxyHostName: 'host'
  }
};

describe('oneKeyDataSubmodule', () => {
  var bidsConfig;
  beforeEach(() => {
    // Fresh bidsConfig because it can be altered
    // during the tests.
    bidsConfig = getReqBidsConfig();
    setUpOneKey();
  });

  it('successfully instantiates', () => {
    expect(oneKeyDataSubmodule.init()).to.equal(true);
  });

  it('call OneKey API once it is loaded', () => {
    const done = sinon.spy();

    oneKeyDataSubmodule.getBidRequestData(bidsConfig, done, defaultRtdConfig);

    expect(bidsConfig).to.eql(getReqBidsConfig());
    expect(done.callCount).to.equal(0);
    expect(window.OneKey.queue.length).to.equal(1);
  });

  it('don\'t change anything without a seed', () => {
    window.OneKey.generateSeed = (_transactionIds) => {
      return Promise.resolve(undefined);
    };

    // Act
    return new Promise(resolve => {
      oneKeyDataSubmodule.getBidRequestData(bidsConfig, resolve, defaultRtdConfig);
      executeOneKeyQueue();
    })

    // Assert
      .then(() => {
        expect(bidsConfig).to.eql(getReqBidsConfig());
      });
  });

  [ // Test cases
    {
      description: 'global orb2',
      rtdConfig: defaultRtdConfig,
      expectedFragment: {
        global: {
          ...defaultOrb2WithTransmission
        },
        bidder: {}
      }
    },

    {
      description: 'bidder-specific orb2',
      rtdConfig: {
        params: {
          proxyHostName: 'host',
          bidders: [ 'bidder42', 'bidder24' ]
        }
      },
      expectedFragment: {
        global: { },
        bidder: {
          bidder42: {
            ...defaultOrb2WithTransmission
          },
          bidder24: {
            ...defaultOrb2WithTransmission
          }
        }
      }
    }
  ].forEach(testCase => {
    it(`update adUnits with transaction-ids and transmission in ${testCase.description}`, () => {
      // Act
      return new Promise(resolve => {
        oneKeyDataSubmodule.getBidRequestData(bidsConfig, resolve, testCase.rtdConfig);
        executeOneKeyQueue();
      })

      // Assert
        .then(() => {
        // Verify transaction-ids without equality
        // because they are generated UUID.
          bidsConfig.adUnits.forEach((adUnit) => {
            expect(adUnit.ortb2Imp.ext.data.paf.transaction_id).to.not.be.undefined;
          });
          expect(bidsConfig.ortb2Fragments).to.eql(testCase.expectedFragment);
        });
    });
  });
});

const getReqBidsConfig = () => {
  return {
    adUnits: getAdUnits(),
    ortb2Fragments: {
      global: {},
      bidder: {}
    }
  }
}

const setUpOneKey = () => {
  window.OneKey.queue = [];
  OneKey.generateSeed = (_transactionIds) => {
    return Promise.resolve(defaultSeed);
  };
}

const executeOneKeyQueue = () => {
  while (window.OneKey.queue.length > 0) {
    window.OneKey.queue[0]();
    window.OneKey.queue.shift();
  }
}
