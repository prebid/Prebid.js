import {
  permutiveSubmodule,
  storage,
  getSegments,
  initSegments,
  isAcEnabled,
  isPermutiveOnPage,
  setBidderRtb
} from 'modules/permutiveRtdProvider.js'
import { deepAccess } from '../../../src/utils.js'
import { config } from 'src/config.js'

describe('permutiveRtdProvider', function () {
  before(function () {
    const data = getTargetingData()
    setLocalStorage(data)
    config.resetConfig()
  })

  after(function () {
    const data = getTargetingData()
    removeLocalStorage(data)
    config.resetConfig()
  })

  describe('permutiveSubmodule', function () {
    it('should initalise and return true', function () {
      expect(permutiveSubmodule.init()).to.equal(true)
    })
  })

  describe('ortb2 config', function () {
    beforeEach(function () {
      config.resetConfig()
    })

    it('should add ortb2 config', function () {
      const moduleConfig = getConfig()
      const bidderConfig = config.getBidderConfig()
      const acBidders = moduleConfig.params.acBidders
      const expectedTargetingData = transformedTargeting().ac.map(seg => {
        return { id: seg }
      })

      setBidderRtb({}, moduleConfig)

      acBidders.forEach(bidder => {
        expect(bidderConfig[bidder].ortb2.user.data).to.deep.include.members([{
          name: 'permutive.com',
          segment: expectedTargetingData
        }])
      })
    })
    it('should include ortb2 user data transformation for IAB audience taxonomy', function() {
      const moduleConfig = getConfig()
      const bidderConfig = config.getBidderConfig()
      const acBidders = moduleConfig.params.acBidders
      const expectedTargetingData = transformedTargeting().ac.map(seg => {
        return { id: seg }
      })

      Object.assign(
        moduleConfig.params,
        {
          transformations: [{
            id: 'iab',
            config: {
              segtax: 4,
              iabIds: {
                1000001: '9000009',
                1000002: '9000008'
              }
            }
          }]
        }
      )

      setBidderRtb({}, moduleConfig)

      acBidders.forEach(bidder => {
        expect(bidderConfig[bidder].ortb2.user.data).to.deep.include.members([
          {
            name: 'permutive.com',
            segment: expectedTargetingData
          },
          {
            name: 'permutive.com',
            ext: { segtax: 4 },
            segment: [{ id: '9000009' }, { id: '9000008' }]
          }
        ])
      })
    })
    it('should not overwrite ortb2 config', function () {
      const moduleConfig = getConfig()
      const bidderConfig = config.getBidderConfig()
      const acBidders = moduleConfig.params.acBidders
      const sampleOrtbConfig = {
        ortb2: {
          site: {
            name: 'example'
          },
          user: {
            keywords: 'a,b',
            data: [
              {
                name: 'www.dataprovider1.com',
                ext: { taxonomyname: 'iab_audience_taxonomy' },
                segment: [{ id: '687' }, { id: '123' }]
              }
            ]
          }
        }
      }

      config.setBidderConfig({
        bidders: acBidders,
        config: sampleOrtbConfig
      })

      const transformedUserData = {
        name: 'transformation',
        ext: { test: true },
        segment: [1, 2, 3]
      }

      setBidderRtb({}, moduleConfig, {
        testTransformation: userData => transformedUserData
      })

      acBidders.forEach(bidder => {
        expect(bidderConfig[bidder].ortb2.site.name).to.equal(sampleOrtbConfig.ortb2.site.name)
        expect(bidderConfig[bidder].ortb2.user.keywords).to.equal(sampleOrtbConfig.ortb2.user.keywords)
        expect(bidderConfig[bidder].ortb2.user.data).to.deep.include.members([sampleOrtbConfig.ortb2.user.data[0]])
      })
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
    it('checks if AC is enabled for Index', function () {
      expect(isAcEnabled({ params: { acBidders: ['ix'] } }, 'ix')).to.equal(true)
      expect(isAcEnabled({ params: { acBidders: ['kjdvb'] } }, 'ix')).to.equal(false)
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
      acBidders: ['appnexus', 'rubicon', 'ozone', 'trustx', 'ix'],
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
    gam: data._pdfps,
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
  const div1sizes = [
    [300, 250],
    [300, 600]
  ]
  const div2sizes = [
    [728, 90],
    [970, 250]
  ]
  return [
    {
      code: '/19968336/header-bid-tag-0',
      mediaTypes: {
        banner: {
          sizes: div1sizes
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
          sizes: div2sizes
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
