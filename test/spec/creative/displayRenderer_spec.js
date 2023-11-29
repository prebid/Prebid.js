import {render} from 'creative/renderers/display/renderer.js';
import {
  ERROR_NO_AD,
  EVENT_AD_RENDER_FAILED,
  EVENT_AD_RENDER_SUCCEEDED,
  MESSAGE_EVENT
} from '../../../creative/renderers/display/constants.js';

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
    return render(data, {sendMessage, mkFrame}, doc);
  }

  it('sends AD_RENDER_FAILED when both ad and adUrl are missing', () => {
    runRenderer({});
    sinon.assert.calledWith(sendMessage, MESSAGE_EVENT, sinon.match({event: EVENT_AD_RENDER_FAILED, info: {reason: ERROR_NO_AD}}));
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
      it('sends AD_RENDER_SUCCEEDED', () => {
        runRenderer(data);
        sinon.assert.calledWith(sendMessage, MESSAGE_EVENT, sinon.match({event: EVENT_AD_RENDER_SUCCEEDED}));
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
