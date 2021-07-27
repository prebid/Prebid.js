import { permutiveSubmodule, storage, getSegments, initSegments, isAcEnabled, isPermutiveOnPage } from 'modules/permutiveRtdProvider.js'
import { deepAccess } from '../../../src/utils.js'

describe('permutiveRtdProvider', function () {
  before(function () {
    const data = getTargetingData()
    setLocalStorage(data)
  })

  after(function () {
    const data = getTargetingData()
    removeLocalStorage(data)
  })

  describe('permutiveSubmodule', function () {
    it('should initalise and return true', function () {
      expect(permutiveSubmodule.init()).to.equal(true)
    })
  })

  describe('Getting segments', function () {
    it('should retrieve segments in the expected structure', function () {
      const data = transformedTargeting()
      expect(getSegments(250)).to.deep.equal(data)
    })
    it('should enforce max segments', function () {
      const max = 1
      const segments = getSegments(max)

      for (const key in segments) {
        expect(segments[key]).to.have.length(max)
      }
    })
  })

  describe('Default segment targeting', function () {
    it('sets segment targeting for Xandr', function () {
      const data = transformedTargeting()
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'appnexus') {
              expect(deepAccess(params, 'keywords.permutive')).to.eql(data.appnexus)
              expect(deepAccess(params, 'keywords.p_standard')).to.eql(data.ac)
            }
          })
        })
      }
    })
    it('sets segment targeting for Magnite', function () {
      const data = transformedTargeting()
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'rubicon') {
              expect(deepAccess(params, 'visitor.permutive')).to.eql(data.rubicon)
              expect(deepAccess(params, 'visitor.p_standard')).to.eql(data.ac)
            }
          })
        })
      }
    })
    it('sets segment targeting for Ozone', function () {
      const data = transformedTargeting()
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'ozone') {
              expect(deepAccess(params, 'customData.0.targeting.p_standard')).to.eql(data.ac)
            }
          })
        })
      }
    })
    it('sets segment targeting for TrustX', function () {
      const data = transformedTargeting()
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'trustx') {
              expect(deepAccess(params, 'keywords.p_standard')).to.eql(data.ac)
            }
          })
        })
      }
    })
  })

  describe('Custom segment targeting', function () {
    it('sets custom segment targeting for Magnite', function () {
      const data = transformedTargeting()
      const adUnits = getAdUnits()
      const config = getConfig()

      config.params.overwrites = {
        rubicon: function (bid, data, acEnabled, utils, defaultFn) {
          if (defaultFn) {
            bid = defaultFn(bid, data, acEnabled)
          }
          if (data.gam && data.gam.length) {
            utils.deepSetValue(bid, 'params.visitor.permutive', data.gam)
          }
        }
      }

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'rubicon') {
              expect(deepAccess(params, 'visitor.permutive')).to.eql(data.gam)
              expect(deepAccess(params, 'visitor.p_standard')).to.eql(data.ac)
            }
          })
        })
      }
    })
  })

  describe('Existing key-value targeting', function () {
    it('doesn\'t overwrite existing key-values for Xandr', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'appnexus') {
              expect(deepAccess(params, 'keywords.test_kv')).to.eql(['true'])
            }
          })
        })
      }
    })
    it('doesn\'t overwrite existing key-values for Magnite', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'rubicon') {
              expect(deepAccess(params, 'visitor.test_kv')).to.eql(['true'])
            }
          })
        })
      }
    })
    it('doesn\'t overwrite existing key-values for Ozone', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'ozone') {
              expect(deepAccess(params, 'customData.0.targeting.test_kv')).to.eql(['true'])
            }
          })
        })
      }
    })
    it('doesn\'t overwrite existing key-values for TrustX', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      initSegments({ adUnits }, callback, config)

      function callback () {
        adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            const { bidder, params } = bid

            if (bidder === 'trustx') {
              expect(deepAccess(params, 'keywords.test_kv')).to.eql(['true'])
            }
          })
        })
      }
    })
  })

  describe('Permutive on page', function () {
    it('checks if Permutive is on page', function () {
      expect(isPermutiveOnPage()).to.equal(false)
    })
  })

  describe('AC is enabled', function () {
    it('checks if AC is enabled for Xandr', function () {
      expect(isAcEnabled({ params: { acBidders: ['appnexus'] } }, 'appnexus')).to.equal(true)
      expect(isAcEnabled({ params: { acBidders: ['kjdbfkvb'] } }, 'appnexus')).to.equal(false)
    })
    it('checks if AC is enabled for Magnite', function () {
      expect(isAcEnabled({ params: { acBidders: ['rubicon'] } }, 'rubicon')).to.equal(true)
      expect(isAcEnabled({ params: { acBidders: ['kjdbfkb'] } }, 'rubicon')).to.equal(false)
    })
    it('checks if AC is enabled for Ozone', function () {
      expect(isAcEnabled({ params: { acBidders: ['ozone'] } }, 'ozone')).to.equal(true)
      expect(isAcEnabled({ params: { acBidders: ['kjdvb'] } }, 'ozone')).to.equal(false)
    })
  })
})

