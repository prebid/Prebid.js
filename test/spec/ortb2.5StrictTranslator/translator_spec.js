import {toOrtb25Strict} from '../../../libraries/ortb2.5StrictTranslator/translator.js';

describe('toOrtb25Strict', () => {
  let translator;
  beforeEach(() => {
    translator = sinon.stub().callsFake((o) => o);
  })
  it('uses provided translator', () => {
    translator.reset();
    translator.callsFake(() => ({id: 'test'}));
    expect(toOrtb25Strict(null, translator)).to.eql({id: 'test'});
  });
  it('removes fields out of spec', () => {
    expect(toOrtb25Strict({unk: 'field', imp: ['err', {}]}, translator)).to.eql({imp: [{}]});
  });
});
