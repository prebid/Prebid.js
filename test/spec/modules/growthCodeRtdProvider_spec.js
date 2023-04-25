import {config} from 'src/config.js';
import {growthCodeRtdProvider, storage} from '../../../modules/growthCodeRtdProvider';

const ENDPOINT_URL = 'https://p2.gcprivacy.com/v2/rtd?'
const RTD_EXPIRE_KEY = 'gc_rtd_expires_at'
const RTD_CACHE_KEY = 'gc_rtd_items'

const sampleConfig = {
  name: 'growthCodeRtd',
  waitForIt: true,
  params: {
    pid: 'TEST01',
  }
}

describe('growthCodeRtdProvider', function() {
  let getDataFromLocalStorageStub;
  let setDataInLocalStorageStub;

  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage')
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
    setDataInLocalStorageStub.restore();
  });

  describe('growthCodeRtdSubmodule', function() {
    it('test bad config instantiates', function () {
		  expect(growthCodeRtdProvider.init(null, null)).to.equal(false);
    });
    it('successfully instantiates', function () {
      expect(growthCodeRtdProvider.init(sampleConfig, null)).to.equal(true);
    });
    it('successfully instantiates (cached)', function () {
      const localStoreItem = '[{"bidder":"criteo","attachment_point":"data","parameters":"{\\"criteo\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}]'
      setDataInLocalStorageStub(RTD_CACHE_KEY, localStoreItem, null)
      setDataInLocalStorageStub(RTD_EXPIRE_KEY, '1965949885', null)
      expect(growthCodeRtdProvider.init(sampleConfig, null)).to.equal(true);
    });
    it('successfully instantiates (cached,expire)', function () {
      const localStoreItem = '[{"bidder":"criteo","attachment_point":"data","parameters":"{\\"criteo\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}]'
      setDataInLocalStorageStub(RTD_CACHE_KEY, localStoreItem, null)
      setDataInLocalStorageStub(RTD_EXPIRE_KEY, '1679188732', null)
      expect(growthCodeRtdProvider.init(sampleConfig, null)).to.equal(true);
    });

    it('test alterBid data merge into ortb2 data (bidder)', function() {
      const gcData =
        {
          'client_a':
            {
              'user':
                {'ext':
                    {'data':
                        {'eids': [
                          {'source': 'test.com',
                            'uids': [
                              {
                                'id': '4254074976bb6a6d970f5f693bd8a75c',
                                'atype': 3,
                                'ext': {
                                  'stype': 'hemmd5'}
                              }, {
                                'id': 'd0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898',
                                'atype': 3,
                                'ext': {
                                  'stype': 'hemsha256'
                                }
                              }
                            ]
                          }
                        ]
                        }
                    }
                }
            }
        };

      const payload = [
        {
          'bidder': 'client_a',
          'attachment_point': 'data',
          'parameters': JSON.stringify(gcData)
        }]

      const bidConfig = {ortb2Fragments: {bidder: {}}};
      growthCodeRtdProvider.addData(bidConfig, payload)

      expect(bidConfig.ortb2Fragments.bidder).to.deep.equal(gcData)
    });
  });
});
