import {config} from 'src/config.js';
import {growthCodeRtdProvider} from '../../../modules/growthCodeRtdProvider';
import sinon from 'sinon';
import * as ajaxLib from 'src/ajax.js';

const sampleConfig = {
  name: 'growthCodeRtd',
  waitForIt: true,
  params: {
    pid: 'TEST01',
  }
}

describe('growthCodeRtdProvider', function() {
  beforeEach(function() {
    config.resetConfig();
  });

  afterEach(function () {
  });

  describe('growthCodeRtdSubmodule', function() {
    it('test bad config instantiates', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.success('{"status":"ok","version":"1.0.0","results":1,"items":[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}],"expires_at":1685029931}')
        }
      });
		  expect(growthCodeRtdProvider.init(null, null)).to.equal(false);
      ajaxStub.restore()
    });
    it('successfully instantiates', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.success('{"status":"ok","version":"1.0.0","results":1,"items":[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}],"expires_at":1685029931}')
        }
      });
      expect(growthCodeRtdProvider.init(sampleConfig, null)).to.equal(true);
      ajaxStub.restore()
    });
    it('successfully instantiates (cached)', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.success('{"status":"ok","version":"1.0.0","results":1,"items":[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}],"expires_at":1685029931}')
        }
      });
      const localStoreItem = '[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}]'
      expect(growthCodeRtdProvider.callServer(sampleConfig, localStoreItem, '1965949885', null)).to.equal(true);
      ajaxStub.restore()
    });
    it('successfully instantiates (cached,expire)', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.success('{"status":"ok","version":"1.0.0","results":1,"items":[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}],"expires_at":1685029931}')
        }
      });
      const localStoreItem = '[{"bidder":"client_a","attachment_point":"data","parameters":"{\\"client_a\\":{\\"user\\":{\\"ext\\":{\\"data\\":{\\"eids\\":[{\\"source\\":\\"\\",\\"uids\\":[{\\"id\\":\\"4254074976bb6a6d970f5f693bd8a75c\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemmd5\\"}},{\\"id\\":\\"d0ee291572ffcfba0bf7edb2b1c90ca7c32d255e5040b8b50907f5963abb1898\\",\\"atype\\":3,\\"ext\\":{\\"stype\\":\\"hemsha256\\"}}]}]}}}}}"}]'
      expect(growthCodeRtdProvider.callServer(sampleConfig, localStoreItem, '1679188732', null)).to.equal(true);
      ajaxStub.restore()
    });

    it('test no items response', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.success('{}')
        }
      });
      expect(growthCodeRtdProvider.callServer(sampleConfig, null, '1679188732', null)).to.equal(true);
      ajaxStub.restore();
    });

    it('ajax error response', function () {
      const ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return (url, cbObj) => {
          cbObj.error();
        }
      });
      expect(growthCodeRtdProvider.callServer(sampleConfig, null, '1679188732', null)).to.equal(true);
      ajaxStub.restore();
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
