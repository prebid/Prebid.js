import {renderer} from '../../../creative/crossDomain.js';
import {
  ERROR_EXCEPTION,
  EVENT_AD_RENDER_FAILED,
  MESSAGE_EVENT,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE
} from '../../../creative/constants.js';
import {createIframe} from '../../../src/utils.js';

describe('cross-domain creative', () => {
  const ORIGIN = 'https://example.com';
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
    renderAd({adId: '123', clickUrl: 'https://click-url.com', pubUrl: ORIGIN});
    expect(messages[0].payload).to.eql({
      message: MESSAGE_REQUEST,
      adId: '123',
      options: {
        clickUrl: 'https://click-url.com'
      }
    })
  });

  it('runs scripts inserted through iframe srcdoc', (done) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('srcdoc', '<script>window.ran = true;</script>');
    iframe.onload = function () {
      expect(iframe.contentWindow.ran).to.be.true;
      done();
    }
    document.body.appendChild(iframe);
  })

  Object.entries({
    'MessageChannel': (msg) => messages[0].transfer[0].postMessage(msg),
    'message listener': (msg) => listeners.forEach((fn) => fn({data: msg, origin: ORIGIN}))
  }).forEach(([t, transport]) => {
    describe(`when using ${t}`, () => {
      function reply(msg) {
        transport(JSON.stringify(msg))
      }

      it('ignores messages that are not a prebid response message', () => {
        renderAd({adId: '123', pubUrl: ORIGIN});
        reply({adId: '123', ad: 'markup'});
        sinon.assert.notCalled(mkIframe);
      })

      if (t === 'message listener') {
        it('ignores messages that are not from the expected origin', () => {
          renderAd({adId: '123', pubUrl: 'https://other.com'});
          reply({adId: '123', ad: 'markup', message: MESSAGE_RESPONSE});
          sinon.assert.notCalled(mkIframe);
        })
      }

      it('signals AD_RENDER_FAILED on exceptions', (done) => {
        mkIframe.callsFake(() => { throw new Error('error message') });
        renderAd({adId: '123', pubUrl: ORIGIN});
        reply({message: MESSAGE_RESPONSE, adId: '123', ad: 'markup'});
        setTimeout(() => {
          expect(messages[1].payload).to.eql({
            message: MESSAGE_EVENT,
            adId: '123',
            event: EVENT_AD_RENDER_FAILED,
            info: {
              reason: ERROR_EXCEPTION,
              message: 'error message'
            }
          })
          done();
        }, 100)
      });

      describe('renderer', () => {
        beforeEach(() => {
          win.document.createElement.callsFake(document.createElement.bind(document));
          win.document.body.appendChild.callsFake(document.body.appendChild.bind(document.body));
        });

        it('sets up and runs renderer', (done) => {
          window._render = sinon.stub();
          const data = {
            message: MESSAGE_RESPONSE,
            adId: '123',
            renderer: 'window.render = window.parent._render'
          }
          renderAd({adId: '123', pubUrl: ORIGIN});
          reply(data);
          setTimeout(() => {
            try {
              sinon.assert.calledWith(window._render, data, sinon.match.any, win.document);
              done()
            } finally {
              delete window._render;
            }
          }, 100)
        });

        Object.entries({
          'broken': 'window.render = function() { throw new Error() }',
          'missing': null
        }).forEach(([t, renderer]) => {
          it(`signals AD_RENDER_FAILED on ${t} renderer`, (done) => {
            renderAd({adId: '123', pubUrl: ORIGIN});
            reply({
              message: MESSAGE_RESPONSE,
              adId: '123',
              renderer
            });
            setTimeout(() => {
              sinon.assert.match(messages[1].payload, {
                message: MESSAGE_EVENT,
                event: EVENT_AD_RENDER_FAILED,
                info: {
                  reason: ERROR_EXCEPTION
                }
              });
              done();
            }, 100)
          })
        });
      });
    });
  });
});
