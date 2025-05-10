import {
  EXPERIAN_RTID_DATA_KEY,
  EXPERIAN_RTID_EXPIRATION_KEY,
  EXPERIAN_RTID_STALE_KEY,
  SUBMODULE_NAME,
  experianRtdObj,
  experianRtdSubmodule, EXPERIAN_RTID_NO_TRACK_KEY
} from '../../../modules/experianRtdProvider.js';
import { getStorageManager } from '../../../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../../../src/activities/modules';
import { safeJSONParse, timestamp } from '../../../src/utils';
import {server} from '../../mocks/xhr.js';

describe('Experian realtime module', () => {
  const sandbox = sinon.createSandbox();
  let requests;

  const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME })
  beforeEach(() => {
    requests = server.requests;
    storage.removeDataFromLocalStorage(EXPERIAN_RTID_DATA_KEY, null)
    storage.removeDataFromLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, null)
    storage.removeDataFromLocalStorage(EXPERIAN_RTID_STALE_KEY, null)
    storage.removeDataFromLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, null)
  })
  afterEach(() => {
    sandbox.restore();
  })
  // Bid request config
  const reqBidsConfigObj = {
    adUnits: [{
      bids: [
        { bidder: 'appnexus' }
      ]
    }]
  };
  describe('init', () => {
    it('succeeds when params have accountId', () => {
      const initResult = experianRtdSubmodule.init({ params: { accountId: 'ZylatYg' } })
      expect(initResult).to.be.true;
    })

    it('fails when params don\'t have accountId', () => {
      const initResult = experianRtdSubmodule.init({ })
      expect(initResult).to.be.false;
    })
  })

  describe('getBidRequestData', () => {
    describe('when local storage has data, isn\'t no track, isn\'t stale and isn\'t expired', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify([
          {
            bidder: 'pubmatic',
            data: {
              key: 'pubmatic-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          },
          {
            bidder: 'sovrn',
            data: {
              key: 'sovrn-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          }
        ]), null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now + 50000).toISOString(), null)
      })
      it('doesn\'t request data envelope, and alters bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig)
        sandbox.assert.calledWithExactly(alterBidsSpy, bidsConfig, moduleConfig)
        expect(dataEnvelopeSpy.called).to.be.false;
      })
    })

    describe('when local storage has data but it is stale', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify([
          {
            bidder: 'pubmatic',
            data: {
              key: 'pubmatic-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          },
          {
            bidder: 'sovrn',
            data: {
              key: 'sovrn-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          }
        ]), null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now - 50000).toISOString(), null)
      })
      it('it requests data envelope and alters bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        sandbox.assert.calledWithExactly(alterBidsSpy, bidsConfig, moduleConfig)
        sandbox.assert.calledWithExactly(dataEnvelopeSpy, moduleConfig, userConsent)
      })
    })
    describe('when local storage has data but it is expired', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify([
          {
            bidder: 'pubmatic',
            data: {
              key: 'pubmatic-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          },
          {
            bidder: 'sovrn',
            data: {
              key: 'sovrn-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          }
        ]), null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now - 50000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now - 100000).toISOString(), null)
      })
      it('requests data envelope, and doesn\'t alter bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        sandbox.assert.calledWithExactly(dataEnvelopeSpy, moduleConfig, userConsent)
        expect(alterBidsSpy.called).to.be.false;
      })
    })
    describe('when local storage has no data envelope', () => {
      it('requests data envelope, and doesn\'t alter bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        sandbox.assert.calledWithExactly(dataEnvelopeSpy, moduleConfig, userConsent)
        expect(alterBidsSpy.called).to.be.false;
      })
    })
    describe('when local storage has no track and is expired', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, 'no_track', null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now - 50000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now - 100000).toISOString(), null)
      })
      it('requests data envelope, and doesn\'t alter bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        sandbox.assert.calledWithExactly(dataEnvelopeSpy, moduleConfig, userConsent)
        expect(alterBidsSpy.called).to.be.false;
      })
    })

    describe('when local storage has no track and is stale', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, 'no_track', null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now - 50000).toISOString(), null)
      })
      it('requests data envelope, and doesn\'t alter bids', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        sandbox.assert.calledWithExactly(dataEnvelopeSpy, moduleConfig, userConsent)
        expect(alterBidsSpy.called).to.be.false;
      })
    })

    describe('when local storage has no track and isn\'t expired or stale', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, 'no_track', null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now + 50000).toISOString(), null)
      })
      it('doesn\'t alter bids and doesn\'t request data envelope', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const userConsent = {gdpr: {}, uspConsent: {}}
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        const dataEnvelopeSpy = sandbox.spy(experianRtdObj, 'requestDataEnvelope')
        const alterBidsSpy = sandbox.spy(experianRtdObj, 'alterBids')
        experianRtdSubmodule.getBidRequestData(bidsConfig, sinon.stub, moduleConfig, userConsent)
        expect(alterBidsSpy.called).to.be.false;
        expect(dataEnvelopeSpy.called).to.be.false;
      })
    })
  })

  describe('alterBids', () => {
    describe('data envelope has every bidder from config', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify([
          {
            bidder: 'pubmatic',
            data: {
              key: 'pubmatic-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          },
          {
            bidder: 'sovrn',
            data: {
              key: 'sovrn-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          }
        ]), null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now + 50000).toISOString(), null)
      })

      it('alters bids for the bidders in the module config', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic'] } }
        experianRtdObj.alterBids(bidsConfig, moduleConfig);
        expect(bidsConfig.ortb2Fragments.bidder).to.deep.equal({pubmatic: {
          experianRtidKey: 'pubmatic-encryption-key-1',
          experianRtidData: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
        }})
      })
    })
    describe('data envelope is missing bidders from config', () => {
      beforeEach(() => {
        const now = timestamp()
        storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify([
          {
            bidder: 'sovrn',
            data: {
              key: 'sovrn-encryption-key-1',
              data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
            }
          }
        ]), null)

        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, new Date(now + 100000).toISOString(), null)
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, new Date(now + 50000).toISOString(), null)
      })

      it('alters bids for the bidders in the module config', () => {
        const bidsConfig = {
          ortb2Fragments: {
            bidder: {}
          }
        }
        const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
        experianRtdObj.alterBids(bidsConfig, moduleConfig);
        expect(bidsConfig.ortb2Fragments.bidder).to.deep.equal({
          sovrn: {
            experianRtidKey: 'sovrn-encryption-key-1',
            experianRtidData: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='
          }})
      })
    })
  })

  describe('requestDataEnvelope', () => {
    it('sends request to experian rtd and stores response', () => {
      const moduleConfig = { params: { accountId: 'ZylatYg', bidders: ['pubmatic', 'sovrn'] } }
      experianRtdObj.requestDataEnvelope(moduleConfig, { gdpr: { gdprApplies: 0, consentString: 'wow' }, uspConsent: '1YYY' })
      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{"staleAt":"2023-06-01T00:00:00","expiresAt":"2023-06-03T00:00:00","status":"ok","data":[{"bidder":"pubmatic","data":{"key":"pubmatic-encryption-key-1","data":"IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=="}},{"bidder":"sovrn","data":{"key":"sovrn-encryption-key-1","data":"IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=="}}]}'
      )

      expect(requests[0].url).to.equal('https://rtid.tapad.com/acc/ZylatYg/ids?gdpr=0&gdpr_consent=wow&us_privacy=1YYY')
      expect(safeJSONParse(storage.getDataFromLocalStorage(EXPERIAN_RTID_DATA_KEY, null))).to.deep.equal([{bidder: 'pubmatic', data: {key: 'pubmatic-encryption-key-1', data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='}}, {bidder: 'sovrn', data: {key: 'sovrn-encryption-key-1', data: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=='}}])
      expect(storage.getDataFromLocalStorage(EXPERIAN_RTID_STALE_KEY)).to.equal('2023-06-01T00:00:00')
      expect(storage.getDataFromLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY)).to.equal('2023-06-03T00:00:00')
    })
  })

  describe('extractConsentQueryString', () => {
    describe('when userConsent is empty', () => {
      it('returns undefined', () => {
        expect(experianRtdObj.extractConsentQueryString({})).to.be.undefined
      })
    })

    describe('when userConsent exists', () => {
      it('builds query string', () => {
        expect(
          experianRtdObj.extractConsentQueryString({}, { gdpr: { gdprApplies: 1, consentString: 'this-is-something' }, uspConsent: '1YYY' })
        ).to.equal('?gdpr=1&gdpr_consent=this-is-something&us_privacy=1YYY')
      })
    })

    describe('when config.ids exists', () => {
      it('builds query string', () => {
        expect(experianRtdObj.extractConsentQueryString({ params: { accountId: 'ZylatYg', ids: { maid: ['424', '2982'], hem: 'my-hem' } } }, { gdpr: { gdprApplies: 1, consentString: 'this-is-something' }, uspConsent: '1YYY' }))
          .to.equal('?gdpr=1&gdpr_consent=this-is-something&us_privacy=1YYY&id.maid=424&id.maid=2982&id.hem=my-hem')
      })
    })
  })
})
