import {
  highEntropySUAAccessor,
  lowEntropySUAAccessor,
  SUA_SOURCE_HIGH_ENTROPY,
  SUA_SOURCE_LOW_ENTROPY,
  SUA_SOURCE_UNKNOWN,
  suaFromUAData,
  uaDataToSUA
} from '../../../src/fpd/sua.js';

describe('uaDataToSUA', () => {
  Object.entries({
    'platform': 'platform',
    'browsers': 'brands',
    'mobile': 'mobile',
    'architecture': 'architecture',
    'model': 'model',
    'bitness': 'bitness'
  }).forEach(([suaKey, uaKey]) => {
    it(`should not set ${suaKey} if ${uaKey} is missing from UAData`, () => {
      const example = {
        platform: 'Windows',
        brands: [{brand: 'Mock', version: 'mk'}],
        mobile: true,
        model: 'mockModel',
        bitness: '64',
        architecture: 'arm'
      }
      delete example[uaKey];
      const sua = uaDataToSUA(SUA_SOURCE_UNKNOWN, example);
      expect(sua.hasOwnProperty(suaKey)).to.be.false;
    })
  });

  it('should convert low-entropy userAgentData', () => {
    const sua = uaDataToSUA(SUA_SOURCE_LOW_ENTROPY, {
      'brands': [
        {
          'brand': '.Not/A)Brand',
          'version': '99'
        },
        {
          'brand': 'Google Chrome',
          'version': '103'
        },
        {
          'brand': 'Chromium',
          'version': '103'
        }
      ],
      'mobile': false,
      'platform': 'Linux'
    });

    expect(sua).to.eql({
      source: SUA_SOURCE_LOW_ENTROPY,
      mobile: 0,
      platform: {
        brand: 'Linux',
      },
      browsers: [
        {
          brand: '.Not/A)Brand',
          version: [
            '99'
          ]
        },
        {
          brand: 'Google Chrome',
          version: [
            '103'
          ]
        },
        {
          brand: 'Chromium',
          version: [
            '103'
          ]
        }
      ]
    })
  });

  it('should convert high entropy properties', () => {
    const uaData = {
      architecture: 'x86',
      bitness: '64',
      fullVersionList: [
        {
          'brand': '.Not/A)Brand',
          'version': '99.0.0.0'
        },
        {
          'brand': 'Google Chrome',
          'version': '103.0.5060.134'
        },
        {
          'brand': 'Chromium',
          'version': '103.0.5060.134'
        }
      ],
      brands: [
        {
          'brand': '.Not/A)Brand',
          'version': '99'
        },
        {
          'brand': 'Google Chrome',
          'version': '103'
        },
        {
          'brand': 'Chromium',
          'version': '103'
        }
      ],
      model: 'mockModel',
      platform: 'Linux',
      platformVersion: '5.14.0'
    }

    expect(uaDataToSUA(SUA_SOURCE_HIGH_ENTROPY, uaData)).to.eql({
      source: SUA_SOURCE_HIGH_ENTROPY,
      architecture: 'x86',
      bitness: '64',
      model: 'mockModel',
      platform: {
        brand: 'Linux',
        version: [
          '5',
          '14',
          '0'
        ]
      },
      browsers: [
        {
          brand: '.Not/A)Brand',
          version: [
            '99',
            '0',
            '0',
            '0'
          ]
        },
        {
          brand: 'Google Chrome',
          version: [
            '103',
            '0',
            '5060',
            '134'
          ]
        },
        {
          brand: 'Chromium',
          version: [
            '103',
            '0',
            '5060',
            '134'
          ]
        }
      ]
    })
  })
});

describe('lowEntropySUAAccessor', () => {
  // Set up a mock data with readonly property
  class MockUserAgentData {}
  Object.defineProperty(MockUserAgentData.prototype, 'mobile', {
    value: false,
    writable: false,
    enumerable: true
  });

  function getSUA(uaData) {
    return lowEntropySUAAccessor(uaData)();
  }

  it('should not be modifiable', () => {
    const sua = getSUA({});
    expect(() => { sua.prop = 'value'; }).to.throw();
  });

  it('should return null if no uaData is available', () => {
    expect(getSUA(null)).to.eql(null);
  })

  it('should return null if uaData is empty', () => {
    expect(getSUA({})).to.eql(null);
  })

  it('should return mobile and source', () => {
    expect(getSUA(new MockUserAgentData())).to.eql({mobile: 0, source: 1})
  })
});

describe('highEntropySUAAccessor', () => {
  let userAgentData, uaResult, getSUA;
  beforeEach(() => {
    uaResult = {};
    userAgentData = {
      getHighEntropyValues: sinon.stub().callsFake(() => Promise.resolve(uaResult))
    };
    getSUA = highEntropySUAAccessor(userAgentData);
  });

  describe('should resolve to null if', () => {
    it('uaData is not available', () => {
      getSUA = highEntropySUAAccessor(null);
      return getSUA().then((result) => {
        expect(result).to.eql(null);
      })
    });
    it('getHighEntropyValues is not avialable', () => {
      delete userAgentData.getHighEntropyValues;
      return getSUA().then((result) => {
        expect(result).to.eql(null);
      })
    });
    it('getHighEntropyValues throws', () => {
      userAgentData.getHighEntropyValues.callsFake(() => { throw new Error() });
      return getSUA().then((result) => {
        expect(result).to.eql(null);
      })
    });
    it('getHighEntropyValues rejects', () => {
      userAgentData.getHighEntropyValues.callsFake(() => Promise.reject(new Error()));
      return getSUA().then((result) => {
        expect(result).to.eql(null);
      })
    });
    it('getHighEntropyValues returns an empty object', () => {
      userAgentData.getHighEntropyValues.callsFake(() => Promise.resolve({}));
      return getSUA().then((result) => {
        expect(result).to.eql(null);
      });
    })
  });
  it('should pass hints to userAgentData', () => {
    getSUA(['h1', 'h2']);
    sinon.assert.calledWith(userAgentData.getHighEntropyValues, ['h1', 'h2']);
  });

  it('should cache results for a set of hints', () => {
    getSUA(['h1', 'h2']);
    getSUA(['h2', 'h1']);
    sinon.assert.calledOnce(userAgentData.getHighEntropyValues);
  });

  it('should return unmodifiable objects', () => {
    return getSUA().then(result => {
      expect(() => { result.prop = 'value'; }).to.throw();
    })
  })
})
