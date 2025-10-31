import {render} from 'creative/renderers/display/renderer.js';
import {ERROR_NO_AD} from '../../../creative/renderers/display/constants.js';

describe('Creative renderer - display', () => {
  let doc, mkFrame, sendMessage, win;
  beforeEach(() => {
    mkFrame = sinon.stub().callsFake((doc, attrs) => Object.assign({doc}, attrs));
    sendMessage = sinon.stub();
    doc = {
      body: {
        appendChild: sinon.stub()
      }
    };
    win = {
      document: doc
    }
  });

  function runRenderer(data) {
    return render(data, {sendMessage, mkFrame}, win);
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

  it('defaults width and height to 100%', () => {
    runRenderer({ad: 'mock'});
    sinon.assert.calledWith(doc.body.appendChild, sinon.match({
      doc,
      width: '100%',
      height: '100%'
    }))
  });

  it('sets html and body style height: 100% if no height is provided', () => {
    Object.assign(doc.body, {
      style: {},
      parentElement: {
        style: {}
      }
    })
    runRenderer({ad: 'mock'});
    expect(doc.body.style.height).to.eql('100%');
    expect(doc.body.parentElement.style.height).to.eql('100%');
  });

  it('sizes frame element if instl = true', () => {
    win.frameElement = { style: {}};
    runRenderer({
      ad: 'mock',
      width: 123,
      height: 321,
      instl: true
    });
    expect(win.frameElement.style).to.eql({
      width: '123px',
      height: '321px'
    })
  });

  it('does not choke if no frame element can be found', () => {
    runRenderer({
      ad: 'mock',
      width: 123,
      height: 321,
      instl: true
    });
  })
})
