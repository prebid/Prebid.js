import { toOrtb25Strict } from '../../../libraries/ortb2.5StrictTranslator/translator.js';

describe('toOrtb25Strict', () => {
  let translator;
  beforeEach(() => {
    translator = sinon.stub().callsFake((o) => o);
  })
  it('uses provided translator', () => {
    translator.resetBehavior();
    translator.resetHistory();
    translator.callsFake(() => ({ id: 'test' }));
    expect(toOrtb25Strict(null, translator)).to.eql({ id: 'test' });
  });
  it('removes fields out of spec', () => {
    expect(toOrtb25Strict({ unk: 'field', imp: ['err', {}] }, translator)).to.eql({ imp: [{}] });
  });

  it('removes non-integer enum fields', () => {
    expect(toOrtb25Strict({ device: { devicetype: 1.5, connectiontype: 2, geo: { type: 2.5 } } }, translator)).to.eql({ device: { connectiontype: 2, geo: {} } });
  });

  it('keeps connectiontype unknown and 5g values', () => {
    expect(toOrtb25Strict({ device: { connectiontype: 0 } }, translator)).to.eql({ device: { connectiontype: 0 } });
    expect(toOrtb25Strict({ device: { connectiontype: 7 } }, translator)).to.eql({ device: { connectiontype: 7 } });
  });

  it('removes devicetype values outside ORTB 2.5 range', () => {
    expect(toOrtb25Strict({ device: { devicetype: 8 } }, translator)).to.eql({ device: {} });
  });
});
