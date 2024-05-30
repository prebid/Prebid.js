import {render} from 'creative/renderers/display/renderer.js';
import {ERROR_NO_AD} from '../../../creative/renderers/display/constants.js';

describe('Creative renderer - display', () => {
  let doc, mkFrame, sendMessage;
  beforeEach(() => {
    mkFrame = sinon.stub().callsFake((doc, attrs) => Object.assign({doc}, attrs));
    sendMessage = sinon.stub();
    doc = {
      body: {
        appendChild: sinon.stub()
      }
    };
  });

  function runRenderer(data) {
    return render(data, {sendMessage, mkFrame}, {document: doc});
  }

  it('throws when both ad and adUrl are missing', () => {
    expect(() => {
      try {
        runRenderer({})
      } catch (e) {
        expect(e.reason).to.eql(ERROR_NO_AD);
        throw e;
      }
    }).to.throw();
  })

  Object.entries({
    ad: 'srcdoc',
    adUrl: 'src'
  }).forEach(([adProp, frameProp]) => {
    describe(`when ad has ${adProp}`, () => {
      let data;
      beforeEach(() => {
        data = {
          [adProp]: 'ad',
          width: 123,
          height: 321
        }
      })
      it(`drops iframe with ${frameProp} = ${adProp}`, () => {
        runRenderer(data);
        sinon.assert.calledWith(doc.body.appendChild, {
          doc,
          [frameProp]: 'ad',
          width: data.width,
          height: data.height
        })
      })
    })
  })
})
