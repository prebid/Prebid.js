import {renderer} from '../../../creative/crossDomain.js';
import {
  ERROR_EXCEPTION,
  EVENT_AD_RENDER_FAILED, EVENT_AD_RENDER_SUCCEEDED,
  MESSAGE_EVENT,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE
} from '../../../creative/constants.js';

describe('cross-domain creative', () => {
  const ORIGIN = 'https://example.com';
  let win, top, renderAd, messages, mkIframe;

  beforeEach(() => {
    messages = [];
    mkIframe = sinon.stub();
    top = {
      frames: {}
    };
    top.top = top;
    win = {
      top,
      frames: {},
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
      parent: {
        parent: top,
        frames: {'__pb_locator__': {}},
        postMessage: sinon.stub().callsFake((payload, targetOrigin, transfer) => {
          messages.push({payload: JSON.parse(payload), targetOrigin, transfer});
        })
      }
    };
    renderAd = (...args) => renderer(win)(...args);
  })

  function waitFor(predicate, timeout = 1000) {
    let timedOut = false;
    return new Promise((resolve, reject) => {
      let to = setTimeout(() => {
        timedOut = true;
        reject(new Error('timeout'))
      }, timeout)
      resolve = (orig => () => { clearTimeout(to); orig() })(resolve);
      function check() {
        if (!timedOut) {
          setTimeout(() => {
            if (predicate()) {
              resolve()
            } else check();
          }, 50)
        }
      }
      check();
    })
  }

  it('derives postMessage target origin from pubUrl ', () => {
    renderAd({pubUrl: 'https://domain.com:123/path'});
    expect(messages[0].targetOrigin).to.eql('https://domain.com:123')
  });

  describe('when there are multiple ancestors', () => {
    let target;
    beforeEach(() => {
      target = win.parent;
      win.parent = {
        top,
        frames: {},
        parent: {
          ...target,
          parent: {
            top,
            frames: {'__pb_locator__': {}},
            parent: {
              top,
              frames: {}
            },
          }
        }
      }
    })
    Object.entries({
      'throws': () => { throw new DOMException() },
      'does not throw': () => ({})
    }).forEach(([t, getFrames]) => {
      describe(`when an ancestor ${t}`, () => {
        beforeEach(() => {
          Object.defineProperty(win.parent.parent.parent.parent, 'frames', {get: getFrames})
        })
        it('posts message to the first ancestor with __pb_locator__ child', () => {
          renderAd({pubUrl: 'https://www.example.com'});
          expect(messages.length).to.eql(1);
        });
      })
    })
    it('posts to first restricted parent, if __pb_locator__ cannot be found', () => {
      Object.defineProperty(win.parent.parent.parent, 'frames', {
        get() {
          throw new DOMException();
        }
      });
      renderAd({pubUrl: 'https://www.example.com'});
      expect(messages.length).to.eql(1);
    })
  })

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

  describe('listens and', () => {
    function reply(msg, index = 0) {
      messages[index].transfer[0].postMessage(JSON.stringify(msg));
    }

    it('ignores messages that are not a prebid response message', () => {
      renderAd({adId: '123', pubUrl: ORIGIN});
      reply({adId: '123', ad: 'markup'});
      sinon.assert.notCalled(mkIframe);
    })

    it('signals AD_RENDER_FAILED on exceptions', () => {
      mkIframe.callsFake(() => { throw new Error('error message') });
      renderAd({adId: '123', pubUrl: ORIGIN});
      reply({message: MESSAGE_RESPONSE, adId: '123', ad: 'markup'});
      return waitFor(() => messages[1]?.payload).then(() => {
        expect(messages[1].payload).to.eql({
          message: MESSAGE_EVENT,
          adId: '123',
          event: EVENT_AD_RENDER_FAILED,
          info: {
            reason: ERROR_EXCEPTION,
            message: 'error message'
          }
        })
      })
    });

    describe('renderer', () => {
      beforeEach(() => {
        win.document.createElement.callsFake(document.createElement.bind(document));
        win.document.body.appendChild.callsFake(document.body.appendChild.bind(document.body));
      });

      it('sets up and runs renderer', () => {
        window._render = sinon.stub();
        const data = {
          message: MESSAGE_RESPONSE,
          adId: '123',
          renderer: 'window.render = window.parent._render'
        }
        renderAd({adId: '123', pubUrl: ORIGIN});
        reply(data);
        return waitFor(() => window._render.args.length).then(() => {
          sinon.assert.calledWith(window._render, data, sinon.match.any, win);
        }).finally(() => {
          delete window._render;
        })
      });

      Object.entries({
        'throws (w/error)': ['window.render = function() { throw new Error("msg") }'],
        'throws (w/reason)': ['window.render = function() { throw {reason: "other", message: "msg"}}', 'other'],
        'is missing': [null, ERROR_EXCEPTION, null],
        'rejects (w/error)': ['window.render = function() { return Promise.reject(new Error("msg")) }'],
        'rejects (w/reason)': ['window.render = function() { return Promise.reject({reason: "other", message: "msg"}) }', 'other'],
      }).forEach(([t, [renderer, reason = ERROR_EXCEPTION, message = 'msg']]) => {
        it(`signals AD_RENDER_FAILED on renderer that ${t}`, () => {
          renderAd({adId: '123', pubUrl: ORIGIN});
          reply({
            message: MESSAGE_RESPONSE,
            adId: '123',
            renderer
          });
          return waitFor(() => messages[1]?.payload).then(() => {
            sinon.assert.match(messages[1].payload, {
              adId: '123',
              message: MESSAGE_EVENT,
              event: EVENT_AD_RENDER_FAILED,
              info: {
                reason,
                message: sinon.match(val => message == null || message === val)
              }
            });
          })
        })
      });

      it('signals AD_RENDER_SUCCEEDED when renderer resolves', () => {
        renderAd({adId: '123', pubUrl: ORIGIN});
        reply({
          message: MESSAGE_RESPONSE,
          adId: '123',
          renderer: 'window.render = function() { return new Promise((resolve) => { window.parent._resolve = resolve })}'
        });
        return waitFor(() => window._resolve).then(() => {
          expect(messages[1]).to.not.exist;
          window._resolve();
          return waitFor(() => messages[1]?.payload)
        }).then(() => {
          sinon.assert.match(messages[1].payload, {
            adId: '123',
            message: MESSAGE_EVENT,
            event: EVENT_AD_RENDER_SUCCEEDED
          })
        }).finally(() => {
          delete window._resolve;
        })
      })

      it('is provided a sendMessage that accepts replies', () => {
        renderAd({adId: '123', pubUrl: ORIGIN});
        window._reply = sinon.stub();
        reply({
          adId: '123',
          message: MESSAGE_RESPONSE,
          renderer: 'window.render = function(_, {sendMessage}) { sendMessage("test", "data", function(reply) { window.parent._reply(reply) }) }'
        });
        return waitFor(() => messages[1]?.payload).then(() => {
          reply('response', 1);
          return waitFor(() => window._reply.args.length)
        }).then(() => {
          sinon.assert.calledWith(window._reply, sinon.match({data: JSON.stringify('response')}));
        }).finally(() => {
          delete window._reply;
        })
      });
    });
  });
});
