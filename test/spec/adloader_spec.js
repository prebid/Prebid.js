import * as utils from 'src/utils.js';
import * as adLoader from 'test/mocks/adloaderStub.js';

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
      adLoader.loadExternalScript('someURL', 'criteo');
      expect(utilsLogErrorStub.called).to.be.false;
      expect(utilsinsertElementStub.called).to.be.true;
    });

    it('should not load cached script again', function() {
      adLoader.loadExternalScript('someURL', 'criteo');
      expect(utilsinsertElementStub.called).to.be.false;
    });

    it('callback function can be passed to the function', function() {
      let callback = function() {};
      adLoader.loadExternalScript('someURL1', 'criteo', callback);
      expect(utilsinsertElementStub.called).to.be.true;
    });
  });
});
