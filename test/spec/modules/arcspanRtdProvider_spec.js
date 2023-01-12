import { arcspanSubmodule } from 'modules/arcspanRtdProvider.js';
import { deepAccess, deepSetValue, mergeDeep } from '../../../src/utils.js';
import { config } from 'src/config.js';

describe('arcspanRtdProvider', function () {
  beforeEach(function () {
    var collection = document.head.getElementsByTagName('script');
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].src.endsWith('as.js')) {
        collection[i].remove();
      }
    }
  });

  describe('arcspanSubmodule', function () {
    it('successfully initializes with a valid silo ID', function () {
      expect(arcspanSubmodule.init(getGoodConfig())).to.equal(true);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      var error = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src === 'https://silo13.p7cloud.net/as.js') {
          scriptFound = true;
          break;
        }
        if (collection[i].src.endsWith('as.js')) {
          error = true;
          break;
        }
      }
      expect(scriptFound).to.equal(true);
      expect(error).to.equal(false);
    });

    it('fails to initialize with a missing silo ID', function () {
      expect(arcspanSubmodule.init(getBadConfig())).to.equal(false);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src.endsWith('as.js')) {
          scriptFound = true;
          break;
        }
      }
      expect(scriptFound).to.equal(false);
    });

    it('drops localhost script for test silo', function () {
      expect(arcspanSubmodule.init(getTestConfig())).to.equal(true);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      var error = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src === 'https://localhost:8080/as.js') {
          scriptFound = true;
          break;
        }
        if (collection[i].src.endsWith('as.js')) {
          error = true;
          break;
        }
      }
      expect(scriptFound).to.equal(true);
      expect(error).to.equal(false);
    });
  });
});

function getGoodConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      silo: 13,
    },
  };
}

function getBadConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      notasilo: 1,
    },
  };
}

function getTestConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      silo: 'test',
    },
  };
}

function getAdUnits() {
  return [
    {
      code: 'test-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        },
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13144370,
          },
        },
      ],
    },
    {
      code: 'test-div2',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]],
        },
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13144370,
          },
        },
      ],
    },
  ];
}
