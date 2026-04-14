import * as utils from '../../../src/utils.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { rediadsIdSubmodule } from 'modules/rediadsIdSystem.js';

describe('Rediads ID System', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'generateUUID').returns('11111111-2222-4333-8444-555555555555');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('module registration', function () {
    it('should register the submodule', function () {
      expect(rediadsIdSubmodule.name).to.equal('rediadsId');
    });

    it('should provide function-based eids mapping', function () {
      expect(rediadsIdSubmodule.eids).to.have.property('rediadsId');
      expect(rediadsIdSubmodule.eids.rediadsId).to.be.a('function');
    });
  });

  describe('decode', function () {
    it('should return undefined for invalid values', function () {
      expect(rediadsIdSubmodule.decode()).to.be.undefined;
      expect(rediadsIdSubmodule.decode('invalid-json')).to.be.undefined;
      expect(rediadsIdSubmodule.decode({})).to.be.undefined;
    });

    it('should decode a stored object', function () {
      const result = rediadsIdSubmodule.decode({
        id: 'ruid_test',
        source: 'rediads.example',
        atype: 1,
        canShare: true,
        consentHash: 'hash_123',
        refreshAfter: 12345
      });

      expect(result).to.deep.equal({
        rediadsId: {
          uid: 'ruid_test',
          source: 'rediads.example',
          atype: 1,
          ext: {
            canShare: true,
            consentHash: 'hash_123',
            refreshAfter: 12345
          }
        }
      });
    });
  });

  describe('getId', function () {
    it('should generate a new id when consent allows storage', function () {
      const config = {
        params: {},
        storage: {
          type: 'html5',
          name: 'rediads_id'
        }
      };

      const result = rediadsIdSubmodule.getId(config, {});
      expect(result.id.id).to.equal('ruid_11111111-2222-4333-8444-555555555555');
      expect(result.id.source).to.equal('rediads.com');
      expect(result.id.canShare).to.equal(true);
      expect(config.storage.expires).to.equal(30);
      expect(config.storage.refreshInSeconds).to.equal(3600);
    });

    it('should reuse the stored id when refreshing', function () {
      const result = rediadsIdSubmodule.getId({
        params: {
          source: 'custom.rediads.com'
        },
        storage: {}
      }, {}, {
        id: 'ruid_existing'
      });

      expect(result.id.id).to.equal('ruid_existing');
      expect(result.id.source).to.equal('custom.rediads.com');
    });

    it('should return undefined when gdpr applies without purpose 1 consent', function () {
      const result = rediadsIdSubmodule.getId({}, {
        gdpr: {
          gdprApplies: true,
          consentString: 'CONSENT',
          vendorData: {
            purpose: {
              consents: {
                1: false
              }
            }
          }
        }
      });

      expect(result).to.be.undefined;
    });

    it('should not enforce gdpr gating when gdprApplies is false', function () {
      const result = rediadsIdSubmodule.getId({}, {
        gdpr: {
          gdprApplies: false,
          consentString: 'CONSENT',
          vendorData: {
            purpose: {
              consents: {
                1: false
              }
            }
          }
        }
      });

      expect(result.id.id).to.equal('ruid_11111111-2222-4333-8444-555555555555');
    });

    it('should preserve the id but disable eids when usp opts out', function () {
      const result = rediadsIdSubmodule.getId({}, {
        usp: '1YYN'
      });

      expect(result.id.id).to.equal('ruid_11111111-2222-4333-8444-555555555555');
      expect(result.id.canShare).to.equal(false);
    });
  });

  describe('extendId', function () {
    it('should reuse an existing id', function () {
      const result = rediadsIdSubmodule.extendId({}, {}, {
        id: 'ruid_existing'
      });

      expect(result.id.id).to.equal('ruid_existing');
    });
  });

  describe('eid translation', function () {
    it('should emit an eid when sharing is allowed', function () {
      const eids = createEidsArray({
        rediadsId: {
          uid: 'ruid_test',
          source: 'rediads.com',
          atype: 1,
          ext: {
            canShare: true
          }
        }
      }, new Map(Object.entries(rediadsIdSubmodule.eids)));

      expect(eids).to.eql([{
        source: 'rediads.com',
        uids: [{
          id: 'ruid_test',
          atype: 1
        }]
      }]);
    });

    it('should suppress eids when sharing is blocked', function () {
      const eids = createEidsArray({
        rediadsId: {
          uid: 'ruid_test',
          source: 'rediads.com',
          atype: 1,
          ext: {
            canShare: false
          }
        }
      }, new Map(Object.entries(rediadsIdSubmodule.eids)));

      expect(eids).to.eql([]);
    });

    it('should not suppress eids based on gpp applicable sections alone', function () {
      const result = rediadsIdSubmodule.getId({}, {
        gpp: {
          gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [7]
        }
      });

      const decoded = rediadsIdSubmodule.decode(result.id);
      const eids = createEidsArray(decoded, new Map(Object.entries(rediadsIdSubmodule.eids)));

      expect(eids).to.have.length(1);
      expect(eids[0].source).to.equal('rediads.com');
    });
  });
});
