import { subModuleObj } from 'modules/a1MediaRtdProvider.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { A1_AUD_KEY, A1_SEG_KEY, getStorageData, storage } from '../../../modules/a1MediaRtdProvider.js';
import { expect } from 'chai';

const configWithParams = {
  name: 'a1Media',
  waitForIt: true,
  params: {
    tagId: 'lb4test.min.js',
  },
};
const configWithoutParams = {
  name: 'a1Media',
  waitForIt: true,
  params: {
  },
};

const reqBidsConfigObj = {
  ortb2Fragments: {
    global: {}
  }
};
const a1TestOrtbObj = {
  user: {
    data: [
      {
        name: 'a1mediagroup.com',
        ext: {
          segtax: 900
        },
        segment: [{id: 'test'}]
      }
    ],
    ext: {
      eids: [
        {
          source: 'a1mediagroup.com',
          uids: [
            {
              id: 'tester',
              atype: 1
            }
          ]
        }
      ]
    }
  }
};

describe('a1MediaRtdProvider', function() {
  describe('init', function() {
    describe('initialize with expected params', function() {
      it('successfully initialize with load script', function() {
        expect(subModuleObj.init(configWithParams)).to.be.true;
        expect(window.linkback.l).to.be.true;
        expect(loadExternalScript.called).to.be.true;
        expect(loadExternalScript.args[0][0]).to.deep.equal('https://linkback.contentsfeed.com/src/lb4test.min.js');
      })

      it('successfully initialize but script is already exist', function() {
        const linkback = { l: true };

        expect(subModuleObj.init(configWithParams)).to.be.true;
        expect(loadExternalScript.called).to.be.false;
      })
    });

    describe('initialize without expected params', function() {
      afterEach(function() {
        storage.setCookie(A1_SEG_KEY, '', 0);
      })

      it('successfully initialize when publisher side segment is exist in cookie', function() {
        storage.setCookie(A1_SEG_KEY, 'test');
        expect(subModuleObj.init(configWithoutParams)).to.be.true;
        expect(getStorageData(A1_SEG_KEY)).to.not.equal('');
      })
      it('fails initalize publisher sied segment is not exist', function() {
        expect(subModuleObj.init(configWithoutParams)).to.be.false;
        expect(getStorageData(A1_SEG_KEY)).to.equal('');
      })
    })
  });

  describe('alterBidRequests', function() {
    const callback = sinon.stub();

    before(function() {
      storage.setCookie(A1_SEG_KEY, 'test');
      storage.setDataInLocalStorage(A1_AUD_KEY, 'tester');
    })
    after(function() {
      storage.setCookie(A1_SEG_KEY, '', 0);
      storage.removeDataFromLocalStorage(A1_AUD_KEY);
    })

    it('alterBidRequests', function() {
      subModuleObj.getBidRequestData(reqBidsConfigObj, callback);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.include(a1TestOrtbObj);
      expect(callback.calledOnce).to.be.true;
    })
  });
})
