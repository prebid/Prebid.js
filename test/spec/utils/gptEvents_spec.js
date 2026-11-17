import { gptEventHandler } from '../../../src/utils/gptEvents.js';

describe('gptEventHandler', () => {
  let origGpt, googletag, pubads, listeners, cb, handler;
  before(() => {
    origGpt = window.googletag;
  });
  after(() => {
    if (typeof origGpt !== 'undefined') {
      window.googletag = origGpt;
    } else {
      delete window.googletag;
    }
  });

  beforeEach(() => {
    listeners = [];
    pubads = {
      addEventListener: sinon.stub().callsFake((evt, arg) => listeners.push([evt, arg])),
      removeEventListener: sinon.stub().callsFake((evt, arg) => {
        const item = listeners.findIndex((listener) => listener[0] === evt && listener[1] === arg);
        if (item !== null) {
          listeners.splice(item, 1);
        }
      }),
      getSlots: sinon.stub(),
    };
    googletag = {
      pubads: sinon.stub().returns(pubads)
    };
    cb = sinon.stub();
    handler = gptEventHandler('slotRenderEnded', cb);
  });

  it('should add listener on enable()', () => {
    window.googletag = googletag;
    handler.enable();
    expect(listeners).to.have.lengthOf(1);
    expect(listeners[0]).to.eql(['slotRenderEnded', cb]);
  });

  it('does nothing on enable when already enabled', () => {
    window.googletag = googletag;
    handler.enable();
    handler.enable();
    expect(listeners).to.have.lengthOf(1);
  });

  it('does nothing on disable, when already disabled', () => {
    window.googletag = googletag;
    handler.enable();
    handler.disable();
    handler.disable();
    expect(listeners).to.have.lengthOf(0);
  });

  it('can be disabled, then re-enabled', () => {
    window.googletag = googletag;
    handler.enable();
    handler.disable();
    expect(listeners).to.have.lengthOf(0);
    handler.enable();
    expect(listeners).to.have.lengthOf(1);
  });

  it('does not do anything when GPT is missing', () => {
    handler.enable();
    handler.disable();
  });
});
