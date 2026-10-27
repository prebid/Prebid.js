import { allowMessageHook, getAdIdForFrame, renderBid } from '../../../modules/safeRendering.js';
import { isMessageAllowed, parseMessage } from '../../../src/secureCreatives.js';
import * as utils from 'src/utils.js';

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

  describe('renderBid', () => {
    let bid;
    beforeEach(() => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      bid = {
        adId: 'mock-adid',
        element
      };
    });

    afterEach(() => {
      if (bid.element?.parent === document.body) {
        document.body.removeChild(bid.element);
      }
    });

    it('drops an iframe that posts a cross-domain request', async () => {
      renderBid(bid);
      const [[event, message]] = await expectMessage();
      sinon.assert.match(message, {
        message: 'Prebid Request'
      });
      expect(event.origin).to.eql('null');
    });

    it('can populate a detached element', async () => {
      bid.element = document.createElement('div');
      renderBid(bid);
      document.body.appendChild(bid.element);
      try {
        const [[event,]] = await expectMessage();
        expect(getAdIdForFrame(event.source)).to.eql(bid.adId);
      } finally {
        document.body.removeChild(bid.element);
      }
    });

    it('passes options back', async () => {
      const options = { option: 'test' };
      renderBid(bid, options);
      const [[, message]] = await expectMessage();
      expect(message.options).to.eql(options);
    });

    it('translates clickThrough to clickUrl', async () => {
      const options = { clickThrough: 'test' };
      renderBid(bid, options);
      const [[, message]] = await expectMessage();
      expect(message.options.clickUrl).to.eql('test');
    });

    it('can handle non-ASCII options', async () => {
      const options = { option: 'è' };
      renderBid(bid, options);
      const [[, message]] = await expectMessage();
      expect(message.options).to.eql(options);
    });

    Object.entries({
      'null': null,
      'undefined': undefined,
      'null adId': { adId: null, adUnitCode: 'au' },
      'undefined adId': { adUnitCode: 'au' },
      'unresolvable element': { adId: 'adId' },
      'null element': { adId: 'adId', element: null },
      'invalid element': { adId: 'adId', element: {} }
    }).forEach(([description, bid]) => {
      it(`refuses a bid with ${description}`, () => {
        sandbox.spy(utils, 'logError');
        sandbox.spy(document, 'createElement');
        renderBid(bid);
        sinon.assert.called(utils.logError);
        sinon.assert.notCalled(document.createElement);
      });
    });

    it('registers the adId/iframe pair with getAdIdForFrame', async () => {
      sandbox.spy(document, 'createElement');
      renderBid(bid);
      const [[event,]] = await expectMessage();
      expect(getAdIdForFrame(document.createElement.returnValues[0].contentWindow)).to.eql(bid.adId);
      expect(getAdIdForFrame(event.source)).to.eql(bid.adId);
    });
  });

  describe('allowMessageHook', () => {
    let next, hook, getAdId, source;
    beforeEach(() => {
      next = sinon.stub();
      next.bail = sinon.stub();
      getAdId = sinon.stub();
      source = 'mock-source';
      hook = allowMessageHook(getAdId);
    });

    [
      {
        desc: 'wrong adid',
        event: () => ({ source, ports: ['mock-source'] }),
        message: { adId: 'wrong' }
      },
      {
        desc: 'missing port',
        event: () => ({ source, ports: [] }),
        message: { adId: 'right' }
      }
    ].forEach(({ desc, event, message }) => {
      it(`rejects ${desc}`, () => {
        getAdId.returns('right');
        hook(next, event(), message);
        sinon.assert.calledWith(getAdId, source);
        sinon.assert.notCalled(next);
        sinon.assert.calledWith(next.bail, false);
      });
    });
  });
});
