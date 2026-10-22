import {
  dep,
  endLayoutEpoch,
  onLayoutEpochEnd,
  startLayoutEpoch
} from '../../../src/utils/layoutEpoch.js';
import { clearCache, getBoundingClientRect } from '../../../libraries/boundingClientRect/boundingClientRect.js';
import {
  getWinDimensions,
  internal as winDimensionsInternal,
  resetWinDimensions
} from '../../../src/utils/winDimensions.js';
import { CachedApiWrapper } from '../../../src/utils/cachedApiWrapper.js';

describe('layoutEpoch', () => {
  let sandbox, reset, unregister;

  function nextTask() {
    return new Promise(resolve => setTimeout(resolve));
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    endLayoutEpoch();
    reset = sinon.stub();
    unregister = onLayoutEpochEnd(reset);
  });

  afterEach(() => {
    unregister();
    sandbox.restore();
    endLayoutEpoch();
  });

  it('does not end the epoch within the synchronous run that started it', () => {
    startLayoutEpoch();
    startLayoutEpoch();
    sinon.assert.notCalled(reset);
  });

  it('ends the epoch before the next microtask queued after it started', async () => {
    startLayoutEpoch();
    await Promise.resolve();
    sinon.assert.calledOnce(reset);
  });

  it('ends the epoch before any later task runs', async () => {
    startLayoutEpoch();
    await nextTask();
    sinon.assert.calledOnce(reset);
  });

  it('queues one microtask per epoch', () => {
    const queueMicrotask = sandbox.stub(dep, 'queueMicrotask');
    startLayoutEpoch();
    startLayoutEpoch();
    sinon.assert.calledOnce(queueMicrotask);
  });

  it('does not end an epoch from a microtask that runs when none is running', () => {
    const callbacks = [];
    sandbox.stub(dep, 'queueMicrotask').callsFake(callback => callbacks.push(callback));
    startLayoutEpoch();
    endLayoutEpoch();
    reset.resetHistory();
    callbacks.forEach(callback => callback());
    sinon.assert.notCalled(reset);
  });

  it('is not held open by a queueMicrotask replaced after it loaded', async () => {
    const original = window.queueMicrotask;
    window.queueMicrotask = () => {};
    try {
      startLayoutEpoch();
    } finally {
      window.queueMicrotask = original;
    }
    await Promise.resolve();
    sinon.assert.calledOnce(reset);
  });

  it('stops calling a reset once it is unregistered', async () => {
    unregister();
    startLayoutEpoch();
    await Promise.resolve();
    sinon.assert.notCalled(reset);
  });

  describe('keeps element rects and window dimensions coherent', () => {
    let element, win, original;

    beforeEach(() => {
      element = document.createElement('div');
      sandbox.stub(element, 'getBoundingClientRect').returns({ top: 100 });
      win = { scrollY: 0 };
      original = winDimensionsInternal.winDimensions;
      winDimensionsInternal.winDimensions = new CachedApiWrapper(() => {
        startLayoutEpoch();
        return win;
      }, { scrollY: true });
    });

    afterEach(() => {
      winDimensionsInternal.winDimensions = original;
    });

    function documentY() {
      return getBoundingClientRect(element).top + getWinDimensions().scrollY;
    }

    function scroll(y) {
      win.scrollY = y;
      element.getBoundingClientRect.returns({ top: 100 - y });
    }

    it('serves both from cache within an epoch', () => {
      expect(documentY()).to.equal(100);
      scroll(40);
      expect(documentY()).to.equal(100);
      expect(getWinDimensions().scrollY).to.equal(0);
      sinon.assert.calledOnce(element.getBoundingClientRect);
    });

    it('does not combine a rect cached before a scroll with an offset first read after it', async () => {
      getBoundingClientRect(element);
      await nextTask();
      // e.g. another script, or the user, scrolls the page in a task of its own
      scroll(40);
      expect(documentY()).to.equal(100);
    });

    Object.entries({
      'at the end of the task': nextTask,
      'when window dimensions are reset': resetWinDimensions,
      'when the rect cache is cleared': clearCache,
    }).forEach(([t, endEpoch]) => {
      it(`discards both ${t}`, async () => {
        documentY();
        scroll(40);
        await endEpoch();
        expect(getBoundingClientRect(element).top).to.equal(60);
        expect(getWinDimensions().scrollY).to.equal(40);
        expect(documentY()).to.equal(100);
      });
    });
  });
});
