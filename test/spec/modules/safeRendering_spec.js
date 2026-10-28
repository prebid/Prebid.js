import { allowMessageHook, validateToken, renderBid, escapeInlineHtml } from '../../../modules/safeRendering.js';
import { isMessageAllowed, parseMessage } from '../../../src/secureCreatives.js';
import * as utils from 'src/utils.js';
import * as secureCreatives from 'src/secureCreatives.js';
import { config } from 'src/config.js';
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from 'creative-renderers/creative.js';
import { createIframe } from 'src/utils.js';
import { BID_STATUS } from 'src/constants.js';

describe('safeRendering', () => {
  let disableSecureCreatives, onMessage, messages, sandbox;

  function disableHook(next) {
    if (disableSecureCreatives) {
      next.bail(false);
    }
  }

  before(() => {
    isMessageAllowed.before(disableHook, 100);
  });
  after(() => {
    isMessageAllowed.getHooks({ hook: disableHook }).remove();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    disableSecureCreatives = true;
    messages = [];
    onMessage = sinon.stub().callsFake((ev) => messages.push(ev));
    window.addEventListener('message', onMessage);
  });

  afterEach(() => {
    sandbox.restore();
    window.removeEventListener('message', onMessage);
  });

  function expectMessage(matcher = (event, message) => true, interval = 50, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const poller = setInterval(() => {
        const filtered = messages.map(ev => [ev, parseMessage(ev)]).filter(([ev, message]) => matcher(ev, message));
        if (filtered.length > 0) {
          clearInterval(poller);
          resolve(filtered);
        }
      }, interval);
      setTimeout(() => {
        clearInterval(poller);
        reject(new Error('no matching messages before timeout'));
      }, timeout);
    });
  }

  it('escaped creative source is valid JS', () => {
    // eslint-disable-next-line no-new-func,no-new
    new Function(escapeInlineHtml(RENDERER));
  });

  describe('renderBid', () => {
    let bid, bidHandle;
    beforeEach(() => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      bid = {
        adId: 'mock-adid',
        element
      };

      bidHandle = {
        adId: bid.adId
      };

      sandbox.stub(secureCreatives, 'getBidForMessage').callsFake((msg) => {
        if (msg?.adId === bid.adId) {
          return bid;
        }
      });
    });

    afterEach(() => {
      if (bid.element?.parentNode === document.body) {
        document.body.removeChild(bid.element);
      }
    });

    it('drops an iframe that posts a cross-domain request', async () => {
      renderBid(bidHandle);
      const [[event, message]] = await expectMessage();
      sinon.assert.match(message, {
        message: 'Prebid Request'
      });
      expect(event.origin).to.eql('null');
    });

    it('can populate a detached element', async () => {
      bid.element = document.createElement('div');
      renderBid(bidHandle);
      document.body.appendChild(bid.element);
      try {
        const [[, { token }]] = await expectMessage();
        expect(validateToken(bid, token)).to.be.true;
      } finally {
        document.body.removeChild(bid.element);
      }
    });

    it('can populate a nested iframe', async () => {
      const iframe = createIframe(document);
      document.body.appendChild(iframe);
      try {
        bid.element = iframe.contentDocument.createElement('div');
        iframe.contentDocument.body.appendChild(bid.element);
        renderBid(bidHandle);
        await expectMessage();
      } finally {
        document.body.removeChild(iframe);
      }
    })

    function getRenderArgs(element) {
      const src = decodeURIComponent(element.querySelector('iframe').src);
      const start = src.lastIndexOf('window.pbRender(') + 'window.pbRender('.length;
      return JSON.parse(src.slice(start, src.lastIndexOf(');</script>')));
    }

    it('uses Prebid\'s location as pubUrl when the element is in an about:blank frame', () => {
      const iframe = createIframe(document);
      document.body.appendChild(iframe);
      try {
        bid.element = iframe.contentDocument.createElement('div');
        iframe.contentDocument.body.appendChild(bid.element);
        renderBid(bidHandle);
        expect(getRenderArgs(bid.element).pubUrl).to.eql(window.location.href);
      } finally {
        document.body.removeChild(iframe);
      }
    });

    describe('when the element is not in a descendant of Prebid\'s window', () => {
      let parentDoc, cleanup;
      beforeEach(function () {
        try {
          parentDoc = window.parent !== window && window.parent.document;
        } catch (e) {
        }
        if (!parentDoc) this.skip();
        cleanup = [];
      });
      afterEach(() => {
        cleanup.forEach(node => node.parentNode?.removeChild(node));
      });

      Object.entries({
        'parent window': () => parentDoc,
        'sibling frame': () => {
          const iframe = createIframe(parentDoc);
          parentDoc.body.appendChild(iframe);
          cleanup.push(iframe);
          return iframe.contentDocument;
        }
      }).forEach(([t, getDoc]) => {
        it(`refuses an element in a ${t}`, () => {
          const doc = getDoc();
          bid.element = doc.createElement('div');
          doc.body.appendChild(bid.element);
          cleanup.push(bid.element);
          sandbox.spy(utils, 'logError');
          renderBid(bidHandle);
          sinon.assert.called(utils.logError);
          expect(bid.element.querySelector('iframe')).to.not.exist;
        });
      });
    });

    it('replaces the contents of the element', async () => {
      bid.element.appendChild(document.createElement('span'));
      renderBid(bidHandle);
      await expectMessage();
      expect(Array.from(bid.element.children).map(el => el.tagName)).to.eql(['IFRAME']);
    });

    describe('when rendering would be suppressed', () => {
      afterEach(() => {
        config.resetConfig();
      });

      Object.entries({
        stale: () => {
          bid.status = BID_STATUS.RENDERED;
          config.setConfig({ auctionOptions: { suppressStaleRender: true } });
        },
        expired: () => {
          Object.assign(bid, { responseTimestamp: 0, ttl: 1 });
          config.setConfig({ auctionOptions: { suppressExpiredRender: true } });
        }
      }).forEach(([t, setup]) => {
        it(`does not clear the element if the bid is ${t}`, () => {
          setup();
          const existing = document.createElement('span');
          bid.element.appendChild(existing);
          renderBid(bidHandle);
          expect(existing.parentNode).to.equal(bid.element);
        });
      });
    });

    it('passes options back', async () => {
      const options = { option: 'test' };
      renderBid(bidHandle, options);
      const [[, message]] = await expectMessage();
      expect(message.options).to.eql(options);
    });

    it('translates clickThrough to clickUrl', async () => {
      const options = { clickThrough: 'test' };
      renderBid(bidHandle, options);
      const [[, message]] = await expectMessage();
      expect(message.options.clickUrl).to.eql('test');
    });

    Object.entries({
      'non-ASCII': { option: 'è' },
      'HTML': { option: '</script>' }
    }).forEach(([desc, options]) => {
      it(`can handle ${desc} in options`, async () => {
        renderBid(bidHandle, options);
        const [[, message]] = await expectMessage();
        expect(message.options).to.eql(options);
      });
    });

    Object.entries({
      'null': null,
      'undefined': undefined,
      'null adId': { adId: null, adUnitCode: 'au' },
      'undefined adId': { adUnitCode: 'au' },
      'unresolvable element': { adId: 'adId' },
      'null element': { adId: 'adId', element: null },
      'invalid element': { adId: 'adId', element: {} },
      'unknown adId': { adId: 'other', adUnitCode: 'au' },
      'windowless element': {
        adId: 'adId',
        element: (() => {
          const doc = document.implementation.createHTMLDocument("test");
          return doc.createElement('div');
        })(),
        adUnitCode: 'au',
      }
    }).forEach(([description, bid]) => {
      it(`refuses a bid with ${description}`, () => {
        secureCreatives.getBidForMessage.callsFake((req) => req?.adId === bid?.adId && bid);
        sandbox.spy(utils, 'logError');
        sandbox.spy(document, 'createElement');
        renderBid(bid);
        sinon.assert.called(utils.logError);
        sinon.assert.notCalled(document.createElement);
      });
    });

    it('registers the token with the bid', async () => {
      sandbox.spy(document, 'createElement');
      renderBid(bidHandle);
      const [[, { token }]] = await expectMessage();
      expect(validateToken(bid, token)).to.be.true;
    });

    it('does not accept the same token for more than one render request', async () => {
      renderBid(bidHandle);
      const [[event, message]] = await expectMessage();
      const hook = allowMessageHook();
      const next = sinon.stub();
      next.bail = sinon.stub();
      hook(next, event, message);
      sinon.assert.calledOnce(next);
      sinon.assert.notCalled(next.bail);
      hook(next, event, message);
      sinon.assert.calledOnce(next);
      sinon.assert.calledWith(next.bail, false);
    });
  });

  describe('allowMessageHook', () => {
    let next, hook, tokenIsValid, getBidForMessage;
    beforeEach(() => {
      next = sinon.stub();
      next.bail = sinon.stub();
      tokenIsValid = sinon.stub();
      hook = allowMessageHook(tokenIsValid);
      getBidForMessage = sinon.stub();
      sandbox.stub(secureCreatives, 'getBidForMessage').callsFake(getBidForMessage);
    });
    [true, false].forEach((exclusive) => {
      describe(`and safeRendering.exclusive = ${exclusive}`, () => {
        beforeEach(() => {
          config.setConfig({ safeRendering: { exclusive } });
        });

        afterEach(() => {
          config.resetConfig();
        });

        [
          {
            desc: 'wrong adId, no token',
            shouldAllow: !exclusive,
            bid: null,
            event: { ports: ['mock-source'] },
            message: { adId: 'wrong' },
          },
          {
            desc: 'missing adId, no token',
            shouldAllow: !exclusive,
            bid: null,
            event: { ports: ['mock-source'] },
            message: { adId: 'wrong' },
          },
          {
            desc: 'good adId, wrong token',
            shouldAllow: false,
            bid: {},
            event: { ports: ['mock-source'] },
            message: { adId: 'right', token: 'wrong' }
          },
          {
            desc: 'good adId, good token',
            shouldAllow: true,
            bid: {},
            event: { ports: ['mock-source'] },
            message: { adId: 'right', token: 'right' },
          },
          {
            desc: 'missing port, good token',
            shouldAllow: false,
            bid: {},
            event: { ports: [] },
            message: { adId: 'right', token: 'right' }
          },
          {
            desc: 'missing port, no token',
            shouldAllow: !exclusive,
            bid: {},
            event: { ports: [] },
            message: { adId: 'right' }
          }
        ].forEach(({ desc, shouldAllow, bid, event, message }) => {
          describe(`when an incoming message has ${desc}`, () => {
            beforeEach(() => {
              secureCreatives.getBidForMessage.returns(bid);
              tokenIsValid.callsFake((bid, token) => token === 'right');
            });

            if (shouldAllow) {
              it('should allow', () => {
                hook(next, event, message);
                sinon.assert.calledWith(next, event, message);
                sinon.assert.notCalled(next.bail);
              });
            } else {
              it('should reject', () => {
                hook(next, event, message);
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(next.bail, false);
              });
            }
          });
        });
      });
    });
  });
});
