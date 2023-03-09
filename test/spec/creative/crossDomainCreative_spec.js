import {renderer} from '../../../libraries/creativeRender/crossDomain.js';
import {
  AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, EXCEPTION, NO_AD,
  PREBID_EVENT,
  PREBID_REQUEST,
  PREBID_RESPONSE
} from '../../../libraries/creativeRender/constants.js';

describe('cross-domain creative', () => {
  let win, renderAd, messages, mkIframe, listeners;

  beforeEach(() => {
    messages = [];
    listeners = [];
    mkIframe = sinon.stub();
    win = {
      document: {
        body: {
          appendChild: sinon.stub(),
        },
        createElement: sinon.stub().callsFake(tagname => {
          switch (tagname.toLowerCase()) {
            case 'a':
              return document.createElement('a')
            case 'iframe': {
              return mkIframe();
            }
          }
        })
      },
      addEventListener: sinon.stub().callsFake((_, listener) => listeners.push(listener)),
      parent: {
        postMessage: sinon.stub().callsFake((payload, targetOrigin, transfer) => {
          messages.push({payload: JSON.parse(payload), targetOrigin, transfer});
        })
      }
    };
    renderAd = renderer(win);
  })

  it('derives postMessage target origin from pubUrl ', () => {
    renderAd({pubUrl: 'https://domain.com:123/path'});
    expect(messages[0].targetOrigin).to.eql('https://domain.com:123')
  });

  it('generates request message with adId and clickUrl', () => {
    renderAd({adId: '123', clickUrl: 'https://click-url.com'});
    expect(messages[0].payload).to.eql({
      message: PREBID_REQUEST,
      adId: '123',
      options: {
        clickUrl: 'https://click-url.com'
      }
    })
  })

  Object.entries({
    'MessageChannel': (msg) => messages[0].transfer[0].postMessage(msg),
    'message listener': (msg) => listeners.forEach((fn) => fn({data: msg}))
  }).forEach(([t, transport]) => {
    describe(`when using ${t}`, () => {
      function reply(msg) {
        transport(JSON.stringify(msg))
      };

      it('ignores messages that are not a prebid response message', () => {
        renderAd({adId: '123'});
        reply({adId: '123', ad: 'markup'});
        sinon.assert.notCalled(mkIframe);
      })

      describe('signals AD_RENDER_FAILED', () => {
        it('on exception', (done) => {
          mkIframe.callsFake(() => { throw new Error('error message') });
          renderAd({adId: '123'});
          reply({message: PREBID_RESPONSE, adId: '123', ad: 'markup'});
          setTimeout(() => {
            expect(messages[1].payload).to.eql({
              message: PREBID_EVENT,
              adId: '123',
              event: AD_RENDER_FAILED,
              info: {
                reason: EXCEPTION,
                message: 'error message'
              }
            })
            done();
          }, 100)
        });

        it('on missing ad', (done) => {
          renderAd({adId: '123'});
          reply({message: PREBID_RESPONSE, adId: '123'});
          setTimeout(() => {
            sinon.assert.match(messages[1].payload, {
              message: PREBID_EVENT,
              adId: '123',
              event: AD_RENDER_FAILED,
              info: {
                reason: NO_AD,
              }
            })
            done();
          }, 100)
        })
      });

      describe('rendering', () => {
        let iframe;

        beforeEach(() => {
          iframe = {
            attrs: {},
            setAttribute: sinon.stub().callsFake((k, v) => iframe.attrs[k.toLowerCase()] = v),
            contentDocument: {
              open: sinon.stub(),
              write: sinon.stub(),
              close: sinon.stub(),
            }
          }
          mkIframe.callsFake(() => iframe);
        });

        it('renders adUrl as iframe src', (done) => {
          renderAd({adId: '123'});
          reply({message: PREBID_RESPONSE, adId: '123', adUrl: 'some-url'});
          setTimeout(() => {
            sinon.assert.calledWith(win.document.body.appendChild, iframe);
            expect(iframe.attrs.src).to.eql('some-url');
            done();
          }, 100)
        });

        it('renders ad through document.write', (done) => {
          renderAd({adId: '123'});
          reply({message: PREBID_RESPONSE, adId: '123', ad: 'some-markup'});
          setTimeout(() => {
            sinon.assert.calledWith(win.document.body.appendChild, iframe);
            sinon.assert.called(iframe.contentDocument.open);
            sinon.assert.calledWith(iframe.contentDocument.write, 'some-markup');
            sinon.assert.called(iframe.contentDocument.close);
            done();
          }, 100)
        });

        Object.entries({
          adUrl: 'mock-ad-url',
          ad: 'mock-ad-markup'
        }).forEach(([prop, propValue]) => {
          describe(`when message has ${prop}`, () => {
            beforeEach((done) => {
              renderAd({adId: '123'});
              reply({
                message: PREBID_RESPONSE,
                adId: '123',
                [prop]: propValue,
                width: 100,
                height: 200
              });
              setTimeout(done, 100);
            });

            it('emits AD_RENDER_SUCCEEDED', () => {
              expect(messages[1].payload).to.eql({
                message: PREBID_EVENT,
                adId: '123',
                event: AD_RENDER_SUCCEEDED
              })
            });

            it('sets iframe height / width to ad height / width', () => {
              sinon.assert.match(iframe.attrs, {
                width: 100,
                height: 200
              })
            })
          })
        })
      });
    });
  });
});
