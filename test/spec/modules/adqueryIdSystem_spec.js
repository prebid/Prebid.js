import { adqueryIdSubmodule, storage } from 'modules/adqueryIdSystem.js';
import sinon from 'sinon';
import { attachIdSystem } from '../../../modules/userId/index.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { expect } from 'chai/index.mjs';

describe('AdqueryIdSystem', function () {
  describe('qid submodule', () => {
    it('should expose a "name" property containing qid', () => {
      expect(adqueryIdSubmodule.name).to.equal('qid');
    });

    it('should expose a "gvlid" property containing the GVL ID 902', () => {
      expect(adqueryIdSubmodule.gvlid).to.equal(902);
    });
  });

  describe('getId', function () {
    let getDataFromLocalStorageStub;
    let setDataInLocalStorageStub;

    beforeEach(function () {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
      setDataInLocalStorageStub.restore();
    });

    it('returns the persisted qid synchronously when one already exists', function () {
      getDataFromLocalStorageStub.withArgs('qid').returns('existing-qid');

      const result = adqueryIdSubmodule.getId();

      expect(result).to.deep.equal({ id: 'existing-qid' });
      expect(setDataInLocalStorageStub.called).to.be.false;
    });

    it('generates and persists a new qid when none is stored yet', function () {
      getDataFromLocalStorageStub.withArgs('qid').returns(null);

      const result = adqueryIdSubmodule.getId();

      expect(result.id).to.be.a('string').that.is.not.empty;
      expect(setDataInLocalStorageStub.calledWith('qid', result.id)).to.be.true;
    });

    it('reuses the same qid across multiple getId calls once persisted', function () {
      getDataFromLocalStorageStub.withArgs('qid').returns(null);
      const first = adqueryIdSubmodule.getId();

      getDataFromLocalStorageStub.withArgs('qid').returns(first.id);
      const second = adqueryIdSubmodule.getId();

      expect(second.id).to.equal(first.id);
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(adqueryIdSubmodule);
    });
    it('qid', function() {
      const userId = {
        qid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adquery.io',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  });
});
