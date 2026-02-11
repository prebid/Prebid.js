import {getAdUnitElement} from '../../../src/utils/adUnits.js';

describe('ad unit utils', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('getAdUnitElement', () => {
    beforeEach(() => {
      sandbox.stub(document, 'getElementById').callsFake((id) => ({id}));
    });
    it('should return null on invalid input', () => {
      expect(getAdUnitElement({})).to.eql(null);
    });
    it('should prefer element', () => {
      expect(getAdUnitElement({
        element: 'explicit',
        code: 'ignored',
        adUnitCode: 'ignored'
      })).to.eql('explicit');
    });
    it('should fallback to code as id', () => {
      expect(getAdUnitElement({
        code: 'au'
      })).to.eql({
        id: 'au'
      });
    });
    it('should fallback to adUnitCode as id', () => {
      expect(getAdUnitElement({
        adUnitCode: 'au'
      })).to.eql({
        id: 'au'
      })
    })
  });
});
