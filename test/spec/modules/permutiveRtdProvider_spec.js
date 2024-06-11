import {
  permutiveSubmodule,
  storage,
  getSegments,
  isAcEnabled,
  isPermutiveOnPage,
  setBidderRtb,
  getModuleConfig,
  PERMUTIVE_SUBMODULE_CONFIG_KEY,
  readAndSetCohorts,
  PERMUTIVE_STANDARD_KEYWORD,
  PERMUTIVE_STANDARD_AUD_KEYWORD,
  PERMUTIVE_CUSTOM_COHORTS_KEYWORD,
} from 'modules/permutiveRtdProvider.js'
import { deepAccess, deepSetValue, mergeDeep } from '../../../src/utils.js'
import { config } from 'src/config.js'

describe('permutiveRtdProvider', function () {
  beforeEach(function () {
    const data = getTargetingData()
    setLocalStorage(data)
    config.resetConfig()
  })

  afterEach(function () {
    const data = getTargetingData()
    removeLocalStorage(data)
    config.resetConfig()
  })

  describe('permutiveSubmodule', function () {
    it('should initalise and return true', function () {
      expect(permutiveSubmodule.init()).to.equal(true)
    })
  })

  describe('getModuleConfig', function () {
    beforeEach(function () {
      // Reads data from the cache
      permutiveSubmodule.init()
    })

    const liftToParams = (params) => ({ params })

    const getDefaultConfig = () => ({
      waitForIt: false,
      params: {
        maxSegs: 500,
        acBidders: [],
        overwrites: {},
      },
    })

    const storeConfigInCacheAndInit = (data) => {
      const dataToStore = { [PERMUTIVE_SUBMODULE_CONFIG_KEY]: data }
      setLocalStorage(dataToStore)
      // Reads data from the cache
      permutiveSubmodule.init()

      // Cleanup
      return () => removeLocalStorage(dataToStore)
    }

    const setWindowPermutivePrebid = (getPermutiveRtdConfig) => {
      // Read from Permutive
      const backup = window.permutive

      deepSetValue(window, 'permutive.addons.prebid', {
        getPermutiveRtdConfig,
      })

      // Cleanup
      return () => window.permutive = backup
    }

    it('should return default values', function () {
      const config = getModuleConfig({})
      expect(config).to.deep.equal(getDefaultConfig())
    })

    it('should override deeply on custom config', function () {
      const defaultConfig = getDefaultConfig()

      const customModuleConfig = { waitForIt: true, params: { acBidders: ['123'] } }
      const config = getModuleConfig(customModuleConfig)

      expect(config).to.deep.equal(mergeDeep(defaultConfig, customModuleConfig))
    })

    it('should override deeply on cached config', function () {
      const defaultConfig = getDefaultConfig()

      const cachedParamsConfig = { acBidders: ['123'] }
      const cleanupCache = storeConfigInCacheAndInit(cachedParamsConfig)

      const config = getModuleConfig({})

      expect(config).to.deep.equal(mergeDeep(defaultConfig, liftToParams(cachedParamsConfig)))

      // Cleanup
      cleanupCache()
    })

    it('should override deeply on Permutive Rtd config', function () {
      const defaultConfig = getDefaultConfig()

      const permutiveRtdConfigParams = { acBidders: ['123'], overwrites: { '123': true } }
      const cleanupPermutive = setWindowPermutivePrebid(function () {
        return permutiveRtdConfigParams
      })

      const config = getModuleConfig({})

      expect(config).to.deep.equal(mergeDeep(defaultConfig, liftToParams(permutiveRtdConfigParams)))

      // Cleanup
      cleanupPermutive()
    })

    it('should NOT use cached Permutive Rtd config if window.permutive is available', function () {
      const defaultConfig = getDefaultConfig()

      // As Permutive is available on the window object, this value won't be used.
      const cachedParamsConfig = { acBidders: ['123'] }
      const cleanupCache = storeConfigInCacheAndInit(cachedParamsConfig)

      const permutiveRtdConfigParams = { acBidders: ['456'], overwrites: { '123': true } }
      const cleanupPermutive = setWindowPermutivePrebid(function () {
        return permutiveRtdConfigParams
      })

      const config = getModuleConfig({})

      expect(config).to.deep.equal(mergeDeep(defaultConfig, liftToParams(permutiveRtdConfigParams)))

      // Cleanup
      cleanupCache()
      cleanupPermutive()
    })

    it('should handle calling Permutive method throwing error', function () {
      const defaultConfig = getDefaultConfig()

      const cleanupPermutive = setWindowPermutivePrebid(function () {
        throw new Error()
      })

      const config = getModuleConfig({})

      expect(config).to.deep.equal(defaultConfig)

      // Cleanup
      cleanupPermutive()
    })

    it('should override deeply in priority order', function () {
      const defaultConfig = getDefaultConfig()

      // As Permutive is available on the window object, this value won't be used.
      const cachedConfig = { acBidders: ['123'] }
      const cleanupCache = storeConfigInCacheAndInit(cachedConfig)

      // Read from Permutive
      const permutiveRtdConfig = { acBidders: ['456'] }
      const cleanupPermutive = setWindowPermutivePrebid(function () {
        return permutiveRtdConfig
      })

      const customModuleConfig = { params: { acBidders: ['789'], maxSegs: 499 } }
      const config = getModuleConfig(customModuleConfig)

      // The configs are in reverse priority order as configs are merged left to right. So the priority is,
      // 1. customModuleConfig <- set by publisher with pbjs.setConfig
      // 2. permutiveRtdConfig <- set by the publisher using Permutive.
      // 3. defaultConfig
      const configMergedInPriorityOrder = mergeDeep(defaultConfig, liftToParams(permutiveRtdConfig), customModuleConfig)
      expect(config).to.deep.equal(configMergedInPriorityOrder)

      // Cleanup
      cleanupCache()
      cleanupPermutive()
    })
  })

  describe('ortb2 config', function () {
    beforeEach(function () {
      config.resetConfig()
    })

    it('should add ortb2 config', function () {
      const moduleConfig = getConfig()
      const bidderConfig = {};
      const acBidders = moduleConfig.params.acBidders
      const segmentsData = transformedTargeting()
      const expectedTargetingData = segmentsData.ac.map(seg => {
        return { id: seg }
      })

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      acBidders.forEach(bidder => {
        const customCohorts = segmentsData[bidder] || []
        expect(bidderConfig[bidder].user.data).to.deep.include.members([
          {
            name: 'permutive.com',
            segment: expectedTargetingData,
          },
          // Should have custom cohorts specific for that bidder
          {
            name: 'permutive',
            segment: customCohorts.map(seg => {
              return { id: seg }
            }),
          },
          {
            name: 'permutive.com',
            ext: {
              segtax: 600
            },
            segment: [
              { id: '1' },
              { id: '2' },
              { id: '3' },
            ],
          },
          {
            name: 'permutive.com',
            ext: {
              segtax: 601
            },
            segment: [
              { id: '100' },
              { id: '101' },
              { id: '102' },
            ],
          },
        ])
      })
    })

    it('should override existing ortb2.user.data reserved by permutive RTD', function () {
      const reservedPermutiveStandardName = 'permutive.com'
      const reservedPermutiveCustomCohortName = 'permutive'

      const moduleConfig = getConfig()
      const acBidders = moduleConfig.params.acBidders
      const segmentsData = transformedTargeting()

      const sampleOrtbConfig = {
        user: {
          data: [
            {
              name: reservedPermutiveCustomCohortName,
              segment: [{ id: 'remove-me' }, { id: 'remove-me-also' }]
            },
            {
              name: reservedPermutiveStandardName,
              segment: [{ id: 'remove-me-also-also' }, { id: 'remove-me-also-also-also' }]
            }
          ]
        }
      }

      const bidderConfig = Object.fromEntries(acBidders.map(bidder => [bidder, sampleOrtbConfig]))

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      acBidders.forEach(bidder => {
        const customCohorts = segmentsData[bidder] || []

        expect(bidderConfig[bidder].user.data).to.not.deep.include.members([...sampleOrtbConfig.user.data])
        expect(bidderConfig[bidder].user.data).to.deep.include.members([
          {
            name: reservedPermutiveCustomCohortName,
            segment: customCohorts.map(id => ({ id })),
          },
          {
            name: reservedPermutiveStandardName,
            segment: segmentsData.ac.map(id => ({ id })),
          },
        ])
      })
    })

    it('should include ortb2 user data transformation for IAB audience taxonomy', function() {
      const moduleConfig = getConfig()
      const bidderConfig = {}
      const acBidders = moduleConfig.params.acBidders
      const segmentsData = transformedTargeting()
      const expectedTargetingData = segmentsData.ac.map(seg => {
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

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      acBidders.forEach(bidder => {
        expect(bidderConfig[bidder].user.data).to.deep.include.members([
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
      const acBidders = moduleConfig.params.acBidders
      const segmentsData = transformedTargeting()

      const sampleOrtbConfig = {
        site: {
          name: 'example'
        },
        user: {
          data: [
            {
              name: 'www.dataprovider1.com',
              ext: { taxonomyname: 'iab_audience_taxonomy' },
              segment: [{ id: '687' }, { id: '123' }]
            }
          ]
        }
      }

      const bidderConfig = Object.fromEntries(acBidders.map(bidder => [bidder, sampleOrtbConfig]))

      const transformedUserData = {
        name: 'transformation',
        ext: { test: true },
        segment: [1, 2, 3]
      }

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      acBidders.forEach(bidder => {
        expect(bidderConfig[bidder].site.name).to.equal(sampleOrtbConfig.site.name)
        expect(bidderConfig[bidder].user.data).to.deep.include.members([sampleOrtbConfig.user.data[0]])
      })
    })
    it('should update user.keywords and not override existing values', function () {
      const moduleConfig = getConfig()
      const acBidders = moduleConfig.params.acBidders
      const segmentsData = transformedTargeting()

      const sampleOrtbConfig = {
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

      const bidderConfig = Object.fromEntries(acBidders.map(bidder => [bidder, sampleOrtbConfig]))

      const transformedUserData = {
        name: 'transformation',
        ext: { test: true },
        segment: [1, 2, 3]
      }

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      acBidders.forEach(bidder => {
        const customCohortsData = segmentsData[bidder] || []
        const keywordGroups = {
          [PERMUTIVE_STANDARD_KEYWORD]: segmentsData.ac,
          [PERMUTIVE_STANDARD_AUD_KEYWORD]: segmentsData.ssp.cohorts,
          [PERMUTIVE_CUSTOM_COHORTS_KEYWORD]: customCohortsData
        }

        // Transform groups of key-values into a single array of strings
        // i.e { permutive: ['1', '2'], p_standard: ['3', '4'] } => ['permutive=1', 'permutive=2', 'p_standard=3',' p_standard=4']
        const transformedKeywordGroups = Object.entries(keywordGroups)
          .flatMap(([keyword, ids]) => ids.map(id => `${keyword}=${id}`))

        const keywords = `${sampleOrtbConfig.user.keywords},${transformedKeywordGroups.join(',')}`

        expect(bidderConfig[bidder].site.name).to.equal(sampleOrtbConfig.site.name)
        expect(bidderConfig[bidder].user.data).to.deep.include.members([sampleOrtbConfig.user.data[0]])
        expect(bidderConfig[bidder].user.keywords).to.deep.equal(keywords)
      })
    })
    it('should merge ortb2 correctly for ac and ssps', function () {
      const customTargetingData = {
        ...getTargetingData(),
        '_ppam': [],
        '_psegs': [],
        '_pcrprs': ['abc', 'def', 'xyz'],
        '_pssps': {
          ssps: ['foo', 'bar'],
          cohorts: ['xyz', 'uvw'],
        }
      }
      const segmentsData = transformedTargeting(customTargetingData)
      setLocalStorage(customTargetingData)

      const moduleConfig = {
        name: 'permutive',
        waitForIt: true,
        params: {
          acBidders: ['foo', 'other'],
          maxSegs: 30
        }
      }
      const bidderConfig = {};

      setBidderRtb(bidderConfig, moduleConfig, segmentsData)

      // include both ac and ssp cohorts, as foo is both in ac bidders and ssps
      const expectedFooTargetingData = [
        { id: 'abc' },
        { id: 'def' },
        { id: 'xyz' },
        { id: 'uvw' },
      ]
      expect(bidderConfig['foo'].user.data).to.deep.include.members([{
        name: 'permutive.com',
        segment: expectedFooTargetingData
      }])

      // don't include ac targeting as it's not in ac bidders
      const expectedBarTargetingData = [
        { id: 'xyz' },
        { id: 'uvw' },
      ]
      expect(bidderConfig['bar'].user.data).to.deep.include.members([{
        name: 'permutive.com',
        segment: expectedBarTargetingData
      }])

      // only include ac targeting as this ssp is not in ssps list
      const expectedOtherTargetingData = [
        { id: 'abc' },
        { id: 'def' },
        { id: 'xyz' },
      ]
      expect(bidderConfig['other'].user.data).to.deep.include.members([{
        name: 'permutive.com',
        segment: expectedOtherTargetingData
      }])
    })

    describe('ortb2.user.ext tests', function () {
      it('should add nothing if there are no cohorts data', function () {
        // Empty module config means we default
        const moduleConfig = getConfig()

        const bidderConfig = {}

        // Passing empty values means there is no segment data
        const segmentsData = transformedTargeting({
          _pdfps: [],
          _prubicons: [],
          _papns: [],
          _psegs: [],
          _ppam: [],
          _pcrprs: [],
          _pssps: { ssps: [], cohorts: [] }
        })

        setBidderRtb(bidderConfig, moduleConfig, segmentsData)

        moduleConfig.params.acBidders.forEach(bidder => {
          expect(bidderConfig[bidder].user).to.not.have.property('ext')
        })
      })

      it('should add standard and custom cohorts', function () {
        const moduleConfig = getConfig()

        const bidderConfig = {}

        const segmentsData = transformedTargeting()

        setBidderRtb(bidderConfig, moduleConfig, segmentsData)

        moduleConfig.params.acBidders.forEach(bidder => {
          const userExtData = {
            // Default targeting
            p_standard: segmentsData.ac,
          }

          const customCohorts = segmentsData[bidder] || []
          if (customCohorts.length > 0) {
            deepSetValue(userExtData, 'permutive', customCohorts)
          }

          expect(bidderConfig[bidder].user.ext.data).to.deep
            .eq(userExtData)
        })
      })

      it('should add ac cohorts ONLY', function () {
        const moduleConfig = getConfig()

        const bidderConfig = {}

        const segmentsData = transformedTargeting()
        moduleConfig.params.acBidders.forEach((bidder) => {
          // Remove custom cohorts
          delete segmentsData[bidder]
        })

        setBidderRtb(bidderConfig, moduleConfig, segmentsData)

        moduleConfig.params.acBidders.forEach((bidder) => {
          expect(bidderConfig[bidder].user.ext.data).to.deep.equal({
            p_standard: segmentsData.ac
          })
        })
      })

      it('should add custom cohorts ONLY', function () {
        const moduleConfig = getConfig()

        const bidderConfig = {}

        const segmentsData = transformedTargeting()
        // Empty the AC cohorts
        segmentsData['ac'] = []

        setBidderRtb(bidderConfig, moduleConfig, segmentsData)

        moduleConfig.params.acBidders.forEach(bidder => {
          const customCohorts = segmentsData[bidder] || []
          if (customCohorts.length > 0) {
            expect(bidderConfig[bidder].user.ext.data).to.deep
              .eq({ permutive: customCohorts })
          } else {
            expect(bidderConfig[bidder].user).to.not.have.property('ext')
          }
        })
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
        if (key === 'ssp') {
          expect(segments[key].cohorts).to.have.length(max)
        } else if (key === 'topics') {
          for (const topic in segments[key]) {
            expect(segments[key][topic]).to.have.length(max)
          }
        } else {
          expect(segments[key]).to.have.length(max)
        }
      }
    })
  })

  describe('Existing key-value targeting', function () {
    it('doesn\'t overwrite existing key-values for Xandr', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      readAndSetCohorts({ adUnits }, config)

      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          const { bidder, params } = bid

          if (bidder === 'appnexus') {
            expect(deepAccess(params, 'keywords.test_kv')).to.eql(['true'])
          }
        })
      })
    })
    it('doesn\'t overwrite existing key-values for Magnite', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      readAndSetCohorts({ adUnits }, config)

      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          const { bidder, params } = bid

          if (bidder === 'rubicon') {
            expect(deepAccess(params, 'visitor.test_kv')).to.eql(['true'])
          }
        })
      })
    })
    it('doesn\'t overwrite existing key-values for Ozone', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      readAndSetCohorts({ adUnits }, config)

      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          const { bidder, params } = bid

          if (bidder === 'ozone') {
            expect(deepAccess(params, 'customData.0.targeting.test_kv')).to.eql(['true'])
          }
        })
      })
    })
    it('doesn\'t overwrite existing key-values for TrustX', function () {
      const adUnits = getAdUnits()
      const config = getConfig()

      readAndSetCohorts({ adUnits }, config)

      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          const { bidder, params } = bid

          if (bidder === 'trustx') {
            expect(deepAccess(params, 'keywords.test_kv')).to.eql(['true'])
          }
        })
      })
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