function setLocalStorage (data) {
  for (const key in data) {
    storage.setDataInLocalStorage(key, JSON.stringify(data[key]))
  }
}

function removeLocalStorage (data) {
  for (const key in data) {
    storage.removeDataFromLocalStorage(key)
  }
}

function getConfig () {
  return {
    name: 'permutive',
    waitForIt: true,
    params: {
      acBidders: ['appnexus', 'rubicon', 'ozone', 'trustx'],
      maxSegs: 500
    }
  }
}

function transformedTargeting () {
  const data = getTargetingData()

  return {
    ac: [...data._pcrprs, ...data._ppam, ...data._psegs.filter(seg => seg >= 1000000)],
    appnexus: data._papns,
    rubicon: data._prubicons,
    gam: data._pdfps
  }
}

function getTargetingData () {
  return {
    _pdfps: ['gam1', 'gam2'],
    _prubicons: ['rubicon1', 'rubicon2'],
    _papns: ['appnexus1', 'appnexus2'],
    _psegs: ['1234', '1000001', '1000002'],
    _ppam: ['ppam1', 'ppam2'],
    _pcrprs: ['pcrprs1', 'pcrprs2']
  }
}

function getAdUnits () {
  const div_1_sizes = [
    [300, 250],
    [300, 600]
  ]
  const div_2_sizes = [
    [728, 90],
    [970, 250]
  ]
  return [
    {
      code: '/19968336/header-bid-tag-0',
      mediaTypes: {
        banner: {
          sizes: div_1_sizes
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13144370,
            keywords: {
              test_kv: ['true']
            }
          }
        },
        {
          bidder: 'rubicon',
          params: {
            accountId: '9840',
            siteId: '123564',
            zoneId: '583584',
            inventory: {
              area: ['home']
            },
            visitor: {
              test_kv: ['true']
            }
          }
        },
        {
          bidder: 'ozone',
          params: {
            publisherId: 'OZONEGMG0001',
            siteId: '4204204209',
            placementId: '0420420500',
            customData: [
              {
                settings: {},
                targeting: {
                  test_kv: ['true']
                }
              }
            ],
            ozoneData: {}
          }
        },
        {
          bidder: 'trustx',
          params: {
            uid: 45,
            keywords: {
              test_kv: ['true']
            }
          }
        }
      ]
    },
    {
      code: '/19968336/header-bid-tag-1',
      mediaTypes: {
        banner: {
          sizes: div_2_sizes
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13144370,
            keywords: {
              test_kv: ['true']
            }
          }
        },
        {
          bidder: 'ozone',
          params: {
            publisherId: 'OZONEGMG0001',
            siteId: '4204204209',
            placementId: '0420420500',
            customData: [
              {
                targeting: {
                  test_kv: ['true']
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
