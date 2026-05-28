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

  it('validates site content enum values with IAB AdCOM enums', () => {
    expect(toOrtb25Strict({
      site: {
        content: {
          prodq: 1,
          context: 5,
          qagmediarating: 2,
          videoquality: 3
        }
      }
    }, translator)).to.eql({
      site: {
        content: {
          prodq: 1,
          context: 5,
          qagmediarating: 2,
          videoquality: 3
        }
      }
    });

    expect(toOrtb25Strict({
      site: {
        content: {
          prodq: 99,
          context: 99,
          qagmediarating: 99,
          videoquality: 99
        }
      }
    }, translator)).to.eql({ site: { content: {} } });
  });
});
