import { permutiveIdentityManagerIdSubmodule, storage } from 'modules/permutiveIdentityManagerIdSystem'
import { deepSetValue } from 'src/utils.js'

const STORAGE_KEY = 'permutive-prebid-id'

describe('permutiveIdentityManagerIdSystem', () => {
  afterEach(() => {
    storage.removeDataFromLocalStorage(STORAGE_KEY)
  })

  describe('decode', () => {
    it('returns the input unchanged', () => {
      const input = {
        id5id: {
          uid: '0',
          ext: {
            abTestingControlGroup: false,
            linkType: 2,
            pba: 'somepba'
          }
        }
      }
      const result = permutiveIdentityManagerIdSubmodule.decode(input)
      expect(result).to.be.equal(input)
    })
  })

  describe('getId', () => {
    it('returns relevant IDs from localStorage and does not return unexpected IDs', () => {
      const data = getUserIdData()
      storage.setDataInLocalStorage(STORAGE_KEY, JSON.stringify(data))
      const result = permutiveIdentityManagerIdSubmodule.getId({})
      const expected = {
        'id': {
          'id5id': {
            'uid': '0',
            'linkType': 0,
            'ext': {
              'abTestingControlGroup': false,
              'linkType': 0,
              'pba': 'EVqgf9vY0fSrsrqJZMOm+Q=='
            }
          }
        }
      }
      expect(result).to.deep.equal(expected)
    })

    it('returns undefined if no relevant IDs are found in localStorage', () => {
      storage.setDataInLocalStorage(STORAGE_KEY, '{}')
      const result = permutiveIdentityManagerIdSubmodule.getId({})
      expect(result).to.be.undefined
    })

    it('will optionally wait for Permutive SDK if no identities are in local storage already', async () => {
      const cleanup = setWindowPermutive()
      const result = permutiveIdentityManagerIdSubmodule.getId({params: {ajaxTimeout: 50}})
      expect(result).not.to.be.undefined
      expect(result.id).to.be.undefined
      expect(result.callback).not.to.be.undefined
      const expected = {
        'id5id': {
          'uid': '0',
          'linkType': 0,
          'ext': {
            'abTestingControlGroup': false,
            'linkType': 0,
            'pba': 'EVqgf9vY0fSrsrqJZMOm+Q=='
          }
        }
      }
      const r = await new Promise(result.callback)
      expect(r).to.deep.equal(expected)
      cleanup()
    })
  })
})

const setWindowPermutive = () => {
  // Read from Permutive
  const backup = window.permutive

  deepSetValue(window, 'permutive.ready', (f) => {
    setTimeout(() => f(), 5)
  })

  deepSetValue(window, 'permutive.addons.identity_manager.prebid.onReady', (f) => {
    setTimeout(() => f(sdkUserIdData()), 5)
  })

  // Cleanup
  return () => window.permutive = backup
}

const sdkUserIdData = () => ({
  'id5id': {
    'uid': '0',
    'linkType': 0,
    'ext': {
      'abTestingControlGroup': false,
      'linkType': 0,
      'pba': 'EVqgf9vY0fSrsrqJZMOm+Q=='
    }
  },
})

const getUserIdData = () => ({
  'providers': {
    'id5id': {
      'userId': {
        'uid': '0',
        'linkType': 0,
        'ext': {
          'abTestingControlGroup': false,
          'linkType': 0,
          'pba': 'EVqgf9vY0fSrsrqJZMOm+Q=='
        }
      }
    },
    'fooid': {
      'userId': {
        'id': '1'
      }
    }
  }
})