function transformedTargeting (data = getTargetingData()) {
  return {
    ac: [...data._pcrprs, ...data._ppam, ...data._psegs.filter(seg => seg >= 1000000)],
    appnexus: data._papns,
    ix: data._pindexs,
    rubicon: data._prubicons,
    gam: data._pdfps,
    ssp: data._pssps,
    topics: data._ppsts,
  }
}

function getTargetingData () {
  return {
    _pdfps: ['gam1', 'gam2'],
    _prubicons: ['rubicon1', 'rubicon2'],
    _papns: ['appnexus1', 'appnexus2'],
    _psegs: ['1234', '1000001', '1000002'],
    _ppam: ['ppam1', 'ppam2'],
    _pindexs: ['pindex1', 'pindex2'],
    _pcrprs: ['pcrprs1', 'pcrprs2', 'dup'],
    _pssps: { ssps: ['xyz', 'abc', 'dup'], cohorts: ['123', 'abc'] },
    _ppsts: { '600': [1, 2, 3], '601': [100, 101, 102] },
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
    },
    {
      code: 'myVideoAdUnit',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4', 'video/x-ms-wmv'],
          protocols: [2, 3, 5, 6],
          api: [2],
          maxduration: 30,
          linearity: 1
        }
      },
      bids: [{
        bidder: 'rubicon',
        params: {
          accountId: '9840',
          siteId: '123564',
          zoneId: '583584',
          video: {
            language: 'en'
          },
          visitor: {
            test_kv: ['true']
          }
        }
      }]
    }
  ]
}
