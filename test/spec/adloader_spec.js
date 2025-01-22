import * as utils from 'src/utils.js';
import * as adLoader from 'test/mocks/adloaderStub.js';
import { LOAD_EXTERNAL_SCRIPT } from '../../src/activities/activities';
import { registerActivityControl } from '../../src/activities/rules';
import { MODULE_TYPE_PREBID } from '../../src/activities/modules';

describe('adLoader', function () {
  let utilsinsertElementStub;
  let utilsLogErrorStub;

  beforeEach(function () {
    utilsinsertElementStub = sinon.stub(utils, 'insertElement');
    utilsLogErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    utilsinsertElementStub.restore();
    utilsLogErrorStub.restore();
  });

  describe('loadExternalScript', function () {
    it('requires moduleCode to be included on the request', function () {
      adLoader.loadExternalScript('someURL');
      expect(utilsLogErrorStub.called).to.be.true;
      expect(utilsinsertElementStub.called).to.be.false;
    });

    it('only allows whitelisted vendors to load scripts', function () {
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging');
      expect(utilsLogErrorStub.called).to.be.false;
      expect(utilsinsertElementStub.called).to.be.true;
    });

    it('should not load cached script again', function() {
      adLoader.loadExternalScript('someURL', 'debugging', MODULE_TYPE_PREBID);
      expect(utilsinsertElementStub.called).to.be.false;
    });

    it('callback function can be passed to the function', function() {
      let callback = function() {};
      adLoader.loadExternalScript('someURL1', MODULE_TYPE_PREBID, 'debugging', callback);
      expect(utilsinsertElementStub.called).to.be.true;
    });

    it('requires a url to be included once per document', function () {
      function getDocSpec() {
        return {
          createElement: function() {
            return {

            }
          },
          getElementsByTagName: function() {
            return {
              firstChild: {
                insertBefore: function() {

                }
              }
            }
          }

        }
      }
      const doc1 = getDocSpec();
      const doc2 = getDocSpec();
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {}, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {}, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {}, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {}, doc2);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {}, doc2);
      expect(utilsinsertElementStub.callCount).to.equal(2);
    });
  });

  it('attaches passed attributes to a script', function () {
    const doc = {
        createElement: function () {
          return {
            setAttribute: function (key, value) {
              this[key] = value;
            }
          }
        },
        getElementsByTagName: function() {
          return {
            firstChild: {
              insertBefore: function() {}
            }
          }
        }
      },
      attrs = {'z': 'A', 'y': 2};
    let script = adLoader.loadExternalScript('someUrl', MODULE_TYPE_PREBID, 'debugging', undefined, doc, attrs);
    expect(script.z).to.equal('A');
    expect(script.y).to.equal(2);
  });

  it('should disable loading external script for activity rule set', function () {
    let unregisterRule;
    try {
      unregisterRule = registerActivityControl(LOAD_EXTERNAL_SCRIPT, 'loadExternalScript config', () => ({allow: false}));
      adLoader.loadExternalScript(null, 'debugging');
      expect(utilsLogErrorStub.called).to.be.false;
    } finally {
      unregisterRule?.();
    }
  })
});
