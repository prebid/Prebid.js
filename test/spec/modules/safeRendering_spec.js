import 'src/secureCreatives.js';
import { renderBid } from '../../../modules/safeRendering.js';
import { isMessageAllowed, parseMessage } from '../../../src/secureCreatives.js';

describe('safeRendering', () => {
  let disableSecureCreatives, onMessage, messages;

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
    disableSecureCreatives = true;
    messages = [];
    onMessage = sinon.stub().callsFake((ev) => messages.push(ev));
    window.addEventListener('message', onMessage);
  });

  afterEach(() => {
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
      document.body.removeChild(bid.element);
    });

    it('drops an iframe that posts a cross-domain request', async () => {
      renderBid(bid);
      const [[event, message]] = await expectMessage();
      sinon.assert.match(message, {
        message: 'Prebid Request'
      });
      expect(event.origin).to.eql('null');
    });

    it('passes options back', async () => {
      const options = { clickUrl: 'test' };
      renderBid(bid, options);
      const [[, message]] = await expectMessage();
      expect(message.options).to.eql(options);
    });

    it('can handle non-ASCII options', async () => {
      const options = { option: 'è' };
      renderBid(bid, options);
      const [[, message]] = await expectMessage();
      expect(message.options).to.eql(options);
    });
  });
});
