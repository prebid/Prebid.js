import { renderer } from '../../../creative/crossDomain.js';
import {
  ERROR_EXCEPTION,
  EVENT_AD_RENDER_FAILED, EVENT_AD_RENDER_SUCCEEDED,
  MESSAGE_EVENT,
  MESSAGE_REQUEST,
  MESSAGE_RESPONSE
} from '../../../creative/constants.js';

describe('cross-domain creative', () => {
  const ORIGIN = 'https://example.com';
  let win, top, renderAd, messages, channelMessages, mkIframe, consoleErrorStub;

  beforeEach(() => {
    consoleErrorStub = sinon.stub(console, 'error');
    messages = [];
    channelMessages = [];
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
              return document.createElement('a');
            case 'iframe': {
              return mkIframe();
            }
          }
        })
      },
      parent: {
        parent: top,
        frames: { '__pb_locator__': {} },
        postMessage: sinon.stub().callsFake((payload, targetOrigin, transfer) => {
          messages.push({ payload: JSON.parse(payload), targetOrigin, transfer });
          if (messages.length === 1) {
            transfer[0].onmessage = sinon.stub().callsFake((ev) => {
              channelMessages.push({ payload: JSON.parse(ev.data) });
            });
          }
        })
      }
    };
    renderAd = (...args) => renderer(win)(...args);
  });

  afterEach(() => {
    consoleErrorStub.restore();
  });

  function waitFor(predicate, timeout = 1000) {
    let timedOut = false;
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        timedOut = true;
        reject(new Error('timeout'));
      }, timeout);
      resolve = (orig => () => { clearTimeout(to); orig(); })(resolve);
      function check() {
        if (!timedOut) {
          setTimeout(() => {
            if (predicate()) {
              resolve();
            } else check();
          }, 50);
        }
      }
      check();
    });
  }

  it('derives postMessage target origin from pubUrl ', () => {
    renderAd({ pubUrl: 'https://domain.com:123/path' });
    expect(messages[0].targetOrigin).to.eql('https://domain.com:123');
  });

  [null, undefined, 'about:blank'].forEach(pubUrl => {
    it(`uses * if allowNullOrigin and pubUrl is ${pubUrl}`, () => {
      renderAd({ pubUrl, allowNullOrigin: true });
      expect(messages[0].targetOrigin).to.eql('*');
    });
  });

  Object.entries({
    relative: '/path',
    missing: undefined
  }).forEach(([t, pubUrl]) => {
    it(`resolves ${t} pubUrl against the creative's location`, () => {
      renderAd({ pubUrl });
      expect(messages[0].targetOrigin).to.eql(window.location.origin);
    });
  });

  it('echoes back token, if provided', () => {
    renderAd({ pubUrl: 'https://domain.com:123/path', token: 'foo' });
    expect(messages[0].payload.token).to.eql('foo');
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
            frames: { '__pb_locator__': {} },
            parent: {
              top,
              frames: {}
            },
          }
        }
      };
    });
    Object.entries({
      'throws': () => { throw new DOMException(); },
      'does not throw': () => ({})
    }).forEach(([t, getFrames]) => {
      describe(`when an ancestor ${t}`, () => {
        beforeEach(() => {
          Object.defineProperty(win.parent.parent.parent.parent, 'frames', { get: getFrames });
        });
        it('posts message to the first ancestor with __pb_locator__ child', () => {
          renderAd({ pubUrl: 'https://www.example.com' });
          expect(messages.length).to.eql(1);
        });

        it('posts message to the given parent, if provided', () => {
          delete win.parent.parent.frames['__pb_locator__'];
          renderAd({ pubUrl: 'https://www.example.com', parent: 2 });
          expect(messages.length).to.eql(1);
        });
      });
    });
    describe('__pb_locator__ cannot be found', () => {
      beforeEach(() => {
        Object.defineProperty(win.parent.parent, 'frames', {
          get() {
            throw new DOMException();
          }
        });
      });
      it('posts to first restricted parent', () => {
        renderAd({ pubUrl: 'https://www.example.com' });
        expect(messages.length).to.eql(1);
      });
      it('posts to given target, if provided', () => {
        renderAd({ pubUrl: 'https://www.example.com', parent: 2 });
        expect(messages.length).to.eql(1);
      });
    });

    describe('when parent is given', () => {
      let received;

      // cross-origin windows throw on lookups of names that are not child frames
      function crossOrigin(frames) {
        return new Proxy(frames, {
          get(target, prop) {
            if (!Object.prototype.hasOwnProperty.call(target, prop)) {
              throw new DOMException('Blocked a frame from accessing a cross-origin frame', 'SecurityError');
            }
            return target[prop];
          }
        });
      }

      Object.entries({
        'same-origin': (frames) => frames,
        'cross-origin': crossOrigin
      }).forEach(([t, wrapFrames]) => {
        describe(`and ancestors are ${t}`, () => {
          beforeEach(() => {
            received = [];
            let depth = 0;
            for (let w = win.parent; w != null; w = w.parent) {
              const d = ++depth;
              w.frames = wrapFrames(w.frames);
              w.postMessage = () => received.push(d);
            }
          });

          [1, 2, 3].forEach(parent => {
            it(`posts to ancestor #${parent}`, () => {
              renderAd({ pubUrl: ORIGIN, parent });
              expect(received).to.eql([parent]);
            });
          });
        });
      });
    });
  });

  it('passes any extra arguments as options', () => {
    renderAd({ adId: '123', clickUrl: 'https://click-url.com', viewUrl: 'https://view-url.com', pubUrl: ORIGIN, extra: 'arg' });
    expect(messages[0].payload).to.eql({
      message: MESSAGE_REQUEST,
      adId: '123',
      options: {
        clickUrl: 'https://click-url.com',
        viewUrl: 'https://view-url.com',
        extra: 'arg'
      }
    });
  });

  it('runs scripts inserted through iframe srcdoc', (done) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('srcdoc', '<script>window.ran = true;</script>');
    iframe.onload = function () {
      expect(iframe.contentWindow.ran).to.be.true;
      done();
    };
    document.body.appendChild(iframe);
  });

  [
    {
      desc: 'a token',
      token: 'test',
      getMessage(index) {
        return index === 0 ? messages[0] : channelMessages[index - 1];
      },
      reply(msg) {
        messages[0].transfer[0].postMessage(JSON.stringify(msg));
      }
    },
    {
      desc: 'no token',
      getMessage(index) {
        return messages[index];
      },
      reply(msg, index = 0) {
        messages[index].transfer[0].postMessage(JSON.stringify(msg));
      }
    }
  ].forEach(({ desc, getMessage, reply, token }) => {
    describe(`when ${desc} is provided`, () => {
      function render(args) {
        return renderAd(Object.assign({ token }, args));
      }
      describe('listens and', () => {
        it('ignores messages that are not a prebid response message', () => {
          render({ adId: '123', pubUrl: ORIGIN });
          reply({ adId: '123', ad: 'markup' });
          sinon.assert.notCalled(mkIframe);
        });

        it('signals AD_RENDER_FAILED on exceptions', () => {
          mkIframe.callsFake(() => { throw new Error('error message'); });
          render({ adId: '123', pubUrl: ORIGIN });
          reply({ message: MESSAGE_RESPONSE, adId: '123', ad: 'markup' });
          return waitFor(() => getMessage(1)?.payload).then(() => {
            expect(getMessage(1).payload).to.eql({
              message: MESSAGE_EVENT,
              adId: '123',
              event: EVENT_AD_RENDER_FAILED,
              info: {
                reason: ERROR_EXCEPTION,
                message: 'error message'
              }
            });
          });
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
            };
            render({ adId: '123', pubUrl: ORIGIN });
            reply(data);
            return waitFor(() => window._render.args.length).then(() => {
              sinon.assert.calledWith(window._render, data, sinon.match.any, win);
            }).finally(() => {
              delete window._render;
            });
          });

          Object.entries({
            'throws (w/error)': ['window.render = function() { throw new Error("msg") }'],
            'throws (w/reason)': ['window.render = function() { throw {reason: "other", message: "msg"}}', 'other'],
            'is missing': [null, ERROR_EXCEPTION, null],
            'rejects (w/error)': ['window.render = function() { return Promise.reject(new Error("msg")) }'],
            'rejects (w/reason)': ['window.render = function() { return Promise.reject({reason: "other", message: "msg"}) }', 'other'],
          }).forEach(([t, [renderer, reason = ERROR_EXCEPTION, message = 'msg']]) => {
            it(`signals AD_RENDER_FAILED on renderer that ${t}`, () => {
              render({ adId: '123', pubUrl: ORIGIN });
              reply({
                message: MESSAGE_RESPONSE,
                adId: '123',
                renderer
              });
              return waitFor(() => getMessage(1)?.payload).then(() => {
                sinon.assert.match(getMessage(1).payload, {
                  adId: '123',
                  message: MESSAGE_EVENT,
                  event: EVENT_AD_RENDER_FAILED,
                  info: {
                    reason,
                    message: sinon.match(val => message == null || message === val)
                  }
                });
              });
            });
          });

          it('signals AD_RENDER_SUCCEEDED when renderer resolves', () => {
            render({ adId: '123', pubUrl: ORIGIN });
            reply({
              message: MESSAGE_RESPONSE,
              adId: '123',
              renderer: 'window.render = function() { return new Promise((resolve) => { window.parent._resolve = resolve })}'
            });
            return waitFor(() => window._resolve).then(() => {
              expect(getMessage(1)).to.not.exist;
              window._resolve();
              return waitFor(() => getMessage(1)?.payload);
            }).then(() => {
              sinon.assert.match(getMessage(1).payload, {
                adId: '123',
                message: MESSAGE_EVENT,
                event: EVENT_AD_RENDER_SUCCEEDED
              });
            }).finally(() => {
              delete window._resolve;
            });
          });

          it('is provided a sendMessage', () => {
            render({ adId: '123', pubUrl: ORIGIN });
            reply({
              adId: '123',
              message: MESSAGE_RESPONSE,
              renderer: 'window.render = function(_, {sendMessage}) { sendMessage("test", {"foo": "bar"}) }'
            });
            return waitFor(() => getMessage(1)?.payload).then(() => {
              sinon.assert.match(getMessage(1).payload, {
                adId: '123',
                message: 'test',
                foo: 'bar'
              });
            });
          });

          it('does not render again on a second response', () => {
            const response = {
              adId: '123',
              message: MESSAGE_RESPONSE,
              renderer: 'window.render = function() {}'
            };
            render({ adId: '123', pubUrl: ORIGIN });
            reply(response);
            return waitFor(() => getMessage(1)?.payload).then(() => {
              reply(response);
              return new Promise((resolve) => setTimeout(resolve, 200));
            }).then(() => {
              sinon.assert.calledOnce(win.document.body.appendChild);
              expect(getMessage(2)).to.not.exist;
            });
          });

          it('is provided an onMessage that receives every message following the response', () => {
            const listener = window._listener = sinon.stub();
            const response = {
              adId: '123',
              message: MESSAGE_RESPONSE,
              renderer: 'window.render = function(_, {onMessage}) { onMessage(function(data) { window.parent._listener(data) }) }'
            };
            render({ adId: '123', pubUrl: ORIGIN });
            reply(response);
            return waitFor(() => getMessage(1)?.payload).then(() => {
              reply({ message: 'other', foo: 'bar' });
              reply(response);
              return waitFor(() => listener.callCount === 2);
            }).then(() => {
              expect(listener.args.map(([data]) => data)).to.eql([
                { message: 'other', foo: 'bar' },
                response
              ]);
              sinon.assert.calledOnce(win.document.body.appendChild);
            }).finally(() => {
              delete window._listener;
            });
          });
        });
      });
    });
  });

  describe('message routing', () => {
    beforeEach(() => {
      win.document.createElement.callsFake(document.createElement.bind(document));
      win.document.body.appendChild.callsFake(document.body.appendChild.bind(document.body));
    });

    function renderAndSend(token) {
      renderAd({ adId: '123', pubUrl: ORIGIN, token });
      messages[0].transfer[0].postMessage(JSON.stringify({
        adId: '123',
        message: MESSAGE_RESPONSE,
        renderer: 'window.render = function(_, {sendMessage}) { sendMessage("test", {foo: "bar"}) }'
      }));
    }

    it('sends follow-up messages over the request channel, without the token, when a token is provided', () => {
      renderAndSend('test');
      return waitFor(() => channelMessages.length === 2).then(() => {
        expect(messages.length).to.equal(1);
        expect(messages[0].payload.token).to.equal('test');
        channelMessages.forEach(({ payload }) => expect(payload).to.not.have.property('token'));
      });
    });

    it('accepts replies through the sendMessage callback when no token is provided', () => {
      const replyListener = window._reply = sinon.stub();
      renderAd({ adId: '123', pubUrl: ORIGIN });
      messages[0].transfer[0].postMessage(JSON.stringify({
        adId: '123',
        message: MESSAGE_RESPONSE,
        renderer: 'window.render = function(_, {sendMessage}) { sendMessage("test", {}, function(ev) { window.parent._reply(ev.data) }) }'
      }));
      return waitFor(() => messages[1]?.payload).then(() => {
        messages[1].transfer[0].postMessage(JSON.stringify('response'));
        return waitFor(() => replyListener.called);
      }).then(() => {
        sinon.assert.calledWith(replyListener, JSON.stringify('response'));
      }).finally(() => {
        delete window._reply;
      });
    });

    it('sends each message on its own channel when no token is provided', () => {
      renderAndSend();
      return waitFor(() => messages.length === 3).then(() => {
        expect(channelMessages).to.eql([]);
        const ports = messages.map(({ transfer }) => transfer[0]);
        expect(new Set(ports).size).to.equal(3);
        messages.forEach(({ payload }) => expect(payload).to.not.have.property('token'));
      });
    });
  });
});
