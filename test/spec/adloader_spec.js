import * as utils from 'src/utils';
import * as adLoader from 'src/adloader';

describe('adLoader', function () {
  let utilsinsertElementStub;
  let utilsLogErrorStub;

  beforeEach(() => {
    utilsinsertElementStub = sinon.stub(utils, 'insertElement');
    utilsLogErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(() => {
    utilsinsertElementStub.restore();
    utilsLogErrorStub.restore();
  });

  describe('loadExternalScript', () => {
    it('requires moduleCode to be included on the request', () => {
      adLoader.loadExternalScript('someURL');
      expect(utilsLogErrorStub.called).to.be.true;
      expect(utilsinsertElementStub.called).to.be.false;
    });

    it('only allows whitelisted vendors to load scripts', () => {
      adLoader.loadExternalScript('someURL', 'criteo');
      expect(utilsLogErrorStub.called).to.be.false;
      expect(utilsinsertElementStub.called).to.be.true;
    });
  });
});
